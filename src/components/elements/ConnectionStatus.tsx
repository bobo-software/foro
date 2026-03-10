import { useWebSocket } from '../../hooks/useWebSocket';

interface ConnectionStatusProps {
  /** Show reconnect button when disconnected (default: true) */
  showReconnectButton?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Compact mode - only show dot indicator */
  compact?: boolean;
}

/**
 * Connection status indicator component
 *
 * Shows the current WebSocket connection status with optional reconnect button.
 */
export function ConnectionStatus({
  showReconnectButton = true,
  className = '',
  compact = false,
}: ConnectionStatusProps) {
  const { isConnected, reconnectAttempts, reconnect } = useWebSocket();

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 ${className}`}
        title={isConnected ? 'Connected' : 'Disconnected'}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? 'bg-green-500 animate-pulse'
              : 'bg-red-500'
          }`}
        />
      </div>
    );
  }

  if (isConnected) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Connected
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 ${className}`}
    >
      <span className="w-2 h-2 rounded-full bg-red-500" />
      <span>
        Disconnected
        {reconnectAttempts > 0 && (
          <span className="ml-1 text-red-500 dark:text-red-400">
            (Attempt {reconnectAttempts})
          </span>
        )}
      </span>
      {showReconnectButton && (
        <button
          onClick={reconnect}
          className="ml-2 px-2 py-0.5 rounded bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}

/**
 * Inline connection dot indicator
 *
 * A minimal indicator showing only the connection status dot.
 */
export function ConnectionDot({ className = '' }: { className?: string }) {
  const { isConnected, reconnectWithDebug } = useWebSocket();

  return (
    <button
      type="button"
      onClick={reconnectWithDebug}
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 ${className}`}
      title="Connection status (click to attempt reconnect and log WebSocket events)"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      Status
    </button>
  );
}
