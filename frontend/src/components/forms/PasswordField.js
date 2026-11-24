'use client';

import { useState } from 'react';
import { useField } from 'formik';
import { FormGroup, Label, Input, FormFeedback, FormText } from 'reactstrap';
import styles from './PasswordField.module.scss';

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2.06 12.35a1 1 0 0 1 0-.7C3.42 8.1 7.36 5 12 5s8.58 3.1 9.94 6.65a1 1 0 0 1 0 .7C20.58 15.9 16.64 19 12 19s-8.58-3.1-9.94-6.65" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c4.64 0 8.58 3.1 9.94 6.65a1 1 0 0 1 0 .7 10.8 10.8 0 0 1-1.44 2.49" />
      <path d="M14.08 14.16a3 3 0 0 1-4.24-4.24" />
      <path d="M17.48 17.5A10.8 10.8 0 0 1 12 19c-4.64 0-8.58-3.1-9.94-6.65a1 1 0 0 1 0-.7 10.8 10.8 0 0 1 4.45-5.14" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function PasswordField({ name, label = 'Password', help, autoComplete = 'current-password', ...rest }) {
  const [field, meta] = useField(name);
  const [visible, setVisible] = useState(false);
  const invalid = Boolean(meta.touched && meta.error);
  const id = `field-${name}`;

  return (
    <FormGroup>
      <Label for={id}>{label}</Label>
      <div className={styles.wrap}>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          invalid={invalid}
          className={styles.input}
          {...field}
          {...rest}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {invalid && <FormFeedback className="d-block">{meta.error}</FormFeedback>}
      {help && !invalid && <FormText>{help}</FormText>}
    </FormGroup>
  );
}
