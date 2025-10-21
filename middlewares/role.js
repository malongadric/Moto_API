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
};

/**
 * Liste des rôles valides
 */
export const VALID_ROLES = Object.keys(ROLE_HIERARCHY);

/**
 * Permissions associées à chaque rôle
 */
const PERMISSIONS = {
  super_directeur: ['read_all_stats', 'manage_users', 'manage_departments'],
  SD: ['read_all_stats', 'manage_users'],
  admin: ['read_stats', 'manage_users', 'assign_immatriculation'],
  directeur_departemental: ['read_stats_department', 'validate_carte_grise'],
  agent: ['create_dossier', 'view_own_dossiers'],
  agent_saisie: ['create_dossier']
};

/**
 * Renvoie les permissions pour un rôle donné
 * @param {string} role 
 * @returns {string[]}
 */
export const getPermissions = (role) => {
  return PERMISSIONS[role] || [];
};

/**
 * Middleware pour vérifier si l'utilisateur connecté possède un rôle autorisé
 * @param {string|string[]} roles - Rôle(s) autorisé(s)
 */
export const checkRole = (roles = []) => {
  return (req, res, next) => {
    // --- S'assurer que roles est un tableau ---
    if (!Array.isArray(roles)) roles = [roles];

    // --- Vérification que l'utilisateur est connecté ---
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // --- Récupération du niveau du rôle de l'utilisateur ---
    const userRoleLevel = ROLE_HIERARCHY[req.user.profil] || 0;

    // --- Récupération des niveaux des rôles autorisés ---
    const allowedLevels = roles.map(r => ROLE_HIERARCHY[r] || 0);

    // --- Vérification des droits ---
    const hasAccess = allowedLevels.some(level => userRoleLevel >= level);

    if (!hasAccess) {
      console.warn(
        `Accès refusé pour ${req.user.email || 'inconnu'} (${req.user.profil || 'profil inconnu'}) sur la route ${req.originalUrl}`
      );
      return res.status(403).json({
        message: `Accès refusé : le profil "${req.user.profil}" n'est pas autorisé pour cette action`
      });
    }

    next();
  };
};
