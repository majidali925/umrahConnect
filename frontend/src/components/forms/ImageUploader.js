'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button, Progress } from 'reactstrap';
import CloudImage from '@/components/common/CloudImage';
import { IMAGE_UPLOAD } from '@/constants';
import { getErrorMessage } from '@/utils/errors';
import styles from './ImageUploader.module.scss';

/** Client-side checks mirroring the API (which re-checks everything). Returns an error or null. */
export function checkImageFile(file) {
  if (!IMAGE_UPLOAD.mimeTypes.includes(file.type)) return 'Only JPG, PNG and WebP photos are allowed.';
  if (file.size > IMAGE_UPLOAD.maxSizeMb * 1024 * 1024) {
    return `This photo is too large. Maximum size is ${IMAGE_UPLOAD.maxSizeMb} MB.`;
  }
  return null;
}

/**
 * Photo picker with a preview in the shape the photo will be shown in.
 *
 * - Upload straight away: pass `onUpload(file, onProgress)` (and `onRemove()`), both returning promises.
 * - Pick now, upload later (e.g. before a package exists): pass `onSelect(file | null)` instead.
 */
export default function ImageUploader({
  imageUrl,
  onUpload,
  onRemove,
  onSelect,
  aspectRatio = '16 / 9',
  sizes = '(min-width: 992px) 640px, 100vw',
  emptyLabel = 'No photo yet',
  hint,
}) {
  const id = useId();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  // Local preview for a picked file (deferred mode).
  const [localUrl, setLocalUrl] = useState(null);
  useEffect(() => () => localUrl && URL.revokeObjectURL(localUrl), [localUrl]);

  const busy = progress !== null || removing;
  const shownUrl = localUrl || imageUrl;

  const handleFile = async (file) => {
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    const problem = checkImageFile(file);
    setError(problem);
    if (problem) return;

    if (onSelect) {
      setLocalUrl(URL.createObjectURL(file));
      onSelect(file);
      return;
    }
    setProgress(0);
    try {
      await onUpload(file, setProgress);
    } catch (err) {
      setError(getErrorMessage(err, 'Upload failed. Please try again.'));
    } finally {
      setProgress(null);
    }
  };

  const handleRemove = async () => {
    setError(null);
    if (onSelect) {
      setLocalUrl(null);
      onSelect(null);
      return;
    }
    setRemoving(true);
    try {
      await onRemove();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div>
      <div className={styles.preview} style={{ aspectRatio }}>
        {shownUrl ? (
          localUrl ? (
            // A local blob: next/image can't optimise it, and doesn't need to.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={localUrl} alt="Selected photo preview" className={styles.img} />
          ) : (
            <CloudImage src={shownUrl} alt="Current photo" fill sizes={sizes} className={styles.img} />
          )
        ) : (
          <div className={styles.placeholder}>
            <span aria-hidden="true" className={styles.icon}>
              ▣
            </span>
            {emptyLabel}
          </div>
        )}
        {progress !== null && (
          <div className={styles.overlay}>
            <Progress value={progress} color="primary" className="w-75" style={{ height: 8 }} />
            <div className="small mt-2">Uploading… {progress}%</div>
          </div>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={IMAGE_UPLOAD.accept}
          className="d-none"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={busy}
        />
        <label htmlFor={id} className={`btn btn-sm ${shownUrl ? 'btn-outline-primary' : 'btn-primary'} mb-0 ${busy ? 'disabled' : ''}`}>
          {shownUrl ? 'Change photo' : 'Upload photo'}
        </label>
        {shownUrl && (onRemove || onSelect) && (
          <Button type="button" size="sm" color="light" className="border" onClick={handleRemove} disabled={busy}>
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        )}
        <span className="small text-secondary">
          {hint || `JPG, PNG or WebP · max ${IMAGE_UPLOAD.maxSizeMb} MB`}
        </span>
      </div>

      {error && (
        <div className="small text-danger mt-2" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
