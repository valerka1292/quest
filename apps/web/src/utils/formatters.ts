export function formatPrice(price: number): string {
  return price.toLocaleString('uk-UA') + ' грн';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
  });
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
