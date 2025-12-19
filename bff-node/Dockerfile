FROM node:18-alpine

WORKDIR /app

# Install deps if package.json exists; otherwise the build will copy files later
COPY package*.json ./
RUN if [ -f package.json ]; then npm ci --only=production || npm install --omit=dev; fi

# Copy the rest of the app
COPY . .

ENV PORT=5000

EXPOSE 5000

CMD ["node", "app.js"]
