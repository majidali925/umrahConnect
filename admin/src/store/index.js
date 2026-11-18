import { configureStore } from '@reduxjs/toolkit';
import authReducer, { sessionRefreshed, sessionCleared } from '@/features/auth/authSlice';
import { configureApiClient } from '@/services/apiClient';

// A plain root reducer instead of a reducer map: Redux's combineReducers probes reducers
// with a Math.random() action type, which Next.js Cache Components rejects during prerender.
// Add new slices here as the app grows.
const rootReducer = (state = {}, action) => ({
  auth: authReducer(state.auth, action),
});

/** Creates a store. Side-effect free: connect it to the API client with `connectApiClient`. */
export function makeStore() {
  return configureStore({ reducer: rootReducer });
}

/**
 * Points the shared API client at `store` (token reads, refresh, expiry). Must be called
 * with the store that is actually rendered — idempotent, so calling it again is safe.
 */
export function connectApiClient(store) {
  configureApiClient({
    getAccessToken: () => store.getState().auth.accessToken,
    onSessionRefreshed: (session) => store.dispatch(sessionRefreshed(session)),
    onSessionExpired: () => store.dispatch(sessionCleared()),
  });
}
