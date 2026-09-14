import { Heart, Home, LineChart, ListChecks, User2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface TabItem {
  to: string;
  labelKey: 'home' | 'records' | 'couple' | 'trends' | 'me';
  icon: LucideIcon;
}

const TABS: TabItem[] = [
  { to: '/', labelKey: 'home', icon: Home },
  { to: '/records', labelKey: 'records', icon: ListChecks },
  { to: '/couple', labelKey: 'couple', icon: Heart },
  { to: '/trends', labelKey: 'trends', icon: LineChart },
  { to: '/me', labelKey: 'me', icon: User2 },
];

/**
 * Bottom tab bar — five tabs that mirror the IA defined in the PRD.
 *
 * Active state uses a coral pill behind the icon so it reads as "selected"
 * rather than just colored. The label appears only when active to keep the
 * bar slim and unmistakably app-like.
 */
export function TabBar() {
  const { t } = useTranslation();
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky bottom-0 z-30',
        'border-t border-[rgb(var(--border-default))]',
        'bg-[rgb(var(--bg-surface))]/90 backdrop-blur-md',
      )}
    >
      <ul className="mx-auto grid h-16 max-w-5xl grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex items-stretch justify-center">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex w-full flex-col items-center justify-center gap-0.5',
                  'rounded-lg py-1 text-[11px] font-medium',
                  'transition-colors duration-150 ease-out',
                  isActive
                    ? 'text-brand-600 dark:text-brand-300'
                    : 'text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-x-3 top-1 h-9 rounded-xl',
                        'bg-brand-100 dark:bg-brand-500/15',
                      )}
                    />
                  ) : null}
                  <tab.icon
                    aria-hidden
                    className={cn(
                      'relative size-5 transition-transform',
                      isActive ? 'scale-110' : 'group-active:scale-95',
                    )}
                    strokeWidth={isActive ? 2.4 : 1.8}
                  />
                  <span className="relative">{t(`nav.${tab.labelKey}`)}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
