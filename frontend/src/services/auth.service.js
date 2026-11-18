import apiClient, { unwrap, refreshSession } from './apiClient';

export const authService = {
  register: (payload) => unwrap(apiClient.post('/auth/register', payload)),
  login: (payload) => unwrap(apiClient.post('/auth/login', payload)),
  verifyOtp: (payload) => unwrap(apiClient.post('/auth/verify-otp', payload)),
  resendOtp: (payload) => unwrap(apiClient.post('/auth/resend-otp', payload)),
  forgotPassword: (payload) => unwrap(apiClient.post('/auth/forgot-password', payload)),
  resetPassword: (payload) => unwrap(apiClient.post('/auth/reset-password', payload)),
  logout: () => unwrap(apiClient.post('/auth/logout')),
  me: () => unwrap(apiClient.get('/auth/me')),
  refresh: refreshSession,
};
