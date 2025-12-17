FROM node:18-alpine

WORKDIR /app

# Install deps if package.json exists; otherwise the build will copy files later
COPY package*.json ./
RUN if [ -f package.json ]; then npm ci --only=production || npm install --omit=dev; fi

# Copy the rest of the app
COPY . .

# Use environment variable PORT (keep 3000 for compose mapping)
ENV PORT=3000

EXPOSE 3000

# Run the canonical entrypoint `app.js` (legacy `server.js` kept for history)
CMD ["node", "app.js"]
