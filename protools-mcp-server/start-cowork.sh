#!/bin/bash

# Quick start script for Claude Cowork (HTTPS)

if [ -z "$PTSL_PROTO_PATH" ]; then
  echo "Error: PTSL_PROTO_PATH environment variable not set"
  echo ""
  echo "Usage:"
  echo "  export PTSL_PROTO_PATH=/path/to/PTSL.proto"
  echo "  ./start-cowork.sh"
  echo ""
  echo "Or run directly:"
  echo "  PTSL_PROTO_PATH=/path/to/PTSL.proto ./start-cowork.sh"
  exit 1
fi

# Check if SSL certificates exist
if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
  echo "SSL certificates not found. Generating them now..."
  ./generate-certs.sh
  echo ""
fi

echo "Starting Pro Tools MCP Server for Claude Cowork (HTTPS)..."
echo ""

# Default to HTTPS (Claude Cowork requires it)
npm run start:http
