import { useEffect, useState } from 'react';

export function formatTanggalIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatTanggalWaktuIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function normalizeWaDisplay(wa: string): string {
  const digits = wa.replace(/\D/g, '');
  if (digits.startsWith('62')) return `0${digits.slice(2)}`;
  return digits;
}

export function buildWaLink(targetPhone: string, message: string): string {
  const digits = targetPhone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('8') ? `62${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export interface CountdownParts {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useCountdown(targetIso: string): CountdownParts {
  const calc = (): CountdownParts => {
    const diff = new Date(targetIso).getTime() - Date.now();
    if (Number.isNaN(diff) || diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { expired: false, days, hours, minutes, seconds };
  };

  const [parts, setParts] = useState<CountdownParts>(calc);

  useEffect(() => {
    setParts(calc());
    const id = window.setInterval(() => setParts(calc()), 1000);
    return () => window.clearInterval(id);
  }, [targetIso]);

  return parts;
}
