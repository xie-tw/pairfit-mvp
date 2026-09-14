import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Database,
  Download,
  Globe,
  Info,
  LogOut,
  Scale,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Switch } from '../components/ui/Switch';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  useAuthStore,
  useCurrentUser,
  signOut,
  type LocalePref,
  type Unit,
} from '../store/auth';
import { useLocaleStore } from '../store/locale';
import {
  useNotificationStore,
  type NotificationCategory,
} from '../store/notifications';
import { downloadSnapshot, wipeAllLocalData, KNOWN_KEYS } from '../lib/dataExport';
import { cn } from '../lib/utils';
import pkg from '../../package.json';

/**
 * App version is inlined at build time by Vite (it understands JSON
 * imports natively). Importing `package.json` keeps the version in one
 * place — bumping it in the manifest automatically propagates to the
 * "About" card here.
 */
const APP_VERSION: string = pkg.version;

/**
 * Settings page — PF-9.
 *
 * Houses every global preference: unit, language, notification toggles,
 * data export + wipe, about, and sign-out. Lives at `/settings` and is
 * auth-gated because data-management actions are account-scoped.
 *
 * Live-update note: changing unit / language writes through both the
 * auth store (per-user source of truth) and the global stores so the
 * rest of the app re-renders immediately. No reload is required.
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setLocaleGlobal = useLocaleStore((s) => s.setLocale);
  const prefs = useNotificationStore((s) => s.prefs);
  const setEnabled = useNotificationStore((s) => s.setEnabled);

  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearPhrase, setClearPhrase] = useState('');
  const [clearing, setClearing] = useState(false);

  if (!user) {
    // RequireAuth guarantees this, but TS narrowing is friend.
    return null;
  }

  const onUnitChange = (next: Unit) => updateProfile({ unit: next });

  const onLocaleChange = (next: LocalePref) => {
    setLocaleGlobal(next);
    updateProfile({ locale: next });
  };

  const onToggleCategory = (category: NotificationCategory, value: boolean) => {
    setEnabled(category, value);
  };

  const onExport = () => {
    downloadSnapshot();
  };

  const onClear = async () => {
    setClearing(true);
    // Brief delay so the spinner has time to render — wipe is instant
    // but we want the affordance of an in-progress state for parity with
    // real account-deletion flows.
    await new Promise((r) => setTimeout(r, 250));
    const cleared = wipeAllLocalData();
    setClearing(false);
    setConfirmingClear(false);
    setClearPhrase('');
    // Reset zustand stores so any in-memory derived state matches the
    // freshly-cleared disk. The cheapest way: blow away the singletons
    // by reloading to /register — the route guard handles "no session".
    signOut();
    navigate('/register', { replace: true });
    // Surface the result in the next page (Register mounts fresh).
    void cleared;
  };

  const onSignOut = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* Unit */}
      <Card>
        <SectionHeading icon={<Scale className="size-4" />}>
          {t('settings.unitTitle')}
        </SectionHeading>
        <SegmentedControl<Unit>
          value={user.unit}
          onChange={onUnitChange}
          options={[
            { value: 'kg', label: t('profile.unitKg') },
            { value: 'lb', label: t('profile.unitLb') },
          ]}
        />
      </Card>

      {/* Language */}
      <Card className="mt-4">
        <SectionHeading icon={<Globe className="size-4" />}>
          {t('settings.languageTitle')}
        </SectionHeading>
        <SegmentedControl<LocalePref>
          value={user.locale}
          onChange={onLocaleChange}
          options={[
            { value: 'en', label: 'English' },
            { value: 'zh', label: '中文' },
          ]}
        />
      </Card>

      {/* Notifications — UI only, real push is V1.1 */}
      <Card className="mt-4" noPadding>
        <div className="px-4 pt-4">
          <SectionHeading icon={<Bell className="size-4" />}>
            {t('settings.notificationsTitle')}
          </SectionHeading>
          <p className="mt-1 text-xs text-[rgb(var(--fg-secondary))]">
            {t('settings.notificationsHint')}
          </p>
        </div>
        <div className="mt-2 divide-y divide-[rgb(var(--border-default))]">
          <Switch
            checked={prefs.goal}
            onChange={(v) => onToggleCategory('goal', v)}
            label={t('settings.notifGoal')}
            description={t('settings.notifGoalHint')}
          />
          <Switch
            checked={prefs.cheer}
            onChange={(v) => onToggleCategory('cheer', v)}
            label={t('settings.notifCheer')}
            description={t('settings.notifCheerHint')}
          />
          <Switch
            checked={prefs.weekly}
            onChange={(v) => onToggleCategory('weekly', v)}
            label={t('settings.notifWeekly')}
            description={t('settings.notifWeeklyHint')}
          />
        </div>
      </Card>

      {/* Data management */}
      <Card className="mt-4" noPadding>
        <div className="px-4 pt-4">
          <SectionHeading icon={<Database className="size-4" />}>
            {t('settings.dataTitle')}
          </SectionHeading>
          <p className="mt-1 text-xs text-[rgb(var(--fg-secondary))]">
            {t('settings.dataHint', { count: KNOWN_KEYS.length })}
          </p>
        </div>
        <div className="mt-3 space-y-2 px-4 pb-4">
          <Button
            variant="outline"
            size="md"
            block
            leadingIcon={<Download className="size-4" aria-hidden />}
            onClick={onExport}
          >
            {t('settings.exportCta')}
          </Button>
          <Button
            variant="danger"
            size="md"
            block
            leadingIcon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => setConfirmingClear(true)}
          >
            {t('settings.clearCta')}
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card className="mt-4">
        <SectionHeading icon={<Info className="size-4" />}>
          {t('settings.aboutTitle')}
        </SectionHeading>
        <dl className="divide-y divide-[rgb(var(--border-default))] text-sm">
          <AboutRow label={t('settings.aboutVersion')} value={APP_VERSION} />
          <AboutLink
            label={t('settings.aboutPrivacy')}
            href="https://pairfit.example/privacy"
          />
          <AboutLink
            label={t('settings.aboutTerms')}
            href="https://pairfit.example/terms"
          />
        </dl>
      </Card>

      {/* Sign out */}
      <div className="mt-6">
        <Button
          variant="ghost"
          size="lg"
          block
          leadingIcon={<LogOut className="size-4" aria-hidden />}
          onClick={onSignOut}
        >
          {t('auth.signOut')}
        </Button>
        <p className="mt-2 text-center text-[11px] text-[rgb(var(--fg-subtle))]">
          {t('settings.signOutHint')}
        </p>
      </div>

      <ConfirmDialog
        open={confirmingClear}
        title={t('settings.clearConfirm.title')}
        description={t('settings.clearConfirm.body')}
        confirmLabel={t('settings.clearConfirm.confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={clearing}
        confirmEnabled={clearPhrase === 'DELETE'}
        onConfirm={onClear}
        onCancel={() => {
          setConfirmingClear(false);
          setClearPhrase('');
        }}
      >
        <div
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
            'border-warning/30 bg-warning-soft/40 text-warning dark:bg-warning/10',
          )}
        >
          <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" aria-hidden />
          <p>{t('settings.clearConfirm.warning')}</p>
        </div>
        <Input
          className="mt-3"
          label={t('settings.clearConfirm.phraseLabel')}
          value={clearPhrase}
          onChange={(e) => setClearPhrase(e.target.value.toUpperCase())}
          placeholder="DELETE"
          autoComplete="off"
          hint={t('settings.clearConfirm.phraseHint')}
        />
      </ConfirmDialog>
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-[rgb(var(--fg-secondary))]" aria-hidden>{icon}</span>
      <h3 className="pf-section-title">{children}</h3>
    </div>
  );
}

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-[rgb(var(--fg-secondary))]">{label}</dt>
      <dd className="font-medium text-[rgb(var(--fg-primary))]">{value}</dd>
    </div>
  );
}

function AboutLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-2.5 text-[rgb(var(--fg-primary))] hover:text-brand-600 dark:hover:text-brand-300"
    >
      <dt>{label}</dt>
      <dd aria-hidden>↗</dd>
    </a>
  );
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: string }>;
}

function SegmentedControl<T extends string>({ value, onChange, options }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" className="inline-flex w-full rounded-lg bg-[rgb(var(--bg-sunken))] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60',
              active
                ? 'bg-[rgb(var(--bg-surface))] text-[rgb(var(--fg-primary))] shadow-sm'
                : 'text-[rgb(var(--fg-secondary))] hover:text-[rgb(var(--fg-primary))]',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}