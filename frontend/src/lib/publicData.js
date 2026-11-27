'use cache';

// Server-side, cached reads of public catalogue data for SEO-critical rendering
// (package pages, sitemap, share images). Browsers keep using the Axios services.
import { cacheLife } from 'next/cache';

// On a server that also runs the API, API_INTERNAL_URL (e.g. http://127.0.0.1:5000/api/v1)
// avoids a round trip through the public internet.
const API = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const OBJECT_ID = /^[a-f0-9]{24}$/i;

async function getJson(path) {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(10000) });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json();
}

/** A published package, or null when it doesn't exist or isn't public. Throws if the API is down. */
export async function getPublicPackage(id) {
  cacheLife('minutes');
  if (!OBJECT_ID.test(id)) return null;
  const body = await getJson(`/packages/${id}`);
  return body?.data ?? null;
}

/** An approved agency's public profile, or null when it doesn't exist or isn't approved. */
export async function getPublicAgency(id) {
  cacheLife('minutes');
  if (!OBJECT_ID.test(id)) return null;
  const body = await getJson(`/vendors/${id}`);
  return body?.data ?? null;
}

/** Every publicly listed package (id and dates only matter), for the sitemap. */
export async function listPublicPackages() {
  cacheLife('hours');
  const all = [];
  for (let page = 1; page <= 40; page += 1) {
    const body = await getJson(`/packages?limit=50&page=${page}&sort=newest`);
    if (!body) break;
    all.push(...body.data);
    if (page >= (body.meta?.totalPages || 1)) break;
  }
  return all;
}

const query = (params) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined)).toString();

/** One page of the public catalogue as { data, meta }, for server-rendered listings. Throws if the API is down. */
export async function browsePublicPackages(params = {}) {
  cacheLife('minutes');
  const body = await getJson(`/packages?${query(params)}`);
  return { data: body?.data ?? [], meta: body?.meta ?? null };
}

/** Departure cities that currently have listed packages. Throws if the API is down. */
export async function listDepartureCities() {
  cacheLife('hours');
  const body = await getJson('/packages/departure-cities');
  return body?.data ?? [];
}

/**
 * How many upcoming packages are listed in total and from each departure city, for the home
 * page's city chips: { total, cities: [{ city, count }] }, busiest city first. Throws if the API is down.
 */
export async function departureCityCounts() {
  cacheLife('minutes');
  const body = await getJson('/packages/departure-cities/counts');
  return { total: body?.data?.total ?? 0, cities: body?.data?.cities ?? [] };
}
