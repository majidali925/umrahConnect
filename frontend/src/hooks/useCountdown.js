'use client';

import { useEffect, useState } from 'react';

/** Seconds remaining until `target` (ms timestamp); 0 when elapsed. */
export function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target || target <= Date.now()) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  return target ? Math.max(0, Math.ceil((target - now) / 1000)) : 0;
}
