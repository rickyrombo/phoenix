# Builder
FROM node:22.21.1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ linux-headers eudev-dev

COPY package*.json ./

RUN npm ci
COPY . .

ENV NODE_ENV=production
RUN npm run build

# Runner
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]