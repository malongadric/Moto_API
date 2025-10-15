// controllers/dossiersController.js
import supabase from '../config/db.js';

/* ==========================================================
   🆕 AJOUTER UN DOSSIER
   ========================================================== */
export const addDossier = async (req, res) => {
  try {
    const {
      moto_id,
      proprietaire,
      mandataire,
      immatriculation_prov,
      immatriculation_def,
      agent_id
    } = req.body;

    if (!moto_id) return res.status(400).json({ message: "ID de la moto obligatoire" });

    let proprietaire_id = null;
    let mandataire_id = null;

    // --- Création du propriétaire si fourni ---
    if (proprietaire) {
      const { nom, prenom, telephone, cni } = proprietaire;
      if (!nom || !prenom || !telephone || !cni) {
        return res.status(400).json({ message: "Nom, prénom, téléphone et CNI du propriétaire sont obligatoires" });
      }

      const { data: propData, error: propError } = await supabase
        .from('proprietaires')
        .insert([proprietaire])
        .select('id')
        .single();

      if (propError) return res.status(400).json({ message: propError.message });
      proprietaire_id = propData.id;
    }

    // --- Création du mandataire si fourni ---
    if (mandataire) {
      const { nom, prenom, telephone, cni } = mandataire;
      if (!nom || !prenom || !telephone || !cni) {
        return res.status(400).json({ message: "Nom, prénom, téléphone et CNI du mandataire sont obligatoires" });
      }

      const { data: mandData, error: mandError } = await supabase
        .from('mandataires')
        .insert([mandataire])
        .select('id')
        .single();

      if (mandError) return res.status(400).json({ message: mandError.message });
      mandataire_id = mandData.id;
    }

    if (!proprietaire_id && !mandataire_id) {
      return res.status(400).json({ message: "Vous devez fournir au moins un propriétaire ou un mandataire" });
    }

    // --- Détermination de l'acteur principal ---
    const acteur_id = proprietaire_id || mandataire_id;
    const acteur_type = proprietaire_id ? 'proprietaire' : 'mandataire';

    // --- Création du dossier ---
    const { data: dossier, error: dossierError } = await supabase
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
        mandataire_id
      }])
      .select('*')
      .single();

    if (dossierError) return res.status(400).json({ message: dossierError.message });

    res.status(201).json({
      message: 'Dossier créé avec succès',
      dossier
    });

  } catch (err) {
    console.error(err);
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
    const { moto_marque, moto_modele, statut, acteur_nom } = req.query;

    let query = supabase.from('dossiers').select(`
      *,
      moto:moto_id(*),
      proprietaire:proprietaire_id(*),
      mandataire:mandataire_id(*)
    `);

    // --- Filtrage selon le rôle ---
    if (role === 'agent_saisie' || role === 'agent_total') query = query.eq('agent_id', userId);
    else if (role === 'admin') query = query.eq('statut', 'en_attente');
    else if (role === 'dd') query = query.eq('statut', 'provisoire');

    // --- Filtres dynamiques ---
    if (statut) query = query.eq('statut', statut);
    if (acteur_nom) query = query.or(
      `proprietaire.nom.ilike.%${acteur_nom}%,mandataire.nom.ilike.%${acteur_nom}%`
    );

    // ⚠️ Supabase ne supporte pas directement ilike sur jointures imbriquées, donc on filtre côté JS si nécessaire
    const { data, error } = await query;
    if (error) return res.status(400).json({ message: error.message });

    let filteredData = data;
    if (moto_marque) filteredData = filteredData.filter(d => d.moto?.marque?.toLowerCase().includes(moto_marque.toLowerCase()));
    if (moto_modele) filteredData = filteredData.filter(d => d.moto?.modele?.toLowerCase().includes(moto_modele.toLowerCase()));

    res.json({ dossiers: filteredData });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur", erreur: err.message });
  }
};

/* ==========================================================
   ✏️ METTRE À JOUR UN DOSSIER
   ========================================================== */
export const updateDossier = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // ⚠️ Ne jamais mettre à jour acteur_id ou acteur_type manuellement
    delete updateData.acteur_id;
    delete updateData.acteur_type;

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
