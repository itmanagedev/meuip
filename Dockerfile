# Stage 1: Build
FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Build the frontend (outputs to /app/dist)
RUN npm run build

# Stage 2: Runtime
FROM node:22-slim

WORKDIR /app

# Copy production dependencies and build artifacts
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Expose the app port
EXPOSE 3000

# Start the application using tsx (already in dependencies)
CMD ["npm", "run", "start"]
