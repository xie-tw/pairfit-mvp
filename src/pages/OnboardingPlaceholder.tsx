import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles, Target } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useCurrentUser } from '../store/auth';

/**
 * Onboarding placeholder — what the issue's DoD calls "跳到空白占位即可".
 *
 * The full goal-setting UI lands in PF-3. For now we celebrate the new
 * account and route the user into the app so they can poke around.
 */
export function OnboardingPlaceholderPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('onboarding.title', { name: user?.displayName ?? '' })}
        subtitle={t('onboarding.subtitle')}
      />

      <Card raised className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-100/60 blur-2xl dark:bg-brand-500/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-accent-100/60 blur-2xl dark:bg-accent-500/10"
        />
        <div className="relative flex flex-col items-center gap-4 py-6 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md"
            aria-hidden
          >
            <Sparkles className="size-7" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
              {t('onboarding.heroTitle')}
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
              {t('onboarding.heroBody')}
            </p>
          </div>
          <span className="pf-chip mt-1">
            <Target className="size-3.5" aria-hidden />
            {t('onboarding.arrivesIn', { issue: 'PF-3' })}
          </span>
        </div>
      </Card>

      <div className="mt-6 flex flex-col gap-3">
        <Link to="/" className="block">
          <Button variant="primary" size="lg" block>
            {t('onboarding.exploreApp')}
          </Button>
        </Link>
        <Link to="/profile" className="block">
          <Button variant="ghost" size="md" block>
            {t('onboarding.editProfile')}
          </Button>
        </Link>
      </div>
    </div>
  );
}