import { useEffect, useRef, useState } from 'react';
import { Bell, Globe, LogOut, Moon, Monitor, Sun, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser, signOut } from '../../store/auth';
import { useLocaleStore, type LocaleCode } from '../../store/locale';
import { useThemeStore } from '../../store/theme';
import { useNotificationCenter } from '../../store/notificationCenter';
import { cn } from '../../lib/utils';

/**
 * Top navigation bar shown above every page.
 *
 * PF-2 additions:
 *   - Auth-aware right-side cluster: a small avatar button opens a
 *     dropdown with "Profile" + "Sign out" when signed in; when signed
 *     out, an inline "Sign in" pill is shown instead.
 *   - The brand locale/theme toggles stay where they were.
 *
 * BUG-FIX-3: auth state is sourced exclusively from `useCurrentUser()`,
 * which reads the persisted `useAuthPointer`. The previous dual-check
 * (`useAuthStore.currentUserId && useCurrentUser()`) silently fell back to
 * the "Sign in" pill after a page reload because `useAuthStore.currentUserId`
 * is intentionally not persisted (its `partialize` only writes `users`).
 * Relying on `useCurrentUser()` alone keeps the menu in sync across the
 * full login → reload → logout cycle.
 */
export function TopBar() {
  const { t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const user = useCurrentUser();
  const unread = useNotificationCenter((s) =>
    user ? s.unreadCount(user.id) : 0,
  );

  const themeIcon =
    mode === 'dark' ? <Moon className="size-4" aria-hidden /> :
    mode === 'system' ? <Monitor className="size-4" aria-hidden /> :
    <Sun className="size-4" aria-hidden />;

  const cycleTheme = () => {
    // Light → Dark → System → Light …
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    setMode(next);
  };

  const cycleLocale = () => {
    const next: LocaleCode = locale === 'en' ? 'zh' : 'en';
    setLocale(next);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'border-b border-[rgb(var(--border-default))]',
        'bg-[rgb(var(--bg-surface))]/85 backdrop-blur-md',
      )}
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <Brand />
        <div className="flex-1" />
        <IconButton
          onClick={cycleLocale}
          label={`${t('common.language')}: ${locale === 'en' ? 'EN' : '中文'}`}
          icon={<Globe className="size-4" aria-hidden />}
        >
          <span className="ml-1.5 hidden text-xs font-medium uppercase sm:inline">
            {locale === 'en' ? 'EN' : 'ZH'}
          </span>
        </IconButton>
        <IconButton
          onClick={cycleTheme}
          label={`${t('common.theme')}: ${mode}`}
          icon={themeIcon}
        />
        {user ? (
          <Link
            to="/notifications"
            aria-label={t('notifications.title')}
            className={cn(
              'relative inline-flex h-9 items-center justify-center rounded-full px-2.5',
              'text-[rgb(var(--fg-secondary))] hover:bg-[rgb(var(--bg-sunken))] hover:text-[rgb(var(--fg-primary))]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
              'pf-press transition-colors',
            )}
          >
            <Bell className="size-4" aria-hidden />
            {unread > 0 ? (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 inline-block size-2 rounded-full bg-brand-500 ring-2 ring-[rgb(var(--bg-surface))]"
              />
            ) : null}
          </Link>
        ) : null}
        <div className="ml-1 h-6 w-px bg-[rgb(var(--border-default))]" aria-hidden />
        {user ? <UserMenu user={user} /> : <SignInPill />}
      </div>
    </header>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 rounded-md">
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-full',
          'bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm',
        )}
        aria-hidden
      >
        <span className="text-sm font-bold tracking-tight">PF</span>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-[rgb(var(--fg-primary))]">
          PairFit
        </div>
        <div className="text-[11px] text-[rgb(var(--fg-subtle))]">
          Move together · 一起动
        </div>
      </div>
    </Link>
  );
}

function SignInPill() {
  const { t } = useTranslation();
  return (
    <Link
      to="/login"
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold',
        'bg-brand-500 text-white shadow-sm hover:bg-brand-600',
        'pf-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
      )}
    >
      {t('auth.signIn')}
    </Link>
  );
}

function UserMenu({ user }: { user: { displayName: string; avatar: string; email: string } }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initial = (user.displayName.trim()[0] ?? 'P').toUpperCase();

  // Close on outside click or Esc.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onProfile = () => {
    setOpen(false);
    navigate('/profile');
  };

  const onSignOut = () => {
    setOpen(false);
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('profile.userMenu', { name: user.displayName })}
        className={cn(
          'flex size-9 items-center justify-center rounded-full text-sm font-semibold',
          'border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))]',
          'text-[rgb(var(--fg-primary))]',
          'hover:bg-[rgb(var(--bg-sunken))]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
          'pf-press transition-colors',
        )}
      >
        {user.avatar ? (
          <span className="text-lg" aria-hidden>{user.avatar}</span>
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('profile.userMenu', { name: user.displayName })}
          className={cn(
            'absolute right-0 mt-2 w-56 origin-top-right rounded-xl border',
            'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))]',
            'shadow-lg animate-fade-in z-40',
          )}
        >
          <div className="px-3 py-3">
            <p className="truncate text-sm font-semibold text-[rgb(var(--fg-primary))]">
              {user.displayName}
            </p>
            <p className="truncate text-xs text-[rgb(var(--fg-secondary))]">{user.email}</p>
          </div>
          <div className="h-px bg-[rgb(var(--border-default))]" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={onProfile}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium',
              'text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]',
            )}
          >
            <UserIcon className="size-4" aria-hidden />
            {t('profile.title')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium',
              'text-danger hover:bg-danger-soft dark:hover:bg-danger/15',
            )}
          >
            <LogOut className="size-4" aria-hidden />
            {t('auth.signOut')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

interface IconButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

function IconButton({ onClick, label, icon, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-full',
        'border border-transparent px-2.5 text-[rgb(var(--fg-secondary))]',
        'hover:bg-[rgb(var(--bg-sunken))] hover:text-[rgb(var(--fg-primary))]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
        'pf-press transition-colors duration-150 ease-out',
      )}
    >
      {icon}
      {children}
    </button>
  );
}