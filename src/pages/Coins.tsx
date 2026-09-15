import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coins as CoinsIcon, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { useCurrentUser } from '../store/auth';
import {
  formatDelta,
  reasonToI18nKey,
  useCoinStore,
} from '../store/coins';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';

/**
 * Coins — PF-7.
 *
 * Two surfaces in one page:
 *
 *   1. **Balance hero** — current balance, with a soft cap hint and a
 *      CTA into the shop.
 *   2. **History** — every coin entry (newest first), with the partner
 *      confirmation status for pending entries.
 *
 * Compliance disclaimer is rendered at the top of the page per the PRD
 * "must be visible" rule (§14.5). We keep it inline rather than modal —
 * a banner reads as informational, not a paywall.
 */
export function CoinsPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const balance = useCoinStore((s) => (user ? s.balanceOf(user.id) : 0));
  const history = useCoinStore((s) => (user ? s.historyOf(user.id) : []));
  const todaysEntry = useCoinStore((s) =>
    user ? s.todaysEntryFor(user.id, new Date().toISOString().slice(0, 10)) : undefined,
  );
  const users = useAuthStore((s) => s.users);

  const recent = useMemo(() => history.slice(0, 30), [history]);

  if (!user) {
    return (
      <div className="animate-fade-in">
        <PageHeader title={t('coins.title')} subtitle={t('auth.signInRequired')} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('coins.title')}
        subtitle={t('coins.subtitle')}
        trailing={
          <Link
            to="/shop"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-3 text-xs font-semibold text-white shadow-sm hover:from-brand-600 hover:to-accent-600"
          >
            <Sparkles className="size-3.5" aria-hidden />
            {t('coins.shopCta')}
          </Link>
        }
      />

      {/* Compliance banner — must stay visible. */}
      <Card className="mb-4 border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          {t('coins.disclaimer')}
        </p>
      </Card>

      {/* Balance hero */}
      <Card raised className="mb-4 overflow-hidden">
        <div className="flex items-center gap-4">
          <div
            aria-hidden
            className="flex size-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 text-white shadow-md"
          >
            <CoinsIcon className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[rgb(var(--fg-secondary))]">
              {t('coins.balanceLabel')}
            </p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums tracking-tight text-[rgb(var(--fg-primary))]">
              {balance.toLocaleString()}
              <span className="ml-2 text-base font-semibold text-[rgb(var(--fg-secondary))]">
                {t('coins.unit')}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
              {t('coins.capHint', { cap: 1000 })}
            </p>
          </div>
        </div>

        {todaysEntry ? (
          <div className="mt-4 rounded-lg bg-[rgb(var(--bg-sunken))]/70 px-3 py-2 text-xs">
            <TodaysEntryHint
              delta={todaysEntry.delta}
              reason={todaysEntry.reason}
              status={todaysEntry.status}
              relatedUserId={todaysEntry.relatedUserId}
              users={users}
            />
          </div>
        ) : null}
      </Card>

      {/* History */}
      <h2 className="pf-section-title mb-3">{t('coins.historyTitle')}</h2>
      {recent.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-[rgb(var(--fg-secondary))]">
            {t('coins.historyEmpty')}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {recent.map((entry) => (
            <CoinRow key={entry.id} entry={entry} users={users} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TodaysEntryHint({
  delta,
  reason,
  status,
  relatedUserId,
  users,
}: {
  delta: number;
  reason: string;
  status: 'pending' | 'confirmed' | 'declined' | 'expired';
  relatedUserId: string | null;
  users: Array<{ id: string; displayName: string }>;
}) {
  const { t } = useTranslation();
  const partnerName = relatedUserId
    ? users.find((u) => u.id === relatedUserId)?.displayName ?? t('couple.partnerCard.partner')
    : null;
  const statusKey = `coins.status.${status}` as const;
  return (
    <p>
      {t('coins.todayHint', {
        delta: formatDelta(delta),
        reason: t(reasonToI18nKey(reason as never)),
        status: t(statusKey, { name: partnerName ?? '' }),
        partner: partnerName ?? '',
      })}
    </p>
  );
}

interface CoinRowProps {
  entry: {
    id: string;
    delta: number;
    reason: string;
    label?: string;
    taskDate?: string;
    createdAt: number;
    status: 'pending' | 'confirmed' | 'declined' | 'expired';
    relatedUserId: string | null;
    confirmedBy: string | null;
    confirmedAt: number | null;
  };
  users: Array<{ id: string; displayName: string }>;
}

function CoinRow({ entry, users }: CoinRowProps) {
  const { t } = useTranslation();
  const positive = entry.delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const confirmedByName = entry.confirmedBy
    ? users.find((u) => u.id === entry.confirmedBy)?.displayName
    : null;
  return (
    <li>
      <Card noPadding className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            aria-hidden
            className={cn(
              'flex size-9 flex-shrink-0 items-center justify-center rounded-full',
              positive ? 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' : 'bg-danger-soft text-danger dark:bg-danger/15',
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[rgb(var(--fg-primary))]">
              {t(reasonToI18nKey(entry.reason as never))}
              {entry.label ? (
                <span className="ml-1 text-[rgb(var(--fg-secondary))]">· {entry.label}</span>
              ) : null}
            </p>
            <p className="mt-0.5 text-xs text-[rgb(var(--fg-secondary))]">
              {new Date(entry.createdAt).toLocaleString()}
              {' · '}
              {entry.status === 'pending' && t('coins.status.pending')}
              {entry.status === 'confirmed' && t('coins.status.confirmed', { name: confirmedByName ?? '' })}
              {entry.status === 'declined' && t('coins.status.declined', { name: confirmedByName ?? '' })}
              {entry.status === 'expired' && t('coins.status.expired')}
            </p>
          </div>
          <div
            className={cn(
              'flex-shrink-0 text-base font-semibold tabular-nums',
              positive ? 'text-brand-600 dark:text-brand-300' : 'text-danger',
            )}
          >
            {formatDelta(entry.delta)}
          </div>
        </div>
      </Card>
    </li>
  );
}
