import { SKAFTIN_CONFIG } from '../../config/skaftin.config';

/**
 * Database change event types
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
 * Database change event
 */
export interface DatabaseEvent {
  type: DatabaseEventType;
  projectId: string;
  tableName: string;
  data?: any;
  oldData?: any;
  timestamp: string;
}

/**
 * Project-level event
 */
export interface ProjectEvent {
  type: string;
  projectId: string;
  data: unknown;
  timestamp: string;
}

/**
 * Connection status
 */
export interface ConnectionStatus {
  isConnected: boolean;
  reconnectAttempts: number;
  socketId: string | null;
}

type ConnectionListener = (status: ConnectionStatus) => void;

/**
 * WebSocket service for real-time updates
 *
 * Automatically connects to Skaftin WebSocket server using API URL from config.
 * Project ID is automatically extracted from API key/token.
 */
class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private reconnectDelayMs = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private explicitlyDisconnected = false;
  private currentProjectId: string | null = null; // Backward-compatible getter
  private subscribedProjects: Set<string> = new Set();
  private connectionListeners: Set<ConnectionListener> = new Set();
  private databaseListeners: Set<(event: DatabaseEvent) => void> = new Set();
  private projectListeners: Set<(event: ProjectEvent) => void> = new Set();
  private initialized = false;

  private debugLog(message: string, payload?: unknown) {
    const ts = new Date().toISOString();
    if (payload === undefined) {
      console.log(`[WebSocket][${ts}] ${message}`);
      return;
    }
    console.log(`[WebSocket][${ts}] ${message}`, payload);
  }

  /**
   * Initialize and connect to WebSocket server
   * Call this when your app starts (e.g., in App.tsx or a provider)
   */
  init() {
    this.debugLog('init() called');
    this.initialized = true;
    this.shouldReconnect = true;
    this.explicitlyDisconnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connect();
  }

  /**
   * Connect to WebSocket server
   */
  private connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.debugLog('connect() skipped, socket already active', {
        readyState: this.socket.readyState,
      });
      return;
    }

    const apiUrl = SKAFTIN_CONFIG.apiUrl.replace(/\/+$/, '');
    const wsBase = apiUrl.replace(/^http/, 'ws');
    const apiKey = SKAFTIN_CONFIG.apiKey;
    const socketUrl = `${wsBase}/app-api/ws${apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : ''}`;
    this.debugLog('Attempting WebSocket connection', {
      apiUrl,
      wsBase,
      hasApiKey: Boolean(apiKey),
      socketUrl,
      reconnectAttempts: this.reconnectAttempts,
    });

    this.socket = new WebSocket(socketUrl);

    this.socket.addEventListener('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelayMs = 1000;
      this.debugLog('WebSocket connection opened', {
        subscribedProjects: Array.from(this.subscribedProjects),
      });
      this.notifyConnectionListeners();

      // Re-subscribe to all project channels after reconnect.
      this.subscribedProjects.forEach((projectId) => {
        this.debugLog('Re-subscribing project after connect', { projectId });
        this.send({ type: 'subscribe', projectId });
      });
    });

    this.socket.addEventListener('message', (event) => {
      this.debugLog('WebSocket message received (raw)', event.data);
      this.handleMessage(event.data);
    });

    this.socket.addEventListener('close', (event) => {
      this.isConnected = false;
      this.debugLog('WebSocket closed', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      });
      this.notifyConnectionListeners();
      this.scheduleReconnect();
    });

    this.socket.addEventListener('error', (event) => {
      this.reconnectAttempts += 1;
      this.debugLog('WebSocket error event', event);
      this.notifyConnectionListeners();
    });
  }

  private send(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.debugLog('send() skipped, socket not open', {
        payload,
        hasSocket: Boolean(this.socket),
        readyState: this.socket?.readyState ?? null,
      });
      return;
    }
    this.debugLog('Sending WebSocket payload', payload);
    this.socket.send(JSON.stringify(payload));
  }

  private handleMessage(raw: unknown) {
    if (typeof raw !== 'string') return;
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      this.debugLog('Failed to parse incoming message as JSON');
      return;
    }
    this.debugLog('Parsed incoming message', msg);

    if (msg?.type === 'database-change' && msg.payload) {
      this.databaseListeners.forEach((listener) => listener(msg.payload as DatabaseEvent));
      return;
    }

    if (msg?.type === 'project-event' && msg.payload) {
      this.projectListeners.forEach((listener) => listener(msg.payload as ProjectEvent));
      return;
    }

    if (msg?.type === 'subscribed' && typeof msg.projectId === 'string') {
      this.currentProjectId = msg.projectId;
      return;
    }

    if (msg?.type === 'unsubscribed' && typeof msg.projectId === 'string') {
      if (this.currentProjectId === msg.projectId) {
        this.currentProjectId = null;
      }
      return;
    }

    if (msg?.type === 'error') {
      this.debugLog('Server reported WebSocket error', msg);
      console.error('WebSocket error:', msg?.message || 'Unknown error');
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.explicitlyDisconnected) return;
    if (this.reconnectTimer) return;

    const delay = Math.min(this.reconnectDelayMs, 10000);
    this.debugLog('Scheduling reconnect', { delayMs: delay });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts += 1;
      this.debugLog('Reconnect timer fired', {
        reconnectAttempts: this.reconnectAttempts,
      });
      this.notifyConnectionListeners();
      this.connect();
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 10000);
    }, delay);
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(callback: ConnectionListener) {
    this.connectionListeners.add(callback);
    // Immediately notify with current status
    callback(this.getConnectionStatus());
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyConnectionListeners() {
    const status = this.getConnectionStatus();
    this.connectionListeners.forEach((listener) => listener(status));
  }

  /**
   * Join a project room to receive project-specific updates
   * Project ID is automatically extracted from your API key/token
   */
  joinProject(projectId: string) {
    this.debugLog('joinProject() called', { projectId });
    this.currentProjectId = projectId;
    this.subscribedProjects.add(projectId);
    this.send({ type: 'subscribe', projectId });
  }

  /**
   * Leave a project room
   */
  leaveProject(projectId: string) {
    this.debugLog('leaveProject() called', { projectId });
    this.subscribedProjects.delete(projectId);
    this.send({ type: 'unsubscribe', projectId });
    if (this.currentProjectId === projectId) {
      this.currentProjectId = null;
    }
  }

  /**
   * Listen for database change events
   */
  onDatabaseChange(callback: (event: DatabaseEvent) => void) {
    this.databaseListeners.add(callback);
  }

  /**
   * Remove database change listener
   */
  offDatabaseChange(callback: (event: DatabaseEvent) => void) {
    this.databaseListeners.delete(callback);
  }

  /**
   * Listen for project events
   */
  onProjectEvent(callback: (event: ProjectEvent) => void) {
    this.projectListeners.add(callback);
  }

  /**
   * Remove project event listener
   */
  offProjectEvent(callback: (event: ProjectEvent) => void) {
    this.projectListeners.delete(callback);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: null,
    };
  }

  /**
   * Get current project ID
   */
  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.debugLog('disconnect() called');
    this.shouldReconnect = false;
    this.explicitlyDisconnected = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.currentProjectId = null;
      this.notifyConnectionListeners();
    }
  }

  /**
   * Reconnect to server
   */
  reconnect() {
    this.debugLog('reconnect() called');
    this.shouldReconnect = true;
    this.explicitlyDisconnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.connect();
  }

  /**
   * Manual debug reconnect for status button clicks.
   * Keeps existing subscriptions and forces a fresh connect attempt.
   */
  reconnectWithDebug(reason: string = 'manual-status-button') {
    this.debugLog('reconnectWithDebug() called', {
      reason,
      status: this.getConnectionStatus(),
      currentProjectId: this.currentProjectId,
      subscribedProjects: Array.from(this.subscribedProjects),
    });
    this.reconnect();
  }
}

// Export singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
export { webSocketService };
