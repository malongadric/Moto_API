// controllers/structureController.js
import supabase from '../config/db.js'

// Lister toutes les structures
export const getStructures = async (req, res) => {
  try {
    const userDept = req.user.departement_id
    const userRole = req.user.role

    let query = supabase.from('structures').select('*')

    // Si l'utilisateur n'est pas admin, filtrer par département
    if (userRole !== 'admin') {
      query = query.eq('departement_id', userDept)
    }

    const { data, error } = await query
    if (error) throw error

    res.json(data)
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des structures', erreur: err.message })
  }
}

// Ajouter une structure
export const addStructure = async (req, res) => {
  try {
    const { nom, adresse, telephone, departement_id } = req.body
    const userDept = req.user.departement_id
    const userRole = req.user.role

    // Vérifier que l'agent ne crée que dans son département
    if (userRole !== 'admin' && departement_id && departement_id !== userDept) {
      return res.status(403).json({ message: 'Vous ne pouvez pas ajouter de structure dans un autre département.' })
    }

    const finalDepartementId = departement_id || userDept

    const { data, error } = await supabase
      .from('structures')
      .insert([{ nom, adresse, telephone, departement_id: finalDepartementId }])
      .select()

    if (error) throw error
    res.status(201).json({ message: 'Structure ajoutée avec succès', structure: data[0] })
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de l’ajout de la structure', erreur: err.message })
  }
}
