# Debt: Console Logs in Production Paths

**Status: Resolved.**

All `console.log` and `console.warn` calls in non-test code have been replaced with the `logger` utility.

---

## Resolution

`src/utils/logger.ts` was created:

```ts
const isDev = import.meta.env.DEV;
export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => console.error(...args),
};
```

Files updated:
- `src/backend/client/SkaftinClient.ts`
- `src/backend/services/WebSocketService.ts`
- `src/hooks/useTokenRefresh.ts`
- `src/hooks/useSessionCheck.ts`
- `src/hooks/useWebSocket.ts`
- `src/config/env.ts`
- `src/utils/pdfLogoHelper.ts`
