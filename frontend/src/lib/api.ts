import { useAuth } from '@clerk/expo';
import { useCallback } from 'react';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Returns a fetch function that calls the FastAPI backend with the signed-in user's Clerk token.
 * Usage: const api = useApi(); const res = await api('/me');
 */
export function useApi() {
  const { getToken } = useAuth();

  return useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return fetch(`${API_URL}${path}`, { ...init, headers });
    },
    [getToken],
  );
}
