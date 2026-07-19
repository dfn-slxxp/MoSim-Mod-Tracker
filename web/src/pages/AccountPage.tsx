// ---------------------------------------------------------------------------
// Account page (/account) — edit your public profile, see how the community
// directory sees you, and link additional Google accounts. Sign-in identity
// (email, Google photo) is read-only.
// ---------------------------------------------------------------------------
import { useEffect } from 'react';
import { useDialog } from '../components/Dialog';
import { ProfileForm } from '../components/ProfileForm';
import { useStore } from '../store/StoreContext';

export function AccountPage() {
  const { user, api } = useStore();
  const { confirmDialog, alertDialog } = useDialog();

  // Linking happens in an external Google tab; refresh when we regain focus so
  // a newly-linked account shows up without a manual reload.
  useEffect(() => {
    const onFocus = () => void api.refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [api]);

  if (!user) return null;

  const linked = user.linked ?? [];

  const addAccount = async () => {
    try {
      await api.startLinkAccount();
    } catch (e) {
      void alertDialog((e as Error).message, 'Could not link account');
    }
  };

  const unlink = async (sub: string, email: string) => {
    if (!(await confirmDialog({
      title: 'Unlink account',
      message: `Stop signing in with ${email}? Its data stays with this account.`,
      confirmLabel: 'Unlink',
    }))) return;
    try {
      await api.unlinkAccount(sub);
    } catch (e) {
      void alertDialog((e as Error).message, 'Could not unlink');
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Account</h1>
        <p className="muted">Your public profile in the community directory.</p>
      </div>

      <div className="account-identity">
        {user.photo && <img className="account-photo" src={user.photo} alt="" referrerPolicy="no-referrer" />}
        <div>
          <div className="account-email">{user.primaryEmail ?? user.email}</div>
          <div className="muted small">Signed in with Google · this can’t be changed here</div>
        </div>
        <button className="btn subtle" style={{ marginLeft: 'auto' }} onClick={() => api.signOut()}>
          Sign out
        </button>
      </div>

      <div className="account-card">
        <ProfileForm />
      </div>

      {/* Linked Google accounts */}
      <div className="account-card" style={{ marginTop: 16 }}>
        <h2 className="account-subhead">Sign-in accounts</h2>
        <p className="muted small" style={{ marginTop: 0 }}>
          Link more Google accounts so you can sign in with any of them and land here. Data always
          stays on this one account.
        </p>

        <div className="linked-list">
          <div className="linked-row">
            <span className="linked-email">{user.primaryEmail ?? user.email}</span>
            <span className="linked-tag primary">Primary</span>
          </div>
          {linked.map((l) => (
            <div key={l.sub} className="linked-row">
              <span className="linked-email">{l.email || l.sub}</span>
              {l.email === user.email && <span className="linked-tag">Current</span>}
              <button className="btn danger subtle" onClick={() => unlink(l.sub, l.email || 'this account')}>
                Unlink
              </button>
            </div>
          ))}
        </div>

        <button className="btn" style={{ marginTop: 12 }} onClick={addAccount}>
          + Add Google account
        </button>
      </div>
    </div>
  );
}
