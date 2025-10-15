// // server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import supabase from './config/db.js'
import auth from './routes/auth.js'
import motos from './routes/motos.js'
import proprietaires from './routes/proprietaires.js'
import structureRoutes from './routes/structureRoutes.js'
import statistiques from './routes/statistiques.js'
import mandataire from './routes/mandataire.js'
import immatriculation from './routes/immatriculation.js';
import departements from './routes/departement.js';
import dossiers from './routes/dossiers.js';
import paiement from './routes/paiement.js';




// Chargement des variables d'environnement
dotenv.config()

// Initialisation de l'application Express
const app = express()

// Middlewares
app.use(cors()) // autorise les requêtes externes
app.use(express.json()) // permet de lire le JSON envoyé dans les requêtes

// Test de connexion à la base Supabase
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('motos').select('*').limit(5)
    if (error) throw error
    res.json({
      message: 'Connexion à Supabase réussie ✅',
      exemples: data
    })
  } catch (err) {
    res.status(500).json({
      message: 'Erreur de connexion à Supabase ❌',
      erreur: err.message
    })
  }
})

// Connexion vers les routes 
app.use('/api/auth', auth)
app.use('/api/motos', motos)
app.use('/api/proprietaires', proprietaires)
app.use('/api/structures', structureRoutes)
app.use('/api/statistiques', statistiques)
app.use('/api/mandataire', mandataire)
// app.use('/api/immatriculation', immatriculation)
app.use('/api/departements', departements);
app.use('/api/dossiers', dossiers);
app.use('/api/immatriculations', immatriculation);
app.use('/api/v1', paiement);

app.get('/api/test-supabase', async (req, res) => {
  const { data, error } = await supabase.from('departements').select('*').limit(2);
  if (error) return res.json({ message: 'Erreur', erreur: error.message });
  res.json({ message: 'OK', data });
});




// Démarrage du serveur
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ Serveur API Motos démarré sur le port ${PORT}`)
})
