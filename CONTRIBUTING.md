# Contributing to Studio Cockpit

First off, thank you for considering contributing to Studio Cockpit! We welcome any and all contributions.

## Guiding Principles

- Keep components small and focused.
- Prefer typed props and explicit data flow.
- Use `cn` from `src/lib/utils.ts` for conditional class names.
- Add tests for new utilities and for new business logic inside components.

## Development

### Prerequisites

- Node.js 20+
- npm (or your preferred package manager)

### Install

```bash
npm install
```

### Run the app

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Scripts

- `npm run dev`: start the dev server
- `npm run build`: build for production
- `npm run start`: run the production build
- `npm run lint`: run ESLint
- `npm run test`: run unit tests (Jest)
- `npm run test:watch`: run Jest in watch mode

### Testing

Unit tests live in `src/__tests__` and cover utilities and key UI logic.
Jest is configured via `jest.config.ts` and `jest.setup.ts`.
