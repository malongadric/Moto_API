// controllers/mandatairesController.js
import supabase from '../config/db.js'

/* ==========================================================
   📋 LISTER TOUS LES MANDATAIRES
   ========================================================== */
export const getMandataires = async (req, res) => {
  try {
    const userDept = req.user.departement_id;
    const userRole = req.user.role;
    const { search } = req.query;

    let query = supabase.from('mandataires').select(`
      id,
      nom,
      prenom,
      telephone,
      email,
      profession,
      nationalite,
      ville,
      adresse,
      cni,
      date_naissance,
      lien_proprietaire,
      moto_id,
      date_enregistrement,
      motos (numero_chassis, marque, modele)
    `);

    // 🔍 Filtre de recherche
    if (search && search.trim() !== '') {
      query = query.or(
        `nom.ilike.%${search}%,prenom.ilike.%${search}%,telephone.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    // 🔒 Filtre par département si pas admin
    if (userRole !== 'admin') {
      query = query.eq('departement_id', userDept);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ message: search ? 'Aucun mandataire trouvé.' : 'Aucun mandataire.' });
    }

    res.status(200).json(data);

  } catch (err) {
    console.error('Erreur getMandataires:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération des mandataires',
      erreur: err.message
    });
  }
};

/* ==========================================================
   🆕 AJOUTER UN MANDATAIRE
   ========================================================== */
export const addMandataire = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      telephone,
      email,
      profession,
      nationalite,
      ville,
      adresse,
      cni,
      date_naissance,
      lien_proprietaire,
      moto_id,
      proprietaire_id
    } = req.body;

    // --- Récupération de l'utilisateur connecté ---
    const userDept = req.user?.departement_id || null;
    const userId = req.user?.id || null;

    // --- Validation des champs obligatoires ---
    if (!nom || !prenom || !telephone || !cni || !moto_id) {
      return res.status(400).json({
        message: "Nom, prénom, téléphone, CNI et moto_id sont obligatoires."
      });
    }

    // --- Normalisation ---
    const normalizedTel = telephone.replace(/\s+/g, '');
    const normalizedCni = cni.toUpperCase();

    // --- Vérification doublons téléphone / CNI ---
    const { data: existingMandataire } = await supabase
      .from('mandataires')
      .select('id')
      .or(`telephone.eq.${normalizedTel},cni.eq.${normalizedCni}`)
      .maybeSingle();

    if (existingMandataire) {
      return res.status(400).json({ message: 'Un mandataire avec ce téléphone ou cette CNI existe déjà.' });
    }

    // --- Vérification si la moto est déjà attribuée ---
    const { data: existingMoto } = await supabase
      .from('mandataires')
      .select('id')
      .eq('moto_id', moto_id)
      .maybeSingle();

    if (existingMoto) {
      return res.status(400).json({ message: 'Cette moto est déjà attribuée à un mandataire.' });
    }

    // --- Vérification que la moto existe ---
    const { data: moto, error: motoErr } = await supabase
      .from('motos')
      .select('id')
      .eq('id', moto_id)
      .single();

    if (motoErr || !moto) {
      return res.status(400).json({ message: 'La moto associée au mandataire est introuvable.' });
    }

    // --- Insertion ---
    const { data, error: insertError } = await supabase
      .from('mandataires')
      .insert([{
        acteur_type: 'mandataire',
        nom,
        prenom,
        telephone: normalizedTel,
        email: email || null,
        profession: profession || null,
        nationalite: nationalite || null,
        ville: ville || null,
        adresse: adresse || null,
        cni: normalizedCni,
        date_naissance: date_naissance || null,
        lien_proprietaire: lien_proprietaire || null,
        moto_id,
        proprietaire_id: proprietaire_id || null, // Lien vers le propriétaire
        departement_id: userDept,
        cree_par: userId,
        date_enregistrement: new Date()
      }])
      .select();

    if (insertError) throw insertError;

    res.status(201).json({
      message: 'Mandataire ajouté avec succès',
      mandataire: data[0]
    });

  } catch (err) {
    console.error('Erreur addMandataire:', err);
    res.status(500).json({
      message: 'Erreur lors de l’ajout du mandataire',
      erreur: err.message
    });
  }
};

/* ==========================================================
   📄 OBTENIR UN MANDATAIRE PAR ID
   ========================================================== */
export const getMandataireById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('mandataires')
      .select(`
        *,
        motos (numero_chassis, marque, modele)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Mandataire introuvable.' });
    }

    res.json(data);

  } catch (err) {
    console.error('Erreur getMandataireById:', err);
    res.status(500).json({
      message: 'Erreur lors de la récupération du mandataire',
      erreur: err.message
    });
  }
};

/* ==========================================================
   ✏️ MODIFIER UN MANDATAIRE
   ========================================================== */
export const updateMandataire = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['nom','prenom','telephone','email','profession','nationalite','ville','adresse','cni','date_naissance','lien_proprietaire'];
    
    // Filtrer les champs autorisés
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Aucune donnée valide à mettre à jour.' });
    }

    const { data, error } = await supabase
      .from('mandataires')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw error;

    res.json({
      message: 'Mandataire mis à jour avec succès',
      mandataire: data
    });

  } catch (err) {
    console.error('Erreur updateMandataire:', err);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour du mandataire',
      erreur: err.message
    });
  }
};

/* ==========================================================
   ❌ SUPPRIMER UN MANDATAIRE
   ========================================================== */
export const deleteMandataire = async (req, res) => {
  try {
    const { id } = req.params;

    // Optionnel : vérifier que la moto associée n’est pas déjà liée à autre chose

    const { error } = await supabase
      .from('mandataires')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Mandataire supprimé avec succès' });

  } catch (err) {
    console.error('Erreur deleteMandataire:', err);
    res.status(500).json({
      message: 'Erreur lors de la suppression du mandataire',
      erreur: err.message
    });
  }
};
