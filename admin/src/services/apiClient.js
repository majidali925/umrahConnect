import axios from 'axios';
import { API_URL } from '@/constants';

/**
 * Admin Axios instance. The access token lives only in memory (Redux); the admin refresh
 * token is an HTTP-only cookie the browser sends automatically to /admin/auth/* endpoints.
 */
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});

let hooks = {
  getAccessToken: () => null,
  onSessionRefreshed: () => {},
  onSessionExpired: () => {},
};

/** Called once by the store provider to connect the client to auth state. */
export function configureApiClient(config) {
  hooks = { ...hooks, ...config };
}

let refreshPromise = null;

/**
 * Exchanges the refresh cookie for a new session. Concurrent callers share one request,
 * so the refresh token is rotated only once.
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/admin/auth/refresh`, null, { withCredentials: true })
      .then((res) => res.data.data)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = hooks.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const code = error.response?.data?.code;

    if (error.response?.status === 401 && code === 'TOKEN_EXPIRED' && original && !original._retried) {
      original._retried = true;
      try {
        const session = await refreshSession();
        hooks.onSessionRefreshed(session);
        original.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        hooks.onSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && ['ACCOUNT_UNAVAILABLE', 'INVALID_TOKEN'].includes(code)) {
      hooks.onSessionExpired();
    }

    return Promise.reject(error);
  },
);

/** Unwraps the API's { success, message, data, meta } envelope. */
export const unwrap = (promise) => promise.then((res) => res.data);

export default apiClient;
