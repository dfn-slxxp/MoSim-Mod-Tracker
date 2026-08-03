// ---------------------------------------------------------------------------
// Shared profile editor: photo + display name + Instagram/Discord handles.
// Used both on the Account page and in the first-time setup modal (ProfileSetup).
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { useDialog } from './Dialog';
import { resizeImageFile } from '../lib/image';

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
  // undefined = unchanged, null = explicit reset to sign-in photo, string = new upload
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const cleanInstagram = (v: string) =>
    v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');

  const pickPhoto = () => fileInput.current?.click();

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      void alertDialog('Please choose an image file.', 'Not an image');
      return;
    }
    try {
      setPhoto(await resizeImageFile(file));
    } catch (err) {
      void alertDialog((err as Error).message, 'Could not use that image');
    }
  };

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
        ...(photo !== undefined ? { photo } : {}),
      });
      setPhoto(undefined);
      onSaved?.();
    } catch (e) {
      void alertDialog((e as Error).message, 'Could not save profile');
    } finally {
      setBusy(false);
    }
  };

  const igHandle = cleanInstagram(instagram);
  const shownPhoto = photo !== undefined ? photo : user?.photo ?? null;

  return (
    <div className="profile-form">
      <div className="profile-field">
        <span className="profile-label">Photo</span>
        <div className="profile-photo-row">
          <button type="button" className="profile-photo-btn" onClick={pickPhoto} title="Change photo">
            {shownPhoto ? (
              <img src={shownPhoto} alt="Your avatar" referrerPolicy="no-referrer" />
            ) : (
              <span className="profile-photo-placeholder">+</span>
            )}
          </button>
          <div className="profile-photo-actions">
            <button type="button" className="btn subtle" onClick={pickPhoto}>
              Upload photo
            </button>
            {shownPhoto && (
              <button type="button" className="btn subtle" onClick={() => setPhoto(null)}>
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onPhotoSelected}
          />
        </div>
      </div>

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
