import { phoneRegex } from '@veilworlds/shared';

export function validatePhone(phone: string): boolean {
  return phoneRegex.test(phone);
}

export function validateEmail(email: string): boolean {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `Вкажіть ${label}`;
  return null;
}
