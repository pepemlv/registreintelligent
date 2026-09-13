import type { DocumentDirection, DocumentItem, DocumentStatus, RegisterInfo, Reminder } from './types';

const VALID_STATUSES = new Set<DocumentStatus>(['unread', 'read', 'action_required', 'archived']);

function normalizeStatus(status: unknown): DocumentStatus {
  if (typeof status === 'string' && VALID_STATUSES.has(status as DocumentStatus)) {
    return status as DocumentStatus;
  }
  // The mobile app writes to the same Firestore collection with a different status enum.
  if (status === 'pending') return 'unread';
  if (status === 'reviewed') return 'read';
  return 'unread';
}

function normalizeDirection(direction: unknown): DocumentDirection | undefined {
  return direction === 'incoming' || direction === 'outgoing' ? direction : undefined;
}

function normalizeRegister(raw: unknown): RegisterInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  return {
    registrationNumber: (r.registrationNumber as string) || '',
    referenceNumber: (r.referenceNumber as string) || '',
    documentDate: (r.documentDate as string | null) ?? null,
    recipient: (r.recipient as string) || '',
    recipientAddress: (r.recipientAddress as string) || '',
    assignedService: (r.assignedService as string) || '',
    instruction: (r.instruction as string) || '',
    transmissionDate: (r.transmissionDate as string | null) ?? null,
    receivedByService: (r.receivedByService as string) || '',
    dispatchMode: (r.dispatchMode as string) || '',
    proofOfSending: (r.proofOfSending as string) || '',
    recipientReceivedDate: (r.recipientReceivedDate as string | null) ?? null,
    registerStatus: (r.registerStatus as string) || '',
    observations: (r.observations as string) || '',
  };
}

/**
 * The mobile app shares this Firestore project but writes documents with its own
 * (smaller) schema: no priority/document_type/content_text/amount_due/image_url,
 * and `amount` instead of `amount_due`. Reading those fields as required strings
 * elsewhere (e.g. priorityLabel) throws on a mobile-created row, so every document
 * is normalized to the web shape right where it's fetched.
 */
export function normalizeDocument(raw: Record<string, unknown>): DocumentItem {
  return {
    id: String(raw.id ?? ''),
    owner_id: (raw.owner_id as string) || undefined,
    owner_role: (raw.owner_role as DocumentItem['owner_role']) || undefined,
    shared_with: Array.isArray(raw.shared_with) ? (raw.shared_with as string[]) : undefined,
    company_id: (raw.company_id as string) || undefined,
    folder_id: (raw.folder_id as string | null) ?? null,
    title: (raw.title as string) || 'Untitled document',
    sender: (raw.sender as string) || '',
    category: (raw.category as string) || 'Other',
    document_type: (raw.document_type as string) || (raw.category as string) || 'Document',
    summary: (raw.summary as string) || '',
    content_text: (raw.content_text as string) || '',
    amount_due: (raw.amount_due as number | null | undefined) ?? (raw.amount as number | null | undefined) ?? null,
    currency: (raw.currency as string) || 'USD',
    due_date: (raw.due_date as string | null) ?? null,
    status: normalizeStatus(raw.status),
    priority: (raw.priority as DocumentItem['priority']) || 'normal',
    direction: normalizeDirection(raw.direction),
    received_date: (raw.received_date as string) || (raw.created_at as string) || new Date().toISOString(),
    image_url: (raw.image_url as string) || (raw.file_url as string) || (raw.thumbnail_url as string) || '',
    processed_by: (raw.processed_by as string | null) ?? null,
    created_at: (raw.created_at as string) || new Date().toISOString(),
    updated_at: (raw.updated_at as string) || (raw.created_at as string) || new Date().toISOString(),
    register: normalizeRegister(raw.register),
  };
}

/** Mobile reminders use `due_date`; web reminders use `remind_at`. */
export function normalizeReminder(raw: Record<string, unknown>): Reminder {
  return {
    id: String(raw.id ?? ''),
    document_id: String(raw.document_id ?? ''),
    title: (raw.title as string) || 'Reminder',
    remind_at: (raw.remind_at as string) || (raw.due_date as string) || new Date().toISOString(),
    completed: Boolean(raw.completed),
    created_at: (raw.created_at as string) || new Date().toISOString(),
  };
}
