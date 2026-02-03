# Environment Variables

Set these when using the Pro Tools MCP panel.

- `PTSL_PROTO_PATH` (required): absolute path to `PTSL.proto`
- `PROTOOLS_MCP_PATH` (optional): path to `protools-mcp-server/dist/index.js`
- `PROTOOLS_ALLOW_WRITES` (optional): set to `memory` or `all` to enable write tools

## Example

```bash
export PTSL_PROTO_PATH="/Users/rezmo/dev/studio-cockpit/PTSL_SDK_CPP.2025.10.0.1232349/Source/PTSL.proto"
export PROTOOLS_MCP_PATH="/Users/rezmo/dev/studio-cockpit/protools-mcp-server/dist/index.js"
export PROTOOLS_ALLOW_WRITES="memory"
```
