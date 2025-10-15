import supabase from '../config/db.js';

// 🔹 Récupérer tous les départements
export const getDepartements = async (req, res) => {
  try {
    const { data, error } = await supabase.from('departements').select('*');
    if (error) throw error;

    res.status(200).json({
      message: 'Liste des départements récupérée avec succès',
      departements: data
    });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des départements', erreur: err.message });
  }
};
