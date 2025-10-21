import express from 'express'
import { verifyToken } from '../middlewares/auth.js'
import { checkRole } from '../middlewares/role.js'
import { getStatistiques } from '../controllers/statistiquesController.js'

const router = express.Router()

// Seuls admin, SD et directeurs peuvent voir les stats
router.get(
  '/statistiques',
  verifyToken,
  checkRole(['admin', 'SD', 'directeur departemental']),
  getStatistiques
)

export default router
