import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  clearAuthToken,
  fetchAllPlayersForAdmin,
  deletePlayer,
  fetchAllArticlesForAdmin,
  deleteArticle,
  fetchHistory,
  deleteHistoryEntry,
  fetchFixtures,
  fetchLeagueTable,
  fetchSyncLogs,
  triggerSync,
  fetchSyncSettings,
  updateSyncSettings,
  fetchUsers,
  createUser,
} from '../../api';
import PlayerFormModal from '../../components/admin/PlayerFormModal';
import ArticleFormModal from '../../components/admin/ArticleFormModal';
import HistoryEntryFormModal from '../../components/admin/HistoryEntryFormModal';
import styles from './Admin.module.css';

const DEFAULT_SECTION = 'sync';

const SECTION_META = {
  sync: {
    label: 'League Sync',
    description: 'Fixtures, results, and the league table are synced automatically from the league API. View synced data and trigger a re-sync here.',
  },
  squad: {
    label: 'Squad',
    description: 'Manage player profiles for the first team.',
  },
  news: {
    label: 'News',
    description: 'Publish club updates and match reports.',
  },
  history: {
    label: 'History',
    description: 'Manage the club timeline and honours shown on the History page.',
  },
  users: {
    label: 'Users',
    description: 'Admin accounts. Only super-admins can create new users.',
  },
};

function formatDateTimeLabel(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function SyncPanel() {
  const [logs, setLogs] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [table, setTable] = useState([]);
  const [intervalMinutes, setIntervalMinutes] = useState(null);
  const [intervalInput, setIntervalInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [savingInterval, setSavingInterval] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [logsResult, fixturesResult, tableResult, settingsResult] = await Promise.all([
        fetchSyncLogs(),
        fetchFixtures({ limit: 10 }),
        fetchLeagueTable(),
        fetchSyncSettings(),
      ]);
      setLogs(Array.isArray(logsResult) ? logsResult : []);
      setFixtures(Array.isArray(fixturesResult) ? fixturesResult : []);
      setTable(Array.isArray(tableResult) ? tableResult : []);
      setIntervalMinutes(settingsResult?.intervalMinutes ?? null);
      setIntervalInput(String(settingsResult?.intervalMinutes ?? ''));
    } catch (err) {
      setError(err.message || 'Unable to load sync data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleTrigger() {
    setTriggering(true);
    setError('');
    setMessage('');
    try {
      const result = await triggerSync();
      setMessage(`Sync ${result?.status?.toLowerCase() || 'complete'} — ${result?.recordsUpserted ?? 0} fixtures upserted.`);
      await load();
    } catch (err) {
      setError(err.message || 'Sync failed to trigger.');
    } finally {
      setTriggering(false);
    }
  }

  async function handleSaveInterval(event) {
    event.preventDefault();
    setSavingInterval(true);
    setError('');
    setMessage('');
    try {
      const result = await updateSyncSettings(Number(intervalInput));
      setIntervalMinutes(result?.intervalMinutes ?? null);
      setMessage(`Auto-sync interval set to every ${result?.intervalMinutes} minute(s).`);
    } catch (err) {
      setError(err.message || 'Unable to update sync interval.');
    } finally {
      setSavingInterval(false);
    }
  }

  return (
    <section className={styles.listPanel} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.panelHeader}>
        <h2>League Sync</h2>
        <p>Fixtures, results, and the league table are pulled automatically from the league API on a schedule.</p>
      </div>

      {(error || message) ? (
        <div className={error ? styles.errorBanner : styles.successBanner}>
          {error || message}
        </div>
      ) : null}

      <div className={styles.headerActions} style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={handleTrigger}
          disabled={triggering || loading}
        >
          {triggering ? 'Syncing…' : 'Trigger sync now'}
        </button>
        <button type="button" className={styles.ghostButton} onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <h3 className={styles.recordTitle}>Auto-sync frequency</h3>
      <p className={styles.recordMeta} style={{ marginBottom: 14 }}>
        {intervalMinutes != null
          ? `Currently syncing automatically every ${intervalMinutes} minute(s).`
          : 'Loading current interval...'}
      </p>
      <form onSubmit={handleSaveInterval} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 28 }}>
        <label className={styles.field} style={{ maxWidth: 160 }}>
          <span>Interval (minutes)</span>
          <input
            type="number"
            min="1"
            value={intervalInput}
            onChange={(event) => setIntervalInput(event.target.value)}
            required
          />
        </label>
        <button type="submit" className={styles.secondaryButton} disabled={savingInterval || loading}>
          {savingInterval ? 'Saving…' : 'Save interval'}
        </button>
      </form>

      <h3 className={styles.recordTitle}>Recent sync runs</h3>
      <div className={styles.recordList}>
        {logs.length === 0 ? (
          <div className={styles.emptyState}>No sync runs recorded yet.</div>
        ) : (
          logs.slice(0, 10).map((log) => (
            <article key={log.id} className={styles.recordCard}>
              <div className={styles.recordTop}>
                <div>
                  <h3 className={styles.recordTitle}>{log.status} · {log.trigger}</h3>
                  <p className={styles.recordMeta}>
                    {formatDateTimeLabel(log.startedAt)} · {log.recordsProcessed ?? 0} processed, {log.recordsUpserted ?? 0} upserted
                    {log.errorMessage ? ` · ${log.errorMessage}` : ''}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <h3 className={styles.recordTitle} style={{ marginTop: 28 }}>Latest synced fixtures</h3>
      <div className={styles.recordList}>
        {fixtures.length === 0 ? (
          <div className={styles.emptyState}>No fixtures synced yet.</div>
        ) : (
          fixtures.map((f) => (
            <article key={f.id} className={styles.recordCard}>
              <div className={styles.recordTop}>
                <div>
                  <h3 className={styles.recordTitle}>
                    {f.homeTeam} vs {f.awayTeam}
                    {f.homeScore != null && f.awayScore != null ? ` (${f.homeScore}–${f.awayScore})` : ''}
                  </h3>
                  <p className={styles.recordMeta}>{formatDateTimeLabel(f.kickoffAt)} · {f.competition} · {f.status}</p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <h3 className={styles.recordTitle} style={{ marginTop: 28 }}>League table</h3>
      <div className={styles.recordList}>
        {table.length === 0 ? (
          <div className={styles.emptyState}>League table not available yet.</div>
        ) : (
          table.map((row) => (
            <article key={row.pos} className={styles.recordCard}>
              <div className={styles.recordTop}>
                <div>
                  <h3 className={styles.recordTitle}>{row.pos}. {row.team}</h3>
                  <p className={styles.recordMeta}>
                    P {row.played} · W {row.won} · D {row.drawn} · L {row.lost} · GD {row.gd} · Pts {row.points}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function SquadPanel() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAllPlayersForAdmin();
      setPlayers(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || 'Unable to load squad.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingItem(null);
    setMessage('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setMessage('');
    setModalOpen(true);
  }

  async function handleDelete(item) {
    const name = `${item.playerFirstName || ''} ${item.playerSurename || ''}`.trim() || 'this player';
    if (!window.confirm(`Delete ${name}?`)) return;

    setError('');
    setMessage('');
    try {
      await deletePlayer(item.id);
      setMessage('Player deleted.');
      await load();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  }

  function handleSaved() {
    setMessage(editingItem ? 'Player updated.' : 'Player added.');
    load();
  }

  return (
    <section className={styles.listPanel} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.panelHeader}>
        <h2>Squad</h2>
        <p>Manage player profiles for the first team.</p>
      </div>

      {(error || message) ? (
        <div className={error ? styles.errorBanner : styles.successBanner}>
          {error || message}
        </div>
      ) : null}

      <div className={styles.headerActions} style={{ marginBottom: 20 }}>
        <button type="button" className={styles.primaryButton} onClick={openAdd}>
          + Add player
        </button>
        <button type="button" className={styles.ghostButton} onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className={styles.recordList}>
        {players.length === 0 ? (
          <div className={styles.emptyState}>No players yet.</div>
        ) : (
          players.map((item) => (
            <article key={item.id} className={styles.recordCard}>
              <div className={styles.recordTop}>
                <div>
                  <h3 className={styles.recordTitle}>
                    {`${item.playerFirstName || ''} ${item.playerSurename || ''}`.trim() || 'Unnamed player'}
                    {item.playerNumber ? ` · #${item.playerNumber}` : ''}
                  </h3>
                  <p className={styles.recordMeta}>
                    {item.position}{item.captain ? ' · Captain' : ''} · {item.appearances || 0} apps · {item.goals || 0} goals
                  </p>
                </div>
                <span className={styles.recordBadge}>{item.position}</span>
              </div>

              <div className={styles.cardActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => openEdit(item)}>
                  Edit
                </button>
                <button type="button" className={styles.dangerButton} onClick={() => handleDelete(item)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <PlayerFormModal
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </section>
  );
}

function NewsPanel() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAllArticlesForAdmin();
      setArticles(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || 'Unable to load news.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingItem(null);
    setMessage('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setMessage('');
    setModalOpen(true);
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    setError('');
    setMessage('');
    try {
      await deleteArticle(item.id);
      setMessage('Article deleted.');
      await load();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  }

  function handleSaved() {
    setMessage(editingItem ? 'Article updated.' : 'Article added.');
    load();
  }

  return (
    <section className={styles.listPanel} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.panelHeader}>
        <h2>News</h2>
        <p>Publish club updates and match reports.</p>
      </div>

      {(error || message) ? (
        <div className={error ? styles.errorBanner : styles.successBanner}>
          {error || message}
        </div>
      ) : null}

      <div className={styles.headerActions} style={{ marginBottom: 20 }}>
        <button type="button" className={styles.primaryButton} onClick={openAdd}>
          + Add article
        </button>
        <button type="button" className={styles.ghostButton} onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className={styles.recordList}>
        {articles.length === 0 ? (
          <div className={styles.emptyState}>No articles yet.</div>
        ) : (
          articles.map((item) => {
            const firstTag = Array.isArray(item.tags) && item.tags.length ? item.tags[0] : 'Untagged';
            const when = item.publishedAt ? formatDateTimeLabel(item.publishedAt) : 'Draft';

            return (
              <article key={item.id} className={styles.recordCard}>
                <div className={styles.recordTop}>
                  <div>
                    <h3 className={styles.recordTitle}>{item.title}</h3>
                    <p className={styles.recordMeta}>{firstTag} · {when} · {item.author || 'Unknown'}</p>
                  </div>
                  <span className={styles.recordBadge}>{item.published ? 'Published' : 'Draft'}</span>
                </div>

                <div className={styles.cardActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => openEdit(item)}>
                    Edit
                  </button>
                  <button type="button" className={styles.dangerButton} onClick={() => handleDelete(item)}>
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      <ArticleFormModal
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </section>
  );
}

function HistoryPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchHistory();
      setEntries(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || 'Unable to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingItem(null);
    setMessage('');
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingItem(item);
    setMessage('');
    setModalOpen(true);
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    setError('');
    setMessage('');
    try {
      await deleteHistoryEntry(item.id);
      setMessage('History entry deleted.');
      await load();
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  }

  function handleSaved() {
    setMessage(editingItem ? 'History entry updated.' : 'History entry added.');
    load();
  }

  return (
    <section className={styles.listPanel} style={{ gridColumn: '1 / -1' }}>
      <div className={styles.panelHeader}>
        <h2>History</h2>
        <p>Manage the club timeline and honours shown on the History page.</p>
      </div>

      {(error || message) ? (
        <div className={error ? styles.errorBanner : styles.successBanner}>
          {error || message}
        </div>
      ) : null}

      <div className={styles.headerActions} style={{ marginBottom: 20 }}>
        <button type="button" className={styles.primaryButton} onClick={openAdd}>
          + Add entry
        </button>
        <button type="button" className={styles.ghostButton} onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className={styles.recordList}>
        {entries.length === 0 ? (
          <div className={styles.emptyState}>No history entries yet.</div>
        ) : (
          entries.map((item) => (
            <article key={item.id} className={styles.recordCard}>
              <div className={styles.recordTop}>
                <div>
                  <h3 className={styles.recordTitle}>{item.title}</h3>
                  <p className={styles.recordMeta}>{item.year} · order {item.order}</p>
                </div>
                <span className={styles.recordBadge}>{item.type}</span>
              </div>

              <div className={styles.cardActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => openEdit(item)}>
                  Edit
                </button>
                <button type="button" className={styles.dangerButton} onClick={() => handleDelete(item)}>
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <HistoryEntryFormModal
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </section>
  );
}

const ROLES = ['SUPER_ADMIN', 'EDITOR', 'VIEWER'];

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ username: '', password: '', role: 'VIEWER' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchUsers();
      setUsers(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createUser(form);
      setMessage(`User "${form.username}" created.`);
      setForm({ username: '', password: '', role: 'VIEWER' });
      await load();
    } catch (err) {
      setError(err.message || 'Unable to create user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className={styles.editorPanel}>
        <div className={styles.panelHeader}>
          <h2>Add user</h2>
          <p>Only super-admins can see this tab or create new accounts.</p>
        </div>

        <form className={styles.editorForm} onSubmit={handleCreate}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Username</span>
              <input
                type="text"
                value={form.username}
                onChange={(event) => setForm((f) => ({ ...f, username: event.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((f) => ({ ...f, password: event.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Role</span>
              <select
                value={form.role}
                onChange={(event) => setForm((f) => ({ ...f, role: event.target.value }))}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? 'Creating...' : 'Create user'}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.listPanel}>
        <div className={styles.panelHeader}>
          <h2>Users</h2>
          <p>{loading ? 'Refreshing...' : `${users.length} accounts.`}</p>
        </div>

        {(error || message) ? (
          <div className={error ? styles.errorBanner : styles.successBanner}>
            {error || message}
          </div>
        ) : null}

        <div className={styles.recordList}>
          {users.length === 0 ? (
            <div className={styles.emptyState}>No users yet.</div>
          ) : (
            users.map((user) => (
              <article key={user.id} className={styles.recordCard}>
                <div className={styles.recordTop}>
                  <div>
                    <h3 className={styles.recordTitle}>{user.username}</h3>
                  </div>
                  <span className={styles.recordBadge}>{user.role}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </>
  );
}

const SECTION_PANELS = {
  sync: SyncPanel,
  squad: SquadPanel,
  news: NewsPanel,
  history: HistoryPanel,
  users: UsersPanel,
};

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);

  const sectionKeys = useMemo(() => Object.keys(SECTION_META), []);
  const ActivePanel = SECTION_PANELS[activeSection];

  function handleLogout() {
    clearAuthToken();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className={styles.adminShell}>
      <div className={styles.adminFrame}>
        <header className={styles.adminHeader}>
          <div>
            <span className={styles.eyebrow}>Denny Warriors FC</span>
            <h1 className={styles.pageTitle}>Admin dashboard</h1>
            <p className={styles.pageSubtitle}>{SECTION_META[activeSection].description}</p>
          </div>

          <div className={styles.headerActions}>
            <Link to="/" className={styles.ghostButton}>
              View site
            </Link>
            <button type="button" className={styles.ghostButton} onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        <nav className={styles.sectionTabs} style={{ gridTemplateColumns: `repeat(${sectionKeys.length}, minmax(0, 1fr))` }} aria-label="Admin sections">
          {sectionKeys.map((section) => (
            <button
              key={section}
              type="button"
              className={`${styles.sectionTab} ${activeSection === section ? styles.sectionTabActive : ''}`}
              onClick={() => setActiveSection(section)}
            >
              {SECTION_META[section].label}
            </button>
          ))}
        </nav>

        <div className={styles.workspace}>
          <ActivePanel />
        </div>
      </div>
    </div>
  );
}
