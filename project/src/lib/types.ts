export type DocumentStatus = 'unread' | 'read' | 'action_required' | 'archived';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type DocumentDirection = 'incoming' | 'outgoing';

/**
 * Fields from the standard incoming/outgoing mail register (registre du courrier
 * arrivée / départ). Which subset applies depends on the document's direction —
 * e.g. `instruction`/`transmissionDate`/`receivedByService` are incoming-only,
 * `recipientAddress`/`dispatchMode`/`proofOfSending`/`recipientReceivedDate` are
 * outgoing-only. All fields are plain strings/dates so the form stays editable
 * even when a value wasn't extracted by the AI.
 */
export interface RegisterInfo {
  registrationNumber: string;
  referenceNumber: string;
  documentDate: string | null;
  recipient: string;
  recipientAddress: string;
  assignedService: string;
  instruction: string;
  transmissionDate: string | null;
  receivedByService: string;
  dispatchMode: string;
  proofOfSending: string;
  recipientReceivedDate: string | null;
  registerStatus: string;
  observations: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  folder_id: string | null;
  title: string;
  sender: string;
  category: string;
  document_type: string;
  summary: string;
  content_text: string;
  amount_due: number | null;
  currency: string;
  due_date: string | null;
  status: DocumentStatus;
  priority: Priority;
  /** Undefined means the document (typically created by the mobile app) hasn't been classified yet. */
  direction?: DocumentDirection;
  received_date: string;
  image_url: string;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  register?: RegisterInfo;
}

export interface Reminder {
  id: string;
  document_id: string;
  title: string;
  remind_at: string;
  completed: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  document_id: string;
  content: string;
  created_at: string;
}

export interface Comment {
  id: string;
  document_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  document_id: string;
  title: string;
  assignee_name: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface DocumentDetail extends DocumentItem {
  reminders?: Reminder[];
  notes?: Note[];
  comments?: Comment[];
  actions?: ActionItem[];
  folder?: Folder | null;
}
