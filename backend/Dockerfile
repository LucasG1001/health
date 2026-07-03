# ---- build frontend ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./
RUN npm run build

# ---- build backend ----
FROM node:22-alpine AS backend
WORKDIR /app

COPY backend/package*.json ./
RUN npm install --no-audit --no-fund

COPY backend/ ./
RUN npm run build

# ---- runtime ----
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/uploads

COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY --from=backend /app/dist ./dist
COPY --from=frontend /app/frontend/dist ./public

RUN mkdir -p /app/uploads && chown node:node /app/uploads

EXPOSE 3333
USER node
CMD ["node", "dist/server.js"]
