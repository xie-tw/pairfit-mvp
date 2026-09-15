import type { FrameId, ThemeBgId, TitleId } from '../store/cosmetics';

/**
 * Cosmetic catalog — PF-7.
 *
 * Static definitions for the shop page. We keep these in `lib/` (rather
 * than the store) because:
 *   - They're reference data, not state.
 *   - The shop page needs the catalog to render its grid; bundling it
 *     with the unlock ledger would couple concerns unnecessarily.
 *   - The catalog rarely changes; bundling separately makes tree-shaking
 *     happier when V1.x adds more items.
 *
 * Prices mirror the PRD §14.3 table:
 *   - Frame      → 100
 *   - Theme      → 200
 *   - Title      → 300
 *
 * The "default" items are owned by every account from day one and cost
 * 0; the shop renders them as "Equipped" rather than "Buy".
 */

export type CosmeticKind = 'frame' | 'theme' | 'title';

export interface CosmeticItem<TId extends string> {
  id: TId;
  /** Price in coins. The default starter is always 0. */
  price: number;
  /** i18n key prefix under `shop.items.<id>` — components render copy via `t()`. */
  i18nKey: string;
  /** Visual preview metadata — emoji, gradient stops, etc. */
  preview: {
    /** Single emoji used in the frame avatar and the shop card. */
    emoji?: string;
    /** Tailwind gradient stops for theme backgrounds (CSS bg-gradient-to-*). */
    gradientFrom?: string;
    gradientVia?: string;
    gradientTo?: string;
    /** Optional hex pair for inline styles when Tailwind can't reach. */
    hexFrom?: string;
    hexVia?: string;
    hexTo?: string;
  };
}

export const FRAME_CATALOG: CosmeticItem<FrameId>[] = [
  {
    id: 'default',
    price: 0,
    i18nKey: 'shop.items.frame.default',
    preview: { emoji: '🖼️' },
  },
  {
    id: 'gold',
    price: 100,
    i18nKey: 'shop.items.frame.gold',
    preview: { hexFrom: '#FCD34D', hexVia: '#F59E0B', hexTo: '#B45309', emoji: '🥇' },
  },
  {
    id: 'rainbow',
    price: 100,
    i18nKey: 'shop.items.frame.rainbow',
    preview: { hexFrom: '#F472B6', hexVia: '#A78BFA', hexTo: '#60A5FA', emoji: '🌈' },
  },
  {
    id: 'flame',
    price: 100,
    i18nKey: 'shop.items.frame.flame',
    preview: { hexFrom: '#FCA5A5', hexVia: '#FB923C', hexTo: '#B91C1C', emoji: '🔥' },
  },
  {
    id: 'ocean',
    price: 100,
    i18nKey: 'shop.items.frame.ocean',
    preview: { hexFrom: '#67E8F9', hexVia: '#22D3EE', hexTo: '#0E7490', emoji: '🌊' },
  },
];

export const THEME_CATALOG: CosmeticItem<ThemeBgId>[] = [
  {
    id: 'default',
    price: 0,
    i18nKey: 'shop.items.theme.default',
    preview: { hexFrom: '#F8FAFC', hexVia: '#F1F5F9', hexTo: '#E2E8F0' },
  },
  {
    id: 'sunset',
    price: 200,
    i18nKey: 'shop.items.theme.sunset',
    preview: { hexFrom: '#FDBA74', hexVia: '#F472B6', hexTo: '#7C3AED' },
  },
  {
    id: 'ocean',
    price: 200,
    i18nKey: 'shop.items.theme.ocean',
    preview: { hexFrom: '#7DD3FC', hexVia: '#22D3EE', hexTo: '#1E40AF' },
  },
  {
    id: 'aurora',
    price: 200,
    i18nKey: 'shop.items.theme.aurora',
    preview: { hexFrom: '#86EFAC', hexVia: '#5EEAD4', hexTo: '#7C3AED' },
  },
  {
    id: 'forest',
    price: 200,
    i18nKey: 'shop.items.theme.forest',
    preview: { hexFrom: '#BBF7D0', hexVia: '#4ADE80', hexTo: '#14532D' },
  },
];

export const TITLE_CATALOG: CosmeticItem<TitleId>[] = [
  {
    id: 'newbie',
    price: 0,
    i18nKey: 'shop.items.title.newbie',
    preview: { emoji: '🌱' },
  },
  {
    id: 'fit_master',
    price: 300,
    i18nKey: 'shop.items.title.fit_master',
    preview: { emoji: '🏋️' },
  },
  {
    id: 'weight_loss_hero',
    price: 300,
    i18nKey: 'shop.items.title.weight_loss_hero',
    preview: { emoji: '🏆' },
  },
  {
    id: 'weight_gain_champ',
    price: 300,
    i18nKey: 'shop.items.title.weight_gain_champ',
    preview: { emoji: '💪' },
  },
];

/**
 * Look up an item's price by id. Used by the Coins → unlock pipeline.
 */
export function priceOf(kind: CosmeticKind, id: string): number {
  const list =
    kind === 'frame' ? FRAME_CATALOG : kind === 'theme' ? THEME_CATALOG : TITLE_CATALOG;
  return list.find((item) => item.id === id)?.price ?? 0;
}

/**
 * Return the gradient className for a theme, suitable for Tailwind's
 * `bg-gradient-to-br from-X via-Y to-Z` syntax. Falls back to a neutral
 * surface for the "default" theme.
 */
export function themeBackgroundStyle(id: ThemeBgId): React.CSSProperties | undefined {
  const item = THEME_CATALOG.find((t) => t.id === id);
  if (!item || !item.preview.hexFrom) return undefined;
  return {
    backgroundImage: `linear-gradient(135deg, ${item.preview.hexFrom}, ${item.preview.hexVia ?? item.preview.hexFrom}, ${item.preview.hexTo ?? item.preview.hexFrom})`,
  };
}

/**
 * Border-style background for an avatar frame. Returned as inline CSS so
 * it survives Tailwind purge when the user picks a brand-new frame.
 */
export function frameRingStyle(id: FrameId): React.CSSProperties | undefined {
  const item = FRAME_CATALOG.find((f) => f.id === id);
  if (!item || !item.preview.hexFrom) return undefined;
  return {
    backgroundImage: `linear-gradient(135deg, ${item.preview.hexFrom}, ${item.preview.hexVia ?? item.preview.hexFrom}, ${item.preview.hexTo ?? item.preview.hexFrom})`,
  };
}
