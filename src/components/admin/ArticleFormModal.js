import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import ImageField from './ImageField';
import { createArticle, updateArticle } from '../../api/news';
import styles from './AdminForm.module.css';

// item may be a raw NewsArticle (from the admin listing) or a public
// NewsArticleResponse (from the News page, where "summary" is aliased to
// "excerpt") — normalize both shapes into one form state.
function buildFormState(item) {
  if (!item) {
    return {
      title: '',
      slug: '',
      author: '',
      tags: '',
      imageUrl: '',
      published: false,
      summary: '',
      content: '',
    };
  }

  const tags = Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || '');

  return {
    title: item.title || '',
    slug: item.slug || '',
    author: item.author || '',
    tags,
    imageUrl: item.imageUrl || '',
    published: Boolean(item.published),
    summary: item.summary ?? item.excerpt ?? '',
    content: item.content || '',
  };
}

export default function ArticleFormModal({ open, item, onClose, onSaved }) {
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
      title: form.title,
      slug: form.slug,
      author: form.author,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      imageUrl: form.imageUrl,
      published: Boolean(form.published),
      summary: form.summary,
      content: form.content,
    };

    try {
      if (item?.id) {
        await updateArticle(item.id, payload);
      } else {
        await createArticle(payload);
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
    <Modal open={open} title={item?.id ? 'Edit article' : 'Add article'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Headline</span>
            <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>URL slug</span>
            <input type="text" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated if blank" />
          </label>
          <label className={styles.field}>
            <span>Author</span>
            <input type="text" value={form.author} onChange={(e) => set('author', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Tags (comma-separated)</span>
            <input type="text" value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Match Report, Club News" />
          </label>
          <div className={`${styles.field} ${styles.fieldCheckbox}`}>
            <label className={styles.checkboxField}>
              <input type="checkbox" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
              <span>Publish now</span>
            </label>
          </div>

          <ImageField label="Cover image" value={form.imageUrl} onChange={(v) => set('imageUrl', v)} />

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Summary</span>
            <textarea rows={3} value={form.summary} onChange={(e) => set('summary', e.target.value)} />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Content</span>
            <textarea rows={10} value={form.content} onChange={(e) => set('content', e.target.value)} required />
          </label>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Saving…' : item?.id ? 'Update article' : 'Add article'}
          </button>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
