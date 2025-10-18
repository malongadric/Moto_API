// controllers/dossiersController.js
import supabase from "../config/db.js";

/* ==========================================================
   🆕 AJOUTER UN DOSSIER
   ========================================================== */
export const addDossier = async (req, res) => {
  try {
    const { moto_id, proprietaire_id, mandataire_id, immatriculation_prov, immatriculation_def, agent_id } = req.body;
    const { id: userId, departement_id: userDepartementId } = req.user || {};

    // 🔹 Vérifications de base
    if (!moto_id) return res.status(400).json({ message: "ID de la moto obligatoire" });
    if (!proprietaire_id && !mandataire_id)
      return res.status(400).json({ message: "Vous devez fournir au moins un propriétaire ou un mandataire" });
    if (!userDepartementId)
      return res.status(400).json({ message: "Impossible de déterminer le département de l'utilisateur" });

    const acteur_id = proprietaire_id || mandataire_id;
    const acteur_type = proprietaire_id ? "proprietaire" : "mandataire";

    // 🔹 Génération automatique de la référence
    const currentYear = new Date().getFullYear();
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const reference_dossier = `REF-${currentYear}-${userDepartementId}-MTO-${randomCode}`;

    console.log("🔹 Référence générée :", reference_dossier);

    // 🔹 Préparation des données à insérer
    const dossierPayload = {
      moto_id,
      acteur_id,
      acteur_type,
      immatriculation_prov: immatriculation_prov || null,
      immatriculation_def: immatriculation_def || null,
      statut: "en_attente",
      date_soumission: new Date(),
      agent_id: agent_id || userId || null,
      proprietaire_id: proprietaire_id || null,
      mandataire_id: mandataire_id || null,
      reference_dossier,
      departement_id: Number(userDepartementId),
    };

    // 🔹 Insertion
    const { data: dossier, error } = await supabase
      .from("dossiers")
      .insert([dossierPayload])
      .select(`
        *,
        departement_id,
        moto:moto_id(*),
        proprietaire:proprietaire_id(*),
        mandataire:mandataire_id(*),
        agent:agent_id(id, nom, prenom)
      `)
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.status(201).json({
      message: "Dossier créé avec succès",
      dossier,
    });

  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

// controllers/dossiersController.js
import supabase from "../config/db.js";

/* ==========================================================
   📋 LISTER LES DOSSIERS (sans filtre par rôle)
   ========================================================== */
export const getDossiers = async (req, res) => {
  try {
    if (!req.user?.id)
      return res.status(401).json({ message: "Utilisateur non authentifié" });

    const { statut, reference_dossier, acteur_id, page = 1, limit = 10, sortBy = "date_soumission", order = "desc" } = req.query;

    let query = supabase.from("dossiers").select(`
      *,
      moto:moto_id(*),
      proprietaire:proprietaire_id(*),
      mandataire:mandataire_id(*)
    `);

    // 🔹 Filtres optionnels
    if (statut) query = query.eq("statut", statut);
    if (reference_dossier) query = query.eq("reference_dossier", reference_dossier);
    if (acteur_id) query = query.eq("acteur_id", Number(acteur_id));

    // 🔹 Pagination
    const from = (page - 1) * limit;
    const to = from + parseInt(limit) - 1;
    query = query.range(from, to);

    // 🔹 Tri
    query = query.order(sortBy, { ascending: order === "asc" });

    // 🔹 Exécution de la requête
    const { data, error } = await query;
    if (error) return res.status(400).json({ message: error.message });

    res.json({
      message: "Dossiers récupérés avec succès",
      dossiers: data || [],
    });
  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};




/* ==========================================================
   🔎 OBTENIR LES DÉTAILS D’UN DOSSIER
   ========================================================== */
export const getDossierById = async (req, res) => {
  try {
    const { id } = req.params;
    const { profil, departement_id } = req.user;

    if (profil === "agent" || profil === "agent_saisie") {
      return res.status(403).json({ message: "Accès refusé : vous ne pouvez pas consulter ce dossier" });
    }

    let query = supabase.from("dossiers").select(`
      *,
      departement_id,
      moto:moto_id(*),
      proprietaire:proprietaire_id(*),
      mandataire:mandataire_id(*),
      agent:agent_id(id, nom, prenom)
    `).eq("dossier_id", id);

    if (profil === "directeur_departemental") {
      query = query.eq("departement_id", departement_id);
    }

    const { data, error } = await query.single();
    if (error || !data) return res.status(404).json({ message: "Dossier introuvable" });

    res.json({ message: "Dossier récupéré avec succès", dossier: data });
  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

/* ==========================================================
   ✏️ METTRE À JOUR UN DOSSIER
   ========================================================== */
export const updateDossier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    const { profil, departement_id } = req.user;

    if (profil === "agent" || profil === "agent_saisie") {
      return res.status(403).json({ message: "Accès refusé : vous ne pouvez pas modifier ce dossier" });
    }

    // Statuts automatiques
    if (profil === "admin" && updateData.numero_immatriculation) {
      updateData.statut = "en_attente_officialisation";
    }
    if (profil === "directeur_departemental" && updateData.valide === true) {
      updateData.statut = "validé";
      updateData.date_validation_dd = new Date();
    }

    let query = supabase.from("dossiers").update(updateData).eq("dossier_id", id);

    if (profil === "directeur_departemental") {
      query = query.eq("departement_id", departement_id);
    }

    const { data, error } = await query.select("*").single();
    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: "Dossier mis à jour avec succès", dossier: data });
  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};
