// controllers/statistiquesController.js
import supabase from '../config/db.js'

export const getStatistiques = async (req, res) => {
  try {
    const profil = req.user.profil
    const userDept = req.user.departement_id

    // 🧠 Normalisation et Définition du filtre selon le rôle
    const normalizedProfil = profil.toLowerCase().replace(/\s+/g, '_'); 
    
    let deptFilter = {}
    let dossierFilter = {}

    // Les filtres s'appliquent sur les colonnes 'departement_id' et 'cree_par'
    
    // CAS 1 : Admin ou SD (Voient tout)
    if (normalizedProfil === 'admin' || normalizedProfil === 'sd') {
        deptFilter = {} // Filtre vide
    } 
    // CAS 2 : Directeur Départemental (Voit uniquement son département)
    else if (normalizedProfil === 'directeur_departemental') {
      // Le filtre s'applique sur les motos, propriétaires et dossiers
      deptFilter = { departement_id: userDept } 
      dossierFilter = { departement_id: userDept } // Peut être différent si la colonne du département est dans la table des dossiers
    } 
    // CAS 3 : Agent (Voit son département et ses propres saisies)
    else if (normalizedProfil === 'agent' || normalizedProfil === 'agent_saisie') {
      // Les agents sont généralement associés à la saisie de la moto/propriétaire
      deptFilter = { departement_id: userDept, cree_par: req.user.id }
      // Les dossiers sont validés par d'autres, le filtre ne doit porter que sur le département
      dossierFilter = { departement_id: userDept } 
    }
    
    // ======================
    // 🔹 Total motos (Utilisé pour total_enregistrements)
    // ======================
    const { count: totalMotos, error: errMotos } = await supabase
      .from('motos')
      .select('id', { count: 'exact', head: true })
      .match(deptFilter) // Utilisation du filtre basé sur le profil
    if (errMotos) throw errMotos

    // ======================
    // 🎯 NOUVEAU : Total Dossiers en attente de Validation DD
    // ======================
    // Utilisez le filtre des dossiers (dossierFilter)
    const filterAttente = { ...dossierFilter, statut: 'en_attente_validation_officielle' }
    const { count: enAttente, error: errAttente } = await supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .match(filterAttente)
    if (errAttente) throw errAttente

    // ======================
    // 🎯 NOUVEAU : Total Dossiers Validés (Certificats Officiels)
    // ======================
    const filterValides = { ...dossierFilter, statut: 'validé' }
    const { count: valides, error: errValides } = await supabase
        .from('dossiers')
        .select('id', { count: 'exact', head: true })
        .match(filterValides)
    if (errValides) throw errValides


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
    // ✅ Résultat final (CLÉS MISES À JOUR POUR LE FRONTEND)
    // ======================
    res.json({
      message: 'Statistiques chargées avec succès',
      profil_utilisateur: profil,
      departement_id: userDept || null,
      
      // 🎯 CLÉS ATTENDUES PAR LE FRONTEND :
      total_enregistrements: totalMotos,
      en_attente_validation_officielle: enAttente,
      validé: valides,
      
      // Autres statistiques:
      total_proprietaires: totalProprietaires,
      motos_par_marque: statsMarque,
      motos_par_structure: statsStructure,
      motos_ce_mois: motosCeMois.length
    })
  } catch (err) {
    // 🛑 Fournir le message d'erreur pour aider au débogage
    console.error("Erreur Statistiques:", err.message); 
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      erreur: err.message
    })
  }
}