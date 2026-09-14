import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/Home';
import { RecordsPage } from './pages/Records';
import { CouplePage } from './pages/Couple';
import { TrendsPage } from './pages/Trends';
import { MePage } from './pages/Me';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { ProfilePage } from './pages/Profile';
import { OnboardingPlaceholderPage } from './pages/OnboardingPlaceholder';
import { RequireAuth } from './components/auth/RequireAuth';
import { bindSystemThemeListener, useThemeStore } from './store/theme';

/**
 * App root. Sets up routing and binds a system-preference listener so the
 * resolved theme updates live when the user changes their OS settings.
 *
 * Routes (PF-1 + PF-2):
 *   - `/` … `/me`            — public tabs (AppShell + tab bar)
 *   - `/login`               — public auth shell (no tab bar)
 *   - `/register`            — public auth shell (no tab bar)
 *   - `/forgot-password`     — public auth shell (no tab bar)
 *   - `/onboarding`          — public celebration after signup
 *   - `/profile`             — protected (RequireAuth)
 */
export default function App() {
  useEffect(() => {
    // Resolve the theme once on boot (the persist middleware also does this
    // on rehydrate, but we re-compute to cover first-load SSR-less cases).
    useThemeStore.getState().syncFromSystem();
    return bindSystemThemeListener();
  }, []);

  return (
    <Routes>
      {/* Auth flow routes — rendered bare, no tab bar / top bar. */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPlaceholderPage />} />

      {/* Protected route — same chrome but auth-guarded. */}
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <AppShell>
              <ProfilePage />
            </AppShell>
          </RequireAuth>
        }
      />

      {/* Default app shell — tabs and all. */}
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/couple" element={<CouplePage />} />
              <Route path="/trends" element={<TrendsPage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-3 text-5xl" aria-hidden>
        🧭
      </span>
      <h1 className="text-2xl font-bold text-[rgb(var(--fg-primary))]">Page not found</h1>
      <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
        The route you tried doesn't exist yet.
      </p>
    </div>
  );
}