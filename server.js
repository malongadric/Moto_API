// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './config/db.js';

// Routes
import auth from './routes/auth.js';
import motos from './routes/motos.js';
import proprietaires from './routes/proprietaires.js';
import structureRoutes from './routes/structureRoutes.js';
import statistiques from './routes/statistiques.js';
import mandataire from './routes/mandataire.js';
import immatriculation from './routes/immatriculation.js';
import departements from './routes/departement.js';
import dossiers from './routes/dossiers.js';
import paiement from './routes/paiement.js';
import dossierAdminRoutes from './routes/dossierAdminRoutes.js';

// Chargement des variables d'environnement
dotenv.config();

// Initialisation de l'application Express
const app = express();

// --- CORS configuration sécurisée ---
const allowedOrigins = [
  'http://127.0.0.1:5500',                      // front dev local
  'http://localhost:5500',                       // alternative localhost
  'https://fni-generator-imm.netlify.app',      // front prod Netlify
  process.env.FRONTEND_URL                        // front prod personnalisé
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // autoriser Postman ou requêtes serveur
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// --- OPTIONS preflight automatique ---
app.options('*', cors());

// Middleware pour lire le JSON
app.use(express.json());

// --- Test connexion Supabase ---
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('motos').select('*').limit(5);
    if (error) throw error;
    res.json({ message: 'Connexion Supabase OK ✅', exemples: data });
  } catch (err) {
    res.status(500).json({ message: 'Erreur Supabase ❌', erreur: err.message });
  }
});

// --- Routes ---
app.use('/api/auth', auth);
app.use('/api/motos', motos);
app.use('/api/proprietaires', proprietaires);
app.use('/api/structures', structureRoutes);
app.use('/api/statistiques', statistiques);
app.use('/api/mandataire', mandataire);
app.use('/api/immatriculations', immatriculation);
app.use('/api/departements', departements);
app.use('/api/dossiers', dossiers);
app.use('/api/v1', paiement);
app.use('/api/dossier_admin', dossierAdminRoutes);

// --- Test simple Supabase ---
app.get('/api/test-supabase', async (req, res) => {
  const { data, error } = await supabase.from('departements').select('*').limit(2);
  if (error) return res.json({ message: 'Erreur', erreur: error.message });
  res.json({ message: 'OK', data });
});

// --- Démarrage serveur ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Serveur API Motos démarré sur le port ${PORT}`);
});
