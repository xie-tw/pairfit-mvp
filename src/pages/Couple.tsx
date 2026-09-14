import { Heart, Link2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';

/**
 * Couple tab — pair-up, share progress, and cheer each other on.
 *
 * PF-1 scope: visual scaffolding only. The bind flow, share-link generation,
 * and shared state live in PF-5 (Couple / Bind).
 */
export function CouplePage() {
  const { t } = useTranslation();
  return (
    <div className="animate-fade-in">
      <PageHeader title={t('couple.title')} subtitle={t('couple.subtitle')} />

      <Card raised className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-100/60 blur-2xl dark:bg-brand-500/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-12 -left-12 size-48 rounded-full bg-accent-100/60 blur-2xl dark:bg-accent-500/10"
        />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md">
            <Heart className="size-6" aria-hidden fill="white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
              {t('couple.bind')}
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
              {t('couple.bindHint')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="primary" size="md" leadingIcon={<Link2 className="size-4" />}>
                {t('couple.bind')}
              </Button>
              <Button variant="outline" size="md" leadingIcon={<Sparkles className="size-4" />}>
                {t('couple.howItWorks')}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <FeatureCard
          title={t('couple.featureSharedGoalsTitle')}
          description={t('couple.featureSharedGoalsBody')}
          emoji="🎯"
        />
        <FeatureCard
          title={t('couple.featureCoinsTitle')}
          description={t('couple.featureCoinsBody')}
          emoji="🪙"
        />
        <FeatureCard
          title={t('couple.featureVoiceTitle')}
          description={t('couple.featureVoiceBody')}
          emoji="🎤"
        />
        <FeatureCard
          title={t('couple.featurePrivateTitle')}
          description={t('couple.featurePrivateBody')}
          emoji="🔒"
        />
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  emoji: string;
}

function FeatureCard({ title, description, emoji }: FeatureCardProps) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--bg-sunken))] text-xl"
          aria-hidden
        >
          {emoji}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">{title}</h3>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">{description}</p>
        </div>
      </div>
    </Card>
  );
}
