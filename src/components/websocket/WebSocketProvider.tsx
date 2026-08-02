import { createContext, useContext, useEffect, ReactNode } from 'react';
import { webSocketService } from '../../backend/services/WebSocketService';

interface WebSocketContextValue {
  /**
   * Kept for API compatibility with existing consumers. Room membership is
   * now server-authoritative (see WebSocketService doc comment) — this value
   * is no longer used to join/leave anything, only passed through to hooks
   * that filter incoming events by business id.
   */
  projectId: string | null;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  projectId: null,
});

interface WebSocketProviderProps {
  children: ReactNode;
  /** Business id to scope event filtering to (server decides actual room membership). */
  projectId?: string | null;
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean;
}

/**
 * WebSocket Provider Component
 *
 * Initializes the WebSocket connection and joins the project room.
 * Provides project ID to child components via context.
 *
 * @example
 * ```tsx
 * // In App.tsx or a layout component
 * <WebSocketProvider projectId="your-project-id">
 *   <YourApp />
 * </WebSocketProvider>
 *
 * // In a component that needs real-time updates
 * function MyList() {
 *   const { projectId } = useWebSocketContext();
 *   useAutoRefresh(projectId, 'my_table', refetch);
 *   // ...
 * }
 * ```
 */
export function WebSocketProvider({
  children,
  projectId = null,
  autoConnect = true,
}: WebSocketProviderProps) {
  useEffect(() => {
    if (!autoConnect) return;

    // Initialize WebSocket connection
    webSocketService.init();

    // Join project room if project ID is provided
    if (projectId) {
      webSocketService.joinProject(projectId);
    }

    return () => {
      if (projectId) {
        webSocketService.leaveProject(projectId);
      }
    };
  }, [projectId, autoConnect]);

  return (
    <WebSocketContext.Provider value={{ projectId }}>
      {children}
    </WebSocketContext.Provider>
  );
}

/**
 * Hook to access WebSocket context
 *
 * Returns the current project ID from the WebSocketProvider.
 */
export function useWebSocketContext() {
  return useContext(WebSocketContext);
}

/**
 * Hook to get the current project ID
 *
 * Returns the project ID from context or falls back to config.
 */
export function useProjectId(): string | null {
  const { projectId } = useWebSocketContext();
  return projectId ?? null;
}
