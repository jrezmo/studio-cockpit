# Studio Cockpit

Mission control for professional audio production. Studio Cockpit is a Next.js
app designed as a desktop-style control surface for ingesting files, launching
sessions, printing stems, and managing studio settings.

## Highlights

- Multi-panel dashboard with fast panel switching.
- Ingest Agent view with history and detection rules.
- Session Launcher flow with multi-step UX.
- Stem Engine for generating standardized stem filenames.
- Settings panel backed by persisted state.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript (strict)
- Zustand for client-side state (persisted)
- Tailwind CSS v4 + tw-animate
- Tauri (desktop container support in `src-tauri`)

## Project Structure

- `src/app`: App router layout and entry page.
- `src/components`: UI and feature components.
- `src/lib`: State and utility modules.
- `src-tauri`: Tauri configuration for desktop packaging.

## App Architecture

**State management**
- Central store in `src/lib/store.ts` using Zustand with persistence.
- UI panels are driven by the `activePanel` state, with panel components mapped
  in `src/app/page.tsx`.

**Panels**
- Dashboard: status widgets + project grid.
- Ingest: watcher control, rules, recent history.
- Sessions: guided launch flow with stepper.
- Stems: filename preview and part selection.
- Settings: editable path configuration.

## Getting Started

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

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: build for production
- `npm run start`: run the production build
- `npm run lint`: run ESLint
- `npm run test`: run unit tests (Jest)
- `npm run test:watch`: run Jest in watch mode

## Testing

Unit tests live in `src/__tests__` and cover utilities and key UI logic.
Jest is configured via `jest.config.ts` and `jest.setup.ts`.

## Configuration

There are no required environment variables at the moment. If you add any,
document them in this README under a new **Environment** section.

## Tauri (Desktop App)

Tauri support lives in `src-tauri`. If you plan to build the desktop app, set
up Tauri according to its official docs and ensure the web app builds
successfully first.

## Contributing

- Keep components small and focused.
- Prefer typed props and explicit data flow.
- Use `cn` from `src/lib/utils.ts` for conditional class names.
- Add tests for new utilities and for new business logic inside components.

## License

Proprietary. All rights reserved.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
