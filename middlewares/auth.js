import jwt from 'jsonwebtoken'

const ROLE_HIERARCHY = {
  super_directeur: 4,
  SD: 3,
  admin: 2,
  directeur_departemental: 2,
  agent: 1,
  agent_saisie: 1
}

// Vérifier le token JWT
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' })

  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Token manquant' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    console.warn(`Token invalide pour ${req.ip}: ${err.message}`)
    return res.status(403).json({ message: 'Token invalide', erreur: err.message })
  }
}

// Vérifier le rôle
export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Utilisateur non authentifié' })

    const userRoleLevel = ROLE_HIERARCHY[req.user.profil] || 0
    const allowedLevels = allowedRoles.map(r => ROLE_HIERARCHY[r] || 0)

    const hasAccess = allowedLevels.some(level => userRoleLevel >= level)
    if (!hasAccess) {
      console.warn(`Accès refusé pour ${req.user.email} (${req.user.profil}) sur ${req.originalUrl}`)
      return res.status(403).json({
        message: `Accès refusé : le profil "${req.user.profil}" n'est pas autorisé pour cette route`
      })
    }

    next()
  }
}
