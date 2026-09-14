import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import type { FoodItem } from '../../store/food';

/**
 * ItemEditor — modal for editing the items of an in-progress meal.
 *
 * The component is "always open" from its own perspective — the parent
 * mounts it only while the editor should be visible, which means a
 * fresh `useState(items)` re-seeds the draft on every open. That's
 * intentional: the alternative (useEffect + setState) triggers React's
 * set-state-in-effect anti-pattern lint.
 *
 * The user can rename, retune macros, add new items, and remove items.
 * The "Save" CTA pushes the new array up via `onChange`. Numeric
 * validation: parse with `Number.parseFloat`; non-numeric / negative
 * inputs are clamped. Empty name falls back to "Item N".
 */
interface ItemEditorProps {
  items: FoodItem[];
  onChange: (next: FoodItem[]) => void;
  onClose: () => void;
}

export function ItemEditor({ items, onChange, onClose }: ItemEditorProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FoodItem[]>(items);

  const update = (index: number, patch: Partial<FoodItem>) => {
    setDraft((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const add = () => {
    setDraft((prev) => [
      ...prev,
      { name: t('record.newItemName', { n: prev.length + 1 }), calories: 0, p: 0, c: 0, f: 0 },
    ]);
  };

  const save = () => {
    const cleaned = draft
      .map((item, i) => ({
        ...item,
        name: item.name.trim() || t('record.newItemName', { n: i + 1 }),
        calories: clampNonNeg(Number.parseFloat(String(item.calories))),
        p: clampNonNeg(Number.parseFloat(String(item.p))),
        c: clampNonNeg(Number.parseFloat(String(item.c))),
        f: clampNonNeg(Number.parseFloat(String(item.f))),
      }))
      .filter((item) => item.calories > 0 || item.p > 0 || item.c > 0 || item.f > 0);

    if (cleaned.length === 0) return; // refuse to save a fully-empty meal
    onChange(cleaned);
    onClose();
  };

  const totalCalories = draft.reduce((sum, item) => sum + (Number.isFinite(item.calories) ? item.calories : 0), 0);

  return (
    <Modal
      open
      onClose={onClose}
      title={t('record.editorTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={save} disabled={draft.length === 0}>
            {t('record.editorSave', { value: Math.round(totalCalories) })}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-[rgb(var(--fg-secondary))]">{t('record.editorSubtitle')}</p>

        <ul className="space-y-3">
          {draft.map((item, idx) => (
            <li
              key={idx}
              className="rounded-lg border border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] p-3"
            >
              <div className="mb-2 flex items-start gap-2">
                <Input
                  label={t('record.foodName')}
                  value={item.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder={t('record.foodNamePlaceholder')}
                  className="flex-1"
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label={t('record.removeItem')}
                  className="pf-press mt-7 inline-flex size-9 flex-shrink-0 items-center justify-center rounded-md border border-[rgb(var(--border-default))] text-[rgb(var(--fg-secondary))] hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Input
                  label={t('record.kcal')}
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min={0}
                  value={String(item.calories)}
                  onChange={(e) => update(idx, { calories: Number.parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label={t('nutrient.proteinShort')}
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min={0}
                  value={String(item.p)}
                  onChange={(e) => update(idx, { p: Number.parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label={t('nutrient.carbsShort')}
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min={0}
                  value={String(item.c)}
                  onChange={(e) => update(idx, { c: Number.parseFloat(e.target.value) || 0 })}
                />
                <Input
                  label={t('nutrient.fatShort')}
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min={0}
                  value={String(item.f)}
                  onChange={(e) => update(idx, { f: Number.parseFloat(e.target.value) || 0 })}
                />
              </div>
            </li>
          ))}
        </ul>

        <Button type="button" variant="outline" onClick={add} block leadingIcon={<Plus className="size-4" aria-hidden />}>
          {t('record.addItem')}
        </Button>
      </div>
    </Modal>
  );
}

function clampNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}
