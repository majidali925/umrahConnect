'use client';

import { useEffect, useState } from 'react';
import { useField, useFormikContext } from 'formik';
import { FormGroup, Label, Input, FormFeedback, FormText, Spinner } from 'reactstrap';
import { agencyPackageService } from '@/services/package.service';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDistance } from '@/utils/format';
import styles from './HotelNameField.module.scss';

const MIN_CHARS = 3;

/**
 * Hotel name input with search-as-you-type suggestions near the Haram of `city`
 * ('MAKKAH' | 'MADINAH'). Picking a suggestion fills the hotel name and its distance from
 * the Haram (`${prefix}.distanceMeters`); the owner can still type any name and distance.
 * `onPick(hotel)` lets the parent show where an auto-filled distance came from.
 */
export default function HotelNameField({ prefix, city, label, placeholder, onPick }) {
  const name = `${prefix}.name`;
  const id = `field-${name}`;
  const listId = `${id}-suggestions`;
  const [field, meta] = useField(name);
  const { setFieldValue } = useFormikContext();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Latest finished search: `key` says which city and text its results belong to.
  const [lookup, setLookup] = useState({ key: '', results: [], error: null });
  const debounced = useDebounce(query.trim(), 450);

  // Search only on what the owner typed, never on values loaded into an edit form.
  useEffect(() => {
    if (debounced.length < MIN_CHARS) return undefined;
    let cancelled = false;
    const key = `${city}:${debounced}`;
    agencyPackageService
      .searchHotels(city, debounced)
      .then((res) => {
        if (!cancelled) setLookup({ key, results: res.data || [], error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        const error = err.response?.data?.message || 'Hotel search is unavailable. Enter the distance yourself.';
        setLookup({ key, results: [], error });
      });
    return () => {
      cancelled = true;
    };
  }, [city, debounced]);

  const typed = query.trim().length >= MIN_CHARS;
  const settled = lookup.key === `${city}:${query.trim()}`; // finished searching what is in the box
  const loading = typed && !settled;
  const results = settled ? lookup.results : [];
  const lookupError = settled ? lookup.error : null;
  const showList = open && typed;

  const pick = (hotel) => {
    setFieldValue(name, hotel.name, true);
    setFieldValue(`${prefix}.distanceMeters`, hotel.distanceMeters, true);
    onPick?.(hotel);
    setQuery('');
    setActive(-1);
    setOpen(false);
  };

  const handleChange = (e) => {
    field.onChange(e);
    setQuery(e.target.value);
    setActive(-1);
    setOpen(true);
    onPick?.(null); // the name no longer matches the auto-filled distance
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!showList || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting the form
      pick(results[active]);
    }
  };

  const invalid = Boolean(meta.touched && meta.error);

  return (
    <FormGroup className={`mb-0 ${styles.wrapper}`}>
      <Label for={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder={placeholder}
        invalid={invalid}
        {...field}
        value={field.value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          field.onBlur(e);
          setOpen(false);
        }}
      />
      {invalid && <FormFeedback>{meta.error}</FormFeedback>}
      {!invalid && <FormText>Type 3+ letters to search hotels and fill in the distance automatically</FormText>}

      {showList && (
        <ul id={listId} role="listbox" className={`list-group shadow-sm ${styles.list}`}>
          {loading && (
            <li className="list-group-item small text-secondary">
              <Spinner size="sm" className="me-2" />
              Searching hotels…
            </li>
          )}
          {settled && lookupError && <li className="list-group-item small text-danger">{lookupError}</li>}
          {settled && !lookupError && results.length === 0 && (
            <li className="list-group-item small text-secondary">No hotels found. Keep typing the name and enter the distance yourself.</li>
          )}
          {!loading &&
            results.map((hotel, i) => (
              <li
                key={`${hotel.name}-${hotel.lat}-${hotel.lng}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`list-group-item list-group-item-action ${styles.option} ${i === active ? 'active' : ''}`}
                // mousedown fires before the input's blur, so the list is still there to click
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(hotel);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <div className="d-flex justify-content-between gap-3">
                  <span className="fw-semibold">{hotel.name}</span>
                  <span className="text-nowrap">{formatDistance(hotel.distanceMeters)}</span>
                </div>
                {hotel.address && <div className={`small ${i === active ? '' : 'text-secondary'}`}>{hotel.address}</div>}
              </li>
            ))}
        </ul>
      )}
    </FormGroup>
  );
}
