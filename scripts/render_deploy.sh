#!/usr/bin/env bash
# scripts/render_deploy.sh
# Script d'automatisation pour créer un service Web sur Render via l'API
# Prérequis:
# - exporter RENDER_API_KEY (clé API Render) dans ton environnement
# - installer `jq` pour parser la sortie JSON
# - avoir le dépôt accessible depuis Render (GitHub/GitLab connecté)

set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "Erreur: curl requis. Installe curl et réessaie."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Erreur: jq requis. Installe jq (apt install jq ou choco install jq) et réessaie."
  exit 1
fi

# Variables par défaut (modifie si besoin)
SERVICE_NAME="moto-api"
REPO=""           # ex: malongadric/Moto_API
BRANCH="main"
DOCKERFILE_PATH="Dockerfile"
PLAN="starter"     # 'starter' / 'free' / 'standard' selon ton compte
REGION="oregon"
AUTO_DEPLOY=true

# Lecture des arguments simples
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO="$2"; shift 2;;
    --name)
      SERVICE_NAME="$2"; shift 2;;
    --branch)
      BRANCH="$2"; shift 2;;
    --dockerfile)
      DOCKERFILE_PATH="$2"; shift 2;;
    --plan)
      PLAN="$2"; shift 2;;
    --region)
      REGION="$2"; shift 2;;
    --no-auto-deploy)
      AUTO_DEPLOY=false; shift 1;;
    -h|--help)
      echo "Usage: $0 --repo owner/repo [--name service-name] [--branch main]"; exit 0;;
    *)
      echo "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -z "$RENDER_API_KEY" && -z "$RENDER_API_KEY_FILE" ]]; then
  echo "Erreur: exporte la variable d'environnement RENDER_API_KEY avant d'exécuter ce script."
  echo "Ex: export RENDER_API_KEY=\"<ta_cle_render>\""
  exit 1
fi

if [[ -z "$REPO" ]]; then
  echo "Erreur: indique le repo GitHub (format owner/repo) via --repo"
  exit 1
fi

API_URL="https://api.render.com/v1"
AUTH_HEADER=( -H "Authorization: Bearer ${RENDER_API_KEY}" )

# 1) Lister services existants et vérifier si le nom est déjà pris
echo "→ Récupération des services Render pour vérifier si '$SERVICE_NAME' existe..."
SERVICES_JSON=$(curl -s ${AUTH_HEADER[@]} "$API_URL/services")
EXISTING_ID=$(echo "$SERVICES_JSON" | jq -r --arg NAME "$SERVICE_NAME" '.[] | select(.name == $NAME) | .id' || true)

if [[ -n "$EXISTING_ID" && "$EXISTING_ID" != "null" ]]; then
  echo "Un service Render existe déjà avec le nom '$SERVICE_NAME' (id: $EXISTING_ID)."
  echo "Si tu veux mettre à jour ce service, utilise l'UI Render ou le PATCH API."
  echo "Service JSON résumé:"
  echo "$SERVICES_JSON" | jq -r --arg ID "$EXISTING_ID" '.[] | select(.id==$ID)'
  exit 0
fi

# 2) Créer le service via l'API
echo "→ Création du service '$SERVICE_NAME' pour le repo '$REPO' (branche: $BRANCH) ..."

# Construire le payload JSON
read -r -d '' CREATE_PAYLOAD << EOM
{
  "service": {
    "name": "$SERVICE_NAME",
    "env": "docker",
    "type": "web",
    "plan": "$PLAN",
    "repo": {
      "name": "$REPO",
      "type": "github"
    },
    "branch": "$BRANCH",
    "dockerfilePath": "$DOCKERFILE_PATH",
    "autoDeploy": $AUTO_DEPLOY
  }
}
EOM

# Appel API (attention: Render peut attendre d'autres champs selon l'API publique)
RESPONSE=$(curl -s -X POST ${AUTH_HEADER[@]} -H "Content-Type: application/json" -d "$CREATE_PAYLOAD" "$API_URL/services") || true

echo "Réponse API (raw):"
echo "$RESPONSE" | jq -C . || echo "$RESPONSE"

echo
echo "Si la création a réussi, tu recevras dans la réponse l'objet service avec son id."
echo "Ensuite, configure les variables d'environnement secrètes (SUPABASE_URL et SUPABASE_KEY) dans l'UI Render -> Environment -> Secrets."

cat <<EOF
Exemples de commandes pour ajouter un secret via l'API (remplace SERVICE_ID et VALEUR):

# Exemple (ne PAS exécuter sans remplacer SERVICE_ID et les valeurs):
# curl -X POST https://api.render.com/v1/services/SERVICE_ID/env-vars \
#   -H "Authorization: Bearer \${RENDER_API_KEY}" \
#   -H "Content-Type: application/json" \
#   -d '{"key":"SUPABASE_URL","value":"https://...","secure":true}'

# curl -X POST https://api.render.com/v1/services/SERVICE_ID/env-vars \
#   -H "Authorization: Bearer \${RENDER_API_KEY}" \
#   -H "Content-Type: application/json" \
#   -d '{"key":"SUPABASE_KEY","value":"...","secure":true}'
EOF

echo
echo "Fin du script. Si l'API Render a renvoyé une erreur, copie la réponse et contacte-moi ou vérifie la clé/API."
