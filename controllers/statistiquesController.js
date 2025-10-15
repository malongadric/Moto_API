// controllers/statistiquesController.js
import supabase from '../config/db.js'

export const getStatistiques = async (req, res) => {
  try {
    const profil = req.user.profil
    const userDept = req.user.departement_id

    // 🧠 Définir le filtre selon le rôle
    let deptFilter = {}
    if (profil === 'directeur departemental') {
      deptFilter = { departement_id: userDept }
    } else if (profil === 'agent' || profil === 'agent_saisie') {
      // Un agent ne voit que ce qu’il a saisi
      deptFilter = { departement_id: userDept, cree_par: req.user.id }
    }
    // admin et SD voient tout (pas de filtre)

    // ======================
    // 🔹 Total motos
    // ======================
    const { count: totalMotos, error: errMotos } = await supabase
      .from('motos')
      .select('id', { count: 'exact', head: true })
      .match(deptFilter)
    if (errMotos) throw errMotos

    // ======================
    // 🔹 Total propriétaires
    // ======================
    const { count: totalProprietaires, error: errProp } = await supabase
      .from('proprietaires')
      .select('id', { count: 'exact', head: true })
      .match(deptFilter)
    if (errProp) throw errProp

    // ======================
    // 🔹 Motos par marque
    // ======================
    const { data: motosParMarque, error: errMarque } = await supabase
      .from('motos')
      .select('marque')
      .match(deptFilter)
    if (errMarque) throw errMarque

    const statsMarque = motosParMarque.reduce((acc, moto) => {
      acc[moto.marque] = (acc[moto.marque] || 0) + 1
      return acc
    }, {})

    // ======================
    // 🔹 Motos par structure
    // ======================
    const { data: motosParStructure, error: errStructure } = await supabase
      .from('motos')
      .select('structure_id')
      .match(deptFilter)
    if (errStructure) throw errStructure

    const statsStructure = motosParStructure.reduce((acc, moto) => {
      acc[moto.structure_id] = (acc[moto.structure_id] || 0) + 1
      return acc
    }, {})

    // ======================
    // 🔹 Motos enregistrées ce mois
    // ======================
    const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { data: motosCeMois, error: errMois } = await supabase
      .from('motos')
      .select('id')
      .match(deptFilter)
      .gte('date_saisie', debutMois)
    if (errMois) throw errMois

    // ======================
    // ✅ Résultat final
    // ======================
    res.json({
      message: 'Statistiques chargées avec succès',
      profil_utilisateur: profil,
      departement_id: userDept || null,
      total_motos: totalMotos,
      total_proprietaires: totalProprietaires,
      motos_par_marque: statsMarque,
      motos_par_structure: statsStructure,
      motos_ce_mois: motosCeMois.length
    })
  } catch (err) {
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      erreur: err.message
    })
  }
}
