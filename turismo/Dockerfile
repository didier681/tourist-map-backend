# Esta etapa puede usar dependencias de desarrollo para compilar TypeScript.
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# La etapa final mantiene pequeña la imagen y excluye herramientas de compilación.
FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

# Evita ejecutar la API con privilegios de root dentro del contenedor.
USER node
EXPOSE 3000
# El healthcheck consulta la misma ruta pública usada por orquestadores.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start:prod"]
