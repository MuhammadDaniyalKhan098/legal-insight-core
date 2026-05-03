# ==========================================
# Frontend Dockerfile (Vite & Nginx Multi-Stage)
# ==========================================

# --- STAGE 1: Build the React App ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# This creates the optimized production build in the /app/dist folder
RUN npm run build 

# --- STAGE 2: Serve with Nginx ---
# Use the lightweight Nginx alpine image
FROM nginx:alpine

# Copy the built assets from Stage 1 into the Nginx public HTML folder
COPY --from=build /app/dist /usr/share/nginx/html

# NEW: Copy our custom Nginx config to fix React routing (404s)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (the default Nginx HTTP port)
EXPOSE 80

# Start Nginx in the foreground so the container doesn't exit
CMD ["nginx", "-g", "daemon off;"]