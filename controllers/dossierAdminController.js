// controllers/dossierAdminController.js
import supabase from "../config/db.js"; 

// 🔹 Récupérer tous les dossiers admin
export const getDossiersAdmin = async (req, res) => {
    try {
        let query = supabase
            .from('dossier_admin')
            .select('*, motos(numero_chassis, marque, modele, numero_immatriculation)')
            .order('date_creation', { ascending: false });

        // Si l'utilisateur est un directeur départemental, filtrer par statut
        if (req.user.profil === 'directeur_dd') {
            query = query.eq('statut', 'en_attente_validation_officielle');
        }

        const { data, error } = await query;

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
            .select('*, motos(numero_chassis, marque, modele, numero_immatriculation)')
            .eq('dossier_admin_id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
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

// 🔹 Ajouter un nouveau dossier admin
// 🔹 Ajouter un nouveau dossier admin (CORRIGÉ)
export const addDossierAdmin = async (req, res) => {
    try {
        // 🛑 Changement 1 : Récupérer 'immatriculation_prov' du corps de la requête (frontend)
        const { 
            reference_dossier, 
            statut = 'en_attente_validation_officielle',
            immatriculation_prov 
        } = req.body;

        if (!reference_dossier) {
            return res.status(400).json({ message: "Référence du dossier manquante." });
        }
        
        // 🛑 Ajout : S'assurer que le numéro d'immatriculation provisoire est présent
        if (!immatriculation_prov) {
             return res.status(400).json({ message: "Le numéro d'immatriculation provisoire (CG) est manquant." });
        }


        if (!req.user || !req.user.id || !req.user.profil) {
            return res.status(401).json({ 
                message: "Non autorisé: L'utilisateur n'a pas pu être identifié."
            });
        }

        const acteur_id = req.user.id;
        const acteur_type = req.user.profil;

        // 🛑 Changement 2 : L'objectif principal est de récupérer le 'moto_id'
        // Nous retirons la recherche de 'immatriculation_prov' car elle est dans le body
        // et cela simplifie la requête.
        const { data: dossierPrincipal, error: dossierError } = await supabase
            .from('dossier')
            .select('moto_id') // <-- Ne demande que le moto_id
            .eq('reference_dossier', reference_dossier)
            .single();

        if (dossierError || !dossierPrincipal) {
            // 🛑 Changement 3 : Meilleure gestion des erreurs si le dossier n'est pas trouvé
            if (dossierError && dossierError.code === 'PGRST116') {
                return res.status(404).json({ message: "Le dossier principal n'existe pas." });
            }
            console.error("SUPABASE ERROR (findDossier):", dossierError);
            // 🛑 Maintenant l'erreur 500 ne se produit que pour des erreurs serveur réelles
            return res.status(500).json({ message: "Erreur serveur lors de la recherche du dossier principal." });
        }

        const { moto_id } = dossierPrincipal; // <-- Récupération du moto_id

        // 🔹 Ajouter dans dossier_admin
        const { data, error: insertError } = await supabase
            .from('dossier_admin')
            .insert([
                {
                    moto_id,
                    acteur_id,
                    acteur_type,
                    // 🛑 Changement 4 : Utiliser la valeur du frontend (la plus à jour)
                    immatriculation_prov, 
                    statut
                }
            ])
            .select();
        // ... (le reste du bloc insertError est conservé)

        if (insertError) {
            console.error("SUPABASE ERROR (addDossierAdmin - Insert):", insertError);
            if (insertError.code === '23505') {
                return res.status(409).json({ message: "Certificat provisoire déjà existant." });
            }
            return res.status(500).json({ message: "Erreur lors de l'ajout du dossier admin", error: insertError.message });
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
        const { immatriculation_prov, immatriculation_def, statut } = req.body; 

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
            return res.status(500).json({ message: "Erreur lors de la mise à jour du dossier admin", error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json(data[0]);
    } catch (err) {
        console.error("SERVER ERROR (updateDossierAdmin):", err);
        res.status(500).json({ message: "Erreur serveur lors de la mise à jour du dossier admin", error: err.message });
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
            .select();

        if (error) {
            console.error("SUPABASE ERROR (deleteDossierAdmin):", error);
            return res.status(500).json({ message: "Erreur lors de la suppression du dossier admin", error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        res.status(200).json({ message: "Dossier admin supprimé avec succès", deleted_item: data[0] });
    } catch (err) {
        console.error("SERVER ERROR (deleteDossierAdmin):", err);
        res.status(500).json({ message: "Erreur serveur lors de la suppression du dossier admin", error: err.message });
    }
};
