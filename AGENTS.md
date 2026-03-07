# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Foroman is a React + TypeScript SPA (Vite dev server on port 5178) for invoice/quotation management. The entire backend is an external BaaS called **Skaftin** — there are no local backend services, databases, or Docker Compose files in this repo.

### Environment variables

A `.env` file is required at the project root with at least:

```
VITE_SKAFTIN_API_URL=http://localhost:4006
VITE_SKAFTIN_API_KEY=sk_your_api_key_here
```

The `.env` file is gitignored. Without valid Skaftin credentials, the frontend will load but API calls (auth, CRUD) will fail.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 5178) |
| Build | `npm run build` |
| Lint | `npm run lint` |
| Preview prod build | `npm run preview` |

### Testing

The project uses Vitest + React Testing Library. Tests live alongside source files (`*.test.ts` / `*.test.tsx`).

| Task | Command |
|------|---------|
| Run tests | `npm test` |
| Watch mode | `npm run test:watch` |
| Coverage | `npm run test:coverage` |

### Architecture notes

- **Code splitting**: All authenticated routes are lazy-loaded via `React.lazy` in `App.tsx`. The landing page, login, and register routes are eagerly loaded.
- **Error Boundary**: `src/components/ErrorBoundary.tsx` wraps the entire app in `App.tsx`. It shows a recovery UI with "Try again" and "Go to Dashboard" buttons.
- **Environment validation**: `src/config/env.ts` uses Zod to validate `VITE_*` env vars at startup. In dev mode it falls back to defaults; in production it throws on invalid config.
- **Validation schemas**: `src/validation/schemas.ts` exports Zod schemas for all entities (invoice, quotation, company, item, payment, auth). Import and use `schema.safeParse(data)` in forms/services.
- **API client**: `SkaftinClient` has retry with exponential backoff (3 retries, jitter), 30s request timeout via AbortController, and GET request deduplication.
- **Accessibility**: Skip-to-content link in `main.tsx`, `id="main-content"` on the main content area in `AppLayout.tsx`.

### Gotchas

- The ESLint config was renamed from `eslint.config.js` to `eslint.config.cjs` because the project uses `"type": "module"` in `package.json` but the ESLint config uses CommonJS `require()` syntax. If you see ESLint failures about `require is not defined`, ensure the config file has the `.cjs` extension.
- `eslint-plugin-react` is needed as a devDependency (it's referenced in the ESLint config). If `npm install` doesn't install it, run `npm install --save-dev eslint-plugin-react`.
- The project uses `rolldown-vite` (aliased as `vite` via npm overrides). This requires Node 20.19+ or 22.12+.
- The project uses Zod v4, which has a different API from v3. Use `{ message: '...' }` instead of `{ required_error: '...' }` in schema constructors.
