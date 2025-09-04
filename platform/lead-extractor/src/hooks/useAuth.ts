import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [hasTokens, setHasTokens] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/status`, { withCredentials: true });
      setIsAuthenticated(response.data.authenticated);
      // Backend stateless renvoie { authenticated, email } (plus de hasTokens)
      setHasTokens(response.data.authenticated);
      setEmail(response.data.email || null);
      return { authenticated: response.data.authenticated, hasTokens: response.data.authenticated, email: response.data.email };
    } catch (error) {
      console.error('Erreur authentification:', error);
      setIsAuthenticated(false);
      setHasTokens(false);
      setEmail(null);
      return { authenticated: false, hasTokens: false, email: null };
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = () => {
    window.location.href = `${API_URL}/auth/google/start`;
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/logout`, null, { withCredentials: true });
      setIsAuthenticated(false);
      setHasTokens(false);
      setEmail(null);
      return { success: true };
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    isAuthenticated,
    hasTokens,
    email,
    loading,
    checkAuthStatus,
    redirectToLogin,
    logout
  };
};
