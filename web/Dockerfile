# Builder
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production
COPY . .
RUN npm run build

# Runner
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]