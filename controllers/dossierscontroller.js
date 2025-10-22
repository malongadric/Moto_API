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

    // 🔹 Requête avec jointures (inclut agent)
    let query = supabase
      .from("dossier")
      .select(`
        dossier_id,
        reference_dossier,
        date_soumission,
        statut,
        agent:utilisateurs(id, nom, prenom),
        moto:motos(id, numero_chassis, numero_immatriculation, marque, modele),
        proprietaire:proprietaires(nom, prenom),
        mandataire:mandataires(nom, prenom),
        departement:departements(nom)
      `)
      .range(from, to)
      .order(sortBy, { ascending: order === "asc" });

      // 🔹 Filtre par référence si fourni
if (req.query.reference_dossier) {
  query = query.eq("reference_dossier", req.query.reference_dossier);
}

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

  // Agent
  const agentObj = Array.isArray(d.agent) && d.agent.length ? d.agent[0] : d.agent || null;
  // Fallback: if agent row missing, show 'ID <n>' when d.agent_id is present
  const agentDisplay = agentObj ? ((agentObj.prenom || '') + ' ' + (agentObj.nom || '')).trim() : (d.agent_id ? `ID ${d.agent_id}` : '—');

  return {
        dossier_id: d.dossier_id,
        reference_dossier: d.reference_dossier,
        date_soumission: d.date_soumission,
        statut: d.statut,
        proprietaire_nom: proprietaireNom,
        proprietaire_prenom: proprietairePrenom,
        mandataire_nom: mandataireNom,
        mandataire_prenom: mandatairePrenom,
  agent_nom: agentDisplay,
  agent_prenom: agentObj ? agentObj.prenom || '' : '',
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

    // 🔒 Restriction pour certains profils
    if (profil === "agent" || profil === "agent_saisie") {
      return res.status(403).json({ message: "Accès refusé : vous ne pouvez pas consulter ce dossier" });
    }

    // 🔹 Requête avec jointures
    let query = supabase
      .from("dossier")
      .select(`
        dossier_id,
        reference_dossier,
        date_soumission,
        statut,
        attribue_par,
        agent_id,
        proprietaire:proprietaires!proprietaire_id(id, nom, prenom, cni, telephone, email),
        mandataire:proprietaires!mandataire_id(id, nom, prenom, cni, telephone, email),
        moto:motos(id, numero_chassis, numero_immatriculation, marque, modele, couleur, date_fabrication, usage)
      `)
      .eq("dossier_id", id);

    // 🔒 Filtre départemental pour directeur_departemental
    if (profil === "directeur_departemental") {
      query = query.eq("departement_id", departement_id);
    }

    const { data, error } = await query.single();
    if (error || !data) return res.status(404).json({ message: "Dossier introuvable" });

    // 🔹 Récupération des informations de l'agent si présentes
    let agent = null;
    if (data.agent_id) {
      const { data: agentData, error: agentError } = await supabase
        .from('utilisateurs')
        .select('id, nom, prenom, email, profil')
        .eq('id', data.agent_id)
        .maybeSingle();
      if (!agentError && agentData) agent = agentData;
      else agent = { id: data.agent_id, nom: `ID ${data.agent_id}`, prenom: '' };
    }

    // 🔹 Retour JSON complet
    res.json({
      message: "Dossier récupéré avec succès",
      dossier: {
        ...data,
        agent
      }
    });
  } catch (err) {
    console.error("❌ Erreur serveur getDossierById:", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};


export const getDossierByReference = async (req, res) => {
  try {
    const { reference_dossier } = req.query;
    if (!reference_dossier) {
      return res.status(400).json({ message: "Référence dossier manquante" });
    }

    // 🔹 Récupération du dossier principal
    const { data: dossier, error: dossierError } = await supabase
      .from("dossier")
      .select("*")
      .eq("reference_dossier", reference_dossier)
      .single();

    if (dossierError || !dossier) return res.status(404).json({ message: "Dossier introuvable" });

    // 🔹 Récupération des relations si elles existent
    let proprietaire = null;
    if (dossier.proprietaire_id) {
      const { data, error } = await supabase
        .from("proprietaires")
        .select("*")
        .eq("id", dossier.proprietaire_id)
        .single();
      if (!error) proprietaire = data;
    }

    let mandataire = null;
    if (dossier.mandataire_id) {
      const { data, error } = await supabase
        .from("mandataires")
        .select("*")
        .eq("id", dossier.mandataire_id)
        .single();
      if (!error) mandataire = data;
    }

    let moto = null;
    if (dossier.moto_id) {
      const { data, error } = await supabase
        .from("motos")
        .select("*")
        .eq("id", dossier.moto_id)
        .single();
      if (!error) moto = data;
    }

    // 🔹 Récupération des informations de l'agent si présentes
    let agent = null;
    if (dossier.agent_id) {
      const { data: agentData, error: agentError } = await supabase
        .from('utilisateurs')
        .select('id, nom, prenom, email, profil')
        .eq('id', dossier.agent_id)
        .maybeSingle();
      if (!agentError && agentData) agent = agentData;
      else agent = { id: dossier.agent_id, nom: `ID ${dossier.agent_id}`, prenom: '' };
    }

    // 🔹 Retour JSON complet
    res.json({
      message: "Dossier récupéré avec succès",
      dossier: {
        ...dossier,
                proprietaire,
                mandataire,
                moto,
                agent,
      }
    });

  } catch (err) {
    console.error("❌ Erreur serveur getDossierByReference:", err);
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
    const { profil, departement_id, id: userId } = req.user || {};

    // 🔒 Restriction pour les agents
    if (profil === "agent" || profil === "agent_saisie") {
      return res.status(403).json({ message: "Accès refusé : vous ne pouvez pas modifier ce dossier" });
    }

    // 🔹 Gestion automatique des statuts pour attribution d'immatriculation
    if ((profil === "admin" || profil === "directeur_departemental") && updateData.numero_immatriculation) {
      updateData.statut = "en_attente_officialisation"; // ou "validé" selon workflow
      updateData.date_attribution = new Date();
      updateData.attribue_par = userId;
    }

    // 🔹 Gestion validation DD
    if (profil === "directeur_departemental" && updateData.valide === true) {
      updateData.statut = "validé";
      updateData.date_validation_dd = new Date();
    }

    // 🔹 Construction de la requête
    let query = supabase.from("dossier").update(updateData).eq("dossier_id", id);

    // Filtrage par département pour DD
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
