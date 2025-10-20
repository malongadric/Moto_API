// /routes/dossierAdminRoutes.js (CORRIGÉ - Option B)
import express from 'express';
// ...
import verifyToken from '../middlewares/auth.js'; 

const router = express.Router();

// 🟢 Applique le middleware à TOUTES les routes qui suivent
router.use(verifyToken);

router.get('/', getDossiersAdmin);
router.get('/:id', getDossierAdminById);
router.post('/', addDossierAdmin); // N'a plus besoin du middleware ici
router.put('/:id', updateDossierAdmin);
router.delete('/:id', deleteDossierAdmin);

export default router;

