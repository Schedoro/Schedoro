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

// shapes shared by the backend models (backend/models.py)
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
export type ApiLocation = { address: string; latitude?: number | null; longitude?: number | null; placeId?: string | null };
export type ApiWindow = { dayOfWeek: DayOfWeek; startTime: string; endTime: string };

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

async function readError(res: Response) {
  if (res.status === 401) return 'The server couldn’t verify your sign-in. Try signing out and back in.';
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') return body.detail;
  } catch {
    // not json, fall back to the messages below
  }
  if (res.status === 422) return 'Some of the details aren’t valid. Check them and try again.';
  return `Something went wrong on the server (error ${res.status}).`;
}

export const jsonHeaders = { 'Content-Type': 'application/json' };

/**
 * Like useApi, but throws an ApiError with a message the app can show if the request fails.
 * Usage: const request = useRequest(); const res = await request('/teams');
 */
export function useRequest() {
  const api = useApi();

  return useCallback(
    async (path: string, init?: RequestInit) => {
      let res: Response;
      try {
        res = await api(path, init);
      } catch {
        throw new ApiError('Can’t reach the Schedoro server. Check your connection and try again.');
      }
      if (!res.ok) throw new ApiError(await readError(res), res.status);
      return res;
    },
    [api],
  );
}

/**
 * useRequest for routes under /teams/{teamId}/{resource}.
 * Usage: const request = useTeamApi(teamId, 'jobs'); await request('/123');
 */
export function useTeamApi(teamId: string | undefined, resource: 'jobs' | 'members') {
  const request = useRequest();

  return useCallback(
    async (path = '', init?: RequestInit) => {
      if (!teamId) throw new ApiError('Pick a team first.');
      return request(`/teams/${encodeURIComponent(teamId)}/${resource}${path}`, init);
    },
    [request, teamId, resource],
  );
}
