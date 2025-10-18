import express from 'express';
import {
  getDossiersAdmin,
  getDossierAdminById,
  addDossierAdmin,
  updateDossierAdmin,
  deleteDossierAdmin
} from '../controllers/dossierAdminController.js';

const router = express.Router();

router.get('/', getDossiersAdmin);
router.get('/:id', getDossierAdminById);
router.post('/', addDossierAdmin);
router.put('/:id', updateDossierAdmin);
router.delete('/:id', deleteDossierAdmin);

export default router;
