import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, fetchCurrentUser } from '../services/api';
import { queryClient } from '../services/queryClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('evaluator_token'));
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('evaluator_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('evaluator_token');
    localStorage.removeItem('evaluator_user');
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  // Verify stored token on initial load
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('evaluator_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const { user: verifiedUser } = await fetchCurrentUser();
        setUser(verifiedUser);
        localStorage.setItem('evaluator_user', JSON.stringify(verifiedUser));
      } catch (err) {
        console.warn('[AuthContext] Session expired or invalid:', err.message);
        logout();
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();

    // Global unauthorized event listener
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const login = async (credentials) => {
    const data = await loginUser(credentials);
    localStorage.setItem('evaluator_token', data.token);
    localStorage.setItem('evaluator_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    queryClient.clear(); // Fresh data for newly logged in user
    return data.user;
  };

  const register = async (userData) => {
    const data = await registerUser(userData);
    localStorage.setItem('evaluator_token', data.token);
    localStorage.setItem('evaluator_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    queryClient.clear();
    return data.user;
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
