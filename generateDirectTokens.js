// generateDirectTokens.js
import jwt from 'jsonwebtoken';
import 'dotenv/config';

// 🔹 Informations des utilisateurs spéciaux
const users = [
  {
    id: 100, // ID fictif ou réel
    nom: 'Jean Dupont',
    email: 'jean.dupont@departement.cg',
    profil: 'directeur departemental',
    departement_id: 4
  },
  {
    id: 101,
    nom: 'Alice Martin',
    email: 'alice.martin@admin.cg',
    profil: 'SD', // Super Directeur
    departement_id: null
  }
];

// 🔹 Générer les tokens
users.forEach(user => {
  const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '12h' });
  console.log(`${user.profil} - Token :\n${token}\n`);
});
