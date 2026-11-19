'use client';

import { useState } from 'react';
import { Button } from 'reactstrap';
import { useCompare, MAX_COMPARE } from '../compareStore';

/**
 * "Add to compare" toggle for one package. Sits above a card's stretched link so it can be
 * clicked on its own. When the list is full it explains why instead of adding.
 */
export default function CompareToggle({ pkg, size = 'sm', className = '' }) {
  const { has, add, remove, isFull } = useCompare();
  const [fullNotice, setFullNotice] = useState(false);
  const selected = has(pkg._id);

  const toggle = () => {
    if (selected) {
      remove(pkg._id);
      setFullNotice(false);
    } else if (!add(pkg)) {
      setFullNotice(true);
    }
  };

  return (
    <div className={`position-relative ${className}`} style={{ zIndex: 2 }}>
      <Button
        size={size}
        color={selected ? 'primary' : 'light'}
        className={selected ? '' : 'border'}
        onClick={toggle}
        aria-pressed={selected}
        title={!selected && isFull ? `You can compare up to ${MAX_COMPARE} packages` : undefined}
      >
        {selected ? '✓ Comparing' : '+ Compare'}
      </Button>
      {fullNotice && !selected && (
        <div className="small text-danger text-end mt-1" role="alert">
          You can compare up to {MAX_COMPARE} packages. Remove one first.
        </div>
      )}
    </div>
  );
}
