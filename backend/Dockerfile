# Étape 1 : Construction
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Étape 2 : Exécution (Image finale légère)
FROM node:18-alpine
WORKDIR /app

# Installation de curl pour les healthchecks
RUN apk add --no-cache curl

# Copie des fichiers nécessaires depuis le builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Sécurité : Exécuter l'application en tant qu'utilisateur non-root
USER node

# Configuration de l'environnement
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Healthcheck pour s'assurer que le container répond
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "index.js"]
