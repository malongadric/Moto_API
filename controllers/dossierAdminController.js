// controllers/dossierAdminController.js
import supabase from "../config/db.js"; // Assure-toi qu'il n'y a qu'un seul import

// 🔹 Récupérer tous les dossiers admin
export const getDossiersAdmin = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('dossier_admin')
            .select('*')
            .order('date_creation', { ascending: false });

        if (error) {
            console.error("SUPABASE ERROR (getDossiersAdmin):", error);
            return res.status(500).json({
                message: "Erreur lors de la récupération des dossiers admin",
                error: error.message
            });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("SERVER ERROR (getDossiersAdmin):", err);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération des dossiers admin",
            error: err.message
        });
    }
};

// 🔹 Récupérer un dossier admin par ID
export const getDossierAdminById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dossier_admin')
            .select('*')
            .eq('dossier_admin_id', id)
            .single();

        if (error) {
            console.error("SUPABASE ERROR (getDossierAdminById):", error);
            return res.status(404).json({
                message: "Dossier admin non trouvé",
                error: error.message
            });
        }

        res.status(200).json(data);
    } catch (err) {
        console.error("SERVER ERROR (getDossierAdminById):", err);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération du dossier admin",
            error: err.message
        });
    }
};

// 🔹 Ajouter un nouveau dossier admin
export const addDossierAdmin = async (req, res) => {
    try {
        const { moto_id, acteur_id, acteur_type, immatriculation_prov, immatriculation_def, statut } = req.body;

        const { data, error } = await supabase
            .from('dossier_admin')
            .insert([
                {
                    moto_id,
                    acteur_id,
                    acteur_type,
                    immatriculation_prov,
                    immatriculation_def,
                    statut
                }
            ])
            .select();

        if (error) {
            console.error("SUPABASE ERROR (addDossierAdmin):", error);
            return res.status(500).json({
                message: "Erreur lors de l'ajout du dossier admin",
                error: error.message
            });
        }

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("SERVER ERROR (addDossierAdmin):", err);
        res.status(500).json({
            message: "Erreur serveur lors de l'ajout du dossier admin",
            error: err.message
        });
    }
};

// 🔹 Mettre à jour un dossier admin
export const updateDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { immatriculation_prov, immatriculation_def, statut } = req.body;

        const { data, error } = await supabase
            .from('dossier_admin')
            .update({ immatriculation_prov, immatriculation_def, statut })
            .eq('dossier_admin_id', id)
            .select();

        if (error) {
            console.error("SUPABASE ERROR (updateDossierAdmin):", error);
            return res.status(500).json({
                message: "Erreur lors de la mise à jour du dossier admin",
                error: error.message
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json(data[0]);
    } catch (err) {
        console.error("SERVER ERROR (updateDossierAdmin):", err);
        res.status(500).json({
            message: "Erreur serveur lors de la mise à jour du dossier admin",
            error: err.message
        });
    }
};

// 🔹 Supprimer un dossier admin
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
            return res.status(500).json({
                message: "Erreur lors de la suppression du dossier admin",
                error: error.message
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json({ message: "Dossier admin supprimé avec succès" });
    } catch (err) {
        console.error("SERVER ERROR (deleteDossierAdmin):", err);
        res.status(500).json({
            message: "Erreur serveur lors de la suppression du dossier admin",
            error: err.message
        });
    }
};
