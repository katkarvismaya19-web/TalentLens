import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return null; }
    try {
      const me = await api("/auth/me");
      setUser(me);
      return me;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = useCallback((session) => {
    setToken(session.token);
    setUser(session.user);
  }, []);

  const signInWithToken = useCallback(async (token) => {
    setToken(token);
    setLoading(true);
    return refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export const homeFor = (user) => (user?.role === "hr" ? "/dashboard" : "/careers");
