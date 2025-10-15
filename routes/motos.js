import express from 'express';
import { 
  addMoto, 
  getMotos, 
  assignImmatriculation, 
  validateCarteGrise, 
  linkDeclarant 
} from '../controllers/motosController.js';
import { verifyToken, checkRole } from '../middlewares/auth.js';

const router = express.Router();

/* ================================
   🆕 Ajouter une moto (Agent / Admin)
================================ */
router.post(
  '/',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'admin'),
  addMoto
);

/* ================================
   📋 Lister les motos
   🔒 Filtrage par département si pas admin
================================ */
router.get(
  '/',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'admin', 'dd'),
  getMotos
);

/* ================================
   🛠️ Admin → Attribuer immatriculation
================================ */
router.put(
  '/:id/assign-immatriculation',
  verifyToken,
  checkRole('admin'),
  assignImmatriculation
);

/* ================================
   ✅ DD → Valider la carte grise officielle
================================ */
router.put(
  '/:id/validate-carte-grise',
  verifyToken,
  checkRole('dd'),
  validateCarteGrise
);

/* ================================
   🔗 Liaison moto ↔ propriétaire / mandataire
================================ */
router.put(
  '/:id/link-declarant',
  verifyToken,
  checkRole('agent_saisie', 'agent_total', 'admin'),
  linkDeclarant
);

export default router;
