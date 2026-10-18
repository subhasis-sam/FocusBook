import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getDatabase } from '../db/database';

type AppState = { ready: boolean; revision: number; refresh: () => void; error: string | null };
const Context = createContext<AppState>({ ready: false, revision: 0, refresh: () => undefined, error: null });
export function AppProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false); const [error, setError] = useState<string | null>(null); const [revision, setRevision] = useState(0);
  useEffect(() => { getDatabase().then(() => setReady(true)).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not open FocusBook storage.')); }, []);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  return <Context.Provider value={{ ready, revision, refresh, error }}>{children}</Context.Provider>;
}
export function useAppState() { return useContext(Context); }
