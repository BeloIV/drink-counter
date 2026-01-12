FROM node:20-slim

WORKDIR /app

# rýchlejšia inštalácia a repeatable builds
COPY package*.json ./
RUN npm ci

# zvyšok projektu (Vite/React)
COPY . .

EXPOSE 5173

