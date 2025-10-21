// controllers/dossierAdminController.js
import supabase from "../config/db.js"; 

// 🔹 Récupérer tous les dossiers admin
export const getDossiersAdmin = async (req, res) => {
    try {
        let query = supabase
            .from('dossier_admin')
            .select(`
                *, 
                motos(numero_chassis, marque, modele, numero_immatriculation)
            `)
            .order('date_creation', { ascending: false });

        // Si l'utilisateur est directeur départemental, filtrer par statut
        if (req.user.profil === 'directeur_dd') {
            query = query.eq('statut', 'en_attente_validation_officielle');
        }

        const { data, error } = await query;
        if (error) {
            console.error("SUPABASE ERROR (getDossiersAdmin):", error);
            return res.status(500).json({ message: "Erreur récupération dossiers admin", error: error.message });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("SERVER ERROR (getDossiersAdmin):", err);
        res.status(500).json({ message: "Erreur serveur récupération dossiers admin", error: err.message });
    }
};

// 🔹 Récupérer un dossier admin par ID
export const getDossierAdminById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dossier_admin')
            .select(`
                *, 
                motos(numero_chassis, marque, modele, numero_immatriculation)
            `)
            .eq('dossier_admin_id', id)
            .single();

        if (error) {
            console.error("SUPABASE ERROR (getDossierAdminById):", error);
            return res.status(500).json({ message: "Erreur récupération dossier admin", error: error.message });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("SERVER ERROR (getDossierAdminById):", err);
        res.status(500).json({ message: "Erreur serveur récupération dossier admin", error: err.message });
    }
};

// 🔹 Ajouter ou mettre à jour un dossier admin (UPSERT)
export const addDossierAdmin = async (req, res) => {
    try {
        const { reference_dossier, statut = 'en_attente_validation_officielle', immatriculation_prov } = req.body;

        if (!reference_dossier || !immatriculation_prov) {
            return res.status(400).json({ message: "Référence ou immatriculation provisoire manquante." });
        }

        if (!req.user || !req.user.id || !req.user.profil) {
            return res.status(401).json({ message: "Utilisateur non identifié." });
        }

        const acteur_id = req.user.id;
        const acteur_type = req.user.profil;

        // 🔹 Étape 1 : Récupérer le dossier principal
        const { data: dossierPrincipal, error: dossierError } = await supabase
            .from('dossier')
            .select('dossier_id, moto_id')
            .eq('reference_dossier', reference_dossier)
            .single();

        if (dossierError || !dossierPrincipal) {
            console.error("SUPABASE ERROR (findDossier):", dossierError);
            return res.status(404).json({ message: "Dossier principal introuvable." });
        }

        const { dossier_id, moto_id } = dossierPrincipal;

        // 🔹 Étape 2 : Vérifier la moto
        const { data: motoData, error: motoError } = await supabase
            .from('motos')
            .select('id')
            .eq('id', moto_id)
            .single();

        if (motoError || !motoData) {
            console.error("SUPABASE ERROR (checkMotoId):", motoError);
            return res.status(404).json({ message: `Moto ID ${moto_id} introuvable.` });
        }

        // 🔹 Étape 3 : Vérifier l'acteur
        const { data: userData, error: userError } = await supabase
            .from('utilisateurs')
            .select('id')
            .eq('id', acteur_id)
            .single();

        if (userError || !userData) {
            console.error("SUPABASE ERROR (checkActeurId):", userError);
            return res.status(401).json({ message: `Acteur ID ${acteur_id} introuvable ou invalide.` });
        }

        // 🔹 Étape 4 : UPSERT dans dossier_admin (clé unique dossier_id)
        const { data, error: upsertError } = await supabase
            .from('dossier_admin')
            .upsert(
                {
                    dossier_id,
                    reference_dossier, // ajout pour conserver la référence
                    moto_id,
                    acteur_id,
                    acteur_type,
                    immatriculation_prov,
                    statut
                },
                { onConflict: 'dossier_id' }
            )
            .select();

        if (upsertError) {
            console.error("SUPABASE ERROR (addDossierAdmin - Upsert):", upsertError);
            return res.status(500).json({ message: "Erreur ajout/mise à jour dossier admin", error: upsertError.message });
        }

        res.status(201).json(data[0]);

    } catch (err) {
        console.error("SERVER ERROR (addDossierAdmin):", err);
        res.status(500).json({ message: "Erreur serveur inattendue", error: err.message });
    }
};

// 🔹 Mettre à jour un dossier admin (par ID)
export const updateDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { immatriculation_prov, immatriculation_def, statut } = req.body;

        const updateObject = {};
        if (immatriculation_prov !== undefined) updateObject.immatriculation_prov = immatriculation_prov;
        if (immatriculation_def !== undefined) updateObject.immatriculation_def = immatriculation_def;
        if (statut !== undefined) updateObject.statut = statut;

        if (Object.keys(updateObject).length === 0) {
            return res.status(400).json({ message: "Aucun champ fourni pour la mise à jour." });
        }

        const { data, error } = await supabase
            .from('dossier_admin')
            .update(updateObject)
            .eq('dossier_admin_id', id)
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

// 🔹 Supprimer un dossier admin (par ID)
export const deleteDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dossier_admin')
            .delete()
            .eq('dossier_admin_id', id)
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
