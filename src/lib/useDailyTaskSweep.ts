import { useEffect } from 'react';
import { useCurrentUser } from '../store/auth';
import { useGoalStore } from '../store/goal';
import { useWeightStore } from '../store/weight';
import { useFoodStore } from '../store/food';
import { useExerciseStore } from '../store/exercise';
import { useCoupleStore } from '../store/couple';
import { useCoinStore } from '../store/coins';
import { useNotificationCenter } from '../store/notificationCenter';
import { evaluateDailyTask, DAILY_TASK_REWARDS } from '../lib/dailyTasks';
import { toast } from '../store/toast';

/**
 * Daily-task sweep hook — PF-7.
 *
 * PairFit's reward loop runs every time the user lands on the Home tab.
 * Two things need to happen here:
 *
 *   1. **Coin auto-confirm sweep** — any pending coin entry older than
 *      24h flips to `expired` and its delta is applied. PRD §14.2
 *      requires this so users aren't punished by an absent partner.
 *
 *   2. **Today's task evaluation** — if no entry exists yet for today,
 *      evaluate the user's logs (weight + meals + workout, direction-aware)
 *      and propose a pending coin entry to the partner for confirmation.
 *
 * The sweep is idempotent: re-running it produces no duplicate entries.
 * The actual reward (delta applied) only happens on confirm/expire.
 *
 * Toast feedback — once per evaluation — is fired from this hook so the
 * user sees a success toast on Home mount when their day was good, and
 * the notification list receives a `coin-confirm` request so the partner
 * is prompted.
 */
export function useDailyTaskSweep(): void {
  const user = useCurrentUser();
  const goal = useGoalStore((s) => s.goal);
  const weights = useWeightStore((s) => s.records);
  const foods = useFoodStore((s) => s.records);
  const exercises = useExerciseStore((s) => s.records);
  const bindings = useCoupleStore((s) => s.bindings);
  const activeBindingFor = useCoupleStore((s) => s.activeBindingFor);
  const sweepExpired = useCoinStore((s) => s.sweepExpired);
  const propose = useCoinStore((s) => s.propose);
  const todaysEntryFor = useCoinStore((s) => s.todaysEntryFor);
  const pushNotification = useNotificationCenter((s) => s.push);
  const pushCoinResult = useNotificationCenter((s) => s.pushCoinResult);

  useEffect(() => {
    if (!user || !goal) return;

    // 1. Auto-confirm sweep first — any entry that crossed 24h should
    //    flip to `expired` *before* today's evaluation runs so the
    //    pending list reflects the latest state.
    const flipped = sweepExpired();
    for (const entry of flipped) {
      // Owner gets a result notification (so they know it landed).
      pushCoinResult({
        userId: entry.userId,
        entryId: entry.id,
        outcome: 'expired',
        delta: entry.delta,
      });
    }

    // 2. Evaluate today's plan. Skip if there's already an entry (the
    //    partner may have already confirmed/declined it).
    const result = evaluateDailyTask({
      direction: goal.direction,
      weights,
      foods,
      exercises,
    });
    const existing = todaysEntryFor(user.id, result.date);
    if (existing) return;

    // 3. Propose a pending entry. If there's a partner, it needs their
    //    confirmation. If not, we go straight to `expired` semantics by
    //    proposing with no `relatedUserId` and zeroing `expiresAt`. We
    //    keep it as `pending` so the single-player can still confirm
    //    themselves through the coins UI; otherwise we auto-confirm
    //    after 24h regardless of partner.
    const binding = activeBindingFor(user.id);
    const partnerId =
      binding && binding.inviterId !== user.id ? binding.inviterId :
      binding && binding.inviteeId !== user.id ? binding.inviteeId :
      user.partnerId ?? null;

    const delta = result.passes ? DAILY_TASK_REWARDS.pass : DAILY_TASK_REWARDS.fail;
    const entry = propose({
      userId: user.id,
      delta,
      reason: result.passes ? 'task_complete' : 'task_fail',
      label: result.passes ? 'dailyTasks.complete' : 'dailyTasks.fail',
      taskDate: result.date,
      relatedUserId: partnerId,
    });

    if (partnerId) {
      // Notify the partner — they see a coin-confirm row.
      pushNotification({
        userId: partnerId,
        payload: { kind: 'coin-confirm', coinEntryId: entry.id },
      });
    }

    // Soft toast for the user — gives them feedback that their day was
    // logged without forcing a modal. Skip when missing something; we
    // only celebrate completion.
    if (result.passes) {
      toast({
        variant: 'success',
        message: "✅ Today's plan complete — partner will be notified.",
      });
    } else {
      const missingCount = result.missingKeys.length;
      toast({
        variant: 'info',
        message: `Today's plan: ${missingCount} task${missingCount === 1 ? '' : 's'} remaining.`,
      });
    }

    // `bindings` is read so the sweep re-runs when a partner binds /
    // unbinds (otherwise we'd propose entries with a stale relatedUserId).
  }, [
    user,
    goal,
    weights,
    foods,
    exercises,
    bindings,
    sweepExpired,
    propose,
    todaysEntryFor,
    pushNotification,
    pushCoinResult,
    activeBindingFor,
  ]);
}
