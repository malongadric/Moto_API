import express from 'express';
import { 
  addMoto, 
  getMotos, 
  assignImmatriculation, 
  validateCarteGrise, 
  linkDeclarant,
  getMotoById
} from '../controllers/motosController.js';
import { verifyToken, checkRole } from '../middlewares/auth.js';

const router = express.Router();

// Ajouter une moto
router.post(
  '/',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'agent', 'admin'),
  addMoto
);

// Lister les motos
router.get(
  '/',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'agent', 'admin', 'directeur_departemental'),
  getMotos
);

// Attribuer immatriculation
router.put(
  '/:id/assign-immatriculation',
  verifyToken,
  checkRole('admin'),
  assignImmatriculation
);

// Valider la carte grise
router.put(
  '/:id/validate-carte-grise',
  verifyToken,
  checkRole('directeur_departemental'),
  validateCarteGrise
);

// Liaison moto ↔ propriétaire / mandataire
router.put(
  '/:id/link-declarant',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'agent', 'admin'),
  linkDeclarant
);

// Récupérer une moto par ID
router.get(
  '/:id',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'agent', 'admin', 'directeur_departemental'),
  getMotoById
);

export default router;
