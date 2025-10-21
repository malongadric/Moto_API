// controllers/immatriculationController.js
import supabase from '../config/db.js';

export const attribuerNumero = async (req, res) => {
    try {
        // 🔹 Conversion et vérification de l'ID de moto
        const motoId = parseInt(req.params.motoId, 10);
        console.log('Attribuer immatriculation pour motoId:', motoId, 'de type', typeof motoId);

        if (isNaN(motoId)) {
            return res.status(400).json({ message: 'ID de moto invalide.' });
        }

        // 🔹 Récupération des infos utilisateur
        const userId = req.user.id;
        const userRole = req.user.profil;
        const departementId = req.user.departement_id;

        if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Vous n’avez pas le droit d’attribuer un numéro.' });
        }

        // 1️⃣ Récupération du dossier lié à la moto
        const { data: dossierData, error: dossierError } = await supabase
            .from('dossier')      // utiliser le nom exact de la table Supabase
            .select('id')
            .eq('moto_id', motoId)
            .maybeSingle();       // évite l'erreur 404 automatique

        if (dossierError) {
            console.error('Erreur récupération dossier:', dossierError.message);
            return res.status(500).json({ message: 'Erreur interne lors de la récupération du dossier.' });
        }
        if (!dossierData) {
            console.error('Dossier non trouvé pour la moto:', motoId);
            return res.status(404).json({ message: 'Dossier associé à cette moto introuvable.' });
        }

        const dossierIdToUpdate = dossierData.id;
        console.log(`Dossier ID trouvé pour mise à jour: ${dossierIdToUpdate}`);

        // 2️⃣ Vérifie si la moto a déjà un numéro
        const { data: existing } = await supabase
            .from('immatriculations')
            .select('id')
            .eq('moto_id', motoId)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ message: 'Cette moto a déjà un numéro d’immatriculation.' });
        }

        const typeVehicule = 'TAXI';

        // 3️⃣ Récupère la séquence et génère la prochaine immatriculation
        let { data: sequenceData, error: seqError } = await supabase
            .from('sequences_immatriculations')
            .select('*')
            .eq('departement_id', departementId)
            .eq('type_vehicule', typeVehicule)
            .maybeSingle();

        if (seqError) throw seqError;

        if (!sequenceData) {
            // Création d'une séquence si inexistante
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

        // 4️⃣ Mise à jour de la séquence
        const { error: updateSeqError } = await supabase
            .from('sequences_immatriculations')
            .update({ last_sequence: nextSequence, last_serie: nextSerie })
            .eq('departement_id', departementId)
            .eq('type_vehicule', typeVehicule);

        if (updateSeqError) throw updateSeqError;

        // 5️⃣ Insère dans la table immatriculations
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

        // 6️⃣ Met à jour le dossier avec l'immatriculation provisoire
        const { error: updateDossierError } = await supabase
            .from('dossier')      // même table que pour la récupération
            .update({ immatriculation_provisoire: numeroImmatriculation })
            .eq('id', dossierIdToUpdate);

        if (updateDossierError) console.error('Erreur mise à jour dossier:', updateDossierError);

        // 7️⃣ Retour API
        res.status(201).json({
            message: 'Numéro attribué avec succès',
            numeroImmatriculation,
            immatriculation: immatriculationData
        });

    } catch (err) {
        console.error('Erreur attribuerNumero:', err);
        res.status(500).json({
            message: 'Erreur lors de l’attribution du numéro',
            erreur: err.message
        });
    }
};
