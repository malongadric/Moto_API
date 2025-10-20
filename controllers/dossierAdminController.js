// controllers/dossierAdminController.js
import supabase from "../config/db.js"; 

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
        // La clé primaire dans Supabase semble être 'dossier_admin_id'
        const { id } = req.params; 

        const { data, error } = await supabase
            .from('dossier_admin')
            .select('*')
            .eq('dossier_admin_id', id)
            .single();

        if (error) {
            // Gère à la fois l'erreur de recherche et le cas où l'enregistrement n'est pas trouvé
            if (error.code === 'PGRST116') { // Code Supabase pour "Aucun enregistrement trouvé"
                return res.status(404).json({ message: "Dossier admin non trouvé" });
            }
            console.error("SUPABASE ERROR (getDossierAdminById):", error);
            return res.status(500).json({
                message: "Erreur lors de la récupération du dossier admin",
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

// 🔹 Ajouter un nouveau dossier admin (CORRECTION DE ROBUSTESSE APPLIQUÉE)
export const addDossierAdmin = async (req, res) => {
    try {
        // 1. Récupération des données du frontend
        const { reference_dossier, statut } = req.body;
        
        if (!reference_dossier || !statut) {
            return res.status(400).json({ message: "Référence du dossier ou statut manquant." });
        }

        // 2. Récupération des infos de l'utilisateur connecté 
        // 🚨 CORRECTION: Vérification explicite de req.user pour éviter l'erreur 500 si le middleware JWT est absent.
        if (!req.user || !req.user.id || !req.user.role) {
            console.error("DEBUG ERROR: req.user manquant. L'accès direct à req.user.id est non sécurisé.");
            return res.status(401).json({ 
                message: "Non autorisé: L'utilisateur n'a pas pu être identifié. Assurez-vous d'avoir fourni un token valide."
            });
        }
        
        const acteur_id = req.user.id; 
        const acteur_type = req.user.role; 
        
        // 3. Recherche du dossier principal pour obtenir les IDs manquants (moto_id et immatriculation_prov)
        const { data: dossierPrincipal, error: dossierError } = await supabase
            .from('dossier')
            .select('moto_id, immatriculation_prov') 
            .eq('reference_dossier', reference_dossier)
            .single();

        if (dossierError || !dossierPrincipal) {
            // Gérer le cas où le dossier n'existe pas ou est introuvable
            if (dossierError && dossierError.code === 'PGRST116') { 
                 return res.status(404).json({ message: "Le dossier principal avec cette référence n'existe pas." });
            }
            console.error("SUPABASE ERROR (findDossier):", dossierError);
            return res.status(500).json({ message: "Erreur lors de la recherche du dossier principal." });
        }

        const { moto_id, immatriculation_prov } = dossierPrincipal;
        
        // 4. Insertion des données complètes dans la table dossier_admin
        const { data, error: insertError } = await supabase
            .from('dossier_admin')
            .insert([
                {
                    moto_id, 
                    acteur_id, 
                    acteur_type, 
                    immatriculation_prov, 
                    statut 
                }
            ])
            .select();

        if (insertError) {
            console.error("SUPABASE ERROR (addDossierAdmin - Insert):", insertError);
            
            if (insertError.code === '23505') { 
                return res.status(409).json({
                    message: "Un certificat provisoire existe déjà pour cette moto.",
                    error: insertError.message
                });
            }

            return res.status(500).json({
                message: "Erreur lors de l'ajout du dossier admin",
                error: insertError.message
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

// 🔹 Mettre à jour un dossier admin (Par ID)
export const updateDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        // On récupère uniquement les champs pertinents pour une mise à jour
        const { immatriculation_prov, immatriculation_def, statut } = req.body; 

        // Création d'un objet de mise à jour propre
        const updateObject = {};
        if (immatriculation_prov !== undefined) updateObject.immatriculation_prov = immatriculation_prov;
        if (immatriculation_def !== undefined) updateObject.immatriculation_def = immatriculation_def;
        if (statut !== undefined) updateObject.statut = statut;
        
        if (Object.keys(updateObject).length === 0) {
            return res.status(400).json({ message: "Aucun champ valide fourni pour la mise à jour." });
        }

        const { data, error } = await supabase
            .from('dossier_admin')
            .update(updateObject)
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

// 🔹 Supprimer un dossier admin (Par ID)
export const deleteDossierAdmin = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('dossier_admin')
            .delete()
            .eq('dossier_admin_id', id)
            .select(); // Sélectionner pour vérifier l'existence avant suppression

        if (error) {
            console.error("SUPABASE ERROR (deleteDossierAdmin):", error);
            return res.status(500).json({
                message: "Erreur lors de la suppression du dossier admin",
                error: error.message
            });
        }
        
        // Si data est vide, cela signifie que l'élément n'existait pas
        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json({ message: "Dossier admin supprimé avec succès", deleted_item: data[0] });
    } catch (err) {
        console.error("SERVER ERROR (deleteDossierAdmin):", err);
        res.status(500).json({
            message: "Erreur serveur lors de la suppression du dossier admin",
            error: err.message
        });
    }
};