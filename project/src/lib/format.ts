export function formatCurrency(amount: number | null, currency = 'EUR'): string {
  if (amount === null || amount === undefined) return '';
  const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === 'EUR') return `${formatted} €`;
  const symbols: Record<string, string> = { USD: '$', GBP: '£' };
  const symbol = symbols[currency] || '€';
  return `${symbol}${formatted}`;
}

export function formatDate(date: string | null): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(date: string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('fr-FR', { hour: 'numeric', minute: '2-digit' });
}

export function formatDateTime(date: string): string {
  return `${formatDate(date)} à ${formatTime(date)}`;
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function relativeDeadline(date: string | null): string {
  const days = daysUntil(date);
  if (days === null) return '';
  if (days < 0) return `En retard de ${Math.abs(days)} jour${Math.abs(days) === 1 ? '' : 's'}`;
  if (days === 0) return 'Échéance aujourd\'hui';
  if (days === 1) return 'Échéance demain';
  return `Échéance dans ${days} jours`;
}

export function relativeTime(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'À l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDate(date);
}

export function isRawJsonText(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'normal': return 'bg-blue-100 text-usps-blue border-blue-200';
    case 'low': return 'bg-gray-100 text-gray-600 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

export function priorityLabel(priority: string): string {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'high': return 'Élevée';
    case 'normal': return 'Normale';
    case 'low': return 'Faible';
    default: return priority.charAt(0).toUpperCase() + priority.slice(1);
  }
}
