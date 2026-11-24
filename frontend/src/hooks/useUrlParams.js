'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * List filters stored in the URL, so they survive reloads and can be linked to.
 * setParams({ key: value }) sets or (for empty values) removes keys, and resets to page 1
 * unless `page` itself is being changed.
 *
 * The URL changes through the History API, which Next keeps in sync with useSearchParams
 * without a server round trip; lists refetch their own data.
 */
export function useUrlParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const get = (key, fallback = '') => searchParams.get(key) || fallback;

  const setParams = (updates) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key)));
    if (!('page' in updates)) params.delete('page');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
  };

  return { get, page: Number(searchParams.get('page')) || 1, setParams };
}

/**
 * A search box bound to a URL param: returns [value, setValue, pending]. The URL (and so
 * the list query) updates once the user pauses typing for `delay` ms; `pending` is true
 * while typed text is still waiting to be applied.
 */
export function useUrlSearch(key = 'search', { delay = 350 } = {}) {
  const { get, setParams } = useUrlParams();
  const urlValue = get(key);
  const [value, setValue] = useState(urlValue);
  const debounced = useDebounce(value.trim(), delay);

  useEffect(() => {
    if (debounced !== urlValue) setParams({ [key]: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [value, setValue, value.trim() !== urlValue];
}
