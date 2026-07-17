// ---------------------------------------------------------------------------
// React glue for the store. Always uses CloudBackend (Firebase).
// If firebase-config.ts is still null, renders a setup screen instead of
// falling back to localStorage — there is no local mode.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { firebaseConfig } from '../firebase-config';
import type { Backend, StoreState } from './backend';
import { CloudBackend } from './cloud';

export interface StoreValue extends StoreState {
  api: Backend;
}

const initialState: StoreState = {
  ready: false,
  user: null,
  robots: [],
  modpacks: [],
  repos: [],
  scripts: [],
  canEdit: false,
  error: null
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Show a clear setup screen instead of silently doing nothing.
  if (!firebaseConfig) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 16, padding: 32, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2 style={{ margin: 0 }}>Firebase not configured</h2>
        <p style={{ margin: 0, color: '#8b95a7', maxWidth: 480 }}>
          Paste your Firebase web app config into{' '}
          <code>web/src/firebase-config.ts</code> to enable Google sign-in and
          cloud sync. See the README for setup instructions.
        </p>
      </div>
    );
  }

  return <_Provider>{children}</_Provider>;
}

// Separated so the hook + state only mount when a config exists.
function _Provider({ children }: { children: React.ReactNode }) {
  const backendRef = useRef<Backend | null>(null);
  if (!backendRef.current) {
    backendRef.current = new CloudBackend(firebaseConfig!);
  }

  const [state, setState] = useState<StoreState>(initialState);

  useEffect(() => {
    const backend = backendRef.current!;
    backend.init((patch) => setState((prev) => ({ ...prev, ...patch })));
    return () => backend.dispose();
  }, []);

  const value = useMemo<StoreValue>(() => ({ ...state, api: backendRef.current! }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
