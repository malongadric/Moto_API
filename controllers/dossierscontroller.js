// controllers/dossierController.js
import supabase from "../config/db.js";

/* ==========================================================
   🆕 AJOUTER UN DOSSIER
   ========================================================== */
export const addDossier = async (req, res) => {
  try {
    const {
      moto_id,
      proprietaire_id,
      mandataire_id,
      agent_id,
      attribue_par
    } = req.body;

    const { id: userId, departement_id: userDepartementId } = req.user || {};

    // 🔹 Vérifications de base
    if (!moto_id) return res.status(400).json({ message: "ID de la moto obligatoire" });
    if (!proprietaire_id && !mandataire_id)
      return res.status(400).json({ message: "Vous devez fournir au moins un propriétaire ou un mandataire" });
    if (!userDepartementId)
      return res.status(400).json({ message: "Impossible de déterminer le département de l'utilisateur" });

    const acteur_id = proprietaire_id || mandataire_id;
    const acteur_type = proprietaire_id ? "proprietaire" : "mandataire";

    // 🔹 Génération de la référence unique pour le dossier
    const currentYear = new Date().getFullYear();
    const reference = `REF-${userDepartementId}-${currentYear}-${moto_id}`;

    // 🔹 Préparation des données
    const dossierPayload = {
      moto_id,
      acteur_id,
      acteur_type,
      statut: "en_attente",
      date_soumission: new Date(),
      date_attribution: null,
      date_validation_dd: null,
      attribue_par: attribue_par || null,
      agent_id: agent_id || userId || null,
      proprietaire_id: proprietaire_id || null,
      mandataire_id: mandataire_id || null,
      reference_dossier: reference,
      departement_id: userDepartementId,
    };

    // 🔹 Insertion
    const { data: dossier, error } = await supabase
      .from("dossier")
      .insert([dossierPayload])
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.status(201).json({ message: "Dossier créé avec succès", dossier });

  } catch (err) {
    console.error("❌ Erreur serveur addDossier:", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

/* ==========================================================
   📋 LISTER LES DOSSIERS (avec relations)
   ========================================================== */


export const getDossiers = async (req, res) => {
  try {
    // 🔹 Vérifier l'authentification
    if (!req.user?.id) 
      return res.status(401).json({ message: "Utilisateur non authentifié" });

    // 🔹 Paramètres de pagination et tri
    const {
      page = 1,
      limit = 10,
      sortBy = "date_soumission",
      order = "desc"
    } = req.query;

    const from = (page - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    // 🔹 Requête avec jointures
    let query = supabase
      .from("dossier")
      .select(`
        dossier_id,
        reference_dossier,
        date_soumission,
        statut,
        moto:motos(id, numero_chassis, numero_immatriculation, marque, modele),
        proprietaire:proprietaires(nom, prenom),
        mandataire:mandataires(nom, prenom),
        departement:departements(nom)
      `)
      .range(from, to)
      .order(sortBy, { ascending: order === "asc" });

    // 🔒 Filtrer par département si pas admin/super_directeur
    if (!['admin', 'super_directeur'].includes(req.user.role)) {
      query = query.eq('departement_id', req.user.departement_id);
    }

    const { data, error, count } = await query;
    if (error) return res.status(400).json({ message: error.message });

    // 🔹 Transformer les données pour le frontend
    const dossiers = data.map(d => {
      // Propriétaire
      const proprietaireNom = Array.isArray(d.proprietaire) && d.proprietaire.length
        ? d.proprietaire[0].nom
        : d.proprietaire?.nom || "Non assigné";
      const proprietairePrenom = Array.isArray(d.proprietaire) && d.proprietaire.length
        ? d.proprietaire[0].prenom
        : d.proprietaire?.prenom || "";

      // Mandataire
      const mandataireNom = Array.isArray(d.mandataire) && d.mandataire.length
        ? d.mandataire[0].nom
        : d.mandataire?.nom || "";
      const mandatairePrenom = Array.isArray(d.mandataire) && d.mandataire.length
        ? d.mandataire[0].prenom
        : d.mandataire?.prenom || "";

      // Département
      const departementNom = Array.isArray(d.departement) && d.departement.length
        ? d.departement[0].nom
        : d.departement?.nom || "—";

      // Moto
      const moto = d.moto?.[0] || d.moto || {};
      const moto_id = moto.id || null;
      const numero_chassis = moto.numero_chassis || "";
      const numero_immatriculation = moto.numero_immatriculation || "";
      const marque = moto.marque || "";
      const modele = moto.modele || "";

      return {
        dossier_id: d.dossier_id,
        reference_dossier: d.reference_dossier,
        date_soumission: d.date_soumission,
        statut: d.statut,
        proprietaire_nom: proprietaireNom,
        proprietaire_prenom: proprietairePrenom,
        mandataire_nom: mandataireNom,
        mandataire_prenom: mandatairePrenom,
        departement_nom: departementNom,
        moto_id,
        numero_chassis,
        numero_immatriculation,
        marque,
        modele
      };
    });

    // 🔹 Retour JSON
    res.json({
      message: "Liste des dossiers récupérée avec succès",
      total: count || dossiers.length,
      page: parseInt(page),
      limit: parseInt(limit),
      dossiers
    });

  } catch (err) {
    console.error("❌ Erreur serveur getDossiers:", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};


/* ==========================================================
   🔎 OBTENIR LES DÉTAILS D’UN DOSSIER
   ========================================================== */
export const getDossierById = async (req, res) => {
  try {
    const { id } = req.params;
    const { profil, departement_id } = req.user || {};

    if (profil === "agent" || profil === "agent_saisie") {
      return res.status(403).json({ message: "Accès refusé : vous ne pouvez pas consulter ce dossier" });
    }

    let query = supabase.from("dossier").select("*").eq("dossier_id", id);

    if (profil === "directeur_departemental") {
      query = query.eq("departement_id", departement_id);
    }

    const { data, error } = await query.single();
    if (error || !data) return res.status(404).json({ message: "Dossier introuvable" });

    res.json({ message: "Dossier récupéré avec succès", dossier: data });
  } catch (err) {
    console.error("❌ Erreur serveur getDossierById:", err);
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
    const { profil, departement_id } = req.user || {};

    if (profil === "agent" || profil === "agent_saisie") {
      return res.status(403).json({ message: "Accès refusé : vous ne pouvez pas modifier ce dossier" });
    }

    // 🔹 Gestion automatique des statuts
    if (profil === "admin" && updateData.numero_immatriculation) {
      updateData.statut = "en_attente_officialisation";
    }
    if (profil === "directeur_departemental" && updateData.valide === true) {
      updateData.statut = "validé";
      updateData.date_validation_dd = new Date();
    }

    let query = supabase.from("dossier").update(updateData).eq("dossier_id", id);

    if (profil === "directeur_departemental") {
      query = query.eq("departement_id", departement_id);
    }

    const { data, error } = await query.select("*").single();
    if (error) return res.status(400).json({ message: error.message });

    res.json({ message: "Dossier mis à jour avec succès", dossier: data });
  } catch (err) {
    console.error("❌ Erreur serveur updateDossier:", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};
