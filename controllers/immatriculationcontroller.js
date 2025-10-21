// controllers/immatriculationController.js
import supabase from '../config/db.js';

export const attribuerNumero = async (req, res) => {
    try {
        const motoId = parseInt(req.params.motoId, 10);
        const userId = req.user.id;
        const userRole = req.user.profil;
        const departementId = req.user.departement_id;

        if (isNaN(motoId)) 
            return res.status(400).json({ message: 'ID de moto invalide.' });

        if (!['admin', 'directeur_departemental'].includes(userRole)) 
            return res.status(403).json({ message: 'Vous n’avez pas le droit d’attribuer un numéro.' });

        // 🔹 Récupérer ou créer le dossier
        let { data: dossierData, error: dossierError } = await supabase
            .from('dossier')
            .select('*')
            .eq('moto_id', motoId)
            .maybeSingle();

        if (dossierError) return res.status(500).json({ message: 'Erreur récupération dossier', error: dossierError.message });

        if (!dossierData) {
            const reference = `REF-${departementId}-${new Date().getFullYear()}-${motoId}`;
            const { data: newDossier, error: createError } = await supabase
                .from('dossier')
                .insert([{
                    moto_id: motoId,
                    statut: 'en_attente',
                    date_creation: new Date(),
                    reference_dossier: reference,
                    departement_id: departementId,
                    agent_id: userId
                }])
                .select()
                .maybeSingle();

            if (createError) return res.status(500).json({ message: 'Impossible de créer le dossier automatiquement', error: createError.message });
            dossierData = newDossier;
        }

        // Vérification département pour directeur départemental
        if (userRole === 'directeur_departemental' && dossierData.departement_id !== departementId)
            return res.status(403).json({ message: "Vous ne pouvez attribuer un numéro que pour votre département." });

        // 🔹 ADMIN : génération et attribution atomique du numéro
        if (userRole === 'admin') {
            // Vérifier si un numéro existe déjà
            const { data: existing } = await supabase
                .from('immatriculations')
                .select('*')
                .eq('moto_id', motoId)
                .maybeSingle();

            if (existing) return res.status(400).json({ message: 'Cette moto a déjà un numéro d’immatriculation.' });

            const typeVehicule = 'TAXI';

            // 🔹 Lecture de la séquence (lecture seule pour calcul)
            const { data: sequenceData } = await supabase
                .from('sequences_immatriculations')
                .select('*')
                .eq('departement_id', departementId)
                .eq('type_vehicule', typeVehicule)
                .limit(1)
                .single();

            let nextSequence = 1;
            let nextSerie = 'A';

            if (sequenceData) {
                nextSequence = sequenceData.last_sequence + 1;
                nextSerie = sequenceData.last_serie;
                if (nextSequence > 999) {
                    nextSequence = 1;
                    nextSerie = String.fromCharCode(nextSerie.charCodeAt(0) + 1);
                    if (nextSerie > 'Z') nextSerie = 'A';
                }
            } else {
                // Créer la séquence si inexistante
                await supabase
                    .from('sequences_immatriculations')
                    .insert([{ departement_id: departementId, type_vehicule: typeVehicule, last_sequence: 0, last_serie: 'A' }]);
            }

            const numeroImmatriculation = `${typeVehicule} ${String(nextSequence).padStart(3, '0')} ${nextSerie}${departementId}`;

            // 🔹 Transaction atomique : mise à jour de la séquence et insertion du numéro
            const { error: txError } = await supabase.rpc('attribuer_numero_transaction', {
                moto_id_input: motoId,
                numero_input: numeroImmatriculation,
                user_id_input: userId,
                reference_dossier_input: dossierData.reference_dossier
            });

            if (txError) return res.status(500).json({ message: 'Erreur lors de l’attribution du numéro (transaction)', error: txError.message });

            return res.status(201).json({
                message: 'Numéro attribué avec succès (transaction sécurisée)',
                numeroImmatriculation
            });
        }

        // 🔹 DIRECTEUR DEPARTEMENTAL : validation
        if (userRole === 'directeur_departemental') {
            if (!dossierData.immatriculation_prov) return res.status(400).json({ message: "Aucune immatriculation provisoire trouvée." });

            const { error: updateError } = await supabase
                .from('dossier')
                .update({ statut: 'validé', immatriculation_def: dossierData.immatriculation_prov, date_mise_a_jour: new Date() })
                .eq('id', dossierData.id);

            if (updateError) return res.status(500).json({ message: "Erreur validation dossier", error: updateError.message });

            // Mettre à jour dossier_admin
            const { error: adminUpdateError } = await supabase
                .from('dossier_admin')
                .update({ statut: 'validé', immatriculation_def: dossierData.immatriculation_prov, date_mise_a_jour: new Date() })
                .eq('reference_dossier', dossierData.reference_dossier);

            if (adminUpdateError) console.error('Erreur mise à jour dossier_admin:', adminUpdateError);

            return res.status(200).json({
                message: 'Dossier validé avec succès',
                numeroImmatriculation: dossierData.immatriculation_prov
            });
        }

    } catch (err) {
        console.error('Erreur attribuerNumero:', err);
        res.status(500).json({ message: 'Erreur lors de l’attribution du numéro', erreur: err.message });
    }
};
