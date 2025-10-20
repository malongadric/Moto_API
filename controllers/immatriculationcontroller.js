// controllers/immatriculationController.js (VERSION FINALE CORRIGÉE)
import supabase from '../config/db.js';

export const attribuerNumero = async (req, res) => {
    try {
        // 🔹 Conversion et vérification de l'ID de moto
        const motoId = parseInt(req.params.motoId, 10);
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
        
        // 1️⃣ CORRECTION: Récupère l'ID du dossier lié à la moto
        // On suppose que la table 'dossiers' contient la clé étrangère 'moto_id'
        const { data: dossierData, error: dossierError } = await supabase
            .from('dossiers') 
            .select('id') // On sélectionne uniquement l'ID du dossier
            .eq('moto_id', motoId) 
            .single();

        if (dossierError || !dossierData) {
            console.error('Erreur récupération dossier lié à la moto:', dossierError?.message || "Donnée manquante");
            return res.status(404).json({ message: 'Dossier associé à cette moto introuvable.' });
        }
        const dossierIdToUpdate = dossierData.id;
        console.log(`Dossier ID trouvé pour la mise à jour: ${dossierIdToUpdate}`);
        
        // 2️⃣ Vérifie si la moto a déjà un numéro (Logique inchangée)
        const { data: existing } = await supabase
            .from('immatriculations')
            .select('id')
            .eq('moto_id', motoId)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ message: 'Cette moto a déjà un numéro d’immatriculation.' });
        }
        
        const typeVehicule = 'TAXI'; 

        // 3️⃣ Récupère la séquence et 4️⃣ Génère la prochaine immatriculation
        let { data: sequenceData, error: seqError } = await supabase
          .from('sequences_immatriculations')
          .select('*')
          .eq('departement_id', departementId)
          .eq('type_vehicule', typeVehicule)
          .single();

        if (seqError && seqError.code === 'PGRST116') {
            const { data: newSeq, error: newSeqError } = await supabase
              .from('sequences_immatriculations')
              .insert([{ departement_id: departementId, type_vehicule: typeVehicule, last_sequence: 0, last_serie: 'A' }])
              .select().single();
            if (newSeqError) throw newSeqError;
            sequenceData = newSeq;
        } else if (seqError) {
            throw seqError;
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
        
        // 5️⃣ Met à jour la séquence
        const { error: updateSeqError } = await supabase
          .from('sequences_immatriculations')
          .update({ last_sequence: nextSequence, last_serie: nextSerie })
          .eq('departement_id', departementId)
          .eq('type_vehicule', typeVehicule);

        if (updateSeqError) throw updateSeqError;

        // 6️⃣ Insère dans la table immatriculations
        const { data: immatriculationData, error: insertError } = await supabase
          .from('immatriculations')
          .insert([{
            moto_id: motoId,
            numero_immatriculation: numeroImmatriculation,
            attribue_par: userId
          }])
          .select()
          .single();

        if (insertError) throw insertError;

        // 7️⃣ CORRECTION: Met à jour le dossier lié (utilise l'ID du dossier récupéré)
        const { error: updateDossierError } = await supabase
            .from('dossiers')
            .update({ immatriculation_provisoire: numeroImmatriculation })
            .eq('id', dossierIdToUpdate); // Utilisation de l'ID du dossier

        if (updateDossierError) console.error('Erreur mise à jour dossier:', updateDossierError);

        // ✅ Résultat final
        res.status(201).json({
            message: 'Numéro attribué avec succès',
            numeroImmatriculation,
            immatriculation: immatriculationData
        });

    } catch (err) {
        console.error('Erreur attribuerNumero:', err);
        // Gère les erreurs internes du serveur avec 500
        res.status(500).json({
            message: 'Erreur lors de l’attribution du numéro',
            erreur: err.message
        });
    }
};