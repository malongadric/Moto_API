// routes/dossiersRoutes.js
import express from "express";
import {
  addDossier,
  getDossiers,
  getDossierById,
  updateDossier
} from "../controllers/dossierscontroller.js";
import {  verifyToken } from "../middlewares/auth.js"; // ton middleware d’auth

const router = express.Router();

// ➕ Ajouter un dossier
router.post("/",  verifyToken, addDossier);

// 📋 Lister tous les dossiers (avec filtres et jointures)
router.get("/",  verifyToken, getDossiers);



// 🔎 Obtenir un dossier par ID
router.get("/:id", verifyToken, getDossierById);

// ✏️ Mettre à jour un dossier
router.put("/:id", verifyToken, updateDossier);

export default router;
