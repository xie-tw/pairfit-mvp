import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AtSign, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useAuthStore } from '../store/auth';
import { isValidEmail } from '../lib/validation';
import { cn } from '../lib/utils';

/**
 * Forgot password — mock flow.
 *
 * The MVP doesn't send real mail. We acknowledge the request and pretend
 * a reset link is on its way so the UX feels complete. The store still
 * verifies the email format so users get immediate feedback for typos.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const requestReset = useAuthStore((s) => s.requestPasswordReset);

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError(t('auth.errors.required'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(t('auth.errors.invalid'));
      return;
    }
    setSubmitting(true);
    try {
      await requestReset(email);
      setSentTo(email.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <span>
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            {t('auth.forgot.backToLogin')}
          </Link>
        </span>
      }
    >
      {sentTo ? (
        <div
          role="status"
          className={cn(
            'flex flex-col items-center gap-3 rounded-xl border border-accent-500/40 bg-accent-50 px-4 py-6 text-center',
            'dark:border-accent-500/30 dark:bg-accent-500/10',
          )}
        >
          <div
            className="flex size-12 items-center justify-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300"
            aria-hidden
          >
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[rgb(var(--fg-primary))]">
              {t('auth.forgot.sentTitle')}
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
              {t('auth.forgot.sentBody', { email: sentTo })}
            </p>
          </div>
          <Link
            to="/login"
            className="mt-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            {t('auth.forgot.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-[rgb(var(--fg-secondary))]">
            {t('auth.forgot.body')}
          </p>
          <Input
            label={t('auth.email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('auth.placeholders.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leadingIcon={<AtSign className="size-4" aria-hidden />}
            error={error ?? undefined}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={submitting}
            disabled={submitting}
            leadingIcon={!submitting ? <Mail className="size-4" aria-hidden /> : undefined}
          >
            {submitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}