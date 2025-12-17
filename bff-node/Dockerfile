FROM node:18-alpine

WORKDIR /app

# Install deps if package.json exists; otherwise the build will copy files later
COPY package*.json ./
RUN if [ -f package.json ]; then npm ci --only=production || npm install --omit=dev; fi

# Copy the rest of the app
COPY . .

# Use environment variable PORT or default 3000
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
