# Pro Tools MCP Panel

The Pro Tools MCP (Media Control Protocol) panel allows Studio Cockpit to interact with Pro Tools.

## One-time setup

1.  Clone and build the MCP server (inside this repo):
    ```bash
    git clone https://github.com/skrul/protools-mcp-server.git ./protools-mcp-server
    cd protools-mcp-server
    npm install
    npm run build
    cd ..
    ```
    Note: `protools-mcp-server/` is ignored by this repo to keep Git history clean.
2.  Download the Pro Tools Scripting Library SDK and locate `PTSL.proto`.
3.  Export the environment variables listed in [ENVIRONMENT.md](ENVIRONMENT.md).
4.  Ensure Pro Tools is running.

## Write permissions

`PROTOOLS_ALLOW_WRITES` controls write access. Recommended values:

- `memory` to allow marker creation
- `all` for full write access

The New Project builder requires:

- `session` (CreateSession)
- `track_structure` (CreateNewTracks)

Example:

```bash
export PROTOOLS_ALLOW_WRITES="session,track_structure"
```
