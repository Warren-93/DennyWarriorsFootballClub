import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  clearAuthToken,
  fetchFixtures,
  createFixture,
  updateFixture,
  deleteFixture,
  fetchResults,
  createResult,
  updateResult,
  deleteResult,
  fetchSquad,
  createPlayer,
  updatePlayer,
  deletePlayer,
  fetchNews,
  createArticle,
  updateArticle,
  deleteArticle,
  fetchLeagueTable,
  updateLeagueTable,
} from '../../api';
import styles from './Admin.module.css';

const COMPETITIONS = ['League', 'Cup', 'Friendly'];
const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
const FIXTURE_STATUSES = ['scheduled', 'postponed', 'cancelled', 'completed'];
const DEFAULT_SECTION = 'fixtures';

const SECTION_META = {
  fixtures: {
    label: 'Fixtures',
    description: 'Create and update upcoming matches.',
  },
  results: {
    label: 'Results',
    description: 'Record scores and final outcomes.',
  },
  squad: {
    label: 'Squad',
    description: 'Manage player profiles for the first team.',
  },
  news: {
    label: 'News',
    description: 'Publish club updates and match reports.',
  },
  league: {
    label: 'League Table',
    description: 'Edit the full standings and publish them in one save.',
  },
};

// All field `name` values match the Spring Boot model fields exactly so
// payloads round-trip through the JSON serializer without a translation layer.
const RESOURCE_CONFIG = {
  fixtures: {
    singular: 'Fixture',
    fetchAll: fetchFixtures,
    createItem: createFixture,
    updateItem: updateFixture,
    deleteItem: deleteFixture,
    emptyItem: () => ({
      opponent: '',
      competition: 'League',
      season: '',
      venue: '',
      fixtureDate: '',
      kickoffTime: '',
      home: true,
      played: false,
      status: 'scheduled',
      notes: '',
      ticketUrl: '',
    }),
    fields: [
      { name: 'opponent', label: 'Opponent', type: 'text', required: true },
      { name: 'fixtureDate', label: 'Date', type: 'date', required: true },
      { name: 'kickoffTime', label: 'Kick-off', type: 'time' },
      { name: 'competition', label: 'Competition', type: 'select', options: COMPETITIONS, required: true },
      { name: 'season', label: 'Season', type: 'text' },
      { name: 'venue', label: 'Venue', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: FIXTURE_STATUSES },
      { name: 'home', label: 'Home fixture', type: 'checkbox' },
      { name: 'played', label: 'Already played', type: 'checkbox' },
      { name: 'ticketUrl', label: 'Ticket URL', type: 'text' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 3 },
    ],
    summary: (item) => item.opponent,
    detail: (item) => `${formatDateLabel(item.fixtureDate)} · ${item.kickoffTime || 'TBC'} · ${item.home ? 'Home' : 'Away'}`,
    badge: (item) => item.competition,
  },
  results: {
    singular: 'Result',
    fetchAll: fetchResults,
    createItem: createResult,
    updateItem: updateResult,
    deleteItem: deleteResult,
    emptyItem: () => ({
      fixtureId: '',
      opponent: '',
      competition: 'League',
      season: '',
      venue: '',
      matchDate: '',
      home: true,
      dennyWarriorsScore: 0,
      opponentScore: 0,
      scorers: [],
      report: '',
    }),
    fields: [
      { name: 'opponent', label: 'Opponent', type: 'text', required: true },
      { name: 'matchDate', label: 'Date', type: 'date', required: true },
      { name: 'competition', label: 'Competition', type: 'select', options: COMPETITIONS, required: true },
      { name: 'season', label: 'Season', type: 'text' },
      { name: 'venue', label: 'Venue', type: 'text' },
      { name: 'home', label: 'Home fixture', type: 'checkbox' },
      { name: 'dennyWarriorsScore', label: 'Denny Warriors goals', type: 'number', required: true, min: 0 },
      { name: 'opponentScore', label: 'Opponent goals', type: 'number', required: true, min: 0 },
      { name: 'scorers', label: 'Scorers (comma-separated)', type: 'tags' },
      { name: 'fixtureId', label: 'Linked fixture ID (optional)', type: 'text' },
      { name: 'report', label: 'Match report', type: 'textarea', rows: 5 },
    ],
    summary: (item) => `${item.dennyWarriorsScore}–${item.opponentScore} vs ${item.opponent}`,
    detail: (item) => `${formatDateLabel(item.matchDate)} · ${item.home ? 'Home' : 'Away'}`,
    badge: (item) => item.competition,
  },
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
      playerProfile: '',
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
      { name: 'playerProfile', label: 'Profile image URL', type: 'text' },
      { name: 'playerInfoCard', label: 'Info-card image URL', type: 'text' },
      { name: 'bio', label: 'Bio', type: 'textarea', rows: 4 },
    ],
    summary: (item) => `${item.playerFirstName || ''} ${item.playerSurename || ''}`.trim() + (item.playerNumber ? ` · #${item.playerNumber}` : ''),
    detail: (item) => `${item.position}${item.captain ? ' · Captain' : ''} · ${item.appearances || 0} apps · ${item.goals || 0} goals`,
    badge: (item) => item.position,
  },
  news: {
    singular: 'Article',
    fetchAll: fetchNews,
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
};

const LEAGUE_FIELDS = [
  { name: 'position', label: 'Pos', type: 'number', required: true, min: 1 },
  { name: 'team', label: 'Team', type: 'text', required: true },
  { name: 'played', label: 'Played', type: 'number', required: true, min: 0 },
  { name: 'won', label: 'Won', type: 'number', required: true, min: 0 },
  { name: 'drawn', label: 'Drawn', type: 'number', required: true, min: 0 },
  { name: 'lost', label: 'Lost', type: 'number', required: true, min: 0 },
  { name: 'goalsFor', label: 'GF', type: 'number', required: true, min: 0 },
  { name: 'goalsAgainst', label: 'GA', type: 'number', required: true, min: 0 },
  { name: 'goalDifference', label: 'GD', type: 'number', required: true },
  { name: 'points', label: 'Points', type: 'number', required: true, min: 0 },
];

function formatDateValue(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
}

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

function createFormState(fields, source) {
  return fields.reduce((accumulator, field) => {
    const rawValue = source?.[field.name];

    if (field.type === 'checkbox') {
      accumulator[field.name] = Boolean(rawValue);
    } else if (field.type === 'date') {
      accumulator[field.name] = formatDateValue(rawValue);
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

function createLeagueRow() {
  return {
    position: '',
    team: '',
    played: '',
    won: '',
    drawn: '',
    lost: '',
    goalsFor: '',
    goalsAgainst: '',
    goalDifference: '',
    points: '',
  };
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

function decorateLeagueRows(rows) {
  return (rows || []).map((row, index) => ({
    ...row,
    __rowId: `league-${index}-${row.position}-${row.team}`,
  }));
}

function stripLeagueRow(row) {
  const { __rowId, ...payload } = row;
  return payload;
}

function getDeletePrompt(section) {
  if (section === 'league') {
    return 'Delete this league row?';
  }

  return `Delete this ${RESOURCE_CONFIG[section].singular.toLowerCase()}?`;
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

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(DEFAULT_SECTION);
  const [itemsBySection, setItemsBySection] = useState({
    fixtures: [],
    results: [],
    squad: [],
    news: [],
    league: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(() =>
    createFormState(RESOURCE_CONFIG[DEFAULT_SECTION].fields, RESOURCE_CONFIG[DEFAULT_SECTION].emptyItem())
  );
  const [leagueDirty, setLeagueDirty] = useState(false);

  const sectionKeys = useMemo(() => Object.keys(SECTION_META), []);
  const activeConfig = activeSection === 'league' ? null : RESOURCE_CONFIG[activeSection];
  const activeItems = itemsBySection[activeSection] || [];

  const resetForm = useCallback((section) => {
    if (section === 'league') {
      setFormState(createFormState(LEAGUE_FIELDS, createLeagueRow()));
      return;
    }

    const config = RESOURCE_CONFIG[section];
    setFormState(createFormState(config.fields, config.emptyItem()));
  }, []);

  const loadSection = useCallback(async (section) => {
    setLoading(true);
    setError('');

    try {
      if (section === 'league') {
        const table = await fetchLeagueTable();
        // Backend returns the LeagueTable wrapper { id, key, leagueName, season, rows, updatedAt }
        const rows = Array.isArray(table) ? table : (table?.rows || []);
        setItemsBySection((previous) => ({
          ...previous,
          league: decorateLeagueRows(rows),
        }));
        setLeagueDirty(false);
      } else {
        const config = RESOURCE_CONFIG[section];
        const items = await config.fetchAll();
        setItemsBySection((previous) => ({
          ...previous,
          [section]: Array.isArray(items) ? items : [],
        }));
      }
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
    resetForm(activeSection);
    loadSection(activeSection);
  }, [activeSection, loadSection, resetForm]);

  function handleFieldChange(field, event) {
    const nextValue = field.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormState((previous) => ({
      ...previous,
      [field.name]: nextValue,
    }));
  }

  function handleEdit(item) {
    if (activeSection === 'league') {
      setEditingId(item.__rowId);
      setFormState(createFormState(LEAGUE_FIELDS, item));
    } else {
      setEditingId(item.id);
      setFormState(createFormState(activeConfig.fields, item));
    }

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
    if (!window.confirm(getDeletePrompt(activeSection))) {
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (activeSection === 'league') {
        setItemsBySection((previous) => ({
          ...previous,
          league: previous.league.filter((row) => row.__rowId !== item.__rowId),
        }));
        setLeagueDirty(true);
        if (editingId === item.__rowId) {
          setEditingId(null);
          resetForm('league');
        }
        setMessage('League row removed. Save the table to publish changes.');
      } else {
        await activeConfig.deleteItem(item.id);
        await loadSection(activeSection);
        if (editingId === item.id) {
          setEditingId(null);
          resetForm(activeSection);
        }
        setMessage(`${activeConfig.singular} deleted.`);
      }
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
      if (activeSection === 'league') {
        const rowPayload = preparePayload(LEAGUE_FIELDS, formState);
        const rowId = editingId || `league-new-${Date.now()}`;
        const nextRow = { ...rowPayload, __rowId: rowId };

        setItemsBySection((previous) => {
          const existing = previous.league || [];
          const league = editingId
            ? existing.map((row) => (row.__rowId === editingId ? nextRow : row))
            : [...existing, nextRow];

          return { ...previous, league };
        });

        setEditingId(null);
        resetForm('league');
        setLeagueDirty(true);
        setMessage('League row staged. Save the table to publish changes.');
      } else {
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
      }
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveLeagueTable() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const rows = (itemsBySection.league || [])
        .map(stripLeagueRow)
        .sort((a, b) => Number(a.position) - Number(b.position));

      await updateLeagueTable(rows);
      setMessage('League table saved.');
      await loadSection('league');
    } catch (err) {
      setError(err.message || 'Unable to save the league table.');
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
            {activeSection === 'league' ? (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleSaveLeagueTable}
                disabled={loading || !leagueDirty}
              >
                Save table
              </button>
            ) : null}
            <button type="button" className={styles.ghostButton} onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>

        <nav className={styles.sectionTabs} aria-label="Admin sections">
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

        {(error || message) ? (
          <div className={error ? styles.errorBanner : styles.successBanner}>
            {error || message}
          </div>
        ) : null}

        <div className={styles.workspace}>
          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <h2>{editingId ? 'Edit entry' : 'Add entry'}</h2>
              <p>
                {activeSection === 'league'
                  ? 'Stage as many row changes as you need, then save the table.'
                  : `Create or update ${SECTION_META[activeSection].label.toLowerCase()} here.`}
              </p>
            </div>

            <form className={styles.editorForm} onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                {(activeSection === 'league' ? LEAGUE_FIELDS : activeConfig.fields).map((field) => {
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
                  <article key={item.id || item.__rowId} className={styles.recordCard}>
                    <div className={styles.recordTop}>
                      <div>
                        <h3 className={styles.recordTitle}>
                          {activeSection === 'league' ? item.team : activeConfig.summary(item)}
                        </h3>
                        <p className={styles.recordMeta}>
                          {activeSection === 'league'
                            ? `Pos ${item.position} · ${item.points} pts · ${item.played} played`
                            : activeConfig.detail(item)}
                        </p>
                      </div>
                      <span className={styles.recordBadge}>
                        {activeSection === 'league'
                          ? 'Row'
                          : activeConfig.badge(item)}
                      </span>
                    </div>

                    {activeSection === 'league' ? (
                      <div className={styles.inlineStats}>
                        <span>W {item.won}</span>
                        <span>D {item.drawn}</span>
                        <span>L {item.lost}</span>
                        <span>GF {item.goalsFor}</span>
                        <span>GA {item.goalsAgainst}</span>
                        <span>GD {item.goalDifference}</span>
                      </div>
                    ) : null}

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
      </div>
    </div>
  );
}
