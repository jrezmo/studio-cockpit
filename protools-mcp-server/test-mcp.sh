#!/bin/bash

# Test the Pro Tools MCP Server
# This script sends test requests to the MCP server via stdio

export PTSL_PROTO_PATH="ptsl_sdk/Source/PTSL.proto"

echo "Testing Pro Tools MCP Server..."
echo ""

# Start the MCP server and send a test request
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | PTSL_PROTO_PATH=ptsl_sdk/Source/PTSL.proto node dist/index.js 2>&1 | head -50
