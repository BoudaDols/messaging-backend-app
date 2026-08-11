# Dockerfile

# Étape 1 : Partir d'une image Node.js officielle
FROM node:22-alpine3.22

# Étape 2 : Créer un dossier de travail dans le container
WORKDIR /app

# Étape 3 : Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Étape 4 : Installer les dépendances
RUN npm install

# Étape 5 : Copier tout le code source
COPY . .

# Étape 6 : Exposer le port (documentation, pas obligatoire)
EXPOSE 3000

# Étape 7 : Commande pour démarrer l'app
CMD ["npm", "start"]
