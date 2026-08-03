import { io, type Socket } from 'socket.io-client';
import { API_CONFIG } from '../../config/api.config';
import { TokenManager } from '../../services/TokenManager';
import { logger } from '../../utils/logger';

/**
 * Database change event types.
 * Only `insert`/`update`/`delete` are actually emitted by foro-api's realtime
 * layer — the DDL/cron variants below mirrored Skaftin's platform-level events,
 * which had no consumer in this app; kept in the union only so existing type
 * annotations across the codebase don't need touching.
 */
export type DatabaseEventType =
  | 'insert'
  | 'update'
  | 'delete'
  | 'create_table'
  | 'drop_table'
  | 'rename_table'
  | 'add_column'
  | 'alter_column'
  | 'drop_column'
  | 'create_constraint'
  | 'drop_constraint'
  | 'create_cron_job'
  | 'update_cron_job'
  | 'delete_cron_job'
  | 'toggle_cron_job'
  | 'import_dump';

/**
 * Database change event.
 * `projectId` here is actually the business id (as a string) — kept under its
 * old name so existing call sites (`event.projectId`) don't need renaming.
 * `oldData` is always undefined; foro-api's `db:change` event doesn't send it.
 */
export interface DatabaseEvent {
  type: DatabaseEventType;
  projectId: string;
  tableName: string;
  data?: unknown;
  oldData?: unknown;
  timestamp: string;
}

/**
 * Project-level event. Skaftin's generic pub/sub `project-event` channel has
 * no foro-api equivalent — this type and `onProjectEvent`/`useProjectEvents`
 * are kept for API compatibility but will never fire. No current consumer
 * was found relying on this at migration time.
 */
export interface ProjectEvent {
  type: string;
  projectId: string;
  data: unknown;
  timestamp: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  socketId: string | null;
}

type ConnectionListener = (status: ConnectionStatus) => void;

interface ForoDbChangeEvent {
  type: 'insert' | 'update' | 'delete';
  table: string;
  businessId: number;
  data?: unknown;
  timestamp: string;
}

/**
 * WebSocket service for real-time updates — thin wrapper around Socket.IO.
 *
 * Room membership is server-authoritative: on connect, foro-api joins the
 * socket to `business:<id>` for every business the authenticated user has an
 * active `team_memberships` row in. There is no client-side "join a project"
 * concept anymore (unlike Skaftin) — `joinProject`/`leaveProject` are kept as
 * no-ops for call-site compatibility; the server decides room membership from
 * the JWT alone.
 */
class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private databaseListeners: Set<(event: DatabaseEvent) => void> = new Set();
  private projectListeners: Set<(event: ProjectEvent) => void> = new Set();
  private initialized = false;

  private debugLog(message: string, payload?: unknown) {
    const ts = new Date().toISOString();
    if (payload === undefined) {
      logger.log(`[WebSocket][${ts}] ${message}`);
      return;
    }
    logger.log(`[WebSocket][${ts}] ${message}`, payload);
  }

  /** Initialize and connect to the realtime server. Call this once when the app starts. */
  init() {
    this.debugLog('init() called');
    this.initialized = true;
    this.connect();
  }

  private connect() {
    if (this.socket?.connected) {
      this.debugLog('connect() skipped, socket already connected');
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) {
      this.debugLog('connect() skipped, no access token yet');
      return;
    }

    this.socket?.disconnect();
    this.socket = io(API_CONFIG.apiUrl, { auth: { token }, reconnection: true });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.debugLog('Socket connected', { id: this.socket?.id });
      this.notifyConnectionListeners();
    });

    this.socket.on('disconnect', (reason) => {
      this.debugLog('Socket disconnected', { reason });
      this.notifyConnectionListeners();
    });

    this.socket.on('connect_error', (err) => {
      this.reconnectAttempts += 1;
      this.debugLog('Socket connect_error', err);
      this.notifyConnectionListeners();
    });

    this.socket.on('db:change', (event: ForoDbChangeEvent) => {
      this.debugLog('db:change received', event);
      const mapped: DatabaseEvent = {
        type: event.type,
        projectId: String(event.businessId),
        tableName: event.table,
        data: event.data,
        timestamp: event.timestamp,
      };
      this.databaseListeners.forEach((listener) => listener(mapped));
    });
  }

  /** No-op — room membership is server-authoritative (see class doc). Kept for call-site compatibility. */
  joinProject(_projectId: string) {
    this.debugLog('joinProject() is a no-op under foro-api realtime (server-authoritative rooms)');
  }

  /** No-op — see `joinProject`. */
  leaveProject(_projectId: string) {
    this.debugLog('leaveProject() is a no-op under foro-api realtime (server-authoritative rooms)');
  }

  onConnectionChange(callback: ConnectionListener) {
    this.connectionListeners.add(callback);
    callback(this.getConnectionStatus());
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyConnectionListeners() {
    const status = this.getConnectionStatus();
    this.connectionListeners.forEach((listener) => listener(status));
  }

  onDatabaseChange(callback: (event: DatabaseEvent) => void) {
    this.databaseListeners.add(callback);
  }

  offDatabaseChange(callback: (event: DatabaseEvent) => void) {
    this.databaseListeners.delete(callback);
  }

  /** Never fires — see `ProjectEvent` doc comment. */
  onProjectEvent(callback: (event: ProjectEvent) => void) {
    this.projectListeners.add(callback);
  }

  offProjectEvent(callback: (event: ProjectEvent) => void) {
    this.projectListeners.delete(callback);
  }

  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: Boolean(this.socket?.connected),
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id ?? null,
    };
  }

  /** @deprecated no client-side project concept anymore; always returns null. */
  getCurrentProjectId(): string | null {
    return null;
  }

  disconnect() {
    this.debugLog('disconnect() called');
    this.socket?.disconnect();
    this.socket = null;
    this.notifyConnectionListeners();
  }

  reconnect() {
    this.debugLog('reconnect() called');
    this.connect();
  }

  reconnectWithDebug(reason: string = 'manual-status-button') {
    this.debugLog('reconnectWithDebug() called', { reason, status: this.getConnectionStatus() });
    this.reconnect();
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;
export { webSocketService };
