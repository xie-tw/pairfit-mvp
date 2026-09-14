import { cn } from '../../lib/utils';

/**
 * Avatar picker — emoji swatches + initial fallback.
 *
 * PairFit's avatar system is intentionally tiny: a curated list of friendly
 * emoji plus an automatic "first letter" fallback so the user never ends
 * up with a broken / blank avatar. Uploaded photos ship in V1.1.
 */

const AVATAR_OPTIONS = ['🐶', '🐱', '🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐰', '🐨', '🦄', '🐙', '🐳', '🐢', '🍀', '🌸'] as const;

interface AvatarPickerProps {
  /** Currently selected emoji — empty string means "use initial". */
  value: string;
  /** Used to render the initial fallback when `value` is empty. */
  fallbackInitial: string;
  onChange: (next: string) => void;
  className?: string;
}

export function AvatarPicker({ value, fallbackInitial, onChange, className }: AvatarPickerProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose an avatar">
        <button
          type="button"
          role="radio"
          aria-checked={value === ''}
          onClick={() => onChange('')}
          className={cn(
            'flex size-10 items-center justify-center rounded-full border text-sm font-semibold',
            'transition-all duration-150',
            value === ''
              ? 'border-brand-500 bg-brand-100 text-brand-600 ring-2 ring-brand-500/30 dark:bg-brand-500/20 dark:text-brand-300'
              : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-primary))] hover:bg-[rgb(var(--bg-sunken))]',
          )}
          title="Use initial"
        >
          {fallbackInitial || '?'}
        </button>
        {AVATAR_OPTIONS.map((emoji) => {
          const selected = value === emoji;
          return (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(emoji)}
              className={cn(
                'flex size-10 items-center justify-center rounded-full border text-xl',
                'transition-all duration-150 pf-press',
                selected
                  ? 'border-brand-500 bg-brand-100 ring-2 ring-brand-500/30 dark:bg-brand-500/20'
                  : 'border-[rgb(var(--border-default))] bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-sunken))]',
              )}
            >
              <span aria-hidden>{emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}