import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Heart, Sparkles, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  useAuthStore,
  useCurrentUser,
  type ProPlan,
  type UserRecord,
} from '../store/auth';
import {
  useCoupleStore,
  formatCooldownRemaining,
  UNBIND_COOLDOWN_MS,
} from '../store/couple';
import { toast } from '../store/toast';
import { cn } from '../lib/utils';

/**
 * Subscription page — PF-9.
 *
 * Lays out the Pro value proposition and lets the user simulate
 * subscribing. The mock-upgrade button updates the auth store directly
 * (the partner, if any, is auto-unlocked inside `activatePro`). Cancel
 * drops both parties back to free.
 *
 * Couple mechanics:
 *   - A bound partner shows a banner confirming both accounts are now
 *     Pro and identifying which side paid.
 *   - Unbind is funneled through a confirmation dialog that surfaces the
 *     7-day cooldown. PairFit waits `UNBIND_COOLDOWN_MS` before clearing
 *     `partnerId`; during the wait the banner reads "unbinding in Xd Yh".
 *
 * Nothing here hits a network; the page is intentionally MVP-clean.
 */
export function SubscriptionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const users = useAuthStore((s) => s.users);
  const activatePro = useAuthStore((s) => s.activatePro);
  const cancelPro = useAuthStore((s) => s.cancelPro);
  const setPartner = useAuthStore((s) => s.setPartner);
  const binding = useCoupleStore((s) =>
    user ? s.activeBindingFor(user.id) : undefined,
  );
  const startUnbind = useCoupleStore((s) => s.startUnbind);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [confirmingUnbind, setConfirmingUnbind] = useState(false);
  const [activating, setActivating] = useState<ProPlan | null>(null);
  // Capture "now" once per mount so the cooldown banner doesn't drift
  // mid-render (React Compiler purity check on `Date.now`).
  const [now] = useState(() => Date.now());

  const partnerId = user?.partnerId ?? null;
  const partner = useMemo<UserRecord | null>(() => {
    if (!partnerId) return null;
    return users.find((u) => u.id === partnerId) ?? null;
  }, [users, partnerId]);

  // Where does *my* Pro come from? Self-paid > unlocked by partner.
  const proSource: 'self' | 'partner' | null = useMemo(() => {
    if (!user?.isPro) return null;
    if (user.proPlan) return 'self';
    if (user.proViaPartner) return 'partner';
    return 'self';
  }, [user]);

  const onActivate = async (plan: ProPlan) => {
    setActivating(plan);
    // Tiny delay so the spinner is visible — real payments would block
    // on a server round-trip; we simulate the latency.
    await new Promise((r) => setTimeout(r, 350));
    const result = activatePro(plan);
    setActivating(null);
    if (!result.ok) return;
    if (result.partnerUnlocked) {
      toast({
        variant: 'success',
        message: t('subscription.toastActivatedWithPartner'),
      });
    } else {
      toast({ variant: 'success', message: t('subscription.toastActivated') });
    }
  };

  const onCancel = () => {
    cancelPro();
    setConfirmingCancel(false);
    toast({ variant: 'info', message: t('subscription.toastCancelled') });
  };

  const onStartUnbind = () => {
    if (!binding) return;
    const requesterId = user!.id;
    startUnbind(binding.id, requesterId, (completedId) => {
      // Cooldown elapsed — the auth store severs the link here. We use
      // a vanilla read of the binding id rather than capturing state in
      // the closure so re-renders during the wait don't matter.
      const current = useCoupleStore.getState().bindings.find(
        (b) => b.id === completedId,
      );
      if (!current) return;
      setPartner(current.inviterId, null);
      setPartner(current.inviteeId, null);
      useCoupleStore.setState((s) => ({
        bindings: s.bindings.filter((b) => b.id !== completedId),
      }));
      toast({ variant: 'info', message: t('couple.toastUnbound') });
    });
    setConfirmingUnbind(false);
    toast({ variant: 'info', message: t('couple.toastUnbindScheduled') });
  };

  // Banner state for an in-progress unbind.
  const unbinding = useCoupleStore((s) =>
    user
      ? s.bindings.find(
          (b) =>
            (b.inviterId === user.id || b.inviteeId === user.id) &&
            b.status === 'unbinding',
        )
      : undefined,
  );
  const cooldownRemaining = unbinding?.unboundAt
    ? Math.max(0, unbinding.unboundAt - now)
    : 0;

  if (!user) {
    // Auth-guarded upstream — defensive only.
    return null;
  }

  const isPro = user.isPro;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('subscription.title')}
        subtitle={t('subscription.subtitle')}
        trailing={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] px-3 py-1.5 text-xs font-medium text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            {t('common.back')}
          </button>
        }
      />

      {isPro ? (
        <ActiveBanner user={user} partner={partner} source={proSource} />
      ) : (
        <UpgradeHero />
      )}

      {/* Couple banner — visible when bound or when an unbind is in flight. */}
      {partner ? <PartnerSection partner={partner} /> : null}
      {unbinding ? (
        <Card className="mt-4 border-warning/30 bg-warning-soft/30 dark:bg-warning-soft/10">
          <div className="flex items-start gap-3">
            <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning dark:bg-warning/15">
              <X className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                {t('couple.unbindingTitle')}
              </h3>
              <p className="mt-1 text-xs text-[rgb(var(--fg-secondary))]">
                {t('couple.unbindingBody', {
                  remaining: formatCooldownRemaining(cooldownRemaining),
                })}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Feature list */}
      <Card className="mt-4">
        <h2 className="pf-section-title mb-3">
          {t('subscription.featuresTitle')}
        </h2>
        <ul className="space-y-2.5">
          {FEATURES.map((f) => (
            <li key={f.key} className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 flex size-7 flex-shrink-0 items-center justify-center rounded-full text-sm',
                  isPro
                    ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'bg-[rgb(var(--bg-sunken))] text-[rgb(var(--fg-secondary))]',
                )}
                aria-hidden
              >
                {f.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                  {t(`subscription.feature.${f.key}.title`)}
                </p>
                <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
                  {t(`subscription.feature.${f.key}.body`, {
                    default: '',
                  })}
                </p>
                {f.soon ? (
                  <span className="mt-1 inline-flex rounded-full bg-[rgb(var(--bg-sunken))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
                    {t('subscription.comingSoon')}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Pricing — visible when free; Pro users see a manage section. */}
      {isPro ? (
        <Card className="mt-4">
          <h2 className="pf-section-title">{t('subscription.manageTitle')}</h2>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
            {user.proPlan
              ? t('subscription.currentPlan', {
                  plan: t(`subscription.plan.${user.proPlan}`),
                })
              : t('subscription.unlockedByPartner')}
          </p>
          {partner ? (
            <Button
              variant="outline"
              size="md"
              className="mt-4"
              onClick={() => setConfirmingUnbind(true)}
            >
              {t('couple.unbind')}
            </Button>
          ) : null}
          <Button
            variant="danger"
            size="md"
            className="mt-2"
            onClick={() => setConfirmingCancel(true)}
          >
            {t('subscription.cancel')}
          </Button>
          <p className="mt-3 text-[11px] text-[rgb(var(--fg-subtle))]">
            {t('subscription.cancelHint')}
          </p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <PlanCard
            planKey="monthly"
            price="$4.99"
            cadence={t('subscription.perMonth')}
            onChoose={() => onActivate('monthly')}
            loading={activating === 'monthly'}
          />
          <PlanCard
            planKey="yearly"
            price="$39.99"
            cadence={t('subscription.perYear')}
            highlight
            badge={t('subscription.saveBadge')}
            onChoose={() => onActivate('yearly')}
            loading={activating === 'yearly'}
          />
        </div>
      )}

      {/* Disclaimer */}
      <p className="mt-4 text-center text-[11px] text-[rgb(var(--fg-subtle))]">
        {t('subscription.disclaimer')}
      </p>

      <ConfirmDialog
        open={confirmingCancel}
        title={t('subscription.cancelConfirm.title')}
        description={t('subscription.cancelConfirm.body')}
        confirmLabel={t('subscription.cancelConfirm.confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={onCancel}
        onCancel={() => setConfirmingCancel(false)}
      />

      <ConfirmDialog
        open={confirmingUnbind}
        title={t('couple.unbindConfirm.title')}
        description={t('couple.unbindConfirm.body', {
          days: Math.round(UNBIND_COOLDOWN_MS / (24 * 60 * 60 * 1000)),
        })}
        confirmLabel={t('couple.unbindConfirm.confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={onStartUnbind}
        onCancel={() => setConfirmingUnbind(false)}
      />
    </div>
  );
}

interface PlanCardProps {
  planKey: ProPlan;
  price: string;
  cadence: string;
  highlight?: boolean;
  badge?: string;
  loading?: boolean;
  onChoose: () => void;
}

function PlanCard({ planKey, price, cadence, highlight, badge, loading, onChoose }: PlanCardProps) {
  const { t } = useTranslation();
  return (
    <Card
      raised={highlight}
      className={cn(
        'relative overflow-hidden',
        highlight && 'ring-1 ring-brand-300 dark:ring-brand-500/40',
      )}
    >
      {badge ? (
        <span className="absolute right-3 top-3 inline-flex rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}
      <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
        {t(`subscription.plan.${planKey}`)}
      </h3>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[rgb(var(--fg-primary))]">
        {price}
      </p>
      <p className="text-xs text-[rgb(var(--fg-secondary))]">{cadence}</p>
      <Button
        variant={highlight ? 'primary' : 'outline'}
        size="md"
        block
        className="mt-4"
        onClick={onChoose}
        loading={loading}
      >
        {t('subscription.choose', { plan: t(`subscription.plan.${planKey}`) })}
      </Button>
    </Card>
  );
}

function UpgradeHero() {
  const { t } = useTranslation();
  return (
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
          <Crown className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
            {t('subscription.heroTitle')}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
            {t('subscription.heroBody')}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface ActiveBannerProps {
  user: UserRecord;
  partner: UserRecord | null;
  source: 'self' | 'partner' | null;
}

function ActiveBanner({ user, source }: ActiveBannerProps) {
  const { t } = useTranslation();
  return (
    <Card raised className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-brand-100/60 blur-2xl dark:bg-brand-500/10"
      />
      <div className="relative flex items-start gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-md">
          <Sparkles className="size-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[rgb(var(--fg-primary))]">
            {t('subscription.activeTitle')}
          </h2>
          <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
            {source === 'partner'
              ? t('subscription.activeByPartner')
              : user.proPlan
                ? t('subscription.activeBody', {
                    plan: t(`subscription.plan.${user.proPlan}`),
                  })
                : t('subscription.activeBodyFree')}
          </p>
        </div>
        <span className="pf-chip">{t('me.proBadge')}</span>
      </div>
    </Card>
  );
}

function PartnerSection({ partner }: { partner: UserRecord }) {
  const { t } = useTranslation();
  return (
    <Card className="mt-4">
      <div className="flex items-start gap-3">
        <div
          className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
          aria-hidden
        >
          <Heart className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
            {t('couple.partnerStatusTitle')}
          </h3>
          <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
            {partner.isPro
              ? t('couple.partnerProOn', { name: partner.displayName })
              : t('couple.partnerProOff', { name: partner.displayName })}
          </p>
        </div>
        <CheckCircle2
          className={cn(
            'size-5 flex-shrink-0',
            partner.isPro
              ? 'text-brand-500'
              : 'text-[rgb(var(--fg-subtle))]',
          )}
          aria-hidden
        />
      </div>
    </Card>
  );
}

const FEATURES: Array<{ key: string; emoji: string; soon?: boolean }> = [
  { key: 'weeklyReport', emoji: '📊' },
  { key: 'themes', emoji: '🎨' },
  { key: 'compareChart', emoji: '📈' },
  { key: 'cloud', emoji: '☁️', soon: true },
  { key: 'noAds', emoji: '🚫', soon: true },
];