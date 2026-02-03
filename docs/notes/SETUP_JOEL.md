# Studio Cockpit - Development Environment Setup (Joel)

This guide covers setting up the development environment for Studio Cockpit from scratch on a new machine.

## Prerequisites

### 1. Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js (v20+)
```bash
brew install node@20
```

Or use nvm for version management:
```bash
brew install nvm
nvm install 20
nvm use 20
```

### 3. Install Rust (required for Tauri desktop builds)
```bash
brew install rust
```

Verify installation:
```bash
rustc --version  # Should be 1.85+ for edition 2024 support
cargo --version
```

### 4. Install Git
```bash
brew install git
```

## Clone and Setup

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/studio-cockpit.git
cd studio-cockpit
```

### 2. Install Node dependencies
```bash
npm install
```

### 3. Set up the database
The SQLite database is automatically created on first run. No manual setup required.

## Running the Application

### Web Development Mode (recommended for development)
```bash
npm run dev
```
Then open http://localhost:3000

### Desktop App (Tauri)
```bash
npm run tauri dev
```

### Build for Production

Web build:
```bash
npm run build
```

Desktop build:
```bash
npm run tauri build
```

## Project Structure Overview

```
studio-cockpit/
├── src/                    # Next.js frontend
│   ├── app/               # App router pages and API routes
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   └── lib/               # Shared utilities, stores, types
├── src-tauri/             # Tauri (Rust) backend
│   └── src/               # Rust source files
├── data/                  # SQLite database location (created on first run)
└── docs/                  # Documentation
```

## Key Technologies

- **Frontend**: Next.js 16, React 19, TypeScript
- **State Management**: Zustand
- **UI Components**: shadcn/ui + Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Desktop**: Tauri 2.x
- **Validation**: Zod

## Common Issues

### "Module not found: @tauri-apps/api/dialog"
This is a Tauri v2 change. The dialog API moved to `@tauri-apps/plugin-dialog`. Already fixed in the codebase.

### Rust version too old
If you see errors about `edition2024`, update Rust:
```bash
brew upgrade rust
```

### Database locked errors
The app uses SQLite with WAL mode. If you see lock errors, ensure only one instance is running.

## Environment Variables

No environment variables are required for local development. The app uses sensible defaults.

## Testing

```bash
npm test
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run tauri dev` | Start Tauri development mode |
| `npm run tauri build` | Build desktop application |

## Contact

For questions about the codebase, refer to:
- `docs/ARCHITECTURE.md` - System architecture
- `docs/notes/IMPROVEMENT_PLAN.md` - Planned improvements
- `docs/notes/ROADMAP.md` - Feature roadmap
