import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WeeklyReportResponse } from '../../api/ai/weekly-report';
import { startOfIsoWeek } from '../lib/weekly-report-api';

/**
 * Cached AI weekly report — PF-8.
 *
 * The PM spec calls for "same week → no repeat call". We key the cache by
 * ISO-week start, so the report is reused until the calendar rolls over
 * to the next Monday. The store keeps *all* historical weeks because
 * rendering "last week's report" is a useful fallback while the new one
 * is generating.
 *
 * Generation lifecycle lives here (rather than in the page) so any
 * future "push notification" trigger or background rehydrate can write
 * into the same slot the page reads from. The store does not call the
 * API itself — pages and `Me` pass in the resolved payload.
 */

export interface CachedWeeklyReport {
  /** ISO-week-start ms — the cache key. */
  weekStart: number;
  /** Wall-clock the report was generated. */
  generatedAt: number;
  /** The AI's response payload. */
  report: WeeklyReportResponse;
  /** True when the data was too sparse for an LLM-grade report. */
  isSparse?: boolean;
}

export const WEEKLY_REPORT_KEY = 'pairfit:weeklyReport';

interface WeeklyReportState {
  /** Newest first. */
  reports: CachedWeeklyReport[];
  /** Save / replace the report for its ISO week. */
  setReport: (input: CachedWeeklyReport) => void;
  /** Drop everything. Used by "clear all data" / data export tests. */
  clearReports: () => void;
}

export const useWeeklyReportStore = create<WeeklyReportState>()(
  persist(
    (set) => ({
      reports: [],

      setReport: (input) => {
        set((state) => {
          const filtered = state.reports.filter((r) => r.weekStart !== input.weekStart);
          return { reports: [input, ...filtered].slice(0, 12) };
        });
      },

      clearReports: () => set({ reports: [] }),
    }),
    {
      name: WEEKLY_REPORT_KEY,
      partialize: (state) => ({ reports: state.reports }),
    },
  ),
);

/** Look up the cached report for the ISO week containing `at`. */
export function reportForWeek(
  reports: CachedWeeklyReport[],
  at = Date.now(),
): CachedWeeklyReport | undefined {
  const week = startOfIsoWeek(at);
  return reports.find((r) => r.weekStart === week);
}
