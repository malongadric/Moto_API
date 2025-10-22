Déploiement sur Render

Prérequis
- Un compte sur https://render.com
- Avoir connecté ce dépôt GitHub/GitLab à Render (ou push du repo sur GitHub)
- Variables d'environnement à configurer dans le dashboard Render (Secrets):
  - SUPABASE_URL
  - SUPABASE_KEY
  - FRONTEND_URL (optionnel)
  - PORT (optionnel, Render fournit $PORT automatiquement)

Procédure rapide
1. Push ton dépôt sur GitHub (branche `main` ou `master`).
2. Sur Render, crée un nouveau service Web, sélectionne "Connect a repo" et choisis ce repo.
3. Pour le type d'environnement, choisis Docker (ou Node si tu préfères). Le `Dockerfile` inclus prendra en charge l'installation.
4. Dans les settings du service, ajoute les secrets `SUPABASE_URL` et `SUPABASE_KEY`.
5. Déploie. Le service construira l'image et démarrera `node server.js`.

Tests après déploiement
- GET /api/test (doit retourner une réponse indiquant la connexion Supabase)
- Vérifie les routes principales `/api/dossiers`, `/api/immatriculations`.

Notes de sécurité
- Ne commite jamais de secrets dans le repo.
- Préfère stocker les clés Supabase dans les Secret Vars de Render.

Si tu veux, je peux:
- Générer un script `deploy-to-render.sh` pour créer automatiquement le service via l'API Render (il faudra un API key Render dans ton environnement).
- Ou te guider pas à pas pour la création du service et des secrets.
