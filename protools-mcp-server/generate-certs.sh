#!/bin/bash

# Generate self-signed SSL certificates for local HTTPS server

echo "Generating self-signed SSL certificate for localhost..."
echo ""

# Create certs directory
mkdir -p certs

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo ""
echo "✓ Certificate generated successfully!"
echo ""
echo "Files created:"
echo "  - certs/cert.pem (certificate)"
echo "  - certs/key.pem (private key)"
echo ""
echo "Note: Your browser will show a security warning because this is a"
echo "self-signed certificate. This is normal for local development."
echo ""
echo "You may need to add certs/cert.pem to your system's trusted certificates."
