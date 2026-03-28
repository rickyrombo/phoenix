# Builder
FROM node:22.21.1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers eudev-dev

COPY package*.json ./

RUN npm ci
COPY . .

ENV VITE_API_BASE_URL=__VITE_API_BASE_URL__
ENV VITE_AUDIUS_APP_KEY=__VITE_AUDIUS_APP_KEY__

ENV NODE_ENV=production
RUN npm run build

# Runner
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]