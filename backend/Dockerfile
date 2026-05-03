# ==========================================
# Backend Dockerfile (Node.js & Express)
# ==========================================

# 1. Base Image: Use a lightweight version of Node.js 20
FROM node:20-alpine

# 2. Working Directory: Set the internal folder where our app will live inside the container
WORKDIR /app

# 3. Cache Optimization: Copy ONLY package files first. 
# Docker caches this step, so if we change our code but not our dependencies, 
# it doesn't have to re-download everything.
COPY package*.json ./

# 4. Install Dependencies: Run npm install inside the container
RUN npm ci

# 5. Copy Source Code: Copy the rest of the backend files into the container
COPY . .

# 6. Expose Port: Tell Docker that this container listens on port 5000 (from our server.js)
EXPOSE 5000

# 7. Start Command: The command to run when the container starts
CMD ["npm", "start"]