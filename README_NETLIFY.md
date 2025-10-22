Déployer le frontend sur Netlify

Ce repo contient un dossier `frontend/` contenant les pages statiques.

Méthode recommandée : Netlify CLI
Prérequis :
- Node.js
- Netlify CLI (installer via `npm i -g netlify-cli` ou `npx netlify-cli`)
- Avoir une clé d'API Netlify (NETLIFY_AUTH_TOKEN) : voir https://app.netlify.com/user/applications#personal-access-tokens

Déployer :
1. Exporter la clé :

```bash
export NETLIFY_AUTH_TOKEN="<ton_token>"
```

(sous PowerShell) :

```powershell
$env:NETLIFY_AUTH_TOKEN = "<ton_token>"
```

2. Optionnel : fournir le SITE_ID comme argument si tu veux déployer sur un site existant :

```bash
./scripts/netlify_deploy.sh <SITE_ID>
```

3. Sinon, lancer le script pour déployer et créer un nouveau site draft (ou lier un existant) :

```bash
./scripts/netlify_deploy.sh
```

Remarques :
- Le script utilise `npx netlify-cli` si `netlify` n'est pas installé globalement.
- Tu peux aussi utiliser `netlify deploy` manuellement pour plus de contrôle.
- Ne commite jamais ton `NETLIFY_AUTH_TOKEN` dans le repo.
