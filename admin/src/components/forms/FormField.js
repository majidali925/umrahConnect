'use client';

import { useField } from 'formik';
import { FormGroup, Label, Input, FormFeedback, FormText } from 'reactstrap';

/**
 * Formik-bound field rendering a Reactstrap input, select or textarea with label,
 * help text and validation feedback.
 *
 *   <FormField name="email" label="Email" type="email" />
 *   <FormField name="province" label="Province" type="select" options={[...]} />
 */
export default function FormField({
  name,
  label,
  type = 'text',
  help,
  options,
  placeholder,
  optional = false,
  className = '',
  children,
  ...rest
}) {
  const [field, meta] = useField(name);
  const invalid = Boolean(meta.touched && meta.error);
  const id = rest.id || `field-${name}`;

  return (
    <FormGroup className={className}>
      {label && (
        <Label for={id}>
          {label}
          {optional && <span className="text-secondary fw-normal ms-1">(optional)</span>}
        </Label>
      )}
      <Input
        id={id}
        type={type}
        placeholder={type === 'select' ? undefined : placeholder}
        invalid={invalid}
        aria-describedby={help ? `${id}-help` : undefined}
        {...field}
        value={field.value ?? ''}
        {...rest}
      >
        {type === 'select' ? (
          <>
            <option value="">{placeholder || 'Select…'}</option>
            {options?.map((opt) => {
              const value = typeof opt === 'string' ? opt : opt.value;
              const text = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={value} value={value}>
                  {text}
                </option>
              );
            })}
          </>
        ) : (
          children
        )}
      </Input>
      {invalid && <FormFeedback>{meta.error}</FormFeedback>}
      {help && !invalid && <FormText id={`${id}-help`}>{help}</FormText>}
    </FormGroup>
  );
}
