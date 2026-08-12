import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearAuthToken,
  fetchSquad,
  createPlayer,
  updatePlayer,
  deletePlayer,
  fetchAllArticlesForAdmin,
  createArticle,
  updateArticle,
  deleteArticle,
  fetchHistory,
  createHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  fetchFixtures,
  fetchLeagueTable,
  fetchSyncLogs,
  triggerSync,
  fetchUsers,
  createUser,
} from '../../api';
import styles from './Admin.module.css';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const HISTORY_TYPES = ['TIMELINE', 'HONOUR'];
const DEFAULT_SECTION = 'sync';

// Sections rendered by a dedicated panel component instead of the generic
// create/edit/delete form below (sync has no editable records; users has no
// edit/delete at all on the backend, only list + create).
const CUSTOM_SECTIONS = new Set(['sync', 'users']);

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

// All field `name` values match the Spring Boot model fields exactly so
// payloads round-trip through the JSON serializer without a translation layer.
const RESOURCE_CONFIG = {
  squad: {
    singular: 'Player',
    fetchAll: fetchSquad,
    createItem: createPlayer,
    updateItem: updatePlayer,
    deleteItem: deletePlayer,
    emptyItem: () => ({
      playerFirstName: '',
      playerSurename: '',
      playerNumber: '',
      position: 'Defender',
      captain: false,
      goals: 0,
      assists: 0,
      appearances: 0,
      playerProfileImage: '',
      playerInfoCard: '',
      bio: '',
    }),
    fields: [
      { name: 'playerFirstName', label: 'First name', type: 'text', required: true },
      { name: 'playerSurename', label: 'Surname', type: 'text', required: true },
      { name: 'playerNumber', label: 'Squad number', type: 'number', min: 1 },
      { name: 'position', label: 'Position', type: 'select', options: POSITIONS, required: true },
      { name: 'captain', label: 'Captain', type: 'checkbox' },
      { name: 'goals', label: 'Goals', type: 'number', min: 0 },
      { name: 'assists', label: 'Assists', type: 'number', min: 0 },
      { name: 'appearances', label: 'Appearances', type: 'number', min: 0 },
      { name: 'playerProfileImage', label: 'Profile image URL', type: 'text' },
      { name: 'playerInfoCard', label: 'Info-card image URL', type: 'text' },
      { name: 'bio', label: 'Bio', type: 'textarea', rows: 4 },
    ],
    summary: (item) => `${item.playerFirstName || ''} ${item.playerSurename || ''}`.trim() + (item.playerNumber ? ` · #${item.playerNumber}` : ''),
    detail: (item) => `${item.position}${item.captain ? ' · Captain' : ''} · ${item.appearances || 0} apps · ${item.goals || 0} goals`,
    badge: (item) => item.position,
  },
  news: {
    singular: 'Article',
    fetchAll: fetchAllArticlesForAdmin,
    createItem: createArticle,
    updateItem: updateArticle,
    deleteItem: deleteArticle,
    emptyItem: () => ({
      title: '',
      slug: '',
      author: '',
      tags: [],
      imageUrl: '',
      published: false,
      summary: '',
      content: '',
    }),
    fields: [
      { name: 'title', label: 'Headline', type: 'text', required: true },
      { name: 'slug', label: 'URL slug', type: 'text' },
      { name: 'author', label: 'Author', type: 'text' },
      { name: 'tags', label: 'Tags (comma-separated)', type: 'tags' },
      { name: 'imageUrl', label: 'Cover image URL', type: 'text' },
      { name: 'published', label: 'Publish now', type: 'checkbox' },
      { name: 'summary', label: 'Summary', type: 'textarea', rows: 3 },
      { name: 'content', label: 'Content', type: 'textarea', rows: 10, required: true },
    ],
    summary: (item) => item.title,
    detail: (item) => {
      const firstTag = Array.isArray(item.tags) && item.tags.length ? item.tags[0] : 'Untagged';
      const when = item.publishedAt ? formatDateLabel(item.publishedAt) : 'Draft';
      return `${firstTag} · ${when} · ${item.author || 'Unknown'}`;
    },
    badge: (item) => (item.published ? 'Published' : 'Draft'),
  },
  history: {
    singular: 'History entry',
    fetchAll: fetchHistory,
    createItem: createHistoryEntry,
    updateItem: updateHistoryEntry,
    deleteItem: deleteHistoryEntry,
    emptyItem: () => ({
      type: 'TIMELINE',
      year: '',
      title: '',
      description: '',
      imageUrl: '',
      order: 0,
    }),
    fields: [
      { name: 'type', label: 'Type', type: 'select', options: HISTORY_TYPES, required: true },
      { name: 'year', label: 'Year', type: 'number', required: true },
      { name: 'title', label: 'Title', type: 'text', required: true },
      { name: 'order', label: 'Display order', type: 'number', min: 0 },
      { name: 'imageUrl', label: 'Image URL', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', rows: 4 },
    ],
    summary: (item) => item.title,
    detail: (item) => `${item.year} · order ${item.order}`,
    badge: (item) => item.type,
  },
};

function formatDateLabel(value) {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTimeLabel(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function createFormState(fields, source) {
  return fields.reduce((accumulator, field) => {
    const rawValue = source?.[field.name];

    if (field.type === 'checkbox') {
      accumulator[field.name] = Boolean(rawValue);
    } else if (field.type === 'tags') {
      accumulator[field.name] = Array.isArray(rawValue)
        ? rawValue.join(', ')
        : (rawValue || '');
    } else if (rawValue === undefined || rawValue === null) {
      accumulator[field.name] = '';
    } else {
      accumulator[field.name] = String(rawValue);
    }

    return accumulator;
  }, {});
}

function preparePayload(fields, formState) {
  return fields.reduce((accumulator, field) => {
    const value = formState[field.name];

    if (field.type === 'checkbox') {
      accumulator[field.name] = Boolean(value);
    } else if (field.type === 'number') {
      accumulator[field.name] = value === '' || value === null || value === undefined
        ? (field.required ? 0 : null)
        : Number(value);
    } else if (field.type === 'tags') {
      accumulator[field.name] = typeof value === 'string'
        ? value.split(',').map((tag) => tag.trim()).filter(Boolean)
        : (Array.isArray(value) ? value : []);
    } else {
      accumulator[field.name] = value;
    }

    return accumulator;
  }, {});
}

function renderField(field, value, onChange) {
  if (field.type === 'select') {
    return (
      <select value={value} onChange={onChange} required={field.required}>
        {field.options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={onChange}
        rows={field.rows || 4}
        required={field.required}
      />
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className={styles.checkboxField}>
        <input type="checkbox" checked={Boolean(value)} onChange={onChange} />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === 'tags') {
    return (
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="tag-one, tag-two"
      />
    );
  }

  return (
    <input
      type={field.type}
      value={value}
      onChange={onChange}
      required={field.required}
      min={field.min}
    />
  );
}

function SyncPanel() {
  const [logs, setLogs] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [logsResult, fixturesResult, tableResult] = await Promise.all([
        fetchSyncLogs(),
        fetchFixtures({ limit: 10 }),
        fetchLeagueTable(),
      ]);
      setLogs(Array.isArray(logsResult) ? logsResult : []);
      setFixtures(Array.isArray(fixturesResult) ? fixturesResult : []);
      setTable(Array.isArray(tableResult) ? tableResult : []);
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

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);
  const [itemsBySection, setItemsBySection] = useState({ squad: [], news: [], history: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(() =>
    createFormState(RESOURCE_CONFIG.squad.fields, RESOURCE_CONFIG.squad.emptyItem())
  );

  const sectionKeys = useMemo(() => Object.keys(SECTION_META), []);
  const activeConfig = RESOURCE_CONFIG[activeSection];
  const activeItems = itemsBySection[activeSection] || [];

  const resetForm = useCallback((section) => {
    const config = RESOURCE_CONFIG[section];
    if (!config) return;
    setFormState(createFormState(config.fields, config.emptyItem()));
  }, []);

  const loadSection = useCallback(async (section) => {
    const config = RESOURCE_CONFIG[section];
    if (!config) return;

    setLoading(true);
    setError('');
    try {
      const items = await config.fetchAll();
      setItemsBySection((previous) => ({
        ...previous,
        [section]: Array.isArray(items) ? items : [],
      }));
    } catch (err) {
      setError(err.message || `Unable to load ${SECTION_META[section].label.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setEditingId(null);
    setMessage('');
    setError('');
    if (!CUSTOM_SECTIONS.has(activeSection)) {
      resetForm(activeSection);
      loadSection(activeSection);
    }
  }, [activeSection, loadSection, resetForm]);

  function handleFieldChange(field, event) {
    const nextValue = field.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormState((previous) => ({
      ...previous,
      [field.name]: nextValue,
    }));
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setFormState(createFormState(activeConfig.fields, item));
    setMessage('');
    setError('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setMessage('');
    setError('');
    resetForm(activeSection);
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete this ${activeConfig.singular.toLowerCase()}?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await activeConfig.deleteItem(item.id);
      await loadSection(activeSection);
      if (editingId === item.id) {
        setEditingId(null);
        resetForm(activeSection);
      }
      setMessage(`${activeConfig.singular} deleted.`);
    } catch (err) {
      setError(err.message || 'Delete failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const payload = preparePayload(activeConfig.fields, formState);

      if (editingId) {
        await activeConfig.updateItem(editingId, payload);
        setMessage(`${activeConfig.singular} updated.`);
      } else {
        await activeConfig.createItem(payload);
        setMessage(`${activeConfig.singular} added.`);
      }

      setEditingId(null);
      resetForm(activeSection);
      await loadSection(activeSection);
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

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

        {CUSTOM_SECTIONS.has(activeSection) ? (
          <div className={styles.workspace}>
            {activeSection === 'sync' ? <SyncPanel /> : <UsersPanel />}
          </div>
        ) : (
          <>
            {(error || message) ? (
              <div className={error ? styles.errorBanner : styles.successBanner}>
                {error || message}
              </div>
            ) : null}

            <div className={styles.workspace}>
              <section className={styles.editorPanel}>
                <div className={styles.panelHeader}>
                  <h2>{editingId ? 'Edit entry' : 'Add entry'}</h2>
                  <p>{`Create or update ${SECTION_META[activeSection].label.toLowerCase()} here.`}</p>
                </div>

                <form className={styles.editorForm} onSubmit={handleSubmit}>
                  <div className={styles.formGrid}>
                    {activeConfig.fields.map((field) => {
                      const className = `${styles.field} ${field.type === 'textarea' ? styles.fieldWide : ''} ${field.type === 'checkbox' ? styles.fieldCheckbox : ''}`;

                      if (field.type === 'checkbox') {
                        return (
                          <div key={field.name} className={className}>
                            {renderField(field, formState[field.name], (event) => handleFieldChange(field, event))}
                          </div>
                        );
                      }

                      return (
                        <label key={field.name} className={className}>
                          <span>{field.label}</span>
                          {renderField(field, formState[field.name], (event) => handleFieldChange(field, event))}
                        </label>
                      );
                    })}
                  </div>

                  <div className={styles.formActions}>
                    <button type="submit" className={styles.primaryButton} disabled={loading}>
                      {loading
                        ? 'Saving...'
                        : editingId
                          ? 'Update entry'
                          : 'Add entry'}
                    </button>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={handleCancelEdit}
                      disabled={loading}
                    >
                      Clear form
                    </button>
                  </div>
                </form>
              </section>

              <section className={styles.listPanel}>
                <div className={styles.panelHeader}>
                  <h2>{SECTION_META[activeSection].label}</h2>
                  <p>{loading ? 'Refreshing data...' : `${activeItems.length} records loaded.`}</p>
                </div>

                <div className={styles.recordList}>
                  {activeItems.length === 0 ? (
                    <div className={styles.emptyState}>No records yet.</div>
                  ) : (
                    activeItems.map((item) => (
                      <article key={item.id} className={styles.recordCard}>
                        <div className={styles.recordTop}>
                          <div>
                            <h3 className={styles.recordTitle}>{activeConfig.summary(item)}</h3>
                            <p className={styles.recordMeta}>{activeConfig.detail(item)}</p>
                          </div>
                          <span className={styles.recordBadge}>{activeConfig.badge(item)}</span>
                        </div>

                        <div className={styles.cardActions}>
                          <button type="button" className={styles.secondaryButton} onClick={() => handleEdit(item)}>
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
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
