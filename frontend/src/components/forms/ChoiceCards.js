'use client';

import { useField } from 'formik';
import styles from './ChoiceCards.module.scss';

/** Large radio cards for choosing one option, bound to a Formik field. */
export default function ChoiceCards({ name, options, label, disabled = false }) {
  const [field, meta, helpers] = useField(name);
  const invalid = meta.touched && meta.error;

  return (
    <fieldset className="mb-3" disabled={disabled}>
      {label && <legend className="form-label fs-6 mb-2">{label}</legend>}
      <div className={styles.grid} role="radiogroup">
        {options.map((opt) => {
          const selected = field.value === opt.value;
          return (
            <label key={opt.value} className={`${styles.card} ${selected ? styles.selected : ''} ${invalid ? styles.invalid : ''}`}>
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={selected}
                onChange={() => helpers.setValue(opt.value)}
                onBlur={() => helpers.setTouched(true)}
                className="visually-hidden"
              />
              <span className={styles.radio} aria-hidden="true" />
              <span>
                <span className={styles.title}>{opt.label}</span>
                {opt.description && <span className={styles.desc}>{opt.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {invalid && <div className="invalid-feedback d-block">{meta.error}</div>}
    </fieldset>
  );
}
