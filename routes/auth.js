// routes/authRoutes.js
import express from 'express'
import { login, getUsers, loginLimiter } from '../controllers/authController.js'
import { verifyToken } from '../middlewares/auth.js'
import { checkRole } from '../middlewares/role.js'

const router = express.Router()

//  Se connecter (tous les profils) avec rate limiter
router.post('/login', loginLimiter, login)

//  Obtenir la liste / stats des utilisateurs
// Seuls admin, DD, SD, super_directeur peuvent accéder
router.get(
  '/users',
  verifyToken,
  checkRole(['admin','directeur departemental','SD','super_directeur']),
  getUsers
)

export default router
