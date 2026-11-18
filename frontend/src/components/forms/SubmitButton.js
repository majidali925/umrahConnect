'use client';

import { Button, Spinner } from 'reactstrap';

export default function SubmitButton({ loading, children, loadingText, block = false, ...rest }) {
  return (
    <Button type="submit" color="primary" disabled={loading} className={block ? 'w-100' : ''} {...rest}>
      {loading && <Spinner size="sm" className="me-2" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
