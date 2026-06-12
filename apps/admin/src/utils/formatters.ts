export function formatPrice(price: number): string {
  return price.toLocaleString('ru-RU') + ' грн';
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}
