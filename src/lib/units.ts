/**
 * Unit conversion helpers for weight readings.
 *
 * PairFit persists each reading with the unit the user typed it in. When
 * comparing across units (e.g. goal vs. latest reading, or two different
 * readings on different days) we normalize to a single canonical unit so
 * the chart axis doesn't mix 65 (kg) with 144 (lb).
 */

import type { Unit } from '../store/auth';

const KG_PER_LB = 0.45359237;

/** Convert any reading into kilograms. */
export function toKg(weight: number, unit: Unit): number {
  return unit === 'kg' ? weight : weight * KG_PER_LB;
}

/** Convert kilograms into the user's preferred display unit. */
export function fromKg(kg: number, target: Unit): number {
  return target === 'kg' ? kg : kg / KG_PER_LB;
}

/** Format a number with the user's preferred precision for display. */
export function formatWeight(weight: number, unit: Unit, precision = 1): string {
  return `${weight.toFixed(precision)} ${unit}`;
}
