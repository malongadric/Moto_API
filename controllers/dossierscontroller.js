/// controllers/dossiersController.js
import supabase from '../config/db.js';

/* ==========================================================
   🆕 AJOUTER UN DOSSIER
   ========================================================== */
export const addDossier = async (req, res) => {
  try {
    const { moto_id, proprietaire_id, mandataire_id, immatriculation_prov, immatriculation_def, agent_id } = req.body;

    if (!moto_id) return res.status(400).json({ message: "ID de la moto obligatoire" });
    if (!proprietaire_id && !mandataire_id) return res.status(400).json({ message: "Vous devez fournir au moins un propriétaire ou un mandataire" });

    const acteur_id = proprietaire_id || mandataire_id;
    const acteur_type = proprietaire_id ? 'proprietaire' : 'mandataire';

    // 🔹 Génération automatique de la référence
    // Format : REF-année-département-motoID
    const currentYear = new Date().getFullYear();
    const departementId = req.user?.departement_id || 'XX'; 
    const reference_dossier = `REF-${currentYear}-PN-${moto_id}`;

    console.log("🔹 Référence générée :", reference_dossier);

    // 🔹 Insertion dans la table
    const { data: dossier, error } = await supabase
      .from('dossiers')
      .insert([{
        moto_id,
        acteur_id,
        acteur_type,
        immatriculation_prov: immatriculation_prov || null,
        immatriculation_def: immatriculation_def || null,
        statut: 'en_attente',
        date_soumission: new Date(),
        agent_id,
        proprietaire_id,
        mandataire_id,
        reference_dossier
      }])
      .select('*')
      .single();

    if (error) {
      console.error("❌ Erreur Supabase :", error);
      return res.status(400).json({ message: error.message });
    }

    console.log("🔹 Dossier inséré :", dossier);

    // 🔹 Retour du dossier avec référence garantie
    res.status(201).json({ 
      message: 'Dossier créé avec succès', 
      dossier: {
        ...dossier,
        reference_dossier // assure que la référence est renvoyée
      }
    });

  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

/* ==========================================================
   📋 LISTER TOUS LES DOSSIERS
   ========================================================== */
export const getDossiers = async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const userDepartement = req.user.departement_id;
    const { moto_marque, moto_modele, statut, acteur_nom } = req.query;

    let query = supabase.from('dossiers').select(`
      *,
      moto:moto_id(*),
      proprietaire:proprietaire_id(*),
      mandataire:mandataire_id(*)
    `);

    // --- Filtrage selon le rôle ---
    if (role === 'agent_saisie' || role === 'agent_total') query = query.eq('agent_id', userId);
    else if (role === 'admin') query = query.in('statut', ['en_attente', 'en_attente_officialisation']);
    else if (role === 'dd') query = query.eq('statut', 'en_attente_officialisation');

    // --- Filtrage selon le département de l’utilisateur ---
    if (userDepartement) query = query.eq('departement_id', userDepartement);

    const { data, error } = await query;
    if (error) return res.status(400).json({ message: error.message });

    let filteredData = data;

    // --- Filtrage côté front selon query params ---
    if (moto_marque)
      filteredData = filteredData.filter(d => d.moto?.marque?.toLowerCase().includes(moto_marque.toLowerCase()));
    if (moto_modele)
      filteredData = filteredData.filter(d => d.moto?.modele?.toLowerCase().includes(moto_modele.toLowerCase()));
    if (acteur_nom) {
      filteredData = filteredData.filter(d =>
        d.proprietaire?.nom?.toLowerCase().includes(acteur_nom.toLowerCase()) ||
        d.mandataire?.nom?.toLowerCase().includes(acteur_nom.toLowerCase())
      );
    }

    res.json({ dossiers: filteredData });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

/* ==========================================================
   ✏️ METTRE À JOUR UN DOSSIER AVEC STATUT AUTOMATIQUE
   ========================================================== */
export const updateDossier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    delete updateData.acteur_id;
    delete updateData.acteur_type;

    const role = req.user.role;

    // ✅ Vérification des IDs
    if (updateData.proprietaire_id) {
      const { data: prop, error: propErr } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('id', updateData.proprietaire_id)
        .single();
      if (propErr || !prop) return res.status(400).json({ message: "Propriétaire introuvable" });
    }

    if (updateData.mandataire_id) {
      const { data: mand, error: mandErr } = await supabase
        .from('mandataires')
        .select('id')
        .eq('id', updateData.mandataire_id)
        .single();
      if (mandErr || !mand) return res.status(400).json({ message: "Mandataire introuvable" });
    }

    // --- Mise à jour automatique de l'acteur principal ---
    if (updateData.proprietaire_id || updateData.mandataire_id) {
      updateData.acteur_id = updateData.proprietaire_id || updateData.mandataire_id;
      updateData.acteur_type = updateData.proprietaire_id ? 'proprietaire' : 'mandataire';
    }

    // --- GESTION AUTOMATIQUE DES STATUTS ---
    if (role === 'admin' && updateData.numero_immatriculation) {
      updateData.statut = 'en_attente_officialisation';
    }

    if (role === 'dd' && updateData.valide === true) {
      updateData.statut = 'validé';
      updateData.date_validation_dd = new Date();
    }

    const { data, error } = await supabase
      .from('dossiers')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) return res.status(400).json({ message: error.message });

    res.json({
      message: 'Dossier mis à jour avec succès',
      dossier: data
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};
