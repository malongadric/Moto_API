import express from 'express'
import { verifyToken } from '../middlewares/auth.js'
import { getProprietaires, addProprietaire, getProprietaireById } from '../controllers/proprietairesController.js'

const router = express.Router()

router.get('/', verifyToken, getProprietaires)   // GET /proprietaires + search via ?search=
router.post('/', verifyToken, addProprietaire)  // POST /proprietaires
router.get('/:id', verifyToken, getProprietaireById) // GET /proprietaires/1

export default router
