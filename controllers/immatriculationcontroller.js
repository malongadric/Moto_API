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

        if (dossierError) 
            return res.status(500).json({ message: 'Erreur récupération dossier', error: dossierError.message });

        if (!dossierData) {
            // Génère une référence par séquence annuelle et département (REF-{dept}-{year}-{seq})
            const currentYear = new Date().getFullYear();
            const startOfYear = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0)).toISOString();
            const endOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59)).toISOString();
            const { data: existingRefs } = await supabase
                .from('dossier')
                .select('reference_dossier')
                .eq('departement_id', departementId)
                .gte('date_soumission', startOfYear)
                .lte('date_soumission', endOfYear);
            let lastSeq = 0;
            (existingRefs || []).forEach(d => {
                const m = d.reference_dossier && String(d.reference_dossier).match(new RegExp(`^REF-${departementId}-${currentYear}-(\\d+)$`));
                if (m) {
                    const num = parseInt(m[1], 10);
                    if (!isNaN(num)) lastSeq = Math.max(lastSeq, num);
                }
            });
            const nextSeq = lastSeq + 1;
            const reference = `REF-${departementId}-${currentYear}-${nextSeq}`;
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

            if (createError) 
                return res.status(500).json({ message: 'Impossible de créer le dossier automatiquement', error: createError.message });

            dossierData = newDossier;
        }

        // 🔹 Vérification département pour directeur départemental
        if (userRole === 'directeur_departemental' && dossierData.departement_id !== departementId)
            return res.status(403).json({ message: "Vous ne pouvez attribuer un numéro que pour votre département." });

        // =======================================================
        // 🔹 ADMIN : génération et attribution atomique du numéro
        // =======================================================
        if (userRole === 'admin') {
            // Vérifie si cette moto a déjà un numéro
            const { data: existing } = await supabase
                .from('immatriculations')
                .select('*')
                .eq('moto_id', motoId)
                .maybeSingle();

            if (existing)
                return res.status(400).json({ message: 'Cette moto a déjà un numéro d’immatriculation.' });

            const typeVehicule = 'TAXI';

            // Utiliser le département du dossier si disponible (source de vérité).
            const seqDepartementId = dossierData.departement_id || departementId;

            // 🔹 Récupération de la séquence du département
            let { data: sequenceData } = await supabase
                .from('sequences_immatriculations')
                .select('*')
                .eq('departement_id', seqDepartementId)
                .eq('type_vehicule', typeVehicule)
                .maybeSingle();

            let nextSequence = 1;
            let nextSerie = 'A';

            if (sequenceData) {
                nextSequence = sequenceData.last_sequence + 1;
                nextSerie = sequenceData.last_serie;

                // Passage à la série suivante après 999
                if (nextSequence > 999) {
                    nextSequence = 1;
                    nextSerie = String.fromCharCode(nextSerie.charCodeAt(0) + 1);
                    if (nextSerie > 'Z') nextSerie = 'A';
                }
            } else {
                // Crée une séquence si inexistante
                const { data: newSeq } = await supabase
                    .from('sequences_immatriculations')
                        .insert([{
                            departement_id: seqDepartementId,
                            type_vehicule: typeVehicule,
                            last_sequence: 0,
                            last_serie: 'A'
                        }])
                    .select()
                    .maybeSingle();
                sequenceData = newSeq;
            }

                // ✅ Génération du numéro : TAXI 001 A1
                const numeroImmatriculation = `${typeVehicule} ${String(nextSequence).padStart(3, '0')} ${nextSerie}${seqDepartementId}`;

            // 🔹 Vérifie si ce numéro existe déjà (sécurité)
            const { data: exist } = await supabase
                .from('immatriculations')
                .select('id')
                .eq('numero_immatriculation', numeroImmatriculation)
                .maybeSingle();

            if (exist) {
                return res.status(409).json({
                    message: `Le numéro ${numeroImmatriculation} existe déjà. Réessayez.`
                });
            }

            // ✅ Mise à jour de la séquence
            const { error: seqUpdateError } = await supabase
                .from('sequences_immatriculations')
                .update({
                    last_sequence: nextSequence,
                    last_serie: nextSerie
                })
                .eq('departement_id', seqDepartementId)
                .eq('type_vehicule', typeVehicule);

            if (seqUpdateError)
                return res.status(500).json({ message: 'Erreur mise à jour séquence', error: seqUpdateError.message });

            // ✅ Attribution atomique via RPC
            const { error: txError } = await supabase.rpc('attribuer_numero_transaction', {
                moto_id_input: motoId,
                numero_input: numeroImmatriculation,
                user_id_input: userId,
                reference_dossier_input: dossierData.reference_dossier
            });

            if (txError)
                return res.status(500).json({ message: 'Erreur lors de l’attribution du numéro (transaction)', error: txError.message });

            // 🔹 Upsert automatique dans dossier_admin pour garantir persistance
            try {
                const reference = dossierData.reference_dossier;
                const departement_final = dossierData.departement_id || departementId;

                const { data: existingAdmin } = await supabase
                    .from('dossier_admin')
                    .select('*')
                    .eq('reference_dossier', reference)
                    .maybeSingle();

                if (existingAdmin) {
                    const { error: updateErr } = await supabase
                        .from('dossier_admin')
                        .update({
                            immatriculation_prov: numeroImmatriculation,
                            moto_id: motoId,
                            departement_id: departement_final,
                            acteur_id: userId,
                            acteur_type: 'admin',
                            statut: existingAdmin.statut || 'envoyé',
                            date_mise_a_jour: new Date()
                        })
                        .eq('reference_dossier', reference);
                    if (updateErr) console.error('Erreur mise à jour dossier_admin après attribution:', updateErr);
                } else {
                    const { error: insertErr } = await supabase
                        .from('dossier_admin')
                        .insert([{
                            reference_dossier: reference,
                            moto_id: motoId,
                            departement_id: departement_final,
                            acteur_id: userId,
                            acteur_type: 'admin',
                            immatriculation_prov: numeroImmatriculation,
                            statut: 'envoyé',
                            date_creation: new Date(),
                            date_mise_a_jour: new Date()
                        }])
                        .select();
                    if (insertErr) console.error('Erreur insertion dossier_admin après attribution:', insertErr);
                }
            } catch (e) {
                console.error('Erreur lors de l\'upsert dossier_admin après attribution:', e);
            }

            return res.status(201).json({
                message: 'Numéro attribué et sauvegardé avec succès (transaction sécurisée)',
                numeroImmatriculation
            });
        }

        // =======================================================
        // 🔹 DIRECTEUR DEPARTEMENTAL : validation finale
        // =======================================================
        if (userRole === 'directeur_departemental') {
            // Lecture prioritaire du dossier_admin (l'admin devrait y avoir sauvegardé
            // l'immatriculation provisoire). On prend dossier_admin.immatriculation_prov
            // si elle existe, sinon on tombe en back-up sur dossier.immatriculation_prov.
            const { data: adminDossier, error: adminFetchError } = await supabase
                .from('dossier_admin')
                .select('immatriculation_prov')
                .eq('reference_dossier', dossierData.reference_dossier)
                .maybeSingle();

            if (adminFetchError) {
                console.error('SUPABASE ERROR (fetch dossier_admin during validation):', adminFetchError);
            }

            const immatProv = adminDossier?.immatriculation_prov || dossierData.immatriculation_prov;
            if (!immatProv) return res.status(400).json({ message: "Aucune immatriculation provisoire trouvée." });

            const { error: updateError } = await supabase
                .from('dossier')
                .update({
                    statut: 'validé',
                    immatriculation_def: immatProv,
                    date_mise_a_jour: new Date()
                })
                .eq('dossier_id', dossierData.dossier_id);

            if (updateError)
                return res.status(500).json({ message: "Erreur validation dossier", error: updateError.message });

            const { error: adminUpdateError } = await supabase
                .from('dossier_admin')
                .update({
                    statut: 'validé',
                    immatriculation_def: immatProv,
                    date_mise_a_jour: new Date()
                })
                .eq('reference_dossier', dossierData.reference_dossier);

            if (adminUpdateError)
                console.error('Erreur mise à jour dossier_admin:', adminUpdateError);

            return res.status(200).json({
                message: 'Dossier validé avec succès',
                numeroImmatriculation: immatProv
            });
        }

    } catch (err) {
        console.error('Erreur attribuerNumero:', err);
        res.status(500).json({ message: 'Erreur lors de l’attribution du numéro', erreur: err.message });
    }
};
