import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Heart, Sparkles, Unlink, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import {
  InviteCodeDisplay,
  INVITE_DURATION_HOURS,
} from '../components/couple/InviteCodeDisplay';
import { InviteCodeInput } from '../components/couple/InviteCodeInput';
import {
  formatCooldownRemaining,
  useCoupleStore,
  UNBIND_COOLDOWN_MS,
} from '../store/couple';
import { useInviteStore, type Invite } from '../store/invite';
import {
  useAuthStore,
  useCurrentUser,
  type UserRecord,
} from '../store/auth';
import { toast } from '../store/toast';

/**
 * Couple tab — bind, share, and cheer.
 *
 * PF-6 wires the actual binding flow:
 *   - Unbound: 2 stacked cards — "generate your code" + "enter partner's
 *     code". Submitting a 6-char code resolves through
 *     `useInviteStore.consumeInvite`; on success we request + accept a
 *     binding and link both users via `setPartner`.
 *   - Active: partner card with avatar/name + bind date + an Unbind
 *     button. Unbind goes through a confirmation dialog that surfaces
 *     the 7-day cooldown.
 *   - Unbinding: countdown card mirroring the Subscription page banner.
 */
export function CouplePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const users = useAuthStore((s) => s.users);
  const setPartner = useAuthStore((s) => s.setPartner);
  const acceptBind = useCoupleStore((s) => s.acceptBind);
  const requestBind = useCoupleStore((s) => s.requestBind);
  const startUnbind = useCoupleStore((s) => s.startUnbind);
  const bindings = useCoupleStore((s) => s.bindings);

  const generateInvite = useInviteStore((s) => s.generateInvite);
  const consumeInvite = useInviteStore((s) => s.consumeInvite);
  const revokeActive = useInviteStore((s) => s.revokeActive);
  const allInvites = useInviteStore((s) => s.invites);

  const activeInvite = useMemo<Invite | undefined>(() => {
    if (!user) return undefined;
    const now = Date.now();
    return allInvites.find(
      (i) => i.inviterId === user.id && i.usedBy === null && i.expiresAt > now,
    );
  }, [allInvites, user]);

  const activeBinding = useMemo(() => {
    if (!user) return undefined;
    return bindings.find(
      (b) =>
        (b.inviterId === user.id || b.inviteeId === user.id) &&
        b.status === 'active',
    );
  }, [bindings, user]);

  const unbindingBinding = useMemo(() => {
    if (!user) return undefined;
    return bindings.find(
      (b) =>
        (b.inviterId === user.id || b.inviteeId === user.id) &&
        b.status === 'unbinding',
    );
  }, [bindings, user]);

  const partner = useMemo<UserRecord | null>(() => {
    if (!user?.partnerId) return null;
    return users.find((u) => u.id === user.partnerId) ?? null;
  }, [users, user]);

  const [enteredCode, setEnteredCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [confirmingUnbind, setConfirmingUnbind] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!user) return null;

  const handleCodeChange = (next: string) => {
    setEnteredCode(next);
    if (inputError) setInputError(null);
  };

  const onGenerate = () => {
    generateInvite(user.id);
  };

  const onRegenerate = () => {
    revokeActive(user.id);
    generateInvite(user.id);
  };

  const onSubmitCode = (raw: string) => {
    if (!user) return;
    setSubmitting(true);
    setInputError(null);
    const result = consumeInvite(raw, user.id);
    if (result.ok === false) {
      setSubmitting(false);
      setInputError(t(`couple.invite.error.${result.code}`));
      setEnteredCode('');
      return;
    }
    const inviterId = result.invite.inviterId;
    if (inviterId === user.id) {
      setSubmitting(false);
      setInputError(t('couple.invite.error.self'));
      setEnteredCode('');
      return;
    }
    const binding = requestBind(inviterId, user.id);
    acceptBind(binding.id, (a, b) => {
      setPartner(a, b);
      setPartner(b, a);
    });
    const inviter = users.find((u) => u.id === inviterId);
    setSubmitting(false);
    setEnteredCode('');
    toast({
      variant: 'success',
      message: t('couple.invite.successToast', {
        name: inviter?.displayName ?? 'partner',
      }),
    });
  };

  const onConfirmUnbind = () => {
    if (!activeBinding) {
      setConfirmingUnbind(false);
      return;
    }
    startUnbind(activeBinding.id, user.id, (completedId) => {
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

  const cooldownRemaining = unbindingBinding?.unboundAt
    ? Math.max(0, unbindingBinding.unboundAt - now)
    : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('couple.title')} subtitle={t('couple.subtitle')} />

      {/* MVP device-share notice — always-on, prominent. */}
      <Card className="mb-4 border-warning/30 bg-warning-soft/30 dark:bg-warning-soft/10">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-xl">📱</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
              MVP
            </p>
            <p className="mt-1 text-sm text-[rgb(var(--fg-primary))]">
              {t('home.deviceShareNote')}
            </p>
          </div>
        </div>
      </Card>

      {activeBinding && partner ? (
        <ActivePartnerCard
          partner={partner}
          boundAt={activeBinding.createdAt}
          onUnbindClick={() => setConfirmingUnbind(true)}
        />
      ) : unbindingBinding ? (
        <UnbindingCard remainingMs={cooldownRemaining} />
      ) : (
        <UnboundSection
          activeInvite={activeInvite}
          enteredCode={enteredCode}
          inputError={inputError}
          submitting={submitting}
          onGenerate={onGenerate}
          onRegenerate={onRegenerate}
          onCodeChange={handleCodeChange}
          onCodeComplete={onSubmitCode}
        />
      )}

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

      <ConfirmDialog
        open={confirmingUnbind}
        title={t('couple.unbindConfirm.title')}
        description={t('couple.unbindConfirm.body', {
          days: Math.round(UNBIND_COOLDOWN_MS / (24 * 60 * 60 * 1000)),
        })}
        confirmLabel={t('couple.unbindConfirm.confirm')}
        destructive
        onConfirm={onConfirmUnbind}
        onCancel={() => setConfirmingUnbind(false)}
      />
    </div>
  );
}

interface ActivePartnerCardProps {
  partner: UserRecord;
  boundAt: number;
  onUnbindClick: () => void;
}

function ActivePartnerCard({ partner, boundAt, onUnbindClick }: ActivePartnerCardProps) {
  const { t } = useTranslation();
  const boundLabel = new Date(boundAt).toLocaleDateString();
  return (
    <Card raised className="mb-4">
      <div className="flex items-center gap-4">
        <div
          aria-hidden
          className="flex size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-2xl text-white shadow-md"
        >
          {partner.avatar ? (
            <span>{partner.avatar}</span>
          ) : (
            <Heart className="size-7" fill="white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
            {t('couple.partnerCard.partner')}
          </p>
          <p className="mt-0.5 truncate text-lg font-semibold text-[rgb(var(--fg-primary))]">
            {partner.displayName}
          </p>
          <p className="text-xs text-[rgb(var(--fg-secondary))]">
            {t('couple.partnerCard.boundSince', { date: boundLabel })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="md"
          leadingIcon={<Unlink className="size-4" />}
          onClick={onUnbindClick}
        >
          {t('couple.partnerCard.unbindCta')}
        </Button>
        <Link to="/me">
          <Button variant="ghost" size="md" leadingIcon={<UserPlus className="size-4" />}>
            {t('couple.partnerCard.viewProfile')}
          </Button>
        </Link>
      </div>
      <p className="mt-3 text-[11px] text-[rgb(var(--fg-subtle))]">
        {t('home.cheerPrivacyNote')}
      </p>
    </Card>
  );
}

function UnbindingCard({ remainingMs }: { remainingMs: number }) {
  const { t } = useTranslation();
  return (
    <Card className="mb-4 border-warning/30 bg-warning-soft/30 dark:bg-warning-soft/10">
      <div className="flex items-start gap-3">
        <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning dark:bg-warning/15">
          <Unlink className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
            {t('couple.unbindingTitle')}
          </h3>
          <p className="mt-1 text-xs text-[rgb(var(--fg-secondary))]">
            {t('couple.unbindingBody', {
              remaining: formatCooldownRemaining(remainingMs),
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface UnboundSectionProps {
  activeInvite: Invite | undefined;
  enteredCode: string;
  inputError: string | null;
  submitting: boolean;
  onGenerate: () => void;
  onRegenerate: () => void;
  onCodeChange: (next: string) => void;
  onCodeComplete: (code: string) => void;
}

function UnboundSection({
  activeInvite,
  enteredCode,
  inputError,
  submitting,
  onGenerate,
  onRegenerate,
  onCodeChange,
  onCodeComplete,
}: UnboundSectionProps) {
  const { t } = useTranslation();
  return (
    <>
      {activeInvite ? (
        <div className="mb-4">
          <InviteCodeDisplay
            invite={activeInvite}
            onRegenerate={onRegenerate}
          />
        </div>
      ) : (
        <Card raised className="mb-4">
          <div className="flex items-start gap-3">
            <div
              aria-hidden
              className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
            >
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
                {t('couple.bind')}
              </h3>
              <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
                {t('couple.bindHint')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button variant="primary" size="md" onClick={onGenerate}>
                  {t('couple.invite.yourCode')}
                </Button>
                <p className="text-[11px] text-[rgb(var(--fg-subtle))]">
                  {t('couple.invite.expiresIn', {
                    remaining: `${INVITE_DURATION_HOURS}h`,
                  })}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card raised className="mb-4">
        <h3 className="text-sm font-semibold text-[rgb(var(--fg-primary))]">
          {t('couple.invite.inputTitle')}
        </h3>
        <p className="mt-1 text-sm text-[rgb(var(--fg-secondary))]">
          {t('couple.invite.inputHint')}
        </p>
        <div className="mt-4 flex flex-col items-center gap-3 sm:items-start">
          <InviteCodeInput
            value={enteredCode}
            onChange={onCodeChange}
            onComplete={onCodeComplete}
            disabled={submitting}
            invalid={!!inputError}
          />
          {inputError ? (
            <p role="alert" className="text-xs font-medium text-danger">
              {inputError}
            </p>
          ) : submitting ? (
            <p className="text-[11px] text-[rgb(var(--fg-subtle))]">
              {t('couple.invite.submitting')}
            </p>
          ) : null}
        </div>
      </Card>
    </>
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

