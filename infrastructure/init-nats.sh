#!/bin/bash

# Use environment variable or default
NATS_URL=${NATS_URL:-nats://home:changeme@localhost:4222}

# Give NATS time to start
echo "Waiting 10 seconds for NATS to start..."
sleep 10

# Wait for NATS to be ready
echo "Checking NATS connection at $NATS_URL..."
max_attempts=30
attempt=0
until nats --server=$NATS_URL server check connection 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "NATS failed to become ready after $max_attempts attempts"
    exit 1
  fi
  echo "Waiting for NATS... (attempt $attempt/$max_attempts)"
  sleep 2
done

echo "NATS is ready!"

# Create KV buckets if they don't exist
echo "Creating KV buckets..."

# Create devices bucket
nats --server=$NATS_URL kv add devices \
  --description "Device registry" \
  --history 10 \
  --ttl 0 \
  --replicas 1 \
  2>/dev/null || echo "Devices bucket already exists"

# Create automations bucket
nats --server=$NATS_URL kv add automations \
  --description "Automation configurations" \
  --history 10 \
  --ttl 0 \
  --replicas 1 \
  2>/dev/null || echo "Automations bucket already exists"

# Create scenes bucket
nats --server=$NATS_URL kv add scenes \
  --description "Scene configurations" \
  --history 10 \
  --ttl 0 \
  --replicas 1 \
  2>/dev/null || echo "Scenes bucket already exists"

echo "KV buckets created successfully!"

# Check if demo data should be added
if [ "${ADD_DEMO_DATA:-true}" = "true" ]; then
  echo "Checking for existing data..."
  
  # Only add demo data if devices bucket is empty
  device_count=$(nats --server=$NATS_URL kv ls devices 2>/dev/null | wc -l)
  if [ "$device_count" -eq 0 ]; then
    echo "Adding demo data..."
    
    # Add demo devices
    /add-demo-devices.sh 2>/dev/null || echo "Demo devices script not found"
    
    # Add demo automations and scenes  
    /add-demo-automations.sh 2>/dev/null || echo "Demo automations script not found"
  else
    echo "Data already exists, skipping demo data"
  fi
fi