# Foro Web

A modern invoice management application built with React, TypeScript, and the **foro-api** backend.

## Features

- Create, read, update, and delete invoices and quotations
- Customer / company management
- Projects, tasks, and portal invites
- Subscriptions and team management
- Modern, responsive UI

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Backend

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:4003
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

Optional: `VITE_WS_URL` for Socket.IO (defaults to `VITE_API_URL` when unset).

Run **foro-api** separately (sibling repo) and point `VITE_API_URL` at it.

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5178` (or the port Vite assigns).

## Project Structure

```
src/
├── backend/              # foro-api client + WebSocket
│   ├── client/
│   │   └── ForoApiClient.ts
│   └── index.ts
├── components/           # React components
├── services/             # API service layer
├── stores/               # Zustand stores
├── types/                # TypeScript types
├── App.tsx               # Main app component
└── main.tsx              # Entry point
```

## Backend Integration

HTTP calls go through `foroApiClient` (`src/backend/client/ForoApiClient.ts`), which handles JWT auth, refresh, retries, and timeouts. Domain services under `src/services/` wrap API routes.

## Environment Variables

- `VITE_API_URL`: foro-api base URL (required)
- `VITE_WS_URL`: Socket.IO URL (optional; defaults to API URL)
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Places API key (company address autocomplete)

## Coolify Deployment Notes

- Build Pack: `Dockerfile`
- Base Directory: `/`
- Dockerfile Location: `/dockerfile`
- Container Port: `80`
- Build-time variables (Vite embeds these into the static bundle):
  - `VITE_API_URL` — foro-api base URL (required), e.g. `https://api.example.com`
  - `VITE_GOOGLE_MAPS_API_KEY` — optional Google Maps Places key
- Remove backend-only pre-deploy commands (for example `php artisan migrate`) for this frontend service.

Example local build:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com \
  -t foro-web \
  -f dockerfile \
  .
```

## License

MIT
