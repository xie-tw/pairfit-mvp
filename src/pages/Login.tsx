import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AtSign, KeyRound } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useAuthStore } from '../store/auth';
import { validateAuthForm, type AuthFormError } from '../lib/validation';
import { cn } from '../lib/utils';

/**
 * Login page — email + password.
 *
 * Reads the original target from router state (set by `RequireAuth`) so a
 * user bounced off `/profile` ends up back on `/profile` after a
 * successful sign-in. The state is wrapped in `useLocation` so a hard
 * reload — which would lose the state — falls back to the home tab.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const userId = useAuthStore((s) => s.currentUserId);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AuthFormError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const fromState = (location.state as { from?: string } | null)?.from;

  // Auto-focus the email field — login pages on mobile usually expect it.
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Already signed in? Bounce straight home.
  useEffect(() => {
    if (userId) {
      navigate(fromState && fromState !== '/login' ? fromState : '/', { replace: true });
    }
  }, [userId, navigate, fromState]);

  const fieldError = (field: AuthFormError['field']) => (error?.field === field ? t(`auth.errors.${error.code}`) : undefined);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setServerError(null);
    const v = validateAuthForm({ email, password });
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const result = await login({ email, password });
      if (result.ok === false) {
        setServerError(t(`auth.errors.${result.code}`));
        return;
      }
      navigate(fromState && fromState !== '/login' ? fromState : '/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <span>
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            {t('auth.login.signUpLink')}
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          ref={emailRef}
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('auth.placeholders.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leadingIcon={<AtSign className="size-4" aria-hidden />}
          error={fieldError('email')}
        />

        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.placeholders.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          leadingIcon={<KeyRound className="size-4" aria-hidden />}
          error={fieldError('password')}
          labelTrailing={
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {t('auth.forgot')}
            </Link>
          }
        />

        {serverError ? (
          <div
            role="alert"
            className={cn(
              'rounded-lg border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger',
              'dark:bg-danger/15',
            )}
          >
            {serverError}
          </div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}