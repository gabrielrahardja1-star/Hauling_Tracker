import { createContext, useContext, useState, useEffect } from 'react';

const TOKEN_KEY = 'ht_token';
const USER_KEY  = 'ht_user';

const AuthContext = createContext(null);
const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 >= payload.exp;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || isExpired(token)) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  });

  // loading is false immediately — we read from localStorage synchronously
  const loading = false;

  async function signIn(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const text = await res.text();
    let json = {};
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`API returned ${res.status || 'a'} non-JSON response. Is the backend running?`);
      }
    }

    if (!res.ok) {
      throw new Error(json.error || `Login request failed (${res.status}). Is the backend running?`);
    }
    if (!json.token || !json.user) throw new Error('Login response was missing user session data');

    localStorage.setItem(TOKEN_KEY, json.token);
    localStorage.setItem(USER_KEY, JSON.stringify(json.user));
    setUser(json.user);
    return json.user;
  }

  function signOut() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  function getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || isExpired(token)) {
      signOut();
      return null;
    }
    return token;
  }

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, signIn, signOut, getToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
