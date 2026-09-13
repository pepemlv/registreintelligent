import type { DocumentItem } from './types';
import type { UserRole } from '@/types';

const TOP_ROLES: UserRole[] = ['EXECUTIVE', 'ORGANIZATION_ADMIN'];

export function canManageTrash(role?: UserRole | null): boolean {
  return isTopRole(role);
}

/** Direction Générale and Administrateur organisationnel are the two "top" roles for document visibility. */
export function isTopRole(role?: UserRole | null): boolean {
  return !!role && TOP_ROLES.includes(role);
}

export interface Viewer {
  uid: string;
  role?: UserRole | null;
}

/**
 * A document uploaded by Direction Générale or Administrateur is visible only to those two
 * roles by default, plus the uploader themselves and anyone it's been explicitly shared with.
 * Documents uploaded by anyone else keep the existing company-wide visibility.
 */
export function canViewDocument(doc: DocumentItem, viewer: Viewer): boolean {
  if (!isTopRole(doc.owner_role)) return true;
  if (isTopRole(viewer.role)) return true;
  if (doc.owner_id && doc.owner_id === viewer.uid) return true;
  if (doc.shared_with?.includes(viewer.uid)) return true;
  return false;
}

export function filterVisibleDocuments(docs: DocumentItem[], viewer: Viewer): DocumentItem[] {
  return docs.filter((doc) => !doc.deleted_at && canViewDocument(doc, viewer));
}
