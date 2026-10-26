import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI, refreshAccessToken } from '../services/api';
import sessionStore, {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
  subscribeAuthChange,
} from '../core/useSessionStore';

const AuthContext = createContext(null);

const authBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('hms_auth_channel')
  : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [department, setDepartment] = useState(null);
  const [facility, setFacility] = useState(null);
  const [securityMetadata, setSecurityMetadata] = useState(null);
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
          const freshToken = await refreshAccessToken();
          if (freshToken) {
            accessToken = freshToken;
          }
        } catch (refreshErr) {
          console.warn('Session bootstrap refresh failed:', refreshErr?.message);
          const isPermanentAuthError =
            refreshErr.response?.status === 401 ||
            refreshErr.response?.status === 403 ||
            ['AUTH_001', 'AUTH_002', 'AUTH_003', 'AUTH_004', 'AUTH_005'].includes(refreshErr.response?.data?.errorCode);

          if (isPermanentAuthError) {
            clearTokens(false);
            if (isMounted) {
              setUser(null);
              setDepartmentId(null);
              setDepartment(null);
              setLoading(false);
            }
            return;
          }
          if (isMounted) setLoading(false);
          return;
        }
      }

      if (!accessToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Single-flight composite BFF session bootstrap
        const { data } = await authAPI.bootstrap();
        const payload = data.data;
        if (isMounted && payload) {
          setUser(payload.user);
          if (payload.user?.departmentId) {
            setDepartmentId(payload.user.departmentId);
          }
          if (payload.department) {
            setDepartment(payload.department);
          }
          if (payload.facility) {
            setFacility(payload.facility);
          }
          if (payload.security) {
            setSecurityMetadata(payload.security);
          }
        }
      } catch (err) {
        // Fallback to me() if bootstrap endpoint returns an unexpected error
        try {
          const { data } = await authAPI.me();
          if (isMounted) {
            setUser(data.data);
            if (data.data?.departmentId) {
              setDepartmentId(data.data.departmentId);
            }
          }
        } catch (meErr) {
          const isAuthError = meErr.response?.status === 401 || meErr.response?.status === 403;
          if (isAuthError) {
            clearTokens(false);
            if (isMounted) {
              setUser(null);
              setDepartmentId(null);
              setDepartment(null);
            }
          }
        }
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
        setDepartment(null);
        setFacility(null);
        setSecurityMetadata(null);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Proactive JWT Token Lifecycle Heartbeat (Refreshes access token before expiration during active sessions)
  useEffect(() => {
    if (!user) return;

    const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes
    const EXPIRY_THRESHOLD_SECONDS = 5 * 60; // Refresh if less than 5 minutes remain

    const heartbeat = setInterval(async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      if (!token || !refreshToken) return;

      const isLocked = typeof window !== 'undefined' && sessionStorage.getItem('hms_terminal_locked') === 'true';
      if (isLocked) return; // Do not refresh while workstation is locked

      if (isTokenExpired(token, EXPIRY_THRESHOLD_SECONDS)) {
        try {
          const { refreshAccessToken } = await import('../services/api');
          await refreshAccessToken();
        } catch (err) {
          console.warn('Proactive background token refresh postponed:', err?.message);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [user]);

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

      // Composite session bootstrap
      try {
        const bootRes = await authAPI.bootstrap();
        const bootData = bootRes.data.data;
        if (bootData?.user) {
          setUser(bootData.user);
          if (bootData.user?.departmentId) setDepartmentId(bootData.user.departmentId);
          if (bootData.department) setDepartment(bootData.department);
          if (bootData.facility) setFacility(bootData.facility);
          if (bootData.security) setSecurityMetadata(bootData.security);
          return bootData.user;
        }
      } catch (_) {
        // Fallback to me endpoint if bootstrap is not supported or fails
        try {
          const meRes = await authAPI.me();
          const fullUser = meRes.data.data || userData;
          setUser(fullUser);
          if (fullUser?.departmentId) setDepartmentId(fullUser.departmentId);
          return fullUser;
        } catch {
          setUser(userData);
          if (userData?.departmentId) setDepartmentId(userData.departmentId);
          return userData;
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      setError(msg);
      throw err;
    }
  }, []);

  // Synchronize logout across browser tabs on shared terminals
  useEffect(() => {
    if (!authBroadcastChannel) return;
    const handleBroadcast = (event) => {
      if (event.data?.type === 'SESSION_TERMINATED') {
        clearTokens(true);
        setUser(null);
        setDepartmentId(null);
        setDepartment(null);
        setFacility(null);
        setSecurityMetadata(null);
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          localStorage.clear();
        }
      }
    };
    authBroadcastChannel.addEventListener('message', handleBroadcast);
    return () => authBroadcastChannel.removeEventListener('message', handleBroadcast);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch {
      // Swallow network failure on logout — clear local session regardless
    }
    clearTokens(true);
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    if (authBroadcastChannel) {
      try {
        authBroadcastChannel.postMessage({ type: 'SESSION_TERMINATED' });
      } catch (_) {}
    }
    setUser(null);
    setDepartmentId(null);
    setDepartment(null);
    setFacility(null);
    setSecurityMetadata(null);
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
        department,
        facility,
        securityMetadata,
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
