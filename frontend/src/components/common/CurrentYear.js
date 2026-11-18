/** Cached server component, so prerendered pages get the year without a request-time read. */
export default async function CurrentYear() {
  'use cache';
  return new Date().getFullYear();
}
