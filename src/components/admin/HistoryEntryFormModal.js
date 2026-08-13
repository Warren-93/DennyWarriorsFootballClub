import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import ImageField from './ImageField';
import { createHistoryEntry, updateHistoryEntry } from '../../api/history';
import styles from './AdminForm.module.css';

const HISTORY_TYPES = ['TIMELINE', 'HONOUR'];

function buildFormState(item) {
  if (!item) {
    return {
      type: 'TIMELINE',
      year: '',
      title: '',
      description: '',
      imageUrl: '',
      order: 0,
    };
  }

  return {
    type: item.type || 'TIMELINE',
    year: item.year ?? '',
    title: item.title || '',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    order: item.order ?? 0,
  };
}

export default function HistoryEntryFormModal({ open, item, onClose, onSaved }) {
  const [form, setForm] = useState(() => buildFormState(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildFormState(item));
      setError('');
    }
  }, [open, item]);

  function set(name, value) {
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      type: form.type,
      year: form.year === '' ? null : Number(form.year),
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl,
      order: form.order === '' ? 0 : Number(form.order),
    };

    try {
      if (item?.id) {
        await updateHistoryEntry(item.id, payload);
      } else {
        await createHistoryEntry(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={item?.id ? 'Edit history entry' : 'Add history entry'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span>Type</span>
            <select value={form.type} onChange={(e) => set('type', e.target.value)} required>
              {HISTORY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Year</span>
            <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} required />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Title</span>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>Display order</span>
            <input type="number" min="0" value={form.order} onChange={(e) => set('order', e.target.value)} />
          </label>

          <ImageField label="Image" value={form.imageUrl} onChange={(v) => set('imageUrl', v)} />

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Description</span>
            <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Saving…' : item?.id ? 'Update entry' : 'Add entry'}
          </button>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
