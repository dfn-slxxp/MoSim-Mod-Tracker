// ---------------------------------------------------------------------------
// React glue for the store. Uses HTTPBackend — all data lives on the server,
// auth is a Google OAuth redirect flow. No Firebase dependency.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Backend, StoreState } from './backend';
import { HTTPBackend } from './http';

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
  error: null,
  needsServerSetup: false,
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const backendRef = useRef<Backend | null>(null);
  if (!backendRef.current) {
    backendRef.current = new HTTPBackend();
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
