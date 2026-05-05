FROM node:18-alpine

WORKDIR /usr/src/app

# Install dependencies first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose the app port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8081/health || exit 1

# Run as non-root
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
USER appuser

CMD ["node", "src/index.js"]
