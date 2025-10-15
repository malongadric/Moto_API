// controllers/authController.js
import jwt from 'jsonwebtoken'
import supabase from '../config/db.js'
import { getPermissions } from '../middlewares/role.js'
import rateLimit from 'express-rate-limit'

// ----------------- Rate limiter pour login -----------------
export const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: "Trop de tentatives de connexion. Réessayez dans 5 minutes."
})

// ----------------- Utilitaire format user -----------------
const formatUser = (user) => ({
  id: user.id,
  nom: user.nom,
  profil: user.profil,
  departement_id: user.departement_id,
  permissions: getPermissions(user.profil)
})

// ----------------- Fonction pour générer le code attendu -----------------
const getCode = (profil, departement_id) => {
  const departementPart = `A${departement_id}2025`
  switch(profil){
    case 'agent': return `${departementPart}B`
    case 'admin': return `${departementPart}D`
    case 'directeur departemental': return `${departementPart}DD`
    case 'SD': return `${departementPart}S`
    case 'super_directeur': return `${departementPart}SD`
    default: return ''
  }
}

// ----------------- LOGIN -----------------
export const login = async (req, res) => {
  try {
    const { nom, departement_id, profil, code } = req.body

    if (!nom || !departement_id || !profil || !code) {
      return res.status(400).json({ message: 'Nom, département, profil et code requis' })
    }

    // Chercher l'utilisateur
    let { data: user, error } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('nom', nom)
      .eq('departement_id', departement_id)
      .eq('profil', profil)
      .single()

    // Si pas trouvé -> créer automatiquement
    if (error && error.code === 'PGRST116') {
      const { data: newUser, error: insertErr } = await supabase
        .from('utilisateurs')
        .insert([{ nom, profil, departement_id, actif: true, cree_le: new Date() }])
        .select()
      if (insertErr) return res.status(500).json({ message: 'Erreur création utilisateur', erreur: insertErr.message })
      user = newUser[0]
    } else if (error) {
      return res.status(500).json({ message: 'Erreur serveur', erreur: error.message })
    }

    // Vérifier le code
    const expectedCode = getCode(profil, departement_id)
    if (code !== expectedCode) {
      return res.status(400).json({ message: 'Code incorrect' })
    }

    // Générer JWT
    const token = jwt.sign({ ...formatUser(user) }, process.env.JWT_SECRET, { expiresIn: '12h' })

    res.json({ message: 'Connexion réussie', user: formatUser(user), token })

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message })
  }
}

// ----------------- GET USERS / STATS -----------------
export const getUsers = async (req, res) => {
  try {
    const { profil, departement_id } = req.user
    const { filter } = req.query

    // Accès limité à admin / DD / SD / super_directeur
    if (!['admin','directeur departemental','SD','super_directeur'].includes(profil)) {
      return res.status(403).json({ message: 'Accès refusé' })
    }

    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, profil, departement_id, actif')

    if (error) throw error

    let filteredData = data

    // Filtre par rôle si demandé
    if (filter) filteredData = filteredData.filter(u => u.profil === filter)

    // DD -> son département seulement
    if (profil === 'directeur departemental') filteredData = filteredData.filter(u => u.departement_id === departement_id)

    // Stats par profil
    const stats = filteredData.reduce((acc, u) => {
      acc[u.profil] = (acc[u.profil] || 0) + 1
      return acc
    }, {})

    res.json({ total: filteredData.length, stats, data: filteredData })

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message })
  }
}
