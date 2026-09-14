import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../../store/auth';

/**
 * Auth guard — wraps protected routes and bounces anonymous visitors to
 * the login page, capturing the original destination in router state so
 * the login page can deep-link back after a successful sign-in.
 *
 * We render a placeholder card rather than `null` while the user record
 * is being resolved so the layout doesn't jitter on first paint (the auth
 * store rehydrates from localStorage asynchronously).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}