# Hugging Face Spaces Dockerfile for VisualVoice Backend
# This will host your T5 model on free CPU (16GB RAM)
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Expose port (HF Spaces expects 7860)
EXPOSE 7860

# Environment variables
ENV PORT=7860
ENV PYTHONUNBUFFERED=1
# Set these in HF Space Secrets:
# HF_MODEL_ID=your-username/visualvoice-t5-base
# MODEL_TYPE=t5
# GEMINI_API_KEY=your_gemini_key (optional, for fallback reserve)

# Run the app
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
