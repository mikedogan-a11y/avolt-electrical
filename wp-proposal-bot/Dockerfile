# Runs the bot with a real browser preinstalled (Playwright base image).
# Used by Render/Railway/Fly so you don't have to install anything yourself.
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Install dependencies first (better build caching)
COPY package*.json ./
RUN npm install --omit=dev

# App code
COPY . .

ENV HEADLESS=true
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
