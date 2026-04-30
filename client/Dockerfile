# Étape 1 : Build
FROM node:20-alpine AS build-stage
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# On force l'installation de TOUT (y compris les outils de build comme Vite)
RUN npm install --include=dev

# Copier le reste du code
COPY . .

# Lancer le build proprement
RUN npm run build

# Étape 2 : Production
FROM nginx:stable-alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
