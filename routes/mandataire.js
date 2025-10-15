import express from 'express'
import {
  getMandataires,
  addMandataire,
  getMandataireById,
  updateMandataire,
  deleteMandataire
} from '../controllers/mandatairecontroller.js'

const router = express.Router()

router.get('/', getMandataires)
router.post('/', addMandataire)
router.get('/:id', getMandataireById)
router.put('/:id', updateMandataire)
router.delete('/:id', deleteMandataire)

export default router
