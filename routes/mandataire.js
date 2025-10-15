// routes/mandataire.js
import express from 'express';
import { addMandataire, getMandataires, updateMandataire } from '../controllers/mandatairecontroller.js';
import { verifyToken, checkRole } from '../middlewares/auth.js';

const router = express.Router();

// Toutes les routes nécessitent d'être connecté
router.get('/', verifyToken, getMandataires);
router.post('/', verifyToken, checkRole('admin','agent','directeur_departemental'), addMandataire);
router.put('/', verifyToken, checkRole('admin','agent','directeur_departemental'), updateMandataire);

export default router;
