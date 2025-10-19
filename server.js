// // // server.js
// import express from 'express'
// import cors from 'cors'
// import dotenv from 'dotenv'
// import supabase from './config/db.js'
// import auth from './routes/auth.js'
// import motos from './routes/motos.js'
// import proprietaires from './routes/proprietaires.js'
// import structureRoutes from './routes/structureRoutes.js'
// import statistiques from './routes/statistiques.js'
// import mandataire from './routes/mandataire.js'
// import immatriculation from './routes/immatriculation.js';
// import departements from './routes/departement.js';
// import dossiers from './routes/dossiers.js';
// import paiement from './routes/paiement.js';

// import dossierAdminRoutes from './routes/dossierAdminRoutes.js';




// // Chargement des variables d'environnement
// dotenv.config()

// // Initialisation de l'application Express
// const app = express()

// // Middlewares
// app.use(cors()) // autorise les requêtes externes
// app.use(express.json()) // permet de lire le JSON envoyé dans les requêtes

// // Test de connexion à la base Supabase
// app.get('/api/test', async (req, res) => {
//   try {
//     const { data, error } = await supabase.from('motos').select('*').limit(5)
//     if (error) throw error
//     res.json({
//       message: 'Connexion à Supabase réussie ✅',
//       exemples: data
//     })
//   } catch (err) {
//     res.status(500).json({
//       message: 'Erreur de connexion à Supabase ❌',
//       erreur: err.message
//     })
//   }
// })

// // Connexion vers les routes 
// app.use('/api/auth', auth)
// app.use('/api/motos', motos)
// app.use('/api/proprietaires', proprietaires)
// app.use('/api/structures', structureRoutes)
// app.use('/api/statistiques', statistiques)
// app.use('/api/mandataire', mandataire)
// // app.use('/api/immatriculation', immatriculation)
// app.use('/api/departements', departements);
// app.use('/api/dossiers', dossiers);
// app.use('/api/immatriculations', immatriculation);
// app.use('/api/v1', paiement);

// app.get('/api/test-supabase', async (req, res) => {
//   const { data, error } = await supabase.from('departements').select('*').limit(2);
//   if (error) return res.json({ message: 'Erreur', erreur: error.message });
//   res.json({ message: 'OK', data });
// });




// app.use('/api/dossier_admin', dossierAdminRoutes);






// // Démarrage du serveur
// const PORT = process.env.PORT || 5000
// app.listen(PORT, () => {
//   console.log(`✅ Serveur API Motos démarré sur le port ${PORT}`)
// })






















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

// --- CORS configuration ---
const allowedOrigins = [
  'http://127.0.0.1:5500', // front local dev
  'http://localhost:5500',  // alternative localhost
  process.env.FRONTEND_URL  // ton domaine prod (ex: https://moto-app.com)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));

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
