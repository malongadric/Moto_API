import express from 'express';
import { addDossier, getDossiers, updateDossier } from '../controllers/dossierscontroller.js';
import { verifyToken } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';

const router = express.Router();

// 🔹 Créer un dossier (seulement Agent)
router.post('/', verifyToken, checkRole('agent', 'admin'), addDossier);

// 🔹 Récupérer tous les dossiers selon rôle
router.get('/', verifyToken, checkRole('agent', 'admin', 'dd'), getDossiers);

// 🔹 Mettre à jour dossier (Admin / DD)
router.put('/:dossier_id', verifyToken, checkRole('admin', 'dd'), updateDossier);

export default router;
