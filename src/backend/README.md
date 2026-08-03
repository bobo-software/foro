# Backend client

HTTP and realtime clients for **foro-api**.

## Structure

```
src/backend/
├── client/
│   └── ForoApiClient.ts    # Unified HTTP client (JWT, refresh, retries)
├── services/
│   └── WebSocketService.ts # Socket.IO realtime
└── index.ts                # Main export file
```

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root with:

```env
VITE_API_URL=http://localhost:4003
# Optional
VITE_WS_URL=http://localhost:4003
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 2. Using the Client

```typescript
import { foroApiClient } from './backend';

const invoices = await foroApiClient.get('/api/v1/invoices');
const created = await foroApiClient.post('/api/v1/invoices', { /* ... */ });
```

Prefer domain helpers under `src/services/` (e.g. `invoiceService`) rather than calling the client from UI code.

## Features

- Single `ForoApiClient` for all API interactions
- Config from `VITE_API_URL` / `API_CONFIG`
- Automatic Bearer JWT from `TokenManager`
- Retry with backoff, request timeout, GET deduplication
- Session refresh on 401
