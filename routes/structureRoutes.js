import express from 'express'
import { getStructures, addStructure } from '../controllers/structuresController.js'
import { verifyToken } from '../middlewares/auth.js'
import { checkRole } from '../middlewares/role.js'

const router = express.Router()

// 🔒 Sécurisation
router.get('/', verifyToken, checkRole(['admin', 'agent']), getStructures)
router.post('/', verifyToken, checkRole(['admin']), addStructure) // Seuls les admins peuvent créer des structures

export default router
