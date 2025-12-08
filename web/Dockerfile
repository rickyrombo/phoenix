# Builder
FROM node:22.21.1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers eudev-dev

COPY package*.json ./

RUN npm ci
COPY . .

ARG VITE_API_BASE_URL
ARG VITE_AUDIUS_APP_KEY
ARG VITE_AUDIUS_APP_NAME

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUDIUS_APP_KEY=${VITE_AUDIUS_APP_KEY}
ENV VITE_AUDIUS_APP_NAME=${VITE_AUDIUS_APP_NAME}

ENV NODE_ENV=production
RUN npm run build

# Runner
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]