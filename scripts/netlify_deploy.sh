#!/usr/bin/env bash
# Netlify deploy helper for the Moto_API frontend
# Usage: NETLIFY_AUTH_TOKEN must be exported in the environment
#        ./scripts/netlify_deploy.sh [SITE_ID]

set -euo pipefail

SITE_ID="${1:-}" 
BUILD_DIR="frontend"

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  echo "ERROR: NETLIFY_AUTH_TOKEN is not set. Export it first."
  exit 1
fi

if [ ! -d "$BUILD_DIR" ]; then
  echo "ERROR: build directory '$BUILD_DIR' does not exist"
  exit 1
fi

if [ -n "$SITE_ID" ]; then
  echo "Deploying to existing site: $SITE_ID"
  npx netlify-cli deploy --dir=$BUILD_DIR --site=$SITE_ID --prod
else
  echo "Deploying as new draft site (or link interactively)."
  npx netlify-cli deploy --dir=$BUILD_DIR
fi

echo "Done."
#!/usr/bin/env bash
# scripts/netlify_deploy.sh
# Déploie le dossier frontend/ sur Netlify en utilisant le CLI Netlify (recommandé) ou l'API.
# Prérequis:
# - Node.js installé (pour utiliser npx)
# - Netlify CLI (optionnel) ou utilisation via npx
# - export NETLIFY_AUTH_TOKEN="<ton_token>" dans l'environnement
# - optionnel: SITE_ID (si tu déploies sur un site Netlify existant)

set -euo pipefail

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  echo "Erreur: NETLIFY_AUTH_TOKEN non défini. Exportes-le d'abord : export NETLIFY_AUTH_TOKEN=\"<token>\""
  exit 1
fi

FRONTEND_DIR="frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Erreur: dossier $FRONTEND_DIR introuvable. Assure-toi d'être à la racine du repo."
  exit 1
fi

SITE_ID="${1:-${SITE_ID:-}}" # argument 1 ou variable d'environnement SITE_ID

# Si netlify CLI est installé, on l'utilise via npx
if command -v netlify >/dev/null 2>&1; then
  NETLIFY_CLI="netlify"
else
  NETLIFY_CLI="npx netlify-cli"
fi

echo "Utilisation de: $NETLIFY_CLI"

if [ -n "$SITE_ID" ]; then
  echo "Déploiement sur site existant: $SITE_ID"
  # déploiement en prod
  NETLIFY_SITE_FLAG="--site $SITE_ID"
else
  echo "Aucun SITE_ID fourni : le script va créer un nouveau draft deploy (ou te demander de lier un site)."
  NETLIFY_SITE_FLAG=""
fi

# Commande de déploiement
# --prod pour déployer en production
# --dir pour dossier à déployer
set -x
$NETLIFY_CLI deploy $NETLIFY_SITE_FLAG --dir="$FRONTEND_DIR" --prod
set +x

#!/usr/bin/env bash
# scripts/netlify_deploy.sh
# Déploie le dossier frontend/ sur Netlify en utilisant le CLI Netlify (recommandé) ou l'API.
# Prérequis:
# - Node.js installé (pour utiliser npx)
# - Netlify CLI (optionnel) ou utilisation via npx
# - export NETLIFY_AUTH_TOKEN="<ton_token>" dans l'environnement
# - optionnel: SITE_ID (si tu déploies sur un site Netlify existant)

set -euo pipefail

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  echo "Erreur: NETLIFY_AUTH_TOKEN non défini. Exportes-le d'abord : export NETLIFY_AUTH_TOKEN=\"<token>\""
  exit 1
fi

FRONTEND_DIR="frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
  echo "Erreur: dossier $FRONTEND_DIR introuvable. Assure-toi d'être à la racine du repo."
  exit 1
fi

SITE_ID="${1:-${SITE_ID:-}}" # argument 1 ou variable d'environnement SITE_ID

# Si netlify CLI est installé, on l'utilise via npx
if command -v netlify >/dev/null 2>&1; then
  NETLIFY_CLI="netlify"
else
  NETLIFY_CLI="npx netlify-cli"
fi

echo "Utilisation de: $NETLIFY_CLI"

if [ -n "$SITE_ID" ]; then
  echo "Déploiement sur site existant: $SITE_ID"
  # déploiement en prod
  NETLIFY_SITE_FLAG="--site $SITE_ID"
else
  echo "Aucun SITE_ID fourni : le script va créer un nouveau draft deploy (ou te demander de lier un site)."
  NETLIFY_SITE_FLAG=""
fi

# Commande de déploiement
# --prod pour déployer en production
# --dir pour dossier à déployer
set -x
$NETLIFY_CLI deploy $NETLIFY_SITE_FLAG --dir="$FRONTEND_DIR" --prod
set +x

echo "Déploiement terminé. Vérifie l'URL retournée par le Netlify CLI ou connecte-toi au dashboard Netlify." 
