FROM node:18-slim

RUN apt-get update && apt-get install -y \
  wget ca-certificates fonts-liberation libappindicator3-1 \
  libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 \
  libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 \
  libxcomposite1 libxdamage1 libxrandr2 xdg-utils \
  libu2f-udev libvulkan1 chromium \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

CMD ["node", "index.js"]
