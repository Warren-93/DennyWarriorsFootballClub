import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import ImageField from './ImageField';
import { createPlayer, updatePlayer } from '../../api/squad';
import styles from './AdminForm.module.css';

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

// item may be a raw Player (from the admin listing) or a public PlayerResponse
// (from the Squad page) — normalize both shapes into one form state.
function buildFormState(item) {
  if (!item) {
    return {
      playerFirstName: '',
      playerSurename: '',
      playerNumber: '',
      position: 'Defender',
      playerAge: '',
      playerNationality: '',
      playerProfileImage: '',
      playerInfoCard: '',
      goals: 0,
      assists: 0,
      appearances: 0,
      bio: '',
      captain: false,
      sponsorLogo1: '',
      sponsorLogo2: '',
      sponsorLogo3: '',
    };
  }

  let firstName = item.playerFirstName;
  let surname = item.playerSurename;
  if (firstName === undefined && item.name) {
    const parts = item.name.trim().split(' ');
    firstName = parts[0] || '';
    surname = parts.slice(1).join(' ');
  }

  const sponsors = item.sponsorLogos || [];

  return {
    playerFirstName: firstName || '',
    playerSurename: surname || '',
    playerNumber: item.playerNumber ?? item.number ?? '',
    position: item.position || 'Defender',
    playerAge: item.playerAge ?? item.age ?? '',
    playerNationality: item.playerNationality ?? item.nationality ?? '',
    playerProfileImage: item.playerProfileImage ?? item.profileImage ?? '',
    playerInfoCard: item.playerInfoCard ?? item.infoCard ?? '',
    goals: item.goals ?? 0,
    assists: item.assists ?? 0,
    appearances: item.appearances ?? 0,
    bio: item.bio || '',
    captain: Boolean(item.captain),
    sponsorLogo1: item.sponsorLogo1 ?? sponsors[0] ?? '',
    sponsorLogo2: item.sponsorLogo2 ?? sponsors[1] ?? '',
    sponsorLogo3: item.sponsorLogo3 ?? sponsors[2] ?? '',
  };
}

export default function PlayerFormModal({ open, item, onClose, onSaved }) {
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
      playerFirstName: form.playerFirstName,
      playerSurename: form.playerSurename,
      playerNumber: form.playerNumber === '' ? null : Number(form.playerNumber),
      position: form.position,
      playerAge: form.playerAge === '' ? 0 : Number(form.playerAge),
      playerNationality: form.playerNationality,
      playerProfileImage: form.playerProfileImage,
      playerInfoCard: form.playerInfoCard,
      goals: Number(form.goals) || 0,
      assists: Number(form.assists) || 0,
      appearances: Number(form.appearances) || 0,
      bio: form.bio,
      captain: Boolean(form.captain),
      sponsorLogo1: form.sponsorLogo1 || null,
      sponsorLogo2: form.sponsorLogo2 || null,
      sponsorLogo3: form.sponsorLogo3 || null,
    };

    try {
      if (item?.id) {
        await updatePlayer(item.id, payload);
      } else {
        await createPlayer(payload);
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
    <Modal open={open} title={item?.id ? 'Edit player' : 'Add player'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error ? <div className={styles.errorBanner}>{error}</div> : null}

        <div className={styles.formGrid}>
          <span className={styles.sectionLabel}>Basic info</span>

          <label className={styles.field}>
            <span>First name</span>
            <input type="text" value={form.playerFirstName} onChange={(e) => set('playerFirstName', e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>Surname</span>
            <input type="text" value={form.playerSurename} onChange={(e) => set('playerSurename', e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>Squad number</span>
            <input type="number" min="1" value={form.playerNumber} onChange={(e) => set('playerNumber', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Position</span>
            <select value={form.position} onChange={(e) => set('position', e.target.value)} required>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Age</span>
            <input type="number" min="0" value={form.playerAge} onChange={(e) => set('playerAge', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Nationality</span>
            <input type="text" value={form.playerNationality} onChange={(e) => set('playerNationality', e.target.value)} />
          </label>
          <div className={`${styles.field} ${styles.fieldCheckbox}`}>
            <label className={styles.checkboxField}>
              <input type="checkbox" checked={form.captain} onChange={(e) => set('captain', e.target.checked)} />
              <span>Captain</span>
            </label>
          </div>

          <span className={styles.sectionLabel}>Stats</span>

          <label className={styles.field}>
            <span>Goals</span>
            <input type="number" min="0" value={form.goals} onChange={(e) => set('goals', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Assists</span>
            <input type="number" min="0" value={form.assists} onChange={(e) => set('assists', e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Appearances</span>
            <input type="number" min="0" value={form.appearances} onChange={(e) => set('appearances', e.target.value)} />
          </label>

          <span className={styles.sectionLabel}>Media</span>

          <ImageField label="Profile photo" value={form.playerProfileImage} onChange={(v) => set('playerProfileImage', v)} />
          <ImageField label="Info-card image" value={form.playerInfoCard} onChange={(v) => set('playerInfoCard', v)} />

          <span className={styles.sectionLabel}>Sponsors (up to 3, optional)</span>

          <ImageField label="Sponsor logo 1" value={form.sponsorLogo1} onChange={(v) => set('sponsorLogo1', v)} />
          <ImageField label="Sponsor logo 2" value={form.sponsorLogo2} onChange={(v) => set('sponsorLogo2', v)} />
          <ImageField label="Sponsor logo 3" value={form.sponsorLogo3} onChange={(v) => set('sponsorLogo3', v)} />

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span>Bio</span>
            <textarea rows={4} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </label>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.primaryButton} disabled={saving}>
            {saving ? 'Saving…' : item?.id ? 'Update player' : 'Add player'}
          </button>
          <button type="button" className={styles.ghostButton} onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
