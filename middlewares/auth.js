// middlewares/auth.js
import jwt from 'jsonwebtoken'

// 🔹 Vérifier le token JWT et décoder le profil
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'Token manquant' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // On met uniquement les infos utiles dans req.user
    req.user = {
      id: decoded.id,
      nom: decoded.nom,
      email: decoded.email,
      profil: decoded.profil,           // <-- important : doit correspondre au champ "profil" dans la DB/token
      departement_id: decoded.departement_id
    };

    next();
  } catch (err) {
    console.warn(`Token invalide pour ${req.ip}: ${err.message}`);
    return res.status(401).json({ message: 'Token invalide', erreur: err.message });
  }
};

// 🔹 Vérifier le profil autorisé
export const checkRole = (...allowedProfiles) => (req, res, next) => {
  const userProfil = req.user?.profil;
  if (!userProfil) return res.status(401).json({ message: 'Utilisateur non authentifié' });

  // Si le profil de l'utilisateur n'est pas dans la liste autorisée
  if (!allowedProfiles.includes(userProfil)) {
    console.warn(`Accès refusé pour ${req.user.email} (${userProfil}) sur ${req.originalUrl}`);
    return res.status(403).json({
      message: `Droits insuffisants : le profil "${userProfil}" n'est pas autorisé pour cette route`
    });
  }

  next();
};
