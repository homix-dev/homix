#!/bin/bash
# Detect and export the appropriate container tool

if command -v podman >/dev/null 2>&1; then
    echo "podman"
elif command -v docker >/dev/null 2>&1; then
    echo "docker"
else
    echo "none"
fi