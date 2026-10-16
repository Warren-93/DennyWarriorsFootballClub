import React, { useRef, useState } from 'react';
import { uploadMedia } from '../../api/media';
import styles from './ImageField.module.css';

export default function ImageField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const result = await uploadMedia(file);
      onChange(result.url);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>

      <div className={styles.row}>
        <div className={styles.preview}>
          {value ? (
            <img src={value} alt="" />
          ) : (
            <span className={styles.previewEmpty}>No image</span>
          )}
        </div>

        <div className={styles.controls}>
          <input
            type="text"
            className={styles.urlInput}
            value={value || ''}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Image URL, or upload a file"
          />
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Upload file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.hiddenFileInput}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}
