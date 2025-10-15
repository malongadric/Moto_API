import express from 'express';
import { verifCaisse, infoCaisse } from '../controllers/paiementcontroller.js';

const router = express.Router();

// Certification / vérification d'une facture
router.post('/verif-caisse/:uuid', verifCaisse);

// Infos sur une facture
router.post('/info-caisse/:uuid', infoCaisse);

export default router;
