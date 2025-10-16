import supabase from '../config/db.js'

// 🔹 LISTER LES PROPRIÉTAIRES (avec recherche et pagination)
export const getProprietaires = async (req, res) => {
  try {
    const userDept = req.user.departement_id
    const userRole = req.user.role
    const { search, page = 1, limit = 10 } = req.query

    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase.from('proprietaires').select('*', { count: 'exact' }).range(start, end)

    // 🔍 Recherche (normalisation)
    if (search && search.trim() !== '') {
      const term = search.trim().toLowerCase()
      query = query.or(
        `nom.ilike.%${term}%,prenom.ilike.%${term}%,telephone.ilike.%${term}%,email.ilike.%${term}%`
      )
    }

    // 🔒 Filtre par département si pas admin
    if (userRole !== 'admin') {
      query = query.eq('departement_id', userDept)
    }

    const { data, count, error } = await query
    if (error) throw error

    if (!data || data.length === 0) {
      return res.status(404).json({ message: search ? 'Aucun propriétaire trouvé.' : 'Aucun propriétaire.' })
    }

    res.status(200).json({ total: count, page: parseInt(page), limit: parseInt(limit), proprietaires: data })
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des propriétaires',
      erreur: err.message
    })
  }
}

// 🔹 AJOUTER UN PROPRIÉTAIRE (moto_id optionnel)
export const addProprietaire = async (req, res) => {
  try {
    const {
      type,
      nom,
      prenom,
      telephone,
      profession,
      email,
      nationalite,
      ville,
      adresse,
      cni,
      date_naissance,
      moto_id // optionnel
    } = req.body;

    const userDept = req.user.departement_id;
    const userId = req.user.id;

    // Validation
    if (!nom || !prenom || !telephone || !cni) {
      return res.status(400).json({
        message: "Nom, prénom, téléphone et CNI sont obligatoires."
      });
    }

    const normalizedTel = telephone.replace(/\s+/g, '');
    const normalizedCni = cni.toUpperCase();

    // Vérification doublons
    const { data: existing, error: checkError } = await supabase
      .from('proprietaires')
      .select('id')
      .or(`telephone.eq.${normalizedTel},cni.eq.${normalizedCni}`)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return res.status(400).json({ message: 'Ce propriétaire existe déjà.' });
    }

    // Conversion date_naissance
    const dateNaissanceObj = date_naissance ? new Date(date_naissance) : null;

    const { data, error: insertError } = await supabase
      .from('proprietaires')
      .insert([{
        type,
        nom,
        prenom,
        telephone: normalizedTel,
        profession,
        email: email || null,
        nationalite,
        ville,
        adresse,
        cni: normalizedCni,
        date_naissance: dateNaissanceObj,
        moto_id: moto_id || null,
        departement_id: userDept || null,
        cree_par: userId || null,
        date_saisie: new Date()
      }])
      .select();

    if (insertError) throw insertError;

    res.status(201).json({
  message: 'Propriétaire ajouté avec succès',
  id: data[0].id,        // <- l'ID directement
  proprietaire: data[0]  // <- si tu veux garder toutes les infos
});


  } catch (err) {
    console.error('Erreur addProprietaire:', err);
    res.status(500).json({
      message: 'Erreur lors de l’ajout du propriétaire',
      erreur: err.message
    });
  }
};

// 🔹 Récupérer un propriétaire par ID
export const getProprietaireById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide' })

    const { data, error } = await supabase
      .from('proprietaires')
      .select(`
        id,
        type,
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
        cree_par,
        date_saisie,
        motos (
          id,
          numero_chassis,
          marque,
          modele,
          couleur,
          numero_immatriculation
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    if (!data) return res.status(404).json({ message: 'Propriétaire introuvable.' })

    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération du propriétaire', erreur: err.message })
  }
};

// 🔹 Mettre à jour un propriétaire
export const updateProprietaire = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide' })

    const { nom, prenom, telephone, profession, email, adresse, ville, nationalite, date_naissance } = req.body

    const { data: existing, error: getErr } = await supabase
      .from('proprietaires')
      .select('*')
      .eq('id', id)
      .single()

    if (getErr || !existing) return res.status(404).json({ message: 'Propriétaire introuvable.' })

    const { data, error: updateErr } = await supabase
      .from('proprietaires')
      .update({
        nom: nom || existing.nom,
        prenom: prenom || existing.prenom,
        telephone: telephone || existing.telephone,
        profession: profession || existing.profession,
        email: email || existing.email,
        adresse: adresse || existing.adresse,
        ville: ville || existing.ville,
        nationalite: nationalite || existing.nationalite,
        date_naissance: date_naissance ? new Date(date_naissance) : existing.date_naissance,
        date_maj: new Date()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    res.status(200).json({ message: 'Propriétaire mis à jour avec succès', proprietaire: data })

  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du propriétaire', erreur: err.message })
  }
};

// 🔹 Supprimer un propriétaire
export const deleteProprietaire = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) return res.status(400).json({ message: 'ID invalide' })

    const { data: existing, error: getErr } = await supabase
      .from('proprietaires')
      .select('id')
      .eq('id', id)
      .single()

    if (getErr || !existing) return res.status(404).json({ message: 'Propriétaire introuvable.' })

    const { error: delErr } = await supabase
      .from('proprietaires')
      .delete()
      .eq('id', id)

    if (delErr) throw delErr

    res.status(200).json({ message: 'Propriétaire supprimé avec succès' })
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du propriétaire', erreur: err.message })
  }
};
