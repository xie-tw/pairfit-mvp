import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AtSign, KeyRound, Lock, User as UserIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AvatarPicker } from '../components/ui/AvatarPicker';
import { AuthLayout } from '../components/auth/AuthLayout';
import { useAuthStore } from '../store/auth';
import { validateAuthForm, type AuthFormError } from '../lib/validation';
import { cn } from '../lib/utils';

/**
 * Register page — email + password + displayName (+ optional avatar).
 *
 * On success we route to `/onboarding` (a placeholder wired in PF-3). The
 * issue's DoD allows routing to "a blank placeholder" until PF-3 lands,
 * so the page is honest about that.
 */
export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState<AuthFormError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fieldError = (field: AuthFormError['field']) => (error?.field === field ? t(`auth.errors.${error.code}`) : undefined);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setServerError(null);
    const v = validateAuthForm({
      email,
      password,
      confirmPassword,
      displayName,
    });
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      const result = await register({
        email,
        password,
        displayName,
      });
      if (result.ok === false) {
        setServerError(t(`auth.errors.${result.code}`));
        return;
      }
      // Optional avatar — picked from the picker on this same page.
      if (avatar) {
        useAuthStore.getState().updateProfile({ avatar });
      }
      navigate('/onboarding', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <span>
          {t('auth.register.haveAccount')}{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-300">
            {t('auth.register.signInLink')}
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('auth.displayName')}
          autoComplete="nickname"
          placeholder={t('auth.placeholders.displayName')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={32}
          required
          leadingIcon={<UserIcon className="size-4" aria-hidden />}
          error={fieldError('displayName')}
        />

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
          error={fieldError('email')}
        />

        <Input
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.placeholders.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          leadingIcon={<KeyRound className="size-4" aria-hidden />}
          hint={t('auth.passwordHint')}
          error={fieldError('password')}
        />

        <Input
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.placeholders.confirmPassword')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          leadingIcon={<Lock className="size-4" aria-hidden />}
          error={fieldError('confirmPassword')}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-[rgb(var(--fg-primary))]">
            {t('auth.avatarOptional')}
          </p>
          <AvatarPicker
            value={avatar}
            fallbackInitial={(displayName.trim()[0] ?? 'P').toUpperCase()}
            onChange={setAvatar}
          />
        </div>

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
          disabled={submitting}
          loading={submitting}
        >
          {submitting ? t('auth.register.submitting') : t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}