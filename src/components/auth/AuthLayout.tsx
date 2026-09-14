import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Shared shell for register / login / forgot-password routes.
 *
 * Keeps the brand mark at the top, a centered card for the form, and a
 * single CTA strip below for cross-navigation ("have an account?",
 * "forgot password?"). All three pages render their form body into the
 * `<Card>` slot so the visual rhythm matches across the auth flow.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in flex min-h-[calc(100vh-3.5rem-4rem)] flex-col items-stretch justify-center">
      <header className="mb-6 flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md"
          aria-hidden
        >
          <span className="text-base font-bold tracking-tight">PF</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
            {title}
          </h1>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">{subtitle}</p>
        </div>
      </header>

      <section className="pf-surface-raised rounded-2xl p-5 sm:p-6">{children}</section>

      {footer ? (
        <div className="mt-5 text-center text-sm text-[rgb(var(--fg-secondary))]">{footer}</div>
      ) : null}

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[rgb(var(--fg-subtle))]">
        {t('auth.footerDisclaimer')}
        <br />
        <Link to="/" className="mt-1 inline-block underline-offset-2 hover:underline">
          {t('auth.skipToHome')}
        </Link>
      </p>
    </div>
  );
}