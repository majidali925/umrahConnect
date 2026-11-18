'use client';

import { Alert } from 'reactstrap';

/** Form-level message. `fade` is disabled because reactstrap's Fade is not React 19 compatible. */
export default function FormAlert({ message, color = 'danger', onDismiss, className = '' }) {
  if (!message) return null;
  return (
    <Alert color={color} fade={false} toggle={onDismiss} className={className} role={color === 'danger' ? 'alert' : 'status'}>
      {message}
    </Alert>
  );
}
