/**
 * Backend SDK - Main Export
 */

export { foroApiClient, ForoApiClient } from './client/ForoApiClient';
export type { ApiResponse } from './client/ForoApiClient';

// WebSocket service
export { default as webSocketService, webSocketService as ws } from './services/WebSocketService';
export type {
  DatabaseEvent,
  ProjectEvent,
  ConnectionStatus,
  DatabaseEventType,
} from './services/WebSocketService';
