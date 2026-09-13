import type { DocumentStatus, DocumentType, Priority, TaskStatus, MailStatus } from '@/types';

export const statusConfig: Record<
  DocumentStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  received: { label: 'Reçu', bg: 'bg-ink-100', text: 'text-ink-700', dot: 'bg-ink-400' },
  processing: { label: 'Traitement', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  assigned: { label: 'Affecté', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  in_review: { label: 'En révision', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  validated: { label: 'Validé', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  closed: { label: 'Terminée', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
  overdue: { label: 'En retard', bg: 'bg-danger-100', text: 'text-danger-700', dot: 'bg-danger-500' },
};

export const taskStatusConfig: Record<
  TaskStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  new: { label: 'Nouveau', bg: 'bg-ink-100', text: 'text-ink-700', dot: 'bg-ink-400' },
  assigned: { label: 'Affecté', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  in_progress: { label: 'En cours', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  submitted: { label: 'En révision', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-400' },
  validated: { label: 'Validé', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  closed: { label: 'Terminée', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
};

export const mailStatusConfig: Record<
  MailStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  received: { label: 'Reçu', bg: 'bg-ink-100', text: 'text-ink-700', dot: 'bg-ink-400' },
  prepared: { label: 'Préparé', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  validated: { label: 'Validé', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  sent: { label: 'Envoyé', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  delivered: { label: 'Délivré', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  processed: { label: 'Traité', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  closed: { label: 'Clôturé', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
};

export const typeConfig: Record<
  DocumentType,
  { label: string; icon: string }
> = {
  invoice: { label: 'Facture', icon: 'Receipt' },
  contract: { label: 'Contrat', icon: 'FileText' },
  letter: { label: 'Courrier', icon: 'Mail' },
  report: { label: 'Rapport', icon: 'BarChart3' },
  order: { label: 'Commande', icon: 'ShoppingCart' },
  delivery_note: { label: 'Bon de livraison', icon: 'Package' },
  quote: { label: 'Devis', icon: 'Calculator' },
  other: { label: 'Autre', icon: 'File' },
};

export const priorityConfig: Record<Priority, { label: string; text: string; bg: string }> = {
  urgent: { label: 'Urgent', text: 'text-danger-700', bg: 'bg-danger-50' },
  high: { label: 'Prioritaire', text: 'text-warning-700', bg: 'bg-warning-50' },
  normal: { label: 'Normal', text: 'text-ink-600', bg: 'bg-ink-50' },
  low: { label: 'Faible', text: 'text-ink-500', bg: 'bg-ink-50' },
};

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
