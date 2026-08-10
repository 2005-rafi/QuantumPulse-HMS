import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authAPI.me();
        setUser(data.data);
        if (data.data && data.data.departmentId) {
          setDepartmentId(data.data.departmentId);
        }
        setUser(data.data);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (username, password) => {
    setError(null);
    try {
      const { data } = await authAPI.login({ username, password });
      const { accessToken, refreshToken, user: userData } = data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      // Fetch full me() to get permissions
      const meRes = await authAPI.me();
      setUser(meRes.data.data);
      return meRes.data.data;
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
      // Swallow — clear local state regardless
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission) => user?.permissions?.includes(permission) || false,
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, departmentId, setDepartmentId, loading, error, login, logout, hasPermission }}>
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
