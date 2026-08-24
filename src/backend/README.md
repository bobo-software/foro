# Skaftin SDK Integration

This folder contains the Skaftin Client SDK integration for the kcd-web application.

## Structure

```
src/backend/
├── client/
│   └── SkaftinClient.ts    # Unified client for all Skaftin API interactions
├── services/
│   ├── TableService.ts      # Base service class for table operations
│   └── index.ts            # Service exports
├── types/
│   └── api.types.ts        # TypeScript type definitions
├── utils/
│   ├── auth.ts             # Authentication utilities
│   └── request.ts          # HTTP request utilities (backward compatibility)
└── index.ts                # Main export file
```

## Quick Start

### 1. Environment Setup

Create a `.env` file in the project root with:

```env
VITE_SKAFTIN_API_URL=http://localhost:4006
VITE_SKAFTIN_API_KEY=sk_your_api_key_here
# Optional: used by address autocomplete on company forms
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
# OR
# VITE_SKAFTIN_ACCESS_TOKEN=sat_your_token_here
```

### 2. Using the Client

**Option 1: Direct Client (Recommended)**
```typescript
import { skaftinClient } from './backend';

// GET request
const shops = await skaftinClient.get('/app-api/database/tables/shops/select');

// POST request
const newShop = await skaftinClient.post('/app-api/database/tables/shops/insert', {
  data: { name: 'My Shop', address: '123 Main St' }
});
```

**Option 2: Backward Compatible Utilities**
```typescript
import { get, post } from './backend';

const shops = await get('/app-api/database/tables/shops/select');
```

**Option 3: Service Classes**
```typescript
import { TableService } from './backend/services';

class ShopService extends TableService<Shop> {
  constructor() {
    super('shops');
  }
}

const service = new ShopService();
const shops = await service.findAll();
```

## Features

- ✅ **Unified Client** - Single `SkaftinClient` for all API interactions
- ✅ **Auto Configuration** - Loads from environment variables
- ✅ **JWT Integration** - Automatically injects tokens from `AuthStore`
- ✅ **Type Safety** - Full TypeScript support
- ✅ **Backward Compatible** - Works alongside existing `RequestUtils`
- ✅ **Error Handling** - Consistent error handling across all requests

## Authentication

The client automatically:
- Adds API key/token headers (`x-api-key` or `x-access-token`)
- Injects JWT tokens from `AuthStore` when available
- Extracts project ID from credentials (no need to include in URLs)

## Next Steps

1. **Generate Types** - Create TypeScript types from your database schema
2. **Create Services** - Extend `TableService` for your specific tables
3. **Migrate API Calls** - Gradually replace `RequestUtils` calls with `skaftinClient`
4. **Add WebSocket Support** - See `client-sdk/08-WEBSOCKET-INTEGRATION.md`

## Documentation

See the `client-sdk/` folder for complete documentation:
- `00-QUICK-START.md` - Quick setup guide
- `01-OVERVIEW.md` - Architecture overview
- `02-AUTHENTICATION.md` - Authentication setup
- `04-SERVICE-GENERATION.md` - Creating service classes
- `07-APP-USER-AUTHENTICATION.md` - User management
- `08-WEBSOCKET-INTEGRATION.md` - Real-time updates

