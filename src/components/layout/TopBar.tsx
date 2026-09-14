import { Globe, Moon, Monitor, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/theme';
import { useLocaleStore, type LocaleCode } from '../../store/locale';
import { cn } from '../../lib/utils';

/**
 * Top navigation bar shown above every page.
 *
 * Responsibilities (PF-1 scope):
 *   - Show brand identity (`PairFit`)
 *   - Language switcher (EN ⇄ ZH)
 *   - Theme switcher (light ⇄ dark ⇄ system)
 *
 * Real account / settings UI lands in PF-2 (account module) and PF-9
 * (settings), so this bar stays minimal.
 */
export function TopBar() {
  const { t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

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
      </div>
    </header>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2">
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
