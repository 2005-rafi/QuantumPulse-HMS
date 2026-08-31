import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';
import sessionStore, {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
  subscribeAuthChange,
} from '../core/useSessionStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on mount (In-Memory + Refresh Token Bootstrap)
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      let accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      // If no accessToken in memory, but refreshToken exists, perform silent bootstrap refresh
      if ((!accessToken || isTokenExpired(accessToken)) && refreshToken) {
        try {
          const { data } = await authAPI.refresh(refreshToken);
          if (data?.data?.accessToken) {
            accessToken = data.data.accessToken;
            setTokens(accessToken, data.data.refreshToken || refreshToken);
          }
        } catch (refreshErr) {
          console.warn('Session bootstrap refresh failed:', refreshErr?.message);
          clearTokens(false);
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }
      }

      if (!accessToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data } = await authAPI.me();
        if (isMounted) {
          setUser(data.data);
          if (data.data?.departmentId) {
            setDepartmentId(data.data.departmentId);
          }
        }
      } catch (err) {
        clearTokens(false);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    restoreSession();

    // Subscribe to cross-tab logout events
    const unsubscribe = subscribeAuthChange((event) => {
      if (event.type === 'LOGOUT' && isMounted) {
        setUser(null);
        setDepartmentId(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const { data } = await authAPI.login({ username, password });
      const { accessToken, refreshToken, user: userData } = data.data;
      // In-memory token storage + persistent refresh token
      setTokens(accessToken, refreshToken);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hms_auth_username', username);
        sessionStorage.removeItem('hms_terminal_locked');
        sessionStorage.setItem('hms_last_activity', String(Date.now()));
      }

      // Fetch full me() to verify fresh permissions
      const meRes = await authAPI.me();
      const fullUser = meRes.data.data || userData;
      setUser(fullUser);
      if (fullUser?.departmentId) {
        setDepartmentId(fullUser.departmentId);
      }
      return fullUser;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Swallow network failure on logout — clear local session regardless
    }
    clearTokens(true);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('hms_auth_username');
      sessionStorage.removeItem('hms_terminal_locked');
      sessionStorage.removeItem('hms_last_activity');
    }
    setUser(null);
    setDepartmentId(null);
  }, []);

  const hasPermission = useCallback(
    (permission) => user?.permissions?.includes(permission) || false,
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        departmentId,
        setDepartmentId,
        loading,
        error,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
