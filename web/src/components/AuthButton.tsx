// Sign-in/sign-out control in the top bar. Signed in, the name links to Account.
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { useAuthProviders } from '../lib/useAuthProviders';

export function AuthButton() {
  const { user, api } = useStore();
  const providers = useAuthProviders();

  if (user) {
    return (
      <div className="auth">
        <Link className="auth-me" to="/account" title="Account settings">
          {user.photo && <img className="avatar" src={user.photo} alt={`${user.name}'s avatar`} referrerPolicy="no-referrer" />}
          <span className="auth-name">{user.name}</span>
        </Link>
        <button className="btn subtle" onClick={() => api.signOut()}>Sign out</button>
      </div>
    );
  }

  return (
    <div className="auth">
      <button className="btn primary" onClick={() => api.signIn('google')}>
        Sign in with Google
      </button>
      {providers.github && (
        <button className="btn" title="Sign in with GitHub" onClick={() => api.signIn('github')}>
          GitHub
        </button>
      )}
      {providers.discord && (
        <button className="btn" title="Sign in with Discord" onClick={() => api.signIn('discord')}>
          Discord
        </button>
      )}
    </div>
  );
}
