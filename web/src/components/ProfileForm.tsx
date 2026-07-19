// ---------------------------------------------------------------------------
// Shared profile editor: display name + Instagram/Discord handles. Used both
// on the Account page and in the first-time setup modal (ProfileSetup).
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { useDialog } from './Dialog';

export function ProfileForm({
  onSaved,
  saveLabel = 'Save profile',
}: {
  onSaved?: () => void;
  saveLabel?: string;
}) {
  const { user, api } = useStore();
  const { alertDialog } = useDialog();
  const [displayName, setDisplayName] = useState(user?.profile?.displayName || user?.name || '');
  const [instagram, setInstagram] = useState(user?.profile?.instagram ?? '');
  const [discord, setDiscord] = useState(user?.profile?.discord ?? '');
  const [busy, setBusy] = useState(false);

  const cleanInstagram = (v: string) =>
    v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');

  const save = async () => {
    if (!displayName.trim()) {
      void alertDialog('Please enter a display name.', 'Display name required');
      return;
    }
    setBusy(true);
    try {
      await api.updateProfile({
        displayName: displayName.trim(),
        instagram: cleanInstagram(instagram),
        discord: discord.trim().replace(/^@/, ''),
      });
      onSaved?.();
    } catch (e) {
      void alertDialog((e as Error).message, 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  const igHandle = cleanInstagram(instagram);

  return (
    <div className="profile-form">
      <label className="profile-field">
        <span className="profile-label">Display name</span>
        <input
          value={displayName}
          maxLength={40}
          placeholder="How you appear in the community"
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </label>

      <label className="profile-field">
        <span className="profile-label">
          <span className="brand-ig">Instagram</span>
          <span className="muted small">optional</span>
        </span>
        <div className="handle-input">
          <span className="handle-prefix">@</span>
          <input
            value={instagram}
            maxLength={40}
            placeholder="username"
            onChange={(e) => setInstagram(e.target.value)}
          />
        </div>
        {igHandle && (
          <a className="muted small" href={`https://instagram.com/${igHandle}`} target="_blank" rel="noreferrer">
            instagram.com/{igHandle} ↗
          </a>
        )}
      </label>

      <label className="profile-field">
        <span className="profile-label">
          <span className="brand-discord">Discord</span>
          <span className="muted small">optional</span>
        </span>
        <div className="handle-input">
          <span className="handle-prefix">@</span>
          <input
            value={discord}
            maxLength={40}
            placeholder="username"
            onChange={(e) => setDiscord(e.target.value)}
          />
        </div>
      </label>

      <button className="btn primary" disabled={busy} onClick={save}>
        {busy ? 'Saving…' : saveLabel}
      </button>
    </div>
  );
}
