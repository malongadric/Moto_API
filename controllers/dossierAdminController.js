// controllers/dossierAdminController.js
import supabase from "../config/db.js"; 

/* ================================================================
   🔹 RÉCUPÉRER TOUS LES DOSSIERS ADMIN (avec filtre départemental)
=================================================================== */
export const getDossiersAdmin = async (req, res) => {
    try {
        let query = supabase
            .from('dossier_admin')
            .select(`
                *,
                motos(id, numero_chassis, marque, modele, numero_immatriculation)
            `)
            .order('date_creation', { ascending: false });

        const { statut, search } = req.query;

        console.log("=== GET DOSSIERS ADMIN ===");
        console.log("Profil utilisateur :", req.user.profil);
        console.log("Département utilisateur :", req.user.departement_id);
        console.log("Paramètres query statut/search :", statut, search);

        // 🎯 Filtrage selon le profil utilisateur
        if (req.user.profil === 'directeur_departemental') {
            const userDepartementId = req.user.departement_id;
            if (!userDepartementId) {
                return res.status(403).json({ message: "Accès refusé. Département manquant." });
            }

            query = query.eq('departement_id', userDepartementId);

            if (statut) {
                query = query.eq('statut', statut.toLowerCase().trim());
            }
        } 
        else if (req.user.profil === 'admin') {
            if (statut) {
                query = query.eq('statut', statut.toLowerCase().trim());
            }
        }

        // 🔹 Filtre recherche
        if (search) {
            query = query.or(
                `reference_dossier.ilike.%${search}%,motos.numero_chassis.ilike.%${search}%`
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error("SUPABASE ERROR (getDossiersAdmin):", error);
            return res.status(500).json({ message: "Erreur récupération dossiers admin", error: error.message });
        }

        console.log("✅ Dossiers récupérés :", data.length);
        console.log("📍 Départements trouvés :", data.map(d => d.departement_id));

        return res.status(200).json(data || []);
    } catch (err) {
        console.error("SERVER ERROR (getDossiersAdmin):", err);
        res.status(500).json({ message: "Erreur serveur récupération dossiers admin", error: err.message });
    }
};



/* ================================================================
   🔹 RÉCUPÉRER UN DOSSIER ADMIN PAR ID
=================================================================== */
export const getDossierAdminById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dossier_admin')
            .select(`
                *, 
                motos(numero_chassis, marque, modele, numero_immatriculation)
            `)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ message: "Dossier admin non trouvé." });
            }
            return res.status(500).json({ message: "Erreur récupération dossier admin", error: error.message });
        }

        // 🔹 Prioriser immatriculation_prov
        const numeroImmat = data.immatriculation_prov || data.motos?.numero_immatriculation || 'N/A';

        res.status(200).json({
            ...data,
            numero_immatriculation: numeroImmat
        });
    } catch (err) {
        res.status(500).json({ message: "Erreur serveur récupération dossier admin", error: err.message });
    }
};



export const addDossierAdmin = async (req, res) => {
    try {
        const { reference_dossier, immatriculation_prov, statut } = req.body;

        if (!reference_dossier) {
            return res.status(400).json({ message: "Référence du dossier manquante." });
        }

        if (!req.user || !req.user.id || !req.user.profil) {
            return res.status(401).json({ message: "Utilisateur non identifié." });
        }

        const acteur_id = req.user.id;
        const acteur_type = req.user.profil;

        // 🔹 Étape 1 : Récupérer le dossier principal
        const { data: dossierPrincipal, error: dossierError } = await supabase
            .from('dossier')
            .select('moto_id, departement_id')
            .eq('reference_dossier', reference_dossier)
            .single();

        if (dossierError || !dossierPrincipal) {
            return res.status(404).json({ message: "Dossier principal introuvable." });
        }

        const { moto_id, departement_id } = dossierPrincipal;
        const departement_id_final = departement_id || req.user.departement_id;

        // 🔹 Étape 2 : Vérifie si un dossier_admin existe déjà
        const { data: existing, error: checkError } = await supabase
            .from('dossier_admin')
            .select('*')
            .eq('reference_dossier', reference_dossier)
            .maybeSingle();

        if (checkError) throw checkError;

        // 🔹 3️⃣ Si un dossier existe déjà → mise à jour uniquement
        if (existing) {
            console.log("⚠️ Dossier déjà existant → mise à jour sans modifier l’immatriculation.");

            // Empêcher le directeur de recréer le dossier
            if (acteur_type === 'directeur_departemental') {
                const { data, error: updateError } = await supabase
                    .from('dossier_admin')
                    .update({
                        statut: statut || existing.statut,
                        date_mise_a_jour: new Date()
                    })
                    .eq('reference_dossier', reference_dossier)
                    .select();

                if (updateError) throw updateError;

                return res.status(200).json({
                    message: "✅ Validation effectuée par le directeur — immatriculation conservée.",
                    data: data[0]
                });
            }

            // Si c’est l’admin, il peut aussi mettre à jour son dossier existant
            const { data, error: updateError } = await supabase
                .from('dossier_admin')
                .update({
                    statut: statut || existing.statut,
                    date_mise_a_jour: new Date()
                })
                .eq('reference_dossier', reference_dossier)
                .select();

            if (updateError) throw updateError;

            return res.status(200).json({
                message: "✅ Dossier existant mis à jour (statut modifié uniquement).",
                data: data[0]
            });
        }

        // 🔹 4️⃣ Création uniquement si inexistant (par l'admin communal)
        if (acteur_type === 'directeur_departemental') {
            return res.status(403).json({
                message: "⛔ Le directeur départemental ne peut pas créer un nouveau dossier admin."
            });
        }

        const { data, error: insertError } = await supabase
            .from('dossier_admin')
            .insert([{
                reference_dossier,
                moto_id,
                departement_id: departement_id_final,
                acteur_id,
                acteur_type,
                immatriculation_prov,
                statut: statut || 'en_attente_validation_officielle',
                date_creation: new Date(),
                date_mise_a_jour: new Date()
            }])
            .select();

        if (insertError) throw insertError;

        console.log("✅ Nouveau dossier_admin créé :", data[0].reference_dossier);
        res.status(201).json({
            message: "✅ Dossier admin créé avec succès.",
            data: data[0]
        });

    } catch (err) {
        console.error("SERVER ERROR (addDossierAdmin):", err);
        res.status(500).json({ message: "Erreur serveur inattendue", error: err.message });
    }
};




/* ================================================================
   🔹 MISE À JOUR D’UN DOSSIER ADMIN
=================================================================== */
export const updateDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { immatriculation_prov, immatriculation_def, statut } = req.body;

        const updateObject = {};
        if (immatriculation_prov !== undefined) updateObject.immatriculation_prov = immatriculation_prov;
        if (immatriculation_def !== undefined) updateObject.immatriculation_def = immatriculation_def;
        if (statut !== undefined) updateObject.statut = statut;
        updateObject.date_mise_a_jour = new Date();

        if (Object.keys(updateObject).length === 0) {
            return res.status(400).json({ message: "Aucun champ fourni pour la mise à jour." });
        }

        const { data, error } = await supabase
            .from('dossier_admin')
            .update(updateObject)
            .eq('id', id)
            .select();

        if (error) {
            console.error("SUPABASE ERROR (updateDossierAdmin):", error);
            return res.status(500).json({ message: "Erreur mise à jour dossier admin", error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json(data[0]);
    } catch (err) {
        console.error("SERVER ERROR (updateDossierAdmin):", err);
        res.status(500).json({ message: "Erreur serveur mise à jour dossier admin", error: err.message });
    }
};



/* ================================================================
   🔹 SUPPRIMER UN DOSSIER ADMIN
=================================================================== */
export const deleteDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dossier_admin')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error("SUPABASE ERROR (deleteDossierAdmin):", error);
            return res.status(500).json({ message: "Erreur suppression dossier admin", error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json({ message: "Dossier admin supprimé avec succès", deleted_item: data[0] });
    } catch (err) {
        console.error("SERVER ERROR (deleteDossierAdmin):", err);
        res.status(500).json({ message: "Erreur serveur suppression dossier admin", error: err.message });
    }
};



/* ================================================================
   🔹 VALIDATION OFFICIELLE (DIRECTEUR DÉPARTEMENTAL)
=================================================================== */
export const validerOfficiel = async (req, res) => {
    try {
        const { id } = req.body;
        if (!id) return res.status(400).json({ message: "ID du dossier manquant" });

        const { data: dossier, error: getError } = await supabase
            .from('dossier_admin')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !dossier) {
            console.error("SUPABASE ERROR (validerOfficiel - get):", getError);
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        if (req.user.profil !== 'directeur_departemental') {
            return res.status(403).json({ message: "Accès refusé. Profil non autorisé." });
        }

        const { data, error } = await supabase
            .from('dossier_admin')
            .update({ 
                statut: 'en_attente_validation_officielle',
                date_mise_a_jour: new Date()
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error("SUPABASE ERROR (validerOfficiel - update):", error);
            return res.status(500).json({ message: "Erreur mise à jour statut", error: error.message });
        }

        res.status(200).json({ message: "Dossier validé officiellement ✅", dossier: data[0] });

    } catch (err) {
        console.error("SERVER ERROR (validerOfficiel):", err);
        res.status(500).json({ message: "Erreur serveur validation officielle", error: err.message });
    }
};
