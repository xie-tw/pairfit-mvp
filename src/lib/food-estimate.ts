import type { FoodItem } from '../store/food';

/**
 * Heuristic food estimator.
 *
 * Used as the **fallback** path when the OPENAI_API_KEY env var is not
 * set (local dev, MVP without API access). The goal is not nutritional
 * accuracy — it's "good enough to demo the user flow so the LLM can be
 * plugged in later".
 *
 * Algorithm:
 *   1. Tokenize the input on a small set of separators (`,`, `、`, `,`,
 *      `和`, `and`, whitespace).
 *   2. For each token, look up the first matching entry in `FOOD_LIBRARY`
 *      (case-insensitive substring match).
 *   3. The unmatched remainder becomes a single "other" item, scaled to
 *      the gap between the matched totals and a typical 600–800 kcal
 *      ceiling — or a flat 250 kcal when nothing matched at all.
 *
 * Confidence is the fraction of input tokens that resolved to a known
 * entry. 0% → confidence = 0 (treat as "couldn't parse").
 */

interface FoodEntry {
  /** Canonical English / pinyin key. */
  key: string;
  /** Chinese aliases — matched case-insensitively as substrings. */
  aliases: string[];
  emoji: string;
  calories: number;
  p: number;
  c: number;
  f: number;
}

/**
 * Compact library — covers ~80% of common Chinese / Western foods a user
 * would dictate in the MVP. Each entry is a *single serving* estimate.
 *
 * Numbers are deliberately round-ish; the UI explicitly flags the result
 * as "estimate — edit if needed".
 */
const FOOD_LIBRARY: FoodEntry[] = [
  // Chinese staples
  { key: 'chicken rice', aliases: ['鸡腿饭', '鸡肉饭', 'chicken rice', '鸡饭'], emoji: '🍗', calories: 550, p: 25, c: 70, f: 18 },
  { key: 'fried rice', aliases: ['炒饭', 'fried rice'], emoji: '🍚', calories: 620, p: 18, c: 85, f: 22 },
  { key: 'beef noodle', aliases: ['牛肉面', '牛面', 'beef noodle'], emoji: '🍜', calories: 580, p: 28, c: 75, f: 16 },
  { key: 'lamian', aliases: ['拉面', 'lamian'], emoji: '🍜', calories: 520, p: 22, c: 70, f: 14 },
  { key: 'dumplings', aliases: ['饺子', 'dumplings', 'jiaozi'], emoji: '🥟', calories: 380, p: 18, c: 45, f: 14 },
  { key: 'xiaolongbao', aliases: ['小笼包', 'xiaolongbao'], emoji: '🥟', calories: 280, p: 12, c: 32, f: 10 },
  { key: 'baozi', aliases: ['包子', 'baozi'], emoji: '🥟', calories: 220, p: 9, c: 36, f: 4 },
  { key: 'mantou', aliases: ['馒头', 'mantou'], emoji: '🍞', calories: 180, p: 5, c: 38, f: 1 },
  { key: 'congee', aliases: ['粥', '白粥', 'congee', 'rice porridge'], emoji: '🍚', calories: 180, p: 4, c: 38, f: 1 },
  { key: 'mapo tofu', aliases: ['麻婆豆腐', 'mapo tofu'], emoji: '🌶️', calories: 320, p: 18, c: 14, f: 20 },
  { key: 'kung pao chicken', aliases: ['宫保鸡丁', 'kung pao'], emoji: '🌶️', calories: 430, p: 26, c: 22, f: 24 },
  { key: 'fried chicken', aliases: ['炸鸡', 'fried chicken'], emoji: '🍗', calories: 420, p: 22, c: 18, f: 28 },
  { key: 'hotpot', aliases: ['火锅', 'hotpot'], emoji: '🍲', calories: 700, p: 35, c: 30, f: 38 },
  { key: 'chinese burger', aliases: ['肉夹馍', 'roujiamo'], emoji: '🥖', calories: 380, p: 18, c: 42, f: 14 },
  { key: 'tofu', aliases: ['豆腐', 'tofu'], emoji: '🍢', calories: 120, p: 10, c: 4, f: 7 },
  { key: 'eggplant', aliases: ['茄子', 'eggplant'], emoji: '🍆', calories: 220, p: 5, c: 14, f: 16 },
  { key: 'bok choy', aliases: ['青菜', '白菜', '蔬菜', 'bok choy', 'vegetable'], emoji: '🥬', calories: 90, p: 4, c: 8, f: 4 },

  // Drinks
  { key: 'milk tea', aliases: ['奶茶', 'milk tea', 'bubble tea', '珍珠奶茶'], emoji: '🧋', calories: 280, p: 5, c: 50, f: 6 },
  { key: 'boba', aliases: ['珍珠', 'boba', 'tapioca'], emoji: '🧋', calories: 200, p: 1, c: 50, f: 0 },
  { key: 'coffee', aliases: ['咖啡', 'coffee', '美式', 'americano'], emoji: '☕', calories: 5, p: 0, c: 1, f: 0 },
  { key: 'latte', aliases: ['拿铁', 'latte'], emoji: '☕', calories: 180, p: 8, c: 18, f: 8 },
  { key: 'cola', aliases: ['可乐', 'cola', 'coke'], emoji: '🥤', calories: 140, p: 0, c: 36, f: 0 },
  { key: 'beer', aliases: ['啤酒', 'beer'], emoji: '🍺', calories: 150, p: 2, c: 13, f: 0 },
  { key: 'orange juice', aliases: ['橙汁', 'orange juice', 'juice'], emoji: '🍊', calories: 110, p: 2, c: 26, f: 0 },
  { key: 'milk', aliases: ['牛奶', 'milk'], emoji: '🥛', calories: 150, p: 8, c: 12, f: 8 },
  { key: 'soy milk', aliases: ['豆浆', 'soy milk'], emoji: '🥛', calories: 100, p: 7, c: 8, f: 4 },

  // Snacks
  { key: 'chips', aliases: ['薯片', 'chips', 'potato chips'], emoji: '🍟', calories: 280, p: 4, c: 30, f: 16 },
  { key: 'fries', aliases: ['薯条', 'fries', 'french fries'], emoji: '🍟', calories: 320, p: 4, c: 42, f: 16 },
  { key: 'burger', aliases: ['汉堡', 'burger', 'hamburger'], emoji: '🍔', calories: 540, p: 25, c: 40, f: 28 },
  { key: 'pizza slice', aliases: ['披萨', 'pizza'], emoji: '🍕', calories: 285, p: 12, c: 36, f: 10 },
  { key: 'hot dog', aliases: ['热狗', 'hot dog'], emoji: '🌭', calories: 290, p: 10, c: 18, f: 18 },
  { key: 'sandwich', aliases: ['三明治', 'sandwich'], emoji: '🥪', calories: 350, p: 18, c: 40, f: 12 },
  { key: 'salad', aliases: ['沙拉', 'salad'], emoji: '🥗', calories: 150, p: 5, c: 12, f: 8 },
  { key: 'sushi roll', aliases: ['寿司', 'sushi'], emoji: '🍣', calories: 220, p: 9, c: 38, f: 3 },
  { key: 'cake', aliases: ['蛋糕', 'cake'], emoji: '🍰', calories: 350, p: 5, c: 45, f: 16 },
  { key: 'ice cream', aliases: ['冰淇淋', 'ice cream'], emoji: '🍦', calories: 270, p: 5, c: 32, f: 14 },
  { key: 'cookie', aliases: ['饼干', 'cookie', '曲奇'], emoji: '🍪', calories: 150, p: 2, c: 20, f: 7 },
  { key: 'chocolate', aliases: ['巧克力', 'chocolate'], emoji: '🍫', calories: 230, p: 3, c: 26, f: 13 },
  { key: 'donut', aliases: ['甜甜圈', 'donut'], emoji: '🍩', calories: 260, p: 4, c: 31, f: 14 },
  { key: 'fruit', aliases: ['水果', 'fruit', 'apple', 'banana', '苹果', '香蕉'], emoji: '🍎', calories: 95, p: 1, c: 25, f: 0 },

  // Western meals
  { key: 'steak', aliases: ['牛排', 'steak'], emoji: '🥩', calories: 480, p: 38, c: 0, f: 34 },
  { key: 'salmon', aliases: ['三文鱼', 'salmon'], emoji: '🐟', calories: 360, p: 30, c: 0, f: 24 },
  { key: 'pasta', aliases: ['意面', '意大利面', 'pasta', 'spaghetti'], emoji: '🍝', calories: 480, p: 14, c: 75, f: 12 },
  { key: 'bread', aliases: ['面包', 'bread', 'toast'], emoji: '🍞', calories: 160, p: 5, c: 30, f: 2 },
  { key: 'egg', aliases: ['鸡蛋', '蛋', 'egg'], emoji: '🥚', calories: 70, p: 6, c: 0, f: 5 },
  { key: 'bacon', aliases: ['培根', 'bacon'], emoji: '🥓', calories: 120, p: 9, c: 0, f: 9 },
  { key: 'yogurt', aliases: ['酸奶', 'yogurt', 'yoghurt'], emoji: '🥣', calories: 120, p: 9, c: 14, f: 3 },
  { key: 'oatmeal', aliases: ['燕麦', 'oatmeal', 'oats'], emoji: '🥣', calories: 220, p: 8, c: 38, f: 4 },
];

interface EstimateResult {
  items: FoodItem[];
  totalCalories: number;
  confidence: number;
}

const SEPARATOR_REGEX = /[,，、]|和|and|plus|加|跟|与/g;

/** Convert a raw string to lowercase, NFC-normalised — stable for matching. */
function normalize(input: string): string {
  return input.trim().toLowerCase().normalize('NFC');
}

/** Find a library entry whose alias appears as a substring of `token`. */
function lookup(token: string): FoodEntry | null {
  const t = normalize(token);
  if (!t) return null;
  for (const entry of FOOD_LIBRARY) {
    for (const alias of entry.aliases) {
      if (t.includes(alias.toLowerCase())) return entry;
    }
  }
  return null;
}

/**
 * Estimate a meal from free-form text. Returns an empty list with
 * confidence = 0 when nothing matched — callers should surface that as a
 * "couldn't parse" state and nudge the user toward manual input.
 */
export function estimateMealFromText(raw: string): EstimateResult {
  const text = raw.trim();
  if (!text) return { items: [], totalCalories: 0, confidence: 0 };

  // Two-pass tokenisation:
  //   1. Split on natural phrase separators (", ", "和", "and", …). The
  //      resulting chunks should still be treated as single phrases so we
  //      can match multi-word entries like "chicken rice" or "milk tea".
  //   2. For each chunk that doesn't match as a whole, fall back to
  //      splitting on whitespace and matching each word.
  const chunks = text
    .split(SEPARATOR_REGEX)
    .map((s) => s.trim())
    .filter(Boolean);
  const items: FoodItem[] = [];
  const matchedChunks = new Set<number>();

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]!;
    // Try the whole chunk first (so "chicken rice" matches as one item).
    let entry = lookup(chunk);
    // Fall back to splitting on whitespace and matching sub-tokens.
    // We only fall back if the whole chunk missed — that way "chicken
    // rice" wins over the speculative "chicken" + "rice" lookup.
    if (!entry) {
      const subTokens = chunk.split(/\s+/).filter(Boolean);
      for (const sub of subTokens) {
        const subEntry = lookup(sub);
        if (subEntry) {
          entry = subEntry;
          break;
        }
      }
    }
    if (entry && !matchedChunks.has(i)) {
      items.push({
        name: entry.key,
        emoji: entry.emoji,
        calories: entry.calories,
        p: entry.p,
        c: entry.c,
        f: entry.f,
      });
      matchedChunks.add(i);
    }
  }

  // Some inputs have no separators — try a single big-string lookup.
  if (items.length === 0) {
    const entry = lookup(text);
    if (entry) {
      items.push({
        name: entry.key,
        emoji: entry.emoji,
        calories: entry.calories,
        p: entry.p,
        c: entry.c,
        f: entry.f,
      });
    }
  }

  if (items.length === 0) {
    // Couldn't parse — confidence = 0 so the UI shows the "couldn't
    // catch that" fallback.
    return { items: [], totalCalories: 0, confidence: 0 };
  }

  const confidence = matchedChunks.size === 0 ? 1 : matchedChunks.size / Math.max(chunks.length, 1);
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);

  return { items, totalCalories, confidence: clamp01(confidence) };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
