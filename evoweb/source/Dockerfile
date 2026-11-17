# Stage 1: Build the frontend
FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci && npm audit --audit-level=low
COPY frontend/ ./
ENV CI=true
RUN npm exec tsc -- -p tsconfig.app.json
RUN npm exec vite -- build

# Stage 2: Build the backend
FROM node:22-slim AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm audit --audit-level=low
COPY . .
# We don't want to copy the frontend source or legacy backup
RUN rm -rf frontend legacy_backup
RUN npm run build

# Stage 3: Production image
FROM node:22-slim
LABEL org.opencontainers.image.title="evoweb" \
      org.opencontainers.image.description="evoWeb Heating Schedule Manager" \
      org.opencontainers.image.version="0.9.4-live20261117-2" \
      org.opencontainers.image.revision="05f2f7280f3b0be30e2a768771b2aee7bc74261c+live-config-20261117-2"
WORKDIR /app

# Copy backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm audit --omit=dev --audit-level=low

# Copy compiled backend from Stage 2
COPY --from=backend-build /app/dist ./dist

# Copy frontend build from Stage 1 (Vite builds to ../static)
COPY --from=frontend-build /app/static ./static

# Copy other necessary files
COPY data/ ./data/

EXPOSE 3330

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3330/healthz', {signal: AbortSignal.timeout(3000)}).then(r => {if (!r.ok) process.exit(1)}).catch(() => process.exit(1))"

# Start from the dist folder
CMD ["npm", "run", "start:evoweb"]
