import type { DocumentItem } from '@/lib/types';

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bVehicle Registration Renewal Notice\b/gi, "Avis de renouvellement d'immatriculation du vehicule"],
  [/\bRegistration Renewal Notice\b/gi, "Avis de renouvellement d'immatriculation"],
  [/\bDMV\b/g, "service d'immatriculation"],
  [/\bAttorney demand response \/ dispute letter\b/gi, "Reponse a mise en demeure / lettre de litige"],
  [/\bOfficial administrative letter\b/gi, "Lettre administrative officielle"],
  [/\burgent request for health data\b/gi, "demande urgente de donnees sanitaires"],
  [/\brequest for transmission of monthly report\b/gi, "demande de transmission du rapport mensuel"],
  [/\brequest for monthly report transmission\b/gi, "demande de transmission du rapport mensuel"],
  [/\bCompany statutes and registration documents\b/gi, "Statuts de societe et pieces d'immatriculation"],
  [/\bstatement\b/gi, "releve"],
  [/\binvoice\b/gi, "facture"],
  [/\bcontract\b/gi, "contrat"],
  [/\bletter\b/gi, "courrier"],
  [/\breport\b/gi, "rapport"],
  [/\bquote\b/gi, "devis"],
];

export function frenchText(text?: string | null): string {
  let value = text || '';
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }
  return value;
}

export function frenchDocumentTitle(doc: DocumentItem): string {
  return frenchText(doc.title);
}

export function frenchDocumentSender(doc: DocumentItem): string {
  return frenchText(doc.sender);
}

export function frenchDocumentSummary(doc: DocumentItem): string {
  return frenchText(doc.summary);
}

export function frenchDocumentType(doc: DocumentItem): string {
  return frenchText(doc.document_type || 'document').toLowerCase();
}
