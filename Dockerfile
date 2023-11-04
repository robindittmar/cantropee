FROM node:lts-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./

RUN npm ci

COPY ./src/ ./src/
RUN npx tsc


FROM node:lts-alpine AS app

EXPOSE 3000

WORKDIR /app
COPY .env.prod .env
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist/ ./dist/

ENTRYPOINT ["node", "./dist/server.js"]
