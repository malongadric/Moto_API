// controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import supabase from '../config/db.js'
import { VALID_ROLES, getPermissions } from '../middlewares/role.js'
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
  email: user.email,
  profil: user.profil,
  departement_id: user.departement_id,
  permissions: getPermissions(user.profil)
})

// ----------------- REGISTER -----------------
export const register = async (req, res) => {
  try {
    const { nom, email, mot_de_passe, profil, departement_id } = req.body

    // Validation de base
    if (!nom || !email || !mot_de_passe) {
      return res.status(400).json({ message: 'Nom, email et mot de passe requis' })
    }
    if (!VALID_ROLES.includes(profil)) {
      return res.status(400).json({ message: 'Rôle invalide' })
    }

    // Vérifier si l'utilisateur existe
    const { data: existingUser, error: existErr } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('email', email)
      .single()
    
    if (existErr && existErr.code !== 'PGRST116') throw existErr
    if (existingUser) return res.status(400).json({ message: 'Email déjà utilisé' })

    // Hasher mot de passe
    const hashedPassword = await bcrypt.hash(mot_de_passe, 10)

    // Créer utilisateur
    const { data, error } = await supabase
      .from('utilisateurs')
      .insert([{
        nom,
        email,
        mot_de_passe: hashedPassword,
        profil,
        departement_id,
        actif: true,
        cree_le: new Date()
      }])
      .select()
    
    if (error) throw error
    const user = data[0]

    // Générer JWT
    const token = jwt.sign(
      { ...formatUser(user) },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )

    res.status(201).json({ message: 'Utilisateur créé avec succès', token, user: formatUser(user) })

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message })
  }
}

// ----------------- LOGIN -----------------
export const login = async (req, res) => {
  try {
    const { email, mot_de_passe } = req.body
    if (!email || !mot_de_passe) return res.status(400).json({ message: 'Email et mot de passe requis' })

    const { data: user, error } = await supabase
      .from('utilisateurs')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error || !user) return res.status(400).json({ message: 'Email ou mot de passe incorrect' })

    let validPassword = false

    // DD / SD / super_directeur utilisent mot de passe spécial
    if (['directeur departemental','SD','super_directeur'].includes(user.profil)) {
      const specialPassword = process.env.SPECIAL_PASSWORD_HASH
      validPassword = await bcrypt.compare(mot_de_passe, specialPassword)
    } else {
      validPassword = await bcrypt.compare(mot_de_passe, user.mot_de_passe)
    }

    if (!validPassword) return res.status(400).json({ message: 'Email ou mot de passe incorrect' })

    const token = jwt.sign(
      { ...formatUser(user) },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    )

    res.json({ message: 'Connexion réussie', user: formatUser(user), token })

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message })
  }
}

// ----------------- GET USERS / STATS -----------------
export const getUsers = async (req, res) => {
  try {
    const { profil, departement_id } = req.user
    const { filter, departement } = req.query

    // Accès limité à admin / DD / SD / super_directeur
    if (!['admin','directeur departemental','SD','super_directeur'].includes(profil)) {
      return res.status(403).json({ message: 'Accès refusé' })
    }

    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, email, profil, departement_id, actif')
    
    if (error) throw error

    let filteredData = data

    // Filtre par rôle si demandé
    if (filter) filteredData = filteredData.filter(u => u.profil === filter)

    // DD -> son département seulement
    if (profil === 'directeur departemental') filteredData = filteredData.filter(u => u.departement_id === departement_id)

    // SD / super_directeur -> accès national
    // admin -> accès complet

    const stats = filteredData.reduce((acc, u) => {
      acc[u.profil] = (acc[u.profil] || 0) + 1
      return acc
    }, {})

    res.json({ total: filteredData.length, stats, data: filteredData })

  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur', erreur: err.message })
  }
}
