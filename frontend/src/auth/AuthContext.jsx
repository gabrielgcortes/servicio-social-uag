import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.js';
import { setOnUnauthorized } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [principal, setPrincipal] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setPrincipal(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(clearSession);
  }, [clearSession]);

  useEffect(() => {
    // Al recargar la página, restaura la sesión vía refresh (cookie httpOnly) + /auth/me.
    (async () => {
      try {
        await authApi.refresh();
        const me = await authApi.fetchMe();
        setPrincipal(me);
      } catch {
        setPrincipal(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    await authApi.login(email, password);
    const me = await authApi.fetchMe();
    setPrincipal(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setPrincipal(null);
    }
  }, []);

  const value = useMemo(
    () => ({ principal, loading, login, logout }),
    [principal, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
