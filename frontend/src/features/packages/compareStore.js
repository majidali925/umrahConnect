'use client';

import { useSyncExternalStore } from 'react';

/**
 * Packages a visitor has picked to compare (up to MAX_COMPARE, from any agencies).
 * Kept in localStorage so the choice survives moving between pages, and shared by every
 * component through useCompare(). Items are { _id, title, agencyName } — just enough to
 * show the compare bar; the compare page loads full details itself.
 */

export const MAX_COMPARE = 3;
const KEY = 'uc_compare';
const EMPTY = [];
const listeners = new Set();
let cache = null;

const isItem = (x) => x && typeof x._id === 'string' && /^[a-f0-9]{24}$/i.test(x._id) && typeof x.title === 'string';

function read() {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed.filter(isItem).slice(0, MAX_COMPARE) : EMPTY;
  } catch {
    cache = EMPTY; // storage blocked (private mode) or corrupt: start empty
  }
  return cache;
}

function write(next) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the selection still works for this page view */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  // Keep tabs in sync: another tab changed the selection.
  const onStorage = (e) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useCompare() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const has = (id) => items.some((x) => x._id === id);
  const isFull = items.length >= MAX_COMPARE;

  return {
    items,
    has,
    isFull,
    /** Adds the package if there is room; returns false when the list is already full. */
    add(pkg) {
      if (has(pkg._id)) return true;
      if (isFull) return false;
      write([...items, { _id: pkg._id, title: pkg.title, agencyName: pkg.agency?.businessName || '' }]);
      return true;
    },
    remove(id) {
      write(items.filter((x) => x._id !== id));
    },
    clear() {
      write(EMPTY);
    },
  };
}

/** Link to the compare page for the given package ids. */
export const compareHref = (ids) => `/packages/compare?ids=${ids.join(',')}`;
