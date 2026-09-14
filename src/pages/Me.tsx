import { ChevronRight, Cog, Crown, Languages, Sparkles, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useLocaleStore } from '../store/locale';
import { useThemeStore } from '../store/theme';
import { cn } from '../lib/utils';

/**
 * "Me" tab — profile, settings, subscription entry points.
 *
 * PF-1 ships the navigation rows only. Auth, profile editing, and the real
 * subscription flow arrive in PF-2 (account) and PF-9 (settings).
 */
export function MePage() {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('me.title')} subtitle={t('me.subtitle')} />

      <Card raised>
        <div className="flex items-center gap-4">
          <div
            className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white shadow-sm"
            aria-hidden
          >
            <User className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[rgb(var(--fg-primary))]">Guest</h2>
            <p className="text-sm text-[rgb(var(--fg-secondary))]">
              Sign in to sync across devices — wired in PF-2.
            </p>
          </div>
          <span className="pf-chip">Free tier</span>
        </div>
      </Card>

      <Card className="mt-4">
        <h3 className="pf-section-title mb-3">{t('common.theme')}</h3>
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

      <Card className="mt-4">
        <h3 className="pf-section-title mb-3">{t('common.language')}</h3>
        <SegmentedControl<'en' | 'zh'>
          value={locale}
          onChange={setLocale}
          options={[
            { value: 'en', label: 'English' },
            { value: 'zh', label: '中文' },
          ]}
        />
      </Card>

      <nav className="mt-4 pf-surface divide-y divide-[rgb(var(--border-default))] rounded-xl" aria-label="Settings">
        <Row icon={<Crown className="size-5 text-brand-500" />} title={t('me.subscription')} trailing={<Badge>Pro</Badge>} />
        <Row icon={<User className="size-5" />} title={t('me.profile')} />
        <Row icon={<Cog className="size-5" />} title={t('me.settings')} />
        <Row icon={<Sparkles className="size-5" />} title="What's new" />
        <Row icon={<Languages className="size-5" />} title="Help & feedback" />
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
    <div
      role="radiogroup"
      className="inline-flex w-full rounded-lg bg-[rgb(var(--bg-sunken))] p-1"
    >
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
