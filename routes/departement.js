import express from 'express';
import { getDepartements } from '../controllers/departementcontroller.js';

const router = express.Router();

// 🔹 GET /api/departements
router.get('/', getDepartements);

export default router;
