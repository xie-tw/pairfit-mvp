import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins as CoinsIcon, Lock, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PageHeader } from '../components/ui/PageHeader';
import { useCurrentUser } from '../store/auth';
import { useCoinStore } from '../store/coins';
import {
  equippedFor,
  type CosmeticKind,
  type EquippedCosmetics,
  type FrameId,
  type ThemeBgId,
  type TitleId,
  type UnlockedCosmetics,
  useCosmeticsStore,
} from '../store/cosmetics';
import {
  FRAME_CATALOG,
  THEME_CATALOG,
  TITLE_CATALOG,
  type CosmeticItem,
} from '../lib/cosmetics';
import { toast } from '../store/toast';
import { cn } from '../lib/utils';

/**
 * Shop — PF-7.
 *
 * Three sections (avatar frames, theme backgrounds, titles), each a
 * grid of cards. Each card has one of three states:
 *
 *   - **Owned** (not currently equipped) — shows "Equip" + "Equipped" toggle.
 *   - **Equipped** — shows the active check mark.
 *   - **Available** — shows price + Buy button.
 *
 * Buy requires confirmation (you don't want a stray double-tap to spend
 * 300 coins). We use the project's existing `ConfirmDialog` so the look
 * stays consistent with the rest of the app.
 *
 * Compliance:
 *   - Top-of-page disclaimer makes clear coins are virtual-only.
 *   - No "buy with cash" affordance ships.
 */
export function ShopPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const unlocksAll = useCosmeticsStore((s) => s.unlocks);
  const equippedAll = useCosmeticsStore((s) => s.equipped);
  const unlock = useCosmeticsStore((s) => s.unlock);
  const equip = useCosmeticsStore((s) => s.equip);
  const balance = useCoinStore((s) => (user ? s.balanceOf(user.id) : 0));
  const redeemGift = useCoinStore((s) => s.redeemGift);

  const [pending, setPending] = useState<null | {
    kind: CosmeticKind;
    id: string;
    price: number;
    label: string;
  }>(null);

  const userId = user?.id ?? null;
  const unlocks: UnlockedCosmetics = useMemo(
    () => (userId ? unlocksAll[userId] ?? defaultUnlocks() : defaultUnlocks()),
    [unlocksAll, userId],
  );
  const equipped: EquippedCosmetics = useMemo(
    () => (userId ? equippedFor(equippedAll, userId) : defaultEquipped()),
    [equippedAll, userId],
  );

  if (!user || !userId) {
    return (
      <div className="animate-fade-in">
        <PageHeader title={t('shop.title')} subtitle={t('auth.signInRequired')} />
      </div>
    );
  }

  const isOwned = (kind: CosmeticKind, id: string): boolean => {
    if (kind === 'frame') return unlocks.frames.includes(id as FrameId);
    if (kind === 'theme') return unlocks.themes.includes(id as ThemeBgId);
    return unlocks.titles.includes(id as TitleId);
  };

  const isEquipped = (kind: CosmeticKind, id: string): boolean => {
    if (kind === 'frame') return equipped.frame === id;
    if (kind === 'theme') return equipped.theme === id;
    return equipped.title === id;
  };

  const onBuy = (kind: CosmeticKind, item: CosmeticItem<string>) => {
    setPending({
      kind,
      id: item.id,
      price: item.price,
      label: t(item.i18nKey),
    });
  };

  const onConfirmBuy = () => {
    if (!pending) return;
    if (balance < pending.price) {
      toast({ variant: 'error', message: t('shop.notEnough') });
      setPending(null);
      return;
    }
    const result = redeemGift({
      userId: user.id,
      price: pending.price,
      giftId: `${pending.kind}:${pending.id}`,
      label: pending.label,
    });
    if (!result) {
      toast({ variant: 'error', message: t('shop.notEnough') });
      setPending(null);
      return;
    }
    unlock(user.id, pending.kind, pending.id);
    // Auto-equip on buy — better UX than forcing another tap. The user
    // can always re-equip another item to switch.
    equip(user.id, pending.kind, pending.id);
    toast({ variant: 'success', message: t('shop.redeemSuccess', { name: pending.label }) });
    setPending(null);
  };

  const onEquip = (kind: CosmeticKind, id: string) => {
    equip(user.id, kind, id);
    toast({ variant: 'info', message: t('shop.equipped') });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t('shop.title')}
        subtitle={t('shop.subtitle')}
        trailing={
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            <CoinsIcon className="size-3.5" aria-hidden />
            <span className="tabular-nums">{balance.toLocaleString()}</span>
          </div>
        }
      />

      {/* Compliance disclaimer — must be visible. */}
      <Card className="mb-4 border-amber-200 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          {t('shop.disclaimer')}
        </p>
      </Card>

      <Section title={t('shop.sections.frames')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FRAME_CATALOG.map((item) => (
            <FrameCard
              key={item.id}
              item={item}
              owned={isOwned('frame', item.id)}
              equipped={isEquipped('frame', item.id)}
              onBuy={() => onBuy('frame', item)}
              onEquip={() => onEquip('frame', item.id)}
            />
          ))}
        </div>
      </Section>

      <Section title={t('shop.sections.themes')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {THEME_CATALOG.map((item) => (
            <ThemeCard
              key={item.id}
              item={item}
              owned={isOwned('theme', item.id)}
              equipped={isEquipped('theme', item.id)}
              onBuy={() => onBuy('theme', item)}
              onEquip={() => onEquip('theme', item.id)}
            />
          ))}
        </div>
      </Section>

      <Section title={t('shop.sections.titles')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TITLE_CATALOG.map((item) => (
            <TitleCard
              key={item.id}
              item={item}
              owned={isOwned('title', item.id)}
              equipped={isEquipped('title', item.id)}
              onBuy={() => onBuy('title', item)}
              onEquip={() => onEquip('title', item.id)}
            />
          ))}
        </div>
      </Section>

      <ConfirmDialog
        open={!!pending}
        title={t('shop.confirmTitle', { name: pending?.label ?? '' })}
        description={
          pending
            ? t('shop.confirmBody', {
                price: pending.price,
                name: pending.label,
              })
            : ''
        }
        confirmLabel={t('shop.confirmBuy', { price: pending?.price ?? 0 })}
        cancelLabel={t('common.cancel')}
        onConfirm={onConfirmBuy}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="pf-section-title mb-3">{title}</h2>
      {children}
    </section>
  );
}

interface CardProps {
  item: CosmeticItem<string>;
  owned: boolean;
  equipped: boolean;
  onBuy: () => void;
  onEquip: () => void;
}

function FrameCard({ item, owned, equipped, onBuy, onEquip }: CardProps) {
  const { t } = useTranslation();
  const { emoji, hexFrom, hexVia, hexTo } = item.preview;
  const ringStyle = hexFrom
    ? {
        backgroundImage: `linear-gradient(135deg, ${hexFrom}, ${hexVia ?? hexFrom}, ${hexTo ?? hexFrom})`,
      }
    : undefined;
  return (
    <Card noPadding className="flex flex-col items-center gap-2 px-3 py-4">
      <div className="relative">
        <div
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full bg-[rgb(var(--bg-surface))] text-2xl shadow-sm ring-2 ring-[rgb(var(--bg-surface))]"
        >
          {emoji ?? '🖼️'}
        </div>
        {ringStyle ? (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full p-0.5"
            style={ringStyle}
          />
        ) : null}
      </div>
      <p className="text-xs font-semibold text-[rgb(var(--fg-primary))]">{t(item.i18nKey)}</p>
      <CardAction owned={owned} equipped={equipped} price={item.price} onBuy={onBuy} onEquip={onEquip} />
    </Card>
  );
}

function ThemeCard({ item, owned, equipped, onBuy, onEquip }: CardProps) {
  const { t } = useTranslation();
  const { hexFrom, hexVia, hexTo } = item.preview;
  const previewStyle = hexFrom
    ? {
        backgroundImage: `linear-gradient(135deg, ${hexFrom}, ${hexVia ?? hexFrom}, ${hexTo ?? hexFrom})`,
      }
    : undefined;
  return (
    <Card noPadding className="flex flex-col items-center gap-2 px-3 py-4">
      <div
        aria-hidden
        className={cn(
          'h-16 w-full rounded-lg border border-[rgb(var(--border-default))]',
          !previewStyle && 'bg-[rgb(var(--bg-sunken))]',
        )}
        style={previewStyle}
      />
      <p className="text-xs font-semibold text-[rgb(var(--fg-primary))]">{t(item.i18nKey)}</p>
      <CardAction owned={owned} equipped={equipped} price={item.price} onBuy={onBuy} onEquip={onEquip} />
    </Card>
  );
}

function TitleCard({ item, owned, equipped, onBuy, onEquip }: CardProps) {
  const { t } = useTranslation();
  const { emoji } = item.preview;
  return (
    <Card noPadding className="flex flex-col items-center gap-2 px-3 py-4">
      <div
        aria-hidden
        className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 text-3xl dark:from-brand-500/15 dark:to-accent-500/15"
      >
        {emoji ?? '🏷️'}
      </div>
      <p className="text-center text-xs font-semibold text-[rgb(var(--fg-primary))]">{t(item.i18nKey)}</p>
      <CardAction owned={owned} equipped={equipped} price={item.price} onBuy={onBuy} onEquip={onEquip} />
    </Card>
  );
}

function CardAction({
  owned,
  equipped,
  price,
  onBuy,
  onEquip,
}: {
  owned: boolean;
  equipped: boolean;
  price: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const { t } = useTranslation();
  if (equipped) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
        <Sparkles className="size-2.5" aria-hidden />
        {t('shop.equipped')}
      </span>
    );
  }
  if (owned) {
    return (
      <Button variant="secondary" size="sm" onClick={onEquip}>
        {t('shop.equip')}
      </Button>
    );
  }
  return (
    <Button
      variant={price === 0 ? 'secondary' : 'primary'}
      size="sm"
      onClick={onBuy}
      leadingIcon={price === 0 ? <Lock className="size-3" aria-hidden /> : <CoinsIcon className="size-3" aria-hidden />}
    >
      {price === 0 ? t('shop.defaultLocked') : t('shop.buy', { price })}
    </Button>
  );
}

function defaultUnlocks(): UnlockedCosmetics {
  return { frames: ['default'], themes: ['default'], titles: ['newbie'] };
}

function defaultEquipped(): EquippedCosmetics {
  return { frame: 'default', theme: 'default', title: 'newbie' };
}
