import express from 'express'
import {
  getMandataires,
  addMandataire,
  getMandataireById,
  updateMandataire,
  
} from '../controllers/mandatairecontroller.js'
import { verifyToken, checkRole } from '../middlewares/auth.js'

const router = express.Router()

// ✅ Routes mandataires
router.get('/', verifyToken, getMandataires)
router.post('/', verifyToken, addMandataire)
router.get('/:id', verifyToken, getMandataireById)
router.put('/:id', verifyToken, updateMandataire)


export default router
