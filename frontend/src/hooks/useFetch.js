'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@/utils/errors';

/**
 * Runs an async loader and tracks loading/error/data. Re-runs when `deps` change.
 * Responses from stale requests are ignored.
 *
 * `initialData` / `initialMeta` (e.g. rendered on the server) are shown straight away; the
 * loader still runs once on mount to refresh them, quietly (without flagging `loading`).
 */
export function useFetch(loader, deps = [], { initialData, initialMeta } = {}) {
  const [state, setState] = useState(() => ({
    data: initialData ?? null,
    meta: initialMeta ?? null,
    loading: initialData === undefined,
    error: null,
  }));
  const requestId = useRef(0);
  const quietRefresh = useRef(initialData !== undefined);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    if (quietRefresh.current) quietRefresh.current = false;
    else setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await loader();
      if (id === requestId.current) setState({ data: res?.data ?? null, meta: res?.meta ?? null, loading: false, error: null });
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  const setData = useCallback((data) => setState((s) => ({ ...s, data })), []);

  return { ...state, reload: run, setData };
}
