import { createContext, useContext, useState, useEffect } from 'react';

const TOKEN_KEY = 'ht_token';
const USER_KEY  = 'ht_user';

const AuthContext = createContext(null);

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
    const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Login failed');

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
