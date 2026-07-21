// Which sign-in providers the server has configured (GET /api/auth/providers).
// Defaults to Google-only until the server answers, so the UI never shows a
// button that can't work. Re-fetches once the store is ready because the
// desktop backend only knows the server URL after init.
import { useEffect, useState } from 'react';
import type { AuthProvider, AuthProviderAvailability } from '../types';
import { useStore } from '../store/StoreContext';

export const PROVIDER_LABELS: Record<AuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  discord: 'Discord',
};

export function useAuthProviders(): AuthProviderAvailability {
  const { api, ready } = useStore();
  const [providers, setProviders] = useState<AuthProviderAvailability>({
    google: true,
    github: false,
    discord: false,
  });

  useEffect(() => {
    let alive = true;
    void api.authProviders().then((p) => {
      if (alive) setProviders(p);
    });
    return () => {
      alive = false;
    };
  }, [api, ready]);

  return providers;
}
