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

        // 🔒 Autorisation : admin ou directeur départemental
        if (!['admin', 'directeur_departemental'].includes(userRole)) 
            return res.status(403).json({ message: 'Vous n’avez pas le droit d’attribuer un numéro.' });

        // 🔹 1️⃣ Récupération du dossier lié à la moto
        let { data: dossierData, error: dossierError } = await supabase
            .from('dossier')
            .select('*')
            .eq('moto_id', motoId)
            .maybeSingle();

        if (dossierError) {
            console.error('Erreur récupération dossier:', dossierError.message);
            return res.status(500).json({ message: 'Erreur interne lors de la récupération du dossier.' });
        }

        if (!dossierData) {
            // Créer automatiquement le dossier si inexistant
            const reference = `REF-${departementId}-${new Date().getFullYear()}-${motoId}`;
            const { data: newDossier, error: createError } = await supabase
                .from('dossier')
                .insert([{
                    moto_id: motoId,
                    statut: 'en_attente',
                    date_soumission: new Date(),
                    reference_dossier: reference,
                    departement_id: departementId,
                    agent_id: userId
                }])
                .select()
                .maybeSingle();

            if (createError) {
                console.error('Erreur création dossier automatique:', createError.message);
                return res.status(500).json({ message: 'Impossible de créer automatiquement le dossier.' });
            }

            dossierData = newDossier;
        }

        // 🔒 Vérification département pour directeur départemental
        if (userRole === 'directeur_departemental' && dossierData.departement_id !== departementId) {
            return res.status(403).json({ message: "Vous ne pouvez attribuer un numéro que pour votre département." });
        }

        // 🔹 2️⃣ Cas ADMIN : création et attribution du numéro
        if (userRole === 'admin') {
            // Vérifier si la moto a déjà un numéro
            const { data: existing } = await supabase
                .from('immatriculations')
                .select('*')
                .eq('moto_id', motoId)
                .maybeSingle();

            if (existing) 
                return res.status(400).json({ message: 'Cette moto a déjà un numéro d’immatriculation.' });

            const typeVehicule = 'TAXI';

            // 🔹 Génération de la séquence
            let { data: sequenceData, error: seqError } = await supabase
                .from('sequences_immatriculations')
                .select('*')
                .eq('departement_id', departementId)
                .eq('type_vehicule', typeVehicule)
                .maybeSingle();

            if (seqError) throw seqError;

            if (!sequenceData) {
                const { data: newSeq, error: newSeqError } = await supabase
                    .from('sequences_immatriculations')
                    .insert([{ departement_id: departementId, type_vehicule: typeVehicule, last_sequence: 0, last_serie: 'A' }])
                    .select()
                    .maybeSingle();
                if (newSeqError) throw newSeqError;
                sequenceData = newSeq;
            }

            let nextSequence = sequenceData.last_sequence + 1;
            let nextSerie = sequenceData.last_serie;
            if (nextSequence > 999) {
                nextSequence = 1;
                nextSerie = String.fromCharCode(nextSerie.charCodeAt(0) + 1);
                if (nextSerie > 'Z') nextSerie = 'A';
            }

            const seqFormatted = String(nextSequence).padStart(3, '0');
            const numeroImmatriculation = `${typeVehicule} ${seqFormatted} ${nextSerie}${departementId}`;

            // 🔹 Mise à jour de la séquence
            const { error: updateSeqError } = await supabase
                .from('sequences_immatriculations')
                .update({ last_sequence: nextSequence, last_serie: nextSerie })
                .eq('departement_id', departementId)
                .eq('type_vehicule', typeVehicule);

            if (updateSeqError) throw updateSeqError;

            // 🔹 Insérer le numéro dans la table immatriculations
            const { data: immatriculationData, error: insertError } = await supabase
                .from('immatriculations')
                .insert([{
                    moto_id: motoId,
                    numero_immatriculation: numeroImmatriculation,
                    attribue_par: userId
                }])
                .select()
                .maybeSingle();

            if (insertError) throw insertError;

            // 🔹 Mettre à jour le dossier avec l'immatriculation provisoire
            const { error: updateDossierError } = await supabase
                .from('dossier')
                .update({ immatriculation_provisoire: numeroImmatriculation })
                .eq('id', dossierData.id);

            if (updateDossierError) console.error('Erreur mise à jour dossier:', updateDossierError);

            return res.status(201).json({
                message: 'Numéro attribué par l’admin avec succès',
                numeroImmatriculation,
                immatriculation: immatriculationData
            });
        }

        // 🔹 3️⃣ Cas DIRECTEUR DEPARTEMENTAL : validation du dossier
        if (userRole === 'directeur_departemental') {
            if (!dossierData.immatriculation_provisoire) 
                return res.status(400).json({ message: "Aucune immatriculation provisoire trouvée pour cette moto." });

            const { error: updateError } = await supabase
                .from('dossier')
                .update({
                    statut: 'validé',
                    date_validation_dd: new Date()
                })
                .eq('id', dossierData.id);

            if (updateError) return res.status(500).json({ message: "Erreur lors de la validation du dossier." });

            return res.status(200).json({
                message: 'Dossier validé avec succès',
                numeroImmatriculation: dossierData.immatriculation_provisoire
            });
        }

    } catch (err) {
        console.error('Erreur attribuerNumero:', err);
        res.status(500).json({
            message: 'Erreur lors de l’attribution du numéro',
            erreur: err.message
        });
    }
};
