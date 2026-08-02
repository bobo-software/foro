/**
 * Backend SDK - Main Export
 */

export { foroApiClient, ForoApiClient } from './client/ForoApiClient';
export type { ApiResponse } from './client/ForoApiClient';

// Deprecated — every service is cut over to foroApiClient except
// paymentGatewayService.ts, which still proxies Skaftin's own Paystack/PayFast
// integration (foro-api has no payment-provider integration yet — a known,
// separately-tracked gap, see docs/02-modules/payments-subscriptions.md).
// Delete this export once that's migrated too.
export { skaftinClient, SkaftinClient } from './client/SkaftinClient';

// WebSocket service
export { default as webSocketService, webSocketService as ws } from './services/WebSocketService';
export type {
  DatabaseEvent,
  ProjectEvent,
  ConnectionStatus,
  DatabaseEventType,
} from './services/WebSocketService';
