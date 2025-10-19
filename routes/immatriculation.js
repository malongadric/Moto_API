// routes/immatriculations.js
import express from 'express';
import { attribuerNumero,  } from '../controllers/immatriculationcontroller.js';
import { verifyToken } from '../middlewares/auth.js';
import { checkRole } from '../middlewares/role.js';

const router = express.Router();

/**
 * 🔹 Attribuer un numéro d’immatriculation à une moto
 * Accessible seulement aux admins
 * POST /immatriculations/attribuer/:motoId
 */
router.post(
  '/attribuer/:motoId',
  verifyToken,
  checkRole(['admin', 'agent']), // <-- ici, tableau
  attribuerNumero
);

/**
 * 🔹 Lister / rechercher / filtrer les immatriculations
 * GET /immatriculations?search=&departement_id=
 */
// router.get(
//   '/',
//   verifyToken,
//   getImmatriculations
// );

export default router;
