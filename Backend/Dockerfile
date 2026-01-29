# Use official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
# PREVENT Python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# PREVENT Python from buffering stdout and stderr
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Expose port
EXPOSE 8000

# Default command to run the API
# CMD can be overridden to run workers: dramatiq src.workers.scheduler
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
