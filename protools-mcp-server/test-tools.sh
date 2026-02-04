#!/bin/bash

# Test individual MCP tools

export PTSL_PROTO_PATH="ptsl_sdk/Source/PTSL.proto"

echo "=== Testing get_session_info ==="
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_session_info","arguments":{}}}' | node dist/index.js 2>&1 | grep -A 50 '"result"'

echo ""
echo "=== Testing get_track_list ==="
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_track_list","arguments":{}}}' | node dist/index.js 2>&1 | grep -A 100 '"result"'
