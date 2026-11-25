// The catalogue query behind /packages, built the same way on the server (first render)
// and in the browser (after filters change), so both ask the API for the same page.

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: 'departure', label: 'Departure: soonest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest first' },
];

export const PRICE_OPTIONS = [200000, 300000, 400000, 500000, 750000, 1000000];

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
