import * as XLSX from 'xlsx';
import type { ProductItem, ProductState } from './types';

export type CatalogRow = Pick<
  ProductItem,
  'ref' | 'category' | 'product_name' | 'brand' | 'model' | 'description' | 'price_usd' | 'stock' | 'unit' | 'warranty_months' | 'state' | 'location' | 'delivery_time'
>;

export const CATALOG_HEADERS = [
  'Réf. Produit', 'Catégorie', 'Produit', 'Marque', 'Modèle',
  'Description / Spécifications', 'Prix unitaire (USD)', 'Stock disponible',
  'Unité', 'Garantie (mois)', 'État', 'Localisation', 'Délai livraison',
] as const;

export const CATALOG_OPTIONAL_HEADERS = ['Dernière mise à jour'] as const;

/** Matches the "Réf. Produit | Catégorie | Produit | Marque | Modèle | Description / Spécifications |
 * Prix unitaire (USD) | Stock disponible | Unité | Garantie (mois) | État | Localisation | Délai livraison"
 * catalogue template. Column order in the file doesn't matter — headers are matched by name. */
const HEADER_ALIASES: Record<string, keyof CatalogRow> = {
  'réf. produit': 'ref',
  'référence': 'ref',
  'catégorie': 'category',
  'produit': 'product_name',
  'marque': 'brand',
  'modèle': 'model',
  'description / spécifications': 'description',
  'description': 'description',
  'prix unitaire (usd)': 'price_usd',
  'prix unitaire': 'price_usd',
  'stock disponible': 'stock',
  'unité': 'unit',
  'garantie (mois)': 'warranty_months',
  'garantie': 'warranty_months',
  'état': 'state',
  'localisation': 'location',
  'ref produit': 'ref',
  reference: 'ref',
  categorie: 'category',
  modele: 'model',
  'description specifications': 'description',
  'prix unitaire usd': 'price_usd',
  unite: 'unit',
  'garantie mois': 'warranty_months',
  etat: 'state',
  'delai livraison': 'delivery_time',
  'délai livraison': 'delivery_time',
};

const VALID_STATES: ProductState[] = ['Disponible', 'Stock limité', 'Indisponible'];

function normalizeHeader(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[./()_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const cleaned = String(raw).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseInt0(raw: unknown): number {
  const value = parseInt(String(raw ?? '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(value) ? value : 0;
}

function parseState(raw: unknown): ProductState {
  const text = String(raw ?? '').trim();
  const match = VALID_STATES.find((s) => s.toLowerCase() === text.toLowerCase());
  return match ?? 'Disponible';
}

export async function parseCatalogExcelFile(file: File): Promise<CatalogRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const headers = (matrix[0] ?? []).map((value) => normalizeHeader(String(value ?? '')));
  if (CATALOG_HEADERS.map(normalizeHeader).some((header) => !headers.includes(header))) {
    throw new Error('FORMAT_CATALOGUE_INVALIDE');
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  return rows
    .map((row) => {
      const mapped: Partial<CatalogRow> = {};
      for (const [key, value] of Object.entries(row)) {
        const field = HEADER_ALIASES[normalizeHeader(key)];
        if (!field) continue;
        if (field === 'price_usd') mapped.price_usd = parsePrice(value);
        else if (field === 'stock') mapped.stock = parseInt0(value);
        else if (field === 'warranty_months') mapped.warranty_months = value === '' ? null : parseInt0(value);
        else if (field === 'state') mapped.state = parseState(value);
        else (mapped[field] as string) = String(value ?? '').trim();
      }
      return {
        ref: mapped.ref || '',
        category: mapped.category || '',
        product_name: mapped.product_name || '',
        brand: mapped.brand || '',
        model: mapped.model || '',
        description: mapped.description || '',
        price_usd: mapped.price_usd ?? null,
        stock: mapped.stock ?? 0,
        unit: mapped.unit || 'Pièce',
        warranty_months: mapped.warranty_months ?? null,
        state: mapped.state ?? 'Disponible',
        location: mapped.location || '',
        delivery_time: mapped.delivery_time || '',
      };
    })
    .filter((row) => row.product_name.trim().length > 0);
}

export function downloadCatalogTemplate() {
  const workbook = XLSX.utils.book_new();
  const catalogueSheet = XLSX.utils.aoa_to_sheet([
    [...CATALOG_HEADERS, ...CATALOG_OPTIONAL_HEADERS],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ]);
  catalogueSheet['!cols'] = CATALOG_HEADERS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(workbook, catalogueSheet, 'Catalogue Produits');
  const infoSheet = XLSX.utils.aoa_to_sheet([
    ['EXEMPLE — CATALOGUE FOURNISSEUR'], [], ['Champ', 'Valeur'],
    ['Nom commercial', ''], ['Téléphone', ''], ['E-mail', ''], ['Adresse / Localisation', ''],
  ]);
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Informations Fournisseur');
  XLSX.writeFile(workbook, 'modele_catalogue_produits_services.xlsx');
}
