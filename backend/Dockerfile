# Dockerfile for Railway/Render deployment
FROM python:3.11-slim

# Install FFmpeg
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for uploads and outputs
RUN mkdir -p uploads outputs

# Expose port (Cloud Run uses PORT env variable, defaults to 8080)
EXPOSE 8080

# Run the application using PORT env variable for Cloud Run compatibility
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
