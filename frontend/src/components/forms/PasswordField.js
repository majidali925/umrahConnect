'use client';

import { useState } from 'react';
import { useField } from 'formik';
import { FormGroup, Label, Input, InputGroup, Button, FormFeedback, FormText } from 'reactstrap';

export default function PasswordField({ name, label = 'Password', help, autoComplete = 'current-password', ...rest }) {
  const [field, meta] = useField(name);
  const [visible, setVisible] = useState(false);
  const invalid = Boolean(meta.touched && meta.error);
  const id = `field-${name}`;

  return (
    <FormGroup>
      <Label for={id}>{label}</Label>
      <InputGroup className={invalid ? 'has-validation' : ''}>
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          invalid={invalid}
          {...field}
          {...rest}
        />
        <Button
          type="button"
          color="light"
          className="border"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? 'Hide' : 'Show'}
        </Button>
        {invalid && <FormFeedback>{meta.error}</FormFeedback>}
      </InputGroup>
      {help && !invalid && <FormText>{help}</FormText>}
    </FormGroup>
  );
}
