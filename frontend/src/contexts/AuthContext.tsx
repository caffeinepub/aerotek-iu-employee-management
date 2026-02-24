import React, { createContext, useContext, useState } from 'react';

export interface Session {
  username: string;
  displayName: string;
  role: 'hrAdmin' | 'manager' | 'employee' | 'supervisor';
  employeeId?: string;
}

interface AuthContextType {
  session: Session | null;
  setSession: (session: Session | null) => void;
  logout: () => void;
  isHrAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isSupervisor: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'auth_session';

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function getStoredSession(): Session | null {
  return loadSession();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => loadSession());

  const setSession = (s: Session | null) => {
    if (s) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
    setSessionState(s);
  };

  const logout = () => setSession(null);

  const isHrAdmin = session?.role === 'hrAdmin';
  const isManager = session?.role === 'manager';
  const isEmployee = session?.role === 'employee';
  const isSupervisor = session?.role === 'supervisor';

  return (
    <AuthContext.Provider value={{ session, setSession, logout, isHrAdmin, isManager, isEmployee, isSupervisor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
