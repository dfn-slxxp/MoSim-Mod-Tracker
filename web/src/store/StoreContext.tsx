// ---------------------------------------------------------------------------
// React glue for the store. React "context" makes a value available to every
// component underneath a provider without passing it through props manually —
// roughly dependency injection for the UI tree. Any component can call
// `useStore()` to get the current data + the backend API.
// ---------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { firebaseConfig } from '../firebase-config';
import type { Backend, StoreState } from './backend';
import { CloudBackend } from './cloud';
import { LocalBackend } from './local';

export interface StoreValue extends StoreState {
  api: Backend; // call api.addRobot(...) etc. from any component
}

const initialState: StoreState = {
  mode: 'local',
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
  // useRef = a mutable box that survives re-renders (unlike a local variable).
  // We create the backend exactly once: cloud if a Firebase config exists,
  // otherwise local.
  const backendRef = useRef<Backend | null>(null);
  if (!backendRef.current) {
    backendRef.current = firebaseConfig ? new CloudBackend(firebaseConfig) : new LocalBackend();
  }

  // useState = component state; calling setState re-renders the UI with the
  // new value. The backend pushes partial updates which we merge in.
  const [state, setState] = useState<StoreState>(initialState);

  // useEffect(fn, []) runs once after the first render (like a constructor for
  // side effects); the returned function runs on teardown (like Dispose()).
  useEffect(() => {
    const backend = backendRef.current!;
    backend.init((patch) => setState((prev) => ({ ...prev, ...patch })));
    return () => backend.dispose();
  }, []);

  // useMemo caches the object so children don't re-render unnecessarily.
  const value = useMemo<StoreValue>(() => ({ ...state, api: backendRef.current! }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/** Hook used by components: `const { robots, api, canEdit } = useStore();` */
export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
