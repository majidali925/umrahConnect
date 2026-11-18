'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { agencyService } from '@/services/agency.service';
import { agencyStatusChanged } from '@/features/auth/authSlice';
import { getErrorMessage } from '@/utils/errors';

const AgencyContext = createContext(null);

/**
 * Loads the signed-in vendor's application once for the whole vendor area and keeps it
 * in sync after edits, uploads and submission.
 */
export function AgencyProvider({ children }) {
  const dispatch = useDispatch();
  const [view, setViewState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const setView = useCallback(
    (next) => {
      setViewState(next);
      if (next?.agency?.verificationStatus) dispatch(agencyStatusChanged(next.agency.verificationStatus));
    },
    [dispatch],
  );

  // State updates happen only in promise callbacks, never synchronously in the effect.
  const reload = useCallback(
    () =>
      agencyService
        .getMine()
        .then((res) => {
          setView(res.data);
          setError(null);
        })
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false)),
    [setView],
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(() => ({ view, loading, error, reload, setView }), [view, loading, error, reload, setView]);
  return <AgencyContext.Provider value={value}>{children}</AgencyContext.Provider>;
}

export function useAgency() {
  const ctx = useContext(AgencyContext);
  if (!ctx) throw new Error('useAgency must be used inside <AgencyProvider>');
  return ctx;
}
