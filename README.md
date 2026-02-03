# Studio Cockpit

**Mission control for modern audio production.**

<p align="center">
  <img src="https://raw.githubusercontent.com/jrezmo/studio-cockpit/master/public/window.svg" alt="Studio Cockpit Logo" width="150">
</p>

<p align="center">
  <a href="https://github.com/jrezmo/studio-cockpit/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-Proprietary-blue.svg" alt="License">
  </a>
  <a href="https://github.com/jrezmo/studio-cockpit/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/jrezmo/studio-cockpit/ci.yml?branch=main" alt="Build Status">
  </a>
  <a href="https://github.com/jrezmo/studio-cockpit/releases">
    <img src="https://img.shields.io/github/v/release/jrezmo/studio-cockpit" alt="Latest Release">
  </a>
</p>

Studio Cockpit unifies file ingestion, session launch, stem printing, studio settings, plus client and session management in one desktop interface.

Studio workflows are scattered. Studio Cockpit makes them cohesive.

---

### Key Features

*   **Unified Dashboard**: Quick access to every panel in one command center.
*   **Smart Ingest**: Watch folders, apply detection rules, and track ingest history.
*   **Client and Session Management**: Track clients, projects, session history, tasks, and correspondence.
*   **Sessions**: Guided launch flow with clear steps and consistent setup.
*   **Stems**: Standardized filename generator with preview and part selection.
*   **Mixing Workflow Prep**: Checklist-driven prep with notes.
*   **Session Stats**: Search your archive and analyze plugin usage across sessions.
*   **Pro Tools MCP**: Live session info, markers, and new project creation.
*   **Centralized Settings**: One place to configure paths and studio defaults.

### How It Works

1.  Configure your studio paths
2.  Ingest and organize incoming files
3.  Launch sessions and print stems with consistency

### Call to Action

Book a demo, request access, or start a pilot build.

### Documentation & Marketing

*   **User Guide**: `docs/user-guide.md`
*   **Client Data Model**: `docs/CRM.md`
*   **One-Sheet**: `docs/one-sheet.md`
*   **Ad Copy**: `docs/marketing/ads.md`
*   **Website Copy**: `docs/website-copy.md`
*   **Website**: [https://jrezmo.github.io/studio-cockpit/](https://jrezmo.github.io/studio-cockpit/)

### Tech Stack

*   [Next.js](https://nextjs.org/) & [React 19](https://react.dev/)
*   [Tauri](https://tauri.app/) for cross-platform desktop builds
*   [TypeScript](https://www.typescriptlang.org/)
*   [Tailwind CSS](https://tailwindcss.com/) for styling
*   [Zustand](https://zustand-demo.pmnd.rs/) for state management

### Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jrezmo/studio-cockpit.git
    cd studio-cockpit
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to see the app.

### Pro Tools MCP Setup

Studio Cockpit can drive Pro Tools through the MCP server (PTSL gRPC). To enable it:

1.  **Clone and build the MCP server** (sibling to this repo):
    ```bash
    git clone https://github.com/skrul/protools-mcp-server.git ../protools-mcp-server
    cd ../protools-mcp-server
    npm install
    npm run build
    ```
    Note: `protools-mcp-server/` is intentionally ignored in this repo.

2.  **Download the Pro Tools Scripting Library SDK** and locate `PTSL.proto`.

3.  **Export environment variables** (same shell you run `npm run dev` from):
    ```bash
    export PTSL_PROTO_PATH="/absolute/path/to/PTSL.proto"
    export PROTOOLS_MCP_PATH="/absolute/path/to/protools-mcp-server/dist/index.js"
    export PROTOOLS_ALLOW_WRITES="session,track_structure"
    ```

4.  **Run the app** and open the **Pro Tools** panel.

**Write permissions**
`PROTOOLS_ALLOW_WRITES` controls what Pro Tools operations are allowed.
- `memory` enables markers
- `session,track_structure` enables New Project creation
- `all` enables full write access

### Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details on how to get started.

### License

This project is proprietary and all rights are reserved. See the [LICENSE](LICENSE) file for more information.
