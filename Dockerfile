# Dockerfile minimal pour déployer l'API Moto sur Render
FROM node:20-alpine

# Créer le dossier d'app
WORKDIR /app

# Copier package.json et package-lock (si présent)
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm ci --omit=dev

# Copier le reste
COPY . .

# Exposer le port (Render override PORT env)
ENV PORT=5000
EXPOSE 5000

# Démarrer l'app
CMD ["node", "server.js"]
