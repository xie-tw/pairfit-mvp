import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Cog } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore, useCurrentUser } from '../store/auth';
import { cn } from '../lib/utils';

/**
 * Profile page — the "Me" tab's deep view.
 *
 * PF-9 scope shrink: Profile now owns *identity* only (avatar + display
 * name). Unit / language / notifications / sign-out / data management
 * moved to `/settings`. Two cards here link into that page so the user
 * always has a path forward.
 *
 * Profile is auth-guarded via `RequireAuth` in the router, so by the time
 * this component mounts `useCurrentUser` is guaranteed non-null.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [nameSaved, setNameSaved] = useState(false);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the input only when the active user changes (sign-in / sign-out /
  // account switch), not on every keystroke of the upstream record — that
  // would clobber the user's in-flight edits before the debounce fires.
  useEffect(() => {
    setDisplayName(user?.displayName ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Persist displayName with a tiny debounce so users don't pay a write
  // for every keystroke. The "saved" badge confirms the change is in.
  useEffect(() => {
    if (!user) return;
    if (displayName.trim() === user.displayName) return;
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => {
      updateProfile({ displayName });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    }, 350);
    return () => {
      if (nameTimer.current) clearTimeout(nameTimer.current);
    };
  }, [displayName, user, updateProfile]);

  if (!user) {
    // Belt-and-suspenders: the route is auth-guarded, so we shouldn't
    // actually hit this. Render a minimal placeholder rather than throw.
    return null;
  }

  const onAvatarChange = (next: string) => {
    updateProfile({ avatar: next });
  };

  const initial = (user.displayName.trim()[0] ?? 'P').toUpperCase();

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      {/* Identity card — avatar + name + email */}
      <Card raised>
        <div className="flex items-center gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-2xl shadow-sm"
            aria-hidden
          >
            {user.avatar || (
              <span className="text-base font-semibold text-white">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-[rgb(var(--fg-primary))]">
              {user.displayName}
            </h2>
            <p className="truncate text-sm text-[rgb(var(--fg-secondary))]">
              {t('profile.signedInAs', { email: user.email })}
            </p>
          </div>
          <span className={user.isPro ? 'pf-chip pf-chip-pro' : 'pf-chip'}>
            {user.isPro ? t('me.proBadge') : t('me.freeTier')}
          </span>
        </div>
      </Card>

      {/* Avatar picker */}
      <Card className="mt-4">
        <h3 className="pf-section-title mb-3">{t('profile.avatar')}</h3>
        <AvatarPicker
          value={user.avatar}
          fallbackInitial={initial}
          onChange={onAvatarChange}
        />
      </Card>

      {/* Display name (editable) */}
      <Card className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="pf-section-title">{t('profile.displayName')}</h3>
          {nameSaved ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
                'bg-accent-500/15 text-[11px] font-medium text-accent-600 dark:text-accent-300',
              )}
              aria-live="polite"
            >
              {t('profile.saved')}
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <Input
            label={t('profile.displayNameLabel')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={32}
            autoComplete="nickname"
          />
        </div>
        <p className="mt-2 text-xs text-[rgb(var(--fg-subtle))]">{user.email}</p>
      </Card>

      {/* Link row into Settings — surfaces where the moved controls live. */}
      <Link
        to="/settings"
        className="mt-4 block rounded-xl border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] transition-shadow hover:shadow-sm pf-press"
      >
        <div className="flex items-center gap-3 px-4 py-3.5">
          <Cog className="size-5 text-[rgb(var(--fg-secondary))]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[rgb(var(--fg-primary))]">
              {t('me.settings')}
            </p>
            <p className="text-xs text-[rgb(var(--fg-secondary))]">
              {t('profile.settingsHint')}
            </p>
          </div>
          <ChevronRight className="size-4 text-[rgb(var(--fg-subtle))]" aria-hidden />
        </div>
      </Link>

      {/* Defensive: Profile can be reached without auth-state recovery
          in some flows; render a minimal return-home escape hatch. */}
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mt-6 text-xs text-[rgb(var(--fg-subtle))] underline-offset-2 hover:underline"
      >
        {t('auth.skipToHome')}
      </button>
    </div>
  );
}