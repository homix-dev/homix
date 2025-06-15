#!/bin/sh
# Simple healthcheck for NATS server
exec nats-server --ping --server nats://localhost:4222