import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/Home';
import { RecordsPage } from './pages/Records';
import { RecordWeightPage } from './pages/RecordWeight';
import { RecordFoodPage } from './pages/RecordFood';
import { RecordExercisePage } from './pages/RecordExercise';
import { CouplePage } from './pages/Couple';
import { TrendsPage } from './pages/Trends';
import { MePage } from './pages/Me';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { ProfilePage } from './pages/Profile';
import { OnboardingPage } from './pages/Onboarding';
import { SettingsPage } from './pages/Settings';
import { SubscriptionPage } from './pages/Subscription';
import { RequireAuth } from './components/auth/RequireAuth';
import { ToastViewport } from './components/ui/Toast';
import { bindSystemThemeListener, useThemeStore } from './store/theme';

/**
 * App root. Sets up routing and binds a system-preference listener so the
 * resolved theme updates live when the user changes their OS settings.
 *
 * Routes (PF-1 + PF-2 + PF-3 + PF-4 + PF-5 + PF-9):
 *   - `/` … `/me`            — public tabs (AppShell + tab bar)
 *   - `/login`               — public auth shell (no tab bar)
 *   - `/register`            — public auth shell (no tab bar)
 *   - `/forgot-password`     — public auth shell (no tab bar)
 *   - `/onboarding`          — public goal-setting flow (PF-3)
 *   - `/records/weight`      — protected (RequireAuth)
 *   - `/records/food`        — protected (RequireAuth) — PF-4 meal log
 *   - `/records/exercise`    — protected (RequireAuth) — PF-5
 *   - `/profile`             — protected (RequireAuth) — avatar + name
 *   - `/settings`            — protected (RequireAuth) — global prefs
 *   - `/subscription`        — protected (RequireAuth) — Pro
 *
 * The ToastViewport is mounted at the very top of the tree so any page
 * can push toasts without owning the layout.
 */
export default function App() {
  useEffect(() => {
    // Resolve the theme once on boot (the persist middleware also does this
    // on rehydrate, but we re-compute to cover first-load SSR-less cases).
    useThemeStore.getState().syncFromSystem();
    return bindSystemThemeListener();
  }, []);

  return (
    <>
      <ToastViewport />
      <Routes>
        {/* Auth flow routes — rendered bare, no tab bar / top bar. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected routes — same chrome but auth-guarded. */}
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
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <AppShell>
                <SettingsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/subscription"
          element={
            <RequireAuth>
              <AppShell>
                <SubscriptionPage />
              </AppShell>
            </RequireAuth>
          }
        />

        {/* Protected weight-logging sub-route — records tab redirects here. */}
        <Route
          path="/records/weight"
          element={
            <RequireAuth>
              <AppShell>
                <RecordWeightPage />
              </AppShell>
            </RequireAuth>
          }
        />

        {/* Protected food-logging sub-route — PF-4. */}
        <Route
          path="/records/food"
          element={
            <RequireAuth>
              <AppShell>
                <RecordFoodPage />
              </AppShell>
            </RequireAuth>
          }
        />

        {/* Protected exercise-logging sub-route — PF-5. */}
        <Route
          path="/records/exercise"
          element={
            <RequireAuth>
              <AppShell>
                <RecordExercisePage />
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
    </>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="mb-3 text-5xl" aria-hidden>
        🧭
      </span>
      <h1 className="text-2xl font-bold text-[rgb(var(--fg-primary))]">{t('notFound.title')}</h1>
      <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
        {t('notFound.body')}
      </p>
    </div>
  );
}
