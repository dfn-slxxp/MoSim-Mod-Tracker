// ---------------------------------------------------------------------------
// Account page (/account) — edit your public profile and see how the community
// directory sees you. Sign-in identity (email, Google photo) is read-only.
// ---------------------------------------------------------------------------
import { ProfileForm } from '../components/ProfileForm';
import { useStore } from '../store/StoreContext';

export function AccountPage() {
  const { user, api } = useStore();
  if (!user) return null;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Account</h1>
        <p className="muted">Your public profile in the community directory.</p>
      </div>

      <div className="account-identity">
        {user.photo && <img className="account-photo" src={user.photo} alt="" referrerPolicy="no-referrer" />}
        <div>
          <div className="account-email">{user.email}</div>
          <div className="muted small">Signed in with Google · this can’t be changed here</div>
        </div>
        <button className="btn subtle" style={{ marginLeft: 'auto' }} onClick={() => api.signOut()}>
          Sign out
        </button>
      </div>

      <div className="account-card">
        <ProfileForm />
      </div>
    </div>
  );
}
