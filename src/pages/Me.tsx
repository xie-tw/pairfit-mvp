import { ChevronRight, Cog, Crown, Globe, Languages, LogIn, Moon, Sparkles, Sun, Target, User as UserIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuthStore, useCurrentUser, type LocalePref } from '../store/auth';
import { useLocaleStore, type LocaleCode } from '../store/locale';
import { useThemeStore } from '../store/theme';
import { useGoalStore } from '../store/goal';
import { cn } from '../lib/utils';

/**
 * "Me" tab — entry point for the user-centric surface.
 *
 * PF-1: navigation rows only.
 * PF-2: real account state (avatar, name, email, tier chip) + a quick CTA
 *       to either sign in (when signed out) or open the full profile
 *       (when signed in). Settings rows remain placeholders until PF-9.
 */
export function MePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const goal = useGoalStore((s) => s.goal);

  const initial = (user?.displayName.trim()[0] ?? 'P').toUpperCase();

  // When signed in, mirror the locale choice into the user record so the
  // Profile screen always reflects the live setting.
  const onLocaleChange = (next: LocaleCode) => {
    setLocale(next);
    if (user) updateProfile({ locale: next as LocalePref });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('me.title')} subtitle={t('me.subtitle')} />

      {/* Account card — the centerpiece. Different content when signed out. */}
      {user ? (
        <Link to="/profile" className="block">
          <Card raised className="pf-press transition-shadow hover:shadow-md">
            <div className="flex items-center gap-4">
              <div
                className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-2xl shadow-sm"
                aria-hidden
              >
                {user.avatar || <span className="text-base font-semibold text-white">{initial}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold text-[rgb(var(--fg-primary))]">
                  {user.displayName}
                </h2>
                <p className="truncate text-sm text-[rgb(var(--fg-secondary))]">{user.email}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="pf-chip">{t('me.freeTier')}</span>
                <ChevronRight className="size-4 text-[rgb(var(--fg-subtle))]" aria-hidden />
              </div>
            </div>
          </Card>
        </Link>
      ) : (
        <Card raised>
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white shadow-sm"
              aria-hidden
            >
              <UserIcon className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-[rgb(var(--fg-primary))]">
                {t('me.signedOutTitle')}
              </h2>
              <p className="text-sm text-[rgb(var(--fg-secondary))]">
                {t('me.signedOutBody')}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-500 px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-600"
            >
              <LogIn className="size-3.5" aria-hidden />
              {t('auth.signIn')}
            </Link>
          </div>
        </Card>
      )}

      {/* Theme */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          {mode === 'dark' ? (
            <Moon className="size-4 text-[rgb(var(--fg-secondary))]" aria-hidden />
          ) : mode === 'light' ? (
            <Sun className="size-4 text-[rgb(var(--fg-secondary))]" aria-hidden />
          ) : (
            <Sparkles className="size-4 text-[rgb(var(--fg-secondary))]" aria-hidden />
          )}
          <h3 className="pf-section-title">{t('common.theme')}</h3>
        </div>
        <SegmentedControl<typeof mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: t('common.light') },
            { value: 'dark', label: t('common.dark') },
            { value: 'system', label: t('common.system') },
          ]}
        />
      </Card>

      {/* Language */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="size-4 text-[rgb(var(--fg-secondary))]" aria-hidden />
          <h3 className="pf-section-title">{t('common.language')}</h3>
        </div>
        <SegmentedControl<LocaleCode>
          value={locale}
          onChange={onLocaleChange}
          options={[
            { value: 'en', label: 'English' },
            { value: 'zh', label: '中文' },
          ]}
        />
      </Card>

      {/* Other rows */}
      <nav className="mt-4 pf-surface divide-y divide-[rgb(var(--border-default))] rounded-xl" aria-label="Settings">
        {goal ? (
          <Link to="/onboarding" className="block">
            <Row icon={<Target className="size-5 text-brand-500" />} title={t('me.editGoal')} />
          </Link>
        ) : (
          <Link to="/onboarding" className="block">
            <Row icon={<Target className="size-5 text-brand-500" />} title={t('home.setGoalCta')} />
          </Link>
        )}
        <Row icon={<Crown className="size-5 text-accent-500" />} title={t('me.subscription')} trailing={<Badge>Pro</Badge>} />
        <Row icon={<Cog className="size-5" />} title={t('me.settings')} />
        <Row icon={<Sparkles className="size-5" />} title={t('me.whatsNew')} />
        <Row icon={<Languages className="size-5" />} title={t('me.help')} />
      </nav>
    </div>
  );
}

interface RowProps {
  icon: React.ReactNode;
  title: string;
  trailing?: React.ReactNode;
}

function Row({ icon, title, trailing }: RowProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3.5 text-left',
        'hover:bg-[rgb(var(--bg-sunken))] focus-visible:outline-none',
        'focus-visible:bg-[rgb(var(--bg-sunken))] pf-press transition-colors duration-150',
      )}
    >
      <span aria-hidden>{icon}</span>
      <span className="flex-1 text-sm font-medium text-[rgb(var(--fg-primary))]">{title}</span>
      {trailing ?? <ChevronRight className="size-4 text-[rgb(var(--fg-subtle))]" aria-hidden />}
    </button>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-2 py-0.5 text-[11px] font-semibold text-white">
      {children}
    </span>
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