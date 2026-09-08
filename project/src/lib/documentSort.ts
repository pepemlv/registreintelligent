import type { DocumentItem } from '@/lib/types';

function parseDateTime(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function parseDateOnly(value?: string | null): number {
  if (!value) return 0;
  const datePart = value.slice(0, 10);
  const time = new Date(`${datePart}T00:00:00`).getTime();
  return Number.isFinite(time) ? time : parseDateTime(value);
}

function registrationSequence(doc: DocumentItem): number {
  const value = doc.register?.registrationNumber || '';
  const match = value.match(/(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function compareNewestDocuments(a: DocumentItem, b: DocumentItem): number {
  const receivedDayDiff = parseDateOnly(b.received_date) - parseDateOnly(a.received_date);
  if (receivedDayDiff !== 0) return receivedDayDiff;

  const receivedTimeDiff = parseDateTime(b.received_date) - parseDateTime(a.received_date);
  if (receivedTimeDiff !== 0) return receivedTimeDiff;

  const createdDiff = parseDateTime(b.created_at) - parseDateTime(a.created_at);
  if (createdDiff !== 0) return createdDiff;

  const updatedDiff = parseDateTime(b.updated_at) - parseDateTime(a.updated_at);
  if (updatedDiff !== 0) return updatedDiff;

  return registrationSequence(b) - registrationSequence(a);
}

export function sortNewestDocuments<T extends DocumentItem>(documents: T[]): T[] {
  return [...documents].sort(compareNewestDocuments);
}

export function compareNewestLegacyDocuments<T extends { receivedDate?: string; reference?: string }>(a: T, b: T): number {
  const receivedDiff = parseDateTime(b.receivedDate) - parseDateTime(a.receivedDate);
  if (receivedDiff !== 0) return receivedDiff;

  const aSeq = Number(a.reference?.match(/(\d+)$/)?.[1] || 0);
  const bSeq = Number(b.reference?.match(/(\d+)$/)?.[1] || 0);
  return bSeq - aSeq;
}
