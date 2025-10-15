# API Motos - Node.js + Express + PostgreSQL

Projet de base pour l'enregistrement et l'immatriculation des motos.

## Contenu
- server.js : point d'entrée
- config/db.js : connexion PostgreSQL
- routes/ : routes pour motos, propriétaires, users
- controllers/ : logique métier
- middlewares/ : validations et authentification
- utils/ : utilitaires (génération immatriculation, PDF)
- scripts/createTables.sql : script SQL pour créer les tables

## Installation
1. Copier `.env.example` en `.env` et remplir les valeurs (host, user, password, database).
2. Installer les dépendances :
```bash
npm install
```
3. Créer la base de données `motos_db` et exécuter le script SQL :
```bash
# sous psql
CREATE DATABASE motos_db;
\c motos_db
\i scripts/createTables.sql
```
4. Lancer le serveur en développement :
```bash
npm run dev
```

## Routes principales (exemples)
- POST /users/register  -> créer un utilisateur
- POST /users/login     -> connexion (retourne un token)
- POST /motos/create    -> créer une moto (vérifie doublon)
- GET  /motos/          -> lister les motos
- POST /motos/:id/immatriculate -> attribuer un numéro d'immatriculation

