// src/hooks/useTokenRefresh.ts

import { useEffect, useRef } from 'react';
import { TokenManager } from '../services/TokenManager';
import { skaftinClient } from '../backend';
import useAuthStore from '../stores/data/AuthStore';
import { SKAFTIN_CONFIG } from '../config/skaftin.config';
import { logger } from '../utils/logger';

/**
 * Proactively refresh the token before it expires
 * This prevents the user from experiencing any interruption
 */
export function useTokenRefresh() {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const accessToken = useAuthStore((s) => s.accessToken);
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

    const checkAndRefresh = async () => {
      // Check if token will expire soon
      if (TokenManager.isTokenExpired(SKAFTIN_CONFIG.tokenRefreshBuffer)) {
        logger.log('Token expiring soon, proactively refreshing...');
        
        try {
          const response = await skaftinClient.post<{ accessToken?: string }>(
            SKAFTIN_CONFIG.endpoints.sessionRefresh
          );
          
          if (response.data?.accessToken) {
            TokenManager.setAccessToken(response.data.accessToken);
            logger.log('Token proactively refreshed');
          }
        } catch (error) {
          logger.error('Proactive token refresh failed:', error);
          // Don't logout here - the 401 interceptor will handle it if needed
        }
      }
    };

    // Check every minute
    intervalRef.current = setInterval(checkAndRefresh, 60 * 1000);

    // Also check on mount
    checkAndRefresh();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated]);
}

export default useTokenRefresh;
