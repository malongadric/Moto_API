// controllers/dossierAdminController.js
import supabase from "../config/db.js"; 

// 🔹 Récupérer tous les dossiers admin (avec filtre départemental pour le DD)
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

        console.log("REQ USER:", req.user);
        console.log("Query params statut/search:", statut, search);

        // 🎯 Filtrage par profil
        if (req.user.profil === 'directeur_departemental') {
            const userDepartementId = req.user.departement_id;
            if (!userDepartementId) {
                return res.status(403).json({ message: "Accès refusé. Département manquant." });
            }

            // 🔹 Tous les dossiers du département
            query = query.eq('departement_id', userDepartementId);

            // 🔹 Filtrer par statut seulement si fourni
            if (statut) {
                query = query.eq('statut', statut.toLowerCase().trim());
            }

        } else if (req.user.profil === 'admin') {
            // 🔹 Admin peut filtrer par statut si fourni
            if (statut) query = query.eq('statut', statut.toLowerCase().trim());
        }

        // 🔹 Filtre de recherche (reference_dossier ou numero_chassis)
        if (search) {
            query = query.or(
                `reference_dossier.ilike.%${search}%,motos.numero_chassis.ilike.%${search}%`
            );
        }

        // 🔹 Exécuter la requête
        const { data, error } = await query;

        if (error) {
            console.error("SUPABASE ERROR (getDossiersAdmin):", error);
            return res.status(500).json({ message: "Erreur récupération dossiers admin", error: error.message });
        }

        console.log("Dossiers récupérés:", data.length, data.map(d => d.reference_dossier));

        // 🔹 Retourner tableau vide si rien trouvé
        if (!data || data.length === 0) {
            return res.status(200).json([]);
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
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ message: "Dossier admin non trouvé." });
            }
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
        const { reference_dossier, immatriculation_prov, statut } = req.body;

        if (!reference_dossier || !immatriculation_prov) {
            return res.status(400).json({ message: "Référence ou immatriculation provisoire manquante." });
        }

        if (!req.user || !req.user.id || !req.user.profil) {
            return res.status(401).json({ message: "Utilisateur non identifié." });
        }

        const acteur_id = req.user.id;
        const acteur_type = req.user.profil;

        // 🔹 Étape 1 : Récupérer le dossier principal pour moto_id et département
        const { data: dossierPrincipal, error: dossierError } = await supabase
            .from('dossier')
            .select('moto_id, departement_id')
            .eq('reference_dossier', reference_dossier)
            .single();

        if (dossierError || !dossierPrincipal) {
            console.error("SUPABASE ERROR (findDossier):", dossierError);
            return res.status(404).json({ message: "Dossier principal introuvable." });
        }

        const { moto_id, departement_id } = dossierPrincipal;

        // 🔹 Étape 2 : Vérifier que moto_id existe
        const { data: motoData, error: motoError } = await supabase
            .from('motos')
            .select('id')
            .eq('id', moto_id)
            .single();

        if (motoError || !motoData) {
            console.error("SUPABASE ERROR (checkMotoId):", motoError);
            return res.status(404).json({ message: `Moto ID ${moto_id} introuvable.` });
        }

        // 🔹 Étape 3 : UPSERT dans dossier_admin
        const { data, error: upsertError } = await supabase
            .from('dossier_admin')
            .upsert({
                reference_dossier,
                moto_id,
                departement_id, // 🔹 Important : département bien renseigné
                acteur_id,
                acteur_type,
                immatriculation_prov,
                statut: statut || 'en_attente_validation_officielle',
                date_creation: new Date(),
                date_mise_a_jour: new Date()
            }, { onConflict: 'reference_dossier' })
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
        updateObject.date_mise_a_jour = new Date(); // Mise à jour automatique de la date

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

// 🔹 Supprimer un dossier admin (par ID)
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

// 🔹 Valider officiellement un dossier (Directeur Départemental)
export const validerOfficiel = async (req, res) => {
    try {
        const { id } = req.body; // ID du dossier à valider
        if (!id) return res.status(400).json({ message: "ID du dossier manquant" });

        // 🔹 Récupérer le dossier
        const { data: dossier, error: getError } = await supabase
            .from('dossier_admin')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !dossier) {
            console.error("SUPABASE ERROR (validerOfficiel - get):", getError);
            return res.status(404).json({ message: "Dossier admin non trouvé" });
        }

        // 🔹 Vérifier profil de l'utilisateur
        if (req.user.profil !== 'directeur_departemental') {
            return res.status(403).json({ message: "Accès refusé. Profil non autorisé." });
        }

        // 🔹 Mettre à jour le statut
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
