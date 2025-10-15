// routes/mandataire.js
import express from 'express';
import { addMandataire, getMandataires } from '../controllers/mandatairecontroller.js';
import { verifyToken, checkRole } from '../middlewares/auth.js';

const router = express.Router();

// Toutes les routes nécessitent d'être connecté
router.get('/', verifyToken, getMandataires);
router.post('/', verifyToken, checkRole('admin','agent','directeur_departemental'), addMandataire);

export default router;
