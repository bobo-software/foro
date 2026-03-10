import { useEffect, useState, useCallback, useRef } from 'react';
import webSocketService, {
  DatabaseEvent,
  ProjectEvent,
  ConnectionStatus,
} from '../backend/services/WebSocketService';

/**
 * Hook for WebSocket connection status
 *
 * Returns the current connection status and methods to reconnect/disconnect.
 * Automatically updates when connection status changes.
 */
export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>(
    webSocketService.getConnectionStatus()
  );

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = webSocketService.onConnectionChange(setStatus);
    return unsubscribe;
  }, []);

  const reconnect = useCallback(() => webSocketService.reconnect(), []);
  const reconnectWithDebug = useCallback(
    () => webSocketService.reconnectWithDebug('status-button-click'),
    []
  );
  const disconnect = useCallback(() => webSocketService.disconnect(), []);

  return {
    ...status,
    reconnect,
    reconnectWithDebug,
    disconnect,
  };
}

/**
 * Hook for listening to database events
 *
 * @param projectId - Project ID (uses current project if not provided)
 * @param tableName - Specific table to listen to (optional, listens to all if not provided)
 * @param onEvent - Callback when event is received
 */
export function useDatabaseEvents(
  projectId: string | null | undefined,
  tableName: string | null | undefined,
  onEvent: (event: DatabaseEvent) => void
) {
  const callbackRef = useRef(onEvent);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!projectId) return;

    // Join project room
    webSocketService.joinProject(projectId);

    // Create stable callback
    const handleEvent = (event: DatabaseEvent) => {
      // Filter by table name if provided
      if (tableName && event.tableName !== tableName) {
        return;
      }
      callbackRef.current(event);
    };

    // Register listener
    webSocketService.onDatabaseChange(handleEvent);

    // Cleanup
    return () => {
      webSocketService.offDatabaseChange(handleEvent);
      webSocketService.leaveProject(projectId);
    };
  }, [projectId, tableName]);
}

/**
 * Hook for listening to project events
 *
 * @param projectId - Project ID
 * @param onEvent - Callback when event is received
 */
export function useProjectEvents(
  projectId: string | null | undefined,
  onEvent: (event: ProjectEvent) => void
) {
  const callbackRef = useRef(onEvent);

  useEffect(() => {
    callbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!projectId) return;

    webSocketService.joinProject(projectId);

    const handleEvent = (event: ProjectEvent) => {
      callbackRef.current(event);
    };

    webSocketService.onProjectEvent(handleEvent);

    return () => {
      webSocketService.offProjectEvent(handleEvent);
      webSocketService.leaveProject(projectId);
    };
  }, [projectId]);
}

/**
 * Hook for automatic data refresh on database changes
 *
 * @param projectId - Project ID
 * @param tableName - Table to watch (null to watch all tables)
 * @param refetch - Function to refetch data
 * @param options - Additional options
 */
export function useAutoRefresh(
  projectId: string | null | undefined,
  tableName: string | null | undefined,
  refetch: () => void | Promise<void>,
  options?: {
    /** Event types to trigger refresh (default: insert, update, delete) */
    eventTypes?: string[];
    /** Debounce delay in ms (default: 300) */
    debounceMs?: number;
    /** Whether to log events (default: false) */
    debug?: boolean;
  }
) {
  const {
    eventTypes = ['insert', 'update', 'delete'],
    debounceMs = 300,
    debug = false,
  } = options || {};

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refetchRef = useRef(refetch);

  // Keep refetch ref updated
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useDatabaseEvents(projectId, tableName, (event) => {
    // Only trigger for specified event types
    if (!eventTypes.includes(event.type)) {
      return;
    }

    if (debug) {
      console.log('🔄 Auto-refreshing due to:', event.type, event.tableName);
    }

    // Debounce rapid updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      refetchRef.current();
    }, debounceMs);
  });

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}

/**
 * Hook for tracking the last database event
 *
 * @param projectId - Project ID
 * @param tableName - Table to watch (optional)
 */
export function useLastDatabaseEvent(
  projectId: string | null | undefined,
  tableName?: string | null
) {
  const [lastEvent, setLastEvent] = useState<DatabaseEvent | null>(null);

  useDatabaseEvents(projectId, tableName ?? null, (event) => {
    setLastEvent(event);
  });

  return lastEvent;
}
