'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * A Link that prefetches its page when the visitor shows intent (hover, keyboard focus or
 * touch) instead of as soon as it scrolls into view. Pages with many links stay light while
 * loading, and a navigation the visitor is about to make is still prefetched in time.
 */
export default function IntentLink({ href, onMouseEnter, onFocus, onTouchStart, ...props }) {
  const router = useRouter();
  const prefetch = () => {
    // In-page anchors ("/#faq") and external links need no prefetch.
    if (typeof href === 'string' && href.startsWith('/') && !href.startsWith('/#')) router.prefetch(href);
  };
  const withPrefetch = (handler) => (e) => {
    prefetch();
    handler?.(e);
  };

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={withPrefetch(onMouseEnter)}
      onFocus={withPrefetch(onFocus)}
      onTouchStart={withPrefetch(onTouchStart)}
      {...props}
    />
  );
}
