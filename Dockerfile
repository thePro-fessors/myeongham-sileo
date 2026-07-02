FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy project files and build static export
COPY . .
RUN npm run build

# Stage 2: Serve static content with Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Clean default Nginx assets
RUN rm -rf ./*

# Copy build outputs from Stage 1
COPY --from=builder /app/out .

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
