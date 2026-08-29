import { POINTS_PER_DAY } from "./constants";

/* ------------------------------------------------------------------- dates */

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

/** Adds `n` working days (Mon–Fri). Deterministic, no holiday calendar. */
export function addWorkingDays(iso: string, n: number): string {
  const date = parseDate(iso);
  let remaining = Math.max(0, Math.round(n));
  while (remaining > 0) {
    date.setTime(date.getTime() + DAY_MS);
    if (!isWeekend(date)) remaining -= 1;
  }
  return toISODate(date);
}

export function isAfter(a: string, b: string): boolean {
  return parseDate(a).getTime() > parseDate(b).getTime();
}

export function formatShortDate(iso: string): string {
  const date = parseDate(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ effort */

export function pointsToDays(points: number): number {
  return points / POINTS_PER_DAY;
}

export function daysToPoints(days: number): number {
  return days * POINTS_PER_DAY;
}

export function loadPercent(assignedEffort: number, capacity: number): number {
  if (capacity <= 0) return assignedEffort > 0 ? 999 : 0;
  return Math.round((assignedEffort / capacity) * 100);
}

/* --------------------------------------------------------------- formatting */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    const rendered = Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1);
    return `${sign}$${rendered}k`;
  }
  return `${sign}$${abs}`;
}

export function formatSignedCurrency(value: number): string {
  if (value === 0) return "$0";
  return `${value > 0 ? "+" : ""}${formatCompactCurrency(value)}`;
}

/* ---------------------------------------------------------------------- ids */

let counter = 0;

/** Monotonic, deterministic-per-session id. No randomness: the demo must replay. */
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}`;
}

export function resetIdCounter(): void {
  counter = 0;
}
