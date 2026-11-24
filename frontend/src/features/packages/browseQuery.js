// The catalogue query behind /packages, built the same way on the server (first render)
// and in the browser (after filters change), so both ask the API for the same page.

export const PAGE_SIZE = 12;

/** `get(key)` returns a URL param's value or ''. */
export function browseQuery(get) {
  return {
    search: get('search'),
    departureCity: get('departureCity'),
    agencyId: get('agencyId'),
    from: get('from'),
    maxPrice: get('maxPrice'),
    sort: get('sort') || 'departure',
    page: Number(get('page')) || 1,
    limit: PAGE_SIZE,
  };
}
