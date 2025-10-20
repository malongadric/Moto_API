// /routes/dossierAdminRoutes.js (VERSION FINALE CORRIGÉE)

import express from 'express';

// 1. 🟢 IMPORT DES FONCTIONS DU CONTRÔLEUR
// Assurez-vous que toutes les fonctions sont listées ici !
import {
  getDossiersAdmin, // <-- LA FONCTION MANQUANTE
  getDossierAdminById,
  addDossierAdmin,
  updateDossierAdmin,
  deleteDossierAdmin
} from '../controllers/dossierAdminController.js'; // Vérifiez que ce chemin est correct

// 2. 🟢 IMPORT DU MIDDLEWARE
import { verifyToken } from '../middlewares/auth.js'; 

const router = express.Router();

// 🟢 Applique le middleware à TOUTES les routes qui suivent
router.use(verifyToken);

// 3. 🟢 DÉFINITION DES ROUTES
router.get('/', getDossiersAdmin); // ✅ Devrait fonctionner maintenant
router.get('/:id', getDossierAdminById);
router.post('/', addDossierAdmin); 
router.put('/:id', updateDossierAdmin);
router.delete('/:id', deleteDossierAdmin);

export default router;