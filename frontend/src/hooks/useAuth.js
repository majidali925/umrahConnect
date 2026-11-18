'use client';

import { useSyncExternalStore } from 'react';
import { useSelector } from 'react-redux';
import { selectAuth } from '@/features/auth/authSlice';

const noopSubscribe = () => () => {};

/**
 * Auth state for components. Until hydration finishes it always reports the initial
 * ("idle") state, so server HTML and the first client render match even if the session
 * restore request has already completed.
 */
export function useAuth() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const auth = useSelector(selectAuth);
  const state = hydrated ? auth : { user: null, agency: null, accessToken: null, status: 'idle' };
  return {
    ...state,
    isAuthenticated: state.status === 'authenticated',
    isResolving: state.status === 'idle' || state.status === 'loading',
  };
}
