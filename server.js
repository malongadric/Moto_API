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

// Initialisation Express
const app = express();

// --- CORS configuration sécurisée ---
const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://fni-generator-imm.netlify.app',
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman ou serveur
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

// --- Preflight OPTIONS pour toutes les routes ---
app.options('*', cors());

// Middleware JSON
app.use(express.json());

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

// --- Test simple Supabase ---
app.get('/api/test-supabase', async (req, res) => {
  const { data, error } = await supabase.from('departements').select('*').limit(2);
  if (error) return res.json({ message: 'Erreur', erreur: error.message });
  res.json({ message: 'OK', data });
});

// --- Démarrage serveur ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Serveur API Motos démarré sur le port ${PORT}`));
