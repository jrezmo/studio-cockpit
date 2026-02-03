# Studio Cockpit User Guide

Mission control for modern audio production.

## What It Is
Studio Cockpit is a desktop-style control surface for professional audio workflows. It centralizes file ingestion, session launch, stem printing, and studio configuration in one interface.

## Quick Start
1. Open Studio Cockpit.
2. Use the Settings panel to confirm your studio paths.
3. Use the Ingest panel to watch or organize incoming files.
4. Launch sessions from the Sessions panel.
5. Create stems in the Stems panel.

## Core Panels
- Dashboard: Status widgets and project grid for a quick daily overview.
- Ingest: Watcher control, detection rules, and ingest history.
- Sessions: Guided launch flow with stepper for creating or opening sessions.
- Stems: Standardized stem filename preview and part selection.
- Session Stats: Search sessions and analyze track and plugin usage.
- Pro Tools MCP: Live session info, markers, and new project creation.
- Settings: Centralized configuration for studio paths and defaults.

## Typical Workflow
1. Receive files and run Smart Ingest to organize them.
2. Launch a new session from the Sessions panel.
3. Work in Pro Tools with live context in the MCP panel.
4. Print stems and export with standardized names.
5. Review Session Stats for archive and plugin insights.

## Pro Tools MCP Setup (Advanced)
1. Install and build the Pro Tools MCP server.
2. Set `PTSL_PROTO_PATH` and optional MCP variables.
3. Enable write permissions only if needed.
4. Ensure Pro Tools is running before using the MCP panel.

For full setup details, see `docs/PROTOOLS_MCP.md` and `docs/ENVIRONMENT.md`.

## Troubleshooting
- Pro Tools panel is blank
  Check that Pro Tools is running and the MCP server path is correct.
- Ingest not detecting files
  Confirm watched folder paths in Settings.
- No write actions available
  Confirm `PROTOOLS_ALLOW_WRITES` is set appropriately.

## Support
For support or onboarding help, contact the Studio Cockpit team.
