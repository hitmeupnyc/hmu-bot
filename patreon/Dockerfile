FROM node:22-alpine AS build
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --ci

# Copying env file means this is not safe to publish as an artifact,
# must be kept locally to deployment
COPY .env tsconfig.json *.ts ./
COPY src/ /app/src

CMD ["npm", "run", "start"]
