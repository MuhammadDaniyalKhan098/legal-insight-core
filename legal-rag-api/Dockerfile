# ==========================================
# AI Microservice Dockerfile (Python & FastAPI)
# ==========================================

# 1. Base Image: Use a slim version of Python 3.10 to keep the image size down
FROM python:3.10-slim

# 2. Working Directory: Set up the app directory
WORKDIR /app

# 3. System Dependencies: Install basic build tools required by some Python AI packages
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 4. Cache Optimization: Copy requirements.txt first
COPY requirements.txt .

# 5. Install Dependencies: Install Python packages without storing cache to save space
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy Source Code: Bring in the FastAPI app, LangGraph logic, and Neo4j connections
COPY . .

# 7. Expose Port: Open port 8000 for uvicorn (from our main.py)
EXPOSE 8000

# 8. Start Command: Run the uvicorn ASGI server, binding to 0.0.0.0 so it can receive outside traffic
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]