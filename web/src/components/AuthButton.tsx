// Sign-in/sign-out control in the top bar. Signed in, the name links to Account.
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';

export function AuthButton() {
  const { user, api } = useStore();

  if (user) {
    return (
      <div className="auth">
        <Link className="auth-me" to="/account" title="Account settings">
          {user.photo && <img className="avatar" src={user.photo} alt="" referrerPolicy="no-referrer" />}
          <span className="auth-name">{user.name}</span>
        </Link>
        <button className="btn subtle" onClick={() => api.signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <button className="btn primary" onClick={() => api.signIn()}>
      Sign in with Google
    </button>
  );
}
