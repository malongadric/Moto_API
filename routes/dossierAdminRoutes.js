// /routes/dossierAdminRoutes.js (VERSION FINALE CORRIGÉE)

import express from 'express';

// 1. IMPORT DES FONCTIONS DU CONTRÔLEUR

import {
  getDossiersAdmin, 
  getDossierAdminById,
  addDossierAdmin,
  updateDossierAdmin,
  deleteDossierAdmin,
  validerOfficiel
} from '../controllers/dossierAdminController.js'; 

// 2.IMPORT DU MIDDLEWARE
import { verifyToken } from '../middlewares/auth.js'; 

const router = express.Router();

// Applique le middleware à TOUTES les routes qui suivent
router.use(verifyToken);

// 3. DÉFINITION DES ROUTES
router.get('/', getDossiersAdmin); 
router.get('/:id', getDossierAdminById);
router.post('/', addDossierAdmin); 
router.put('/:id', updateDossierAdmin);
router.delete('/:id', deleteDossierAdmin);
router.post('/valider_officiel', validerOfficiel);


export default router;