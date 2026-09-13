/** Shared category list: used at company signup (what a supplier offers) and when
 * targeting an RFQ's visibility (which suppliers should see it). Keeping one shared
 * list means an RFQ's category filter actually matches what companies declared. */
export const BUSINESS_CATEGORIES = [
  'Informatique / Électronique',
  'Construction / BTP',
  'Transport / Logistique',
  'Fournitures de bureau',
  'Mobilier / Aménagement',
  'Nettoyage / Entretien',
  'Sécurité / Gardiennage',
  'Restauration / Traiteur',
  'Médical / Pharmaceutique',
  'Télécoms',
  'Consulting / Services professionnels',
  'Textile / Habillement',
  'Énergie',
  'Agroalimentaire',
  'Autre',
] as const;

export type SupplierOfferType = 'products' | 'services' | 'both';
