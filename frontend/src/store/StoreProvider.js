'use client';

import { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore, connectApiClient } from './index';
import { initAuth } from '@/features/auth/authSlice';

export default function StoreProvider({ children }) {
  // One store per browser session, created lazily on first render.
  const [store] = useState(makeStore);

  // Wire the API client to the store React actually kept. Strict Mode runs state
  // initializers twice and discards one result, so this must not happen inside makeStore.
  // Runs during render (idempotent) so it is in place before any child effect fires a request.
  connectApiClient(store);

  useEffect(() => {
    store.dispatch(initAuth());
  }, [store]);

  return <Provider store={store}>{children}</Provider>;
}
