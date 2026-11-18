import apiClient, { unwrap, refreshSession } from './apiClient';

/** Admin sign-in. Uses /admin/auth only; marketplace accounts cannot sign in here. */
export const adminAuthService = {
  login: (payload) => unwrap(apiClient.post('/admin/auth/login', payload)),
  logout: () => unwrap(apiClient.post('/admin/auth/logout')),
  me: () => unwrap(apiClient.get('/admin/auth/me')),
  refresh: refreshSession,
};
