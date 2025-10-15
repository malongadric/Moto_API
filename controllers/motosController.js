// controllers/motosController.js
import supabase from '../config/db.js'

/* ============================
   Helper : Vérifie existence d'un enregistrement
============================ */
const checkExist = async (table, id) => {
  if (!id) return null
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`Erreur Supabase (${table}): ${error.message}`)
  if (data === null) throw new Error(`${table.slice(0,-1)} introuvable.`)
  return data.id
}

/* ==========================================================
   📋 LISTER LES MOTOS (avec pagination + filtre département)
========================================================== */
export const getMotos = async (req, res) => {
  try {
    const { departement_id: userDept, role: userRole } = req.user

    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const start = (page - 1) * limit
    const end = start + limit - 1

    let query = supabase
      .from('motos')
      .select(`
        id,
        numero_chassis,
        numero_immatriculation,
        marque,
        modele,
        type,
        couleur,
        poids_vide,
        puissance_moteur,
        energie,
        date_fabrication,
        usage,
        proprietaire:proprietaires (nom, prenom),
        departement:departements (nom),
        structure:structures (nom),
        cree_par,
        date_saisie
      `, { count: 'exact' })
      .range(start, end)

    // 🔒 Filtrer par département si pas admin ou super_directeur
    if (!['admin','super_directeur'].includes(userRole)) {
      query = query.eq('departement_id', userDept)
    }

    const { data, count, error } = await query
    if (error) throw error

    res.json({
      message: 'Liste des motos récupérée avec succès',
      total: count,
      page,
      limit,
      motos: data
    })

  } catch (err) {
    console.error('Erreur getMotos:', err)
    res.status(500).json({ message: 'Erreur lors de la récupération des motos', erreur: err.message })
  }
}

/* ==========================================================
   🆕 AJOUTER UNE MOTO
========================================================== */
export const addMoto = async (req, res) => {
  try {
    const body = req.body
    const { id: userId, departement_id: userDept, role: userRole } = req.user

    // Statut automatique selon rôle
    const statut = ['agent_saisie', 'agent_total'].includes(userRole) ? 'en_attente_admin' : 'en_attente_dd'
    const finalDeptId = body.departement_id || userDept

    // ✅ Vérification numéro de châssis unique
    const { data: existing } = await supabase
      .from('motos')
      .select('id')
      .eq('numero_chassis', body.numero_chassis)
      .maybeSingle()
    if (existing !== null) return res.status(400).json({ message: 'Cette moto est déjà enregistrée.' })

    // ✅ Vérification propriétaire/mandataire
    try {
      if (body.proprietaire_id) await checkExist('proprietaires', body.proprietaire_id)
      if (body.mandataire_id) await checkExist('proprietaires', body.mandataire_id)
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }

    // ✅ Conversion sécurisée des types
    const parseNumber = (val, name) => {
      if (!val) return null
      const num = parseFloat(val)
      if (isNaN(num)) throw new Error(`${name} invalide`)
      return num
    }

    const poidsVideNum = parseNumber(body.poids_vide, 'Poids vide')
    const nombrePlacesNum = parseNumber(body.nombre_places, 'Nombre de places')
    const cylindreeNum = parseNumber(body.cylindree, 'Cylindrée')
    const puissanceMoteurNum = parseNumber(body.puissance_moteur, 'Puissance moteur')
    const chargeUtileNum = parseNumber(body.charge_utile, 'Charge utile')
    const puissanceAdminNum = parseNumber(body.puissance_admin, 'Puissance admin')
    const poidsChargeAutoriseeNum = parseNumber(body.poids_charge_autorisee, 'Poids charge autorisée')
    const dateFabricationObj = body.date_fabrication ? new Date(body.date_fabrication) : null
    const premiereMCObj = body.premiere_mise_circulation ? new Date(body.premiere_mise_circulation) : null

    // ✅ Insertion
    const { data, error } = await supabase
      .from('motos')
      .insert([{
        numero_chassis: body.numero_chassis,
        marque: body.marque,
        modele: body.modele,
        type: body.type,
        reference_moteur: body.reference_moteur,
        etat: body.etat,
        poids_vide: poidsVideNum,
        couleur: body.couleur,
        nombre_places: nombrePlacesNum,
        cylindree: cylindreeNum,
        puissance_moteur: puissanceMoteurNum,
        charge_utile: chargeUtileNum,
        date_fabrication: dateFabricationObj,
        premiere_mise_circulation: premiereMCObj,
        usage: body.usage,
        carrosserie: body.carrosserie,
        type_moteur: body.type_moteur,
        puissance_admin: puissanceAdminNum,
        poids_charge_autorisee: poidsChargeAutoriseeNum,
        energie: body.energie,
        boite_vitesse: body.boite_vitesse,
        serie_immatriculation: body.serie_immatriculation,
        proprietaire_id: body.proprietaire_id || null,
        mandataire_id: body.mandataire_id || null,
        structure_id: body.structure_id || null,
        departement_id: finalDeptId,
        cree_par: userId,
        statut,
        date_saisie: new Date()
      }])
      .select()

    if (error) throw error

    res.status(201).json({ message: 'Moto enregistrée avec succès', moto_id: data[0].id, moto: data[0] })

  } catch (err) {
    console.error('Erreur complète addMoto:', err)
    res.status(500).json({ message: 'Erreur lors de l’ajout de la moto', erreur: err.message })
  }
}

/* ==========================================================
   🛠️ ATTRIBUTION IMMATRICULATION PAR L'ADMIN
========================================================== */
export const assignImmatriculation = async (req, res) => {
  try {
    const { id } = req.params
    const { serie_immatriculation, carte_grise_provisoire } = req.body
    if (!serie_immatriculation) return res.status(400).json({ message: "La série d'immatriculation est obligatoire." })

    const { data: moto, error: motoErr } = await supabase.from('motos').select('*').eq('id', id).single()
    if (motoErr || !moto) return res.status(404).json({ message: "Moto introuvable." })

    const { data, error } = await supabase
      .from('motos')
      .update({
        serie_immatriculation,
        carte_grise_provisoire,
        statut: 'en_attente_dd',
        date_maj: new Date()
      })
      .eq('id', id)
      .select()

    if (error) throw error
    res.status(200).json({ message: "Série d'immatriculation attribuée avec succès.", moto: data[0] })

  } catch (err) {
    console.error('Erreur assignImmatriculation:', err)
    res.status(500).json({ message: "Erreur lors de l'attribution de l'immatriculation", erreur: err.message })
  }
}

/* ==========================================================
   ✅ VALIDATION CARTE GRISE PAR LE DD
========================================================== */
export const validateCarteGrise = async (req, res) => {
  try {
    const { id } = req.params
    const { carte_grise_officielle } = req.body
    if (!carte_grise_officielle) return res.status(400).json({ message: "La carte grise officielle est obligatoire." })

    const { data: moto, error: motoErr } = await supabase.from('motos').select('*').eq('id', id).single()
    if (motoErr || !moto) return res.status(404).json({ message: "Moto introuvable." })

    const { data, error } = await supabase
      .from('motos')
      .update({ carte_grise_officielle, statut: 'validé', date_maj: new Date() })
      .eq('id', id)
      .select()

    if (error) throw error
    res.status(200).json({ message: "Carte grise validée avec succès.", moto: data[0] })

  } catch (err) {
    console.error('Erreur validateCarteGrise:', err)
    res.status(500).json({ message: "Erreur lors de la validation de la carte grise", erreur: err.message })
  }
}

/* ==========================================================
   ✅ LIAISON PROPRIETAIRE / MANDATAIRE
========================================================== */
export const linkDeclarant = async (req, res) => {
  try {
    const { id } = req.params
    const { proprietaire_id, mandataire_id } = req.body
    if (!proprietaire_id && !mandataire_id) return res.status(400).json({ message: 'Vous devez spécifier soit un propriétaire, soit un mandataire.' })

    const { data: moto, error: motoErr } = await supabase.from('motos').select('*').eq('id', id).single()
    if (motoErr || !moto) return res.status(404).json({ message: 'Moto introuvable.' })

    try {
      if (proprietaire_id) await checkExist('proprietaires', proprietaire_id)
      if (mandataire_id) await checkExist('proprietaires', mandataire_id)
    } catch (err) {
      return res.status(400).json({ message: err.message })
    }

    const { data: updatedMoto, error: updateErr } = await supabase
      .from('motos')
      .update({ proprietaire_id: proprietaire_id || null, mandataire_id: mandataire_id || null })
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr
    res.status(200).json({ message: 'Liaison effectuée avec succès', moto: updatedMoto })

  } catch (error) {
    console.error('Erreur liaison moto-déclarant:', error)
    res.status(500).json({ message: 'Erreur serveur lors de la liaison moto-déclarant', erreur: error.message })
  }
}
