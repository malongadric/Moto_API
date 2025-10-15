// middlewares/role.js

/**
 * Hiérarchie des rôles
 * Plus le chiffre est grand, plus le rôle a de privilèges
 */
export const ROLE_HIERARCHY = {
  super_directeur: 4,
  SD: 3,
  admin: 2,
  directeur_departemental: 2,
  agent: 1,
  agent_saisie: 1
}

/**
 * Liste des rôles valides pour l'inscription ou vérification
 */
export const VALID_ROLES = Object.keys(ROLE_HIERARCHY)

/**
 * Permissions associées à chaque rôle
 * Tu peux adapter selon les besoins de ton projet
 */
const PERMISSIONS = {
  super_directeur: ['read_all_stats', 'manage_users', 'manage_departments'],
  SD: ['read_all_stats', 'manage_users'],
  admin: ['read_stats', 'manage_users', 'assign_immatriculation'],
  directeur_departemental: ['read_stats_department', 'validate_carte_grise'],
  agent: ['create_dossier', 'view_own_dossiers'],
  agent_saisie: ['create_dossier']
}

/**
 * Renvoie les permissions pour un rôle donné
 * @param {string} role 
 * @returns {string[]}
 */
export const getPermissions = (role) => {
  return PERMISSIONS[role] || []
}

/**
 * Middleware pour vérifier si l'utilisateur connecté possède un rôle autorisé
 * @param {string[]} roles - Liste des rôles autorisés (ex: ['admin', 'agent'])
 */
export const checkRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' })
    }

    const userRoleLevel = ROLE_HIERARCHY[req.user.profil] || 0
    const allowedLevels = roles.map(r => ROLE_HIERARCHY[r] || 0)

    const hasAccess = allowedLevels.some(level => userRoleLevel >= level)

    if (!hasAccess) {
      console.warn(
        `Accès refusé pour ${req.user.email} (${req.user.profil}) sur la route ${req.originalUrl}`
      )
      return res.status(403).json({
        message: `Accès refusé : le profil "${req.user.profil}" n'est pas autorisé pour cette action`
      })
    }

    next()
  }
}
