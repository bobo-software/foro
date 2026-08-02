// src/hooks/useSessionCheck.ts

import { useEffect, useRef } from 'react';
import useAuthStore from '../stores/data/AuthStore';
import { API_CONFIG } from '../config/api.config';
import { logger } from '../utils/logger';

/**
 * Periodically verify the session is still valid
 * @param intervalMs - How often to check (default: 5 minutes)
 */
export function useSessionCheck(intervalMs = API_CONFIG.sessionCheckInterval) {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const accessToken = useAuthStore((s) => s.accessToken);
  const verifySession = useAuthStore((s) => s.verifySession);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!(sessionUser?.accessToken || accessToken);

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkSession = async () => {
      const isValid = await verifySession();
      if (!isValid) {
        logger.log('Session expired during periodic check');
      }
    };

    // Check immediately after mount
    checkSession();

    // Then check periodically
    intervalRef.current = setInterval(checkSession, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, verifySession, intervalMs]);
}

export default useSessionCheck;
