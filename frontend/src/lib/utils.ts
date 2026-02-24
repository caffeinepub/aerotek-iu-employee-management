import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: bigint | number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return '—';
  try {
    const ms = typeof timestamp === 'bigint' ? Number(timestamp) / 1_000_000 : timestamp;
    if (!isFinite(ms) || ms <= 0) return '—';
    return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatTime(timestamp: bigint | number | null | undefined): string {
  if (timestamp === null || timestamp === undefined) return '—';
  try {
    const ms = typeof timestamp === 'bigint' ? Number(timestamp) / 1_000_000 : timestamp;
    if (!isFinite(ms) || ms <= 0) return '—';
    return new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export function dateToNano(date: Date): bigint {
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

export function nanoToDate(nano: bigint): Date {
  return new Date(Number(nano) / 1_000_000);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDateInput(nano: bigint): string {
  const d = nanoToDate(nano);
  return d.toISOString().split('T')[0];
}

export function parseTimeToNano(dateStr: string, timeStr: string): bigint {
  const dt = new Date(`${dateStr}T${timeStr}:00`);
  return BigInt(dt.getTime()) * BigInt(1_000_000);
}

export function safeString(value: string | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || value.trim() === '') return fallback;
  return value;
}
