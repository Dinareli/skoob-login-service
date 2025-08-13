# Usa uma imagem base do Node.js
FROM node:18-slim

# --- INÍCIO DA CORREÇÃO ---
# Instala TODAS as dependências de sistema necessárias para o Puppeteer/Chromium
# Esta lista é mais completa e inclui a 'libxdmcp6' (que fornece libxdm.so.2)
RUN apt-get update \
    && apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    libxdmcp6 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
# --- FIM DA CORREÇÃO ---

# Define o diretório de trabalho
WORKDIR /usr/src/app

# Copia os ficheiros de dependências
COPY package*.json ./

# Instala as dependências do Node.js
RUN npm install

# Copia o resto do código da aplicação
COPY . .

# Expõe a porta que a aplicação vai usar
EXPOSE 10000

# Comando para iniciar a aplicação
CMD [ "node", "index.js" ]
