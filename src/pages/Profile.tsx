import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, Scale } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore, useCurrentUser, type LocalePref, type Unit, signOut } from '../store/auth';
import { useLocaleStore } from '../store/locale';
import { cn } from '../lib/utils';

/**
 * Profile page — the "Me" tab's deep view.
 *
 * Wires together:
 *   - Avatar picker (emoji swatch + initial fallback)
 *   - Display name editing (live)
 *   - Unit toggle (kg ⇄ lb)
 *   - Language toggle (EN ⇄ ZH) — syncs both auth store and i18next
 *   - Sign-out button (clears current user pointer)
 *
 * Profile is auth-guarded via `RequireAuth` in the router, so by the time
 * this component mounts `useCurrentUser` is guaranteed non-null.
 */
export function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setLocaleGlobal = useLocaleStore((s) => s.setLocale);

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

  const onUnitChange = (next: Unit) => {
    updateProfile({ unit: next });
  };

  const onLocaleChange = (next: LocalePref) => {
    updateProfile({ locale: next });
    setLocaleGlobal(next);
  };

  const onAvatarChange = (next: string) => {
    updateProfile({ avatar: next });
  };

  const onSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
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
          <span className="pf-chip">{t('me.freeTier')}</span>
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

      {/* Unit toggle */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          <Scale className="size-4 text-[rgb(var(--fg-secondary))]" aria-hidden />
          <h3 className="pf-section-title">{t('profile.unit')}</h3>
        </div>
        <SegmentedControl<Unit>
          value={user.unit}
          onChange={onUnitChange}
          options={[
            { value: 'kg', label: t('profile.unitKg') },
            { value: 'lb', label: t('profile.unitLb') },
          ]}
        />
      </Card>

      {/* Language toggle */}
      <Card className="mt-4">
        <h3 className="pf-section-title mb-3">{t('profile.language')}</h3>
        <SegmentedControl<LocalePref>
          value={user.locale}
          onChange={onLocaleChange}
          options={[
            { value: 'en', label: 'English' },
            { value: 'zh', label: '中文' },
          ]}
        />
      </Card>

      {/* Sign-out */}
      <div className="mt-6">
        <Button
          variant="danger"
          size="lg"
          block
          leadingIcon={<LogOut className="size-4" aria-hidden />}
          onClick={onSignOut}
        >
          {t('auth.signOut')}
        </Button>
        <p className="mt-2 text-center text-[11px] text-[rgb(var(--fg-subtle))]">
          {t('profile.signOutHint')}
        </p>
      </div>
    </div>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}

function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" className="inline-flex w-full rounded-lg bg-[rgb(var(--bg-sunken))] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
              active
                ? 'bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-primary))] shadow-sm'
                : 'text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}