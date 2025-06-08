FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY mqtt-nats-bridge/ /app/

# Create non-root user
RUN useradd -m -u 1000 bridge && \
    chown -R bridge:bridge /app

USER bridge

# Expose metrics port
EXPOSE 9090

# Run the bridge
CMD ["python", "-m", "main"]