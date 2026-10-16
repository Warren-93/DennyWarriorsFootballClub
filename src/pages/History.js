import React, { useState } from 'react';
import { useHistory } from '../hooks';
import useAdminRole from '../hooks/useAdminRole';
import ApiState from '../components/ApiState';
import HistoryEntryFormModal from '../components/admin/HistoryEntryFormModal';
import { deleteHistoryEntry } from '../api/history';
import sharedStyles from './PageShared.module.css';
import styles from './History.module.css';
import adminStyles from '../components/admin/InlineAdminControls.module.css';

export default function History() {
  const { data: entries, loading, error, refetch } = useHistory();
  const { canEdit } = useAdminRole();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const timeline = (entries || []).filter((entry) => entry.type === 'TIMELINE');
  const honours = (entries || []).filter((entry) => entry.type === 'HONOUR');

  function openAdd() {
    setEditingEntry(null);
    setModalOpen(true);
  }

  function openEdit(entry) {
    setEditingEntry(entry);
    setModalOpen(true);
  }

  async function handleDelete(entry) {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    await deleteHistoryEntry(entry.id);
    refetch();
  }

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>Club History</h1>
          <p className={sharedStyles.pageSubtitle}>Our journey, milestones &amp; honours</p>
        </div>
      </div>

      <div className="container section">
        {canEdit && (
          <div className={adminStyles.addBar}>
            <button type="button" className={adminStyles.addButton} onClick={openAdd}>
              + Add history entry
            </button>
          </div>
        )}

        <ApiState
          loading={loading}
          error={error}
          empty={!loading && (entries || []).length === 0}
          emptyMessage="No history recorded yet."
          onRetry={refetch}
        >
          <>
            <h2 className={styles.sectionHeading}>Timeline</h2>
            {timeline.length === 0 ? (
              <p>No timeline entries yet.</p>
            ) : (
              <div className={styles.timeline}>
                {timeline.map((entry) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <span className={styles.timelineYear}>{entry.year}</span>
                    <h3 className={styles.timelineTitle}>{entry.title}</h3>
                    <p className={styles.timelineDescription}>{entry.description}</p>
                    {canEdit && (
                      <div className={adminStyles.inlineControls}>
                        <button type="button" className={adminStyles.inlineButton} onClick={() => openEdit(entry)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${adminStyles.inlineButton} ${adminStyles.inlineButtonDanger}`}
                          onClick={() => handleDelete(entry)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <h2 className={`${styles.sectionHeading} ${styles.sectionGap}`}>Honours</h2>
            {honours.length === 0 ? (
              <p>No honours recorded yet.</p>
            ) : (
              <div className={styles.honoursGrid}>
                {honours.map((entry) => (
                  <div key={entry.id} className={styles.honourCard}>
                    <span className={styles.honourYear}>{entry.year}</span>
                    <h3 className={styles.honourTitle}>{entry.title}</h3>
                    {entry.description ? (
                      <p className={styles.honourDescription}>{entry.description}</p>
                    ) : null}
                    {canEdit && (
                      <div className={adminStyles.inlineControls} style={{ justifyContent: 'center' }}>
                        <button type="button" className={adminStyles.inlineButton} onClick={() => openEdit(entry)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`${adminStyles.inlineButton} ${adminStyles.inlineButtonDanger}`}
                          onClick={() => handleDelete(entry)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        </ApiState>
      </div>

      <HistoryEntryFormModal
        open={modalOpen}
        item={editingEntry}
        onClose={() => setModalOpen(false)}
        onSaved={refetch}
      />
    </div>
  );
}
