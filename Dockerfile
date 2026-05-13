# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY backend/package*.json ./backend/
RUN npm ci --workspace=packages/shared-types --workspace=backend
COPY packages/shared-types ./packages/shared-types
COPY backend ./backend
RUN npm run build --workspace=backend

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY backend/package*.json ./backend/
RUN npm ci --workspace=packages/shared-types --workspace=backend --omit=dev
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/prisma ./backend/prisma
EXPOSE 3000
CMD ["node", "backend/dist/main"]
