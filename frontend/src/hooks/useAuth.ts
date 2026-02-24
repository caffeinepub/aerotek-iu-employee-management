import { useState } from 'react';
import { useActor } from './useActor';
import { useAuthContext, Session, getStoredSession } from '../contexts/AuthContext';
import { Role } from '../backend';

export { getStoredSession };

function parseIcpError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes('user not found') || msg.includes('User not found')) return 'User not found';
  if (msg.includes('invalid credentials') || msg.includes('Invalid credentials')) return 'Invalid credentials';
  if (msg.includes('Unauthorized')) return 'Unauthorized access';
  return msg;
}

export function useAuth() {
  const { actor, isFetching } = useActor();
  const { session, setSession, logout: ctxLogout, isHrAdmin, isManager, isEmployee, isSupervisor } = useAuthContext();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = async (username: string, password: string): Promise<{ success: boolean; role?: string; error?: string }> => {
    if (isFetching || !actor) {
      return { success: false, error: 'System initializing, please try again.' };
    }
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const profile = await actor.login(username, password);
      if (!profile) {
        // Try validateSession for pre-seeded admins
        const valid = await actor.validateSession(username);
        if (!valid) {
          setLoginError('Invalid username or password.');
          return { success: false, error: 'Invalid username or password.' };
        }
        // Pre-seeded admin fallback
        const sess: Session = {
          username,
          displayName: username,
          role: 'hrAdmin',
          employeeId: undefined,
        };
        setSession(sess);
        return { success: true, role: 'hrAdmin' };
      }

      const roleMap: Record<string, 'hrAdmin' | 'manager' | 'employee' | 'supervisor'> = {
        [Role.hrAdmin]: 'hrAdmin',
        [Role.manager]: 'manager',
        [Role.employee]: 'employee',
        [Role.supervisor]: 'supervisor',
      };
      const role = roleMap[profile.role as string] ?? 'employee';
      const sess: Session = {
        username: profile.username,
        displayName: profile.username,
        role,
        employeeId: profile.employeeId ?? undefined,
      };
      setSession(sess);
      return { success: true, role };
    } catch (err) {
      const msg = parseIcpError(err);
      setLoginError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    ctxLogout();
  };

  return {
    session,
    login,
    logout,
    isLoggingIn,
    loginError,
    isHrAdmin,
    isManager,
    isEmployee,
    isSupervisor,
    isAuthenticated: !!session,
  };
}
