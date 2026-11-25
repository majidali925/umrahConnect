/**
 * How the API client reads and updates auth state. Kept apart from apiClient (and axios) so
 * the store can be wired up without loading the HTTP client on pages that make no requests.
 */
let hooks = {
  getAccessToken: () => null,
  onSessionRefreshed: () => {},
  onSessionExpired: () => {},
};

/** Called once by the store provider to connect the client to auth state. */
export function configureApiClient(config) {
  hooks = { ...hooks, ...config };
}

/** The current hooks (read per request, so they always reflect the connected store). */
export const apiHooks = () => hooks;
