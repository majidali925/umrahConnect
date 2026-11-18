'use client';

import { useState } from 'react';
import { Button, Spinner } from 'reactstrap';
import { getErrorMessage } from '@/utils/errors';

/**
 * Opens a private document in a new tab. The file is fetched with the access token
 * (never via a public URL) and shown from a short-lived object URL.
 */
export default function DocumentViewButton({ load, label = 'View', size = 'sm', color = 'primary', outline = true, onError }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    // Open the tab synchronously so popup blockers allow it, then fill it once loaded.
    const tab = window.open('', '_blank');
    setBusy(true);
    try {
      const blob = await load();
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      onError?.(getErrorMessage(err, 'Could not open the document.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size={size} color={color} outline={outline} onClick={handleClick} disabled={busy}>
      {busy ? <Spinner size="sm" /> : label}
    </Button>
  );
}
