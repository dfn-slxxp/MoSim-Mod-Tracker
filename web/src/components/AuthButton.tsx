// Sign-in/sign-out button in the top bar.
import { useState } from 'react';
import { useStore } from '../store/StoreContext';

export function AuthButton() {
  const { user, api } = useStore();
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="auth">
        {user.photo && <img className="avatar" src={user.photo} alt="" referrerPolicy="no-referrer" />}
        <span className="auth-name" title={user.email}>{user.name}</span>
        <button className="btn subtle" onClick={() => api.signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <button
      className="btn primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api.signIn();
        } catch (e) {
          alert((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      Sign in with Google
    </button>
  );
}
