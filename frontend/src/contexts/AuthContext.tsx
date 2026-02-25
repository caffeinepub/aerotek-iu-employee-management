import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SessionRole = 'hrAdmin' | 'manager' | 'employee' | 'supervisor';

export interface Session {
  username: string;
  role: SessionRole;
  employeeId?: string;
}

interface AuthContextType {
  session: Session | null;
  setSession: (session: Session | null) => void;
  logout: () => void;
  isHrAdmin: boolean;
  isHRAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
  isSupervisor: boolean;
  isAuthenticated: boolean;
}

const SESSION_KEY = 'aerotek_session';

export function getStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.username && parsed.role) {
      return parsed as Session;
    }
    return null;
  } catch {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  setSession: () => {},
  logout: () => {},
  isHrAdmin: false,
  isHRAdmin: false,
  isManager: false,
  isEmployee: false,
  isSupervisor: false,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => {
    return getStoredSession();
  });

  const setSession = (newSession: Session | null) => {
    setSessionState(newSession);
    try {
      if (newSession) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Storage quota exceeded or unavailable — continue without persisting
    }
  };

  const logout = () => setSession(null);

  const isHrAdmin = session?.role === 'hrAdmin';
  const isHRAdmin = isHrAdmin;
  const isManager = session?.role === 'manager';
  const isEmployee = session?.role === 'employee';
  const isSupervisor = session?.role === 'supervisor';
  const isAuthenticated = session !== null;

  return (
    <AuthContext.Provider
      value={{
        session,
        setSession,
        logout,
        isHrAdmin,
        isHRAdmin,
        isManager,
        isEmployee,
        isSupervisor,
        isAuthenticated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Alias for backward compatibility with existing components
export function useAuthContext() {
  return useContext(AuthContext);
}

export default AuthContext;
