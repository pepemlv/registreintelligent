import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Upload, X, Package, RefreshCw, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import { downloadCatalogTemplate, parseCatalogExcelFile } from '@/lib/catalogExcel';
import { getUsdToCdfRate, formatCdf } from '@/lib/exchangeRate';
import { BUSINESS_CATEGORIES } from '@/lib/businessCategories';
import type { ProductItem, ProductState } from '@/lib/types';

interface ProductCatalogManagerProps {
  companyId: string;
  companyName: string;
  onClose: () => void;
  embedded?: boolean;
}

type CatalogKind = 'product' | 'service';
type CatalogItem = ProductItem & { item_type?: CatalogKind };
const PAGE_SIZE = 10;

const STATES: ProductState[] = ['Disponible', 'Stock limité', 'Indisponible'];

const emptyForm = {
  ref: '',
  category: '',
  product_name: '',
  brand: '',
  model: '',
  description: '',
  price_usd: '',
  stock: '1',
  unit: 'Pièce',
  warranty_months: '',
  state: 'Disponible' as ProductState,
  location: '',
  delivery_time: '',
};

export default function ProductCatalogManager({ companyId, companyName, onClose, embedded = false }: ProductCatalogManagerProps) {
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [catalogKind, setCatalogKind] = useState<CatalogKind>('product');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState<{ rate: number; isLive: boolean } | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filteredProducts = products.filter((product) => (product.item_type ?? 'product') === catalogKind);
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    const { data } = await firestore.from<CatalogItem>('products').select().eq('company_id', companyId);
    setProducts((data as CatalogItem[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void getUsdToCdfRate().then(setRate);
  }, [companyId]);

  const updateForm = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleAdd = async () => {
    if (!form.product_name.trim() || saving) return;
    setSaving(true);
    await firestore.from('products').insert({
      company_id: companyId,
      company_name: companyName,
      item_type: catalogKind,
      ref: form.ref.trim(),
      category: form.category.trim(),
      product_name: form.product_name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      description: form.description.trim(),
      price_usd: form.price_usd.trim() ? parseFloat(form.price_usd) : null,
      stock: catalogKind === 'service' ? 0 : parseInt(form.stock, 10) || 0,
      unit: form.unit.trim() || 'Pièce',
      warranty_months: form.warranty_months.trim() ? parseInt(form.warranty_months, 10) : null,
      state: form.state,
      location: form.location.trim(),
      delivery_time: form.delivery_time.trim(),
    });
    setForm(emptyForm);
    setSaving(false);
    setShowForm(false);
    await load();
  };

  const handleDelete = async (id: string) => {
    await firestore.from('products').delete().eq('id', id);
    await load();
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    setImporting(true);
    try {
      const rows = await parseCatalogExcelFile(file);
      if (rows.length === 0) {
        setImportError("Aucune ligne de produit valide trouvée dans ce fichier. Vérifiez les en-têtes de colonnes.");
        setImporting(false);
        return;
      }
      // Replace the existing catalog with the imported one.
      const existing = await firestore.from<CatalogItem>('products').select().eq('company_id', companyId);
      await Promise.all(((existing.data as CatalogItem[] | null) ?? []).map((row) => firestore.from('products').delete().eq('id', row.id)));
      await Promise.all(rows.map((row) => firestore.from('products').insert({ ...row, item_type: 'product', company_id: companyId, company_name: companyName })));
      await load();
    } catch (error) {
      setImportError(error instanceof Error && error.message === 'FORMAT_CATALOGUE_INVALIDE'
        ? 'Le format de ce fichier ne correspond pas au modèle. Téléchargez puis remplissez le modèle Excel officiel avant de l’importer.'
        : 'Impossible de lire ce fichier. Utilisez le modèle Excel officiel téléchargé depuis cette page.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={embedded ? 'min-h-full bg-ink-50 p-4 md:p-6 animate-fade-in' : 'fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in'}>
      <div className={embedded ? 'min-h-full w-full bg-white p-6 md:p-8' : 'bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto'}>
        <div className="flex items-start justify-between mb-1 gap-3">
          <h3 className="font-display font-bold text-ink-900 text-lg leading-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            Mes produits &amp; services
          </h3>
          {!embedded && <button onClick={onClose} aria-label="Fermer" className="text-ink-400 hover:text-ink-600 shrink-0"><X className="h-5 w-5" /></button>}
        </div>
        <p className="text-xs text-ink-500 mb-4">
          Visible par les autres entreprises du réseau lorsqu'elles consultent votre profil.
          {rate && (
            <span className="ml-1 text-ink-400">
              Taux appliqué : 1 USD ≈ {formatCdf(rate.rate)} {rate.isLive ? '' : '(taux hors ligne)'}
            </span>
          )}
        </p>

        {/* Excel import */}
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-dashed border-primary-300 bg-primary-50/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-ink-600">
            <p className="font-semibold text-ink-700">Importer un catalogue Excel</p>
            <p>Utilisez exclusivement le modèle officiel : il contient les colonnes attendues pour extraire vos produits.</p>
            {importError && <p className="text-danger-600 mt-1">{importError}</p>}
          </div>
          <div className="flex w-full shrink-0 flex-wrap justify-center gap-2 sm:w-auto sm:justify-end">
            <button onClick={downloadCatalogTemplate} className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-yellow-500"><Download className="h-3.5 w-3.5" /> Télécharger le modèle</button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-700">
              {importing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {importing ? 'Import...' : 'Choisir un fichier'}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleImportFile(file); if (fileInputRef.current) fileInputRef.current.value = ''; }} />
            </label>
          </div>
        </div>

        <div className="mb-4 flex justify-center sm:justify-start">
          <div className="inline-flex rounded-md border border-ink-200 bg-ink-50 p-1">
            {(['product', 'service'] as CatalogKind[]).map((kind) => (
              <button key={kind} type="button" onClick={() => { setCatalogKind(kind); setPage(1); }} className={`rounded px-4 py-2 text-xs font-semibold transition-colors ${catalogKind === kind ? 'bg-white text-primary-700 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
                {kind === 'product' ? 'Produits' : 'Services'}
              </button>
            ))}
          </div>
        </div>

        {showForm && <>
        {/* Add product form */}
        <div className="mb-5 p-4 rounded-xl bg-ink-50 border border-ink-100 space-y-3">
          <div className="flex items-center gap-3 border-b border-ink-200 pb-3">
            <label className="text-xs font-semibold text-ink-600">Type</label>
            <select value={catalogKind} onChange={(event) => { setCatalogKind(event.target.value as CatalogKind); setPage(1); }} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 outline-none focus:border-primary-400">
              <option value="product">Produit</option>
              <option value="service">Service</option>
            </select>
          </div>
          <p className="text-xs font-bold text-ink-600 uppercase">Ajouter un {catalogKind === 'product' ? 'produit' : 'service'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input value={form.ref} onChange={(e) => updateForm('ref', e.target.value)} placeholder="Réf." className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />
            <select value={form.category} onChange={(e) => updateForm('category', e.target.value)} className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400"><option value="">Catégorie</option>{BUSINESS_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <input value={form.product_name} onChange={(e) => updateForm('product_name', e.target.value)} placeholder={catalogKind === 'product' ? 'Nom du produit *' : 'Nom du service *'} className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400 sm:col-span-2" />
            {catalogKind === 'product' && <><input value={form.brand} onChange={(e) => updateForm('brand', e.target.value)} placeholder="Marque" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" /><input value={form.model} onChange={(e) => updateForm('model', e.target.value)} placeholder="Modèle" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" /></>}
            <input value={form.price_usd} onChange={(e) => updateForm('price_usd', e.target.value)} placeholder="Prix USD (optionnel)" type="number" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />
            {catalogKind === 'product' && <input value={form.stock} onChange={(e) => updateForm('stock', e.target.value)} placeholder="Stock" type="number" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />}
            <input value={form.unit} onChange={(e) => updateForm('unit', e.target.value)} placeholder="Unité" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />
            {catalogKind === 'product' && <input value={form.warranty_months} onChange={(e) => updateForm('warranty_months', e.target.value)} placeholder="Garantie (mois)" type="number" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />}
            <select value={form.state} onChange={(e) => updateForm('state', e.target.value)} className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400">
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={form.location} onChange={(e) => updateForm('location', e.target.value)} placeholder="Localisation" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />
            <input value={form.delivery_time} onChange={(e) => updateForm('delivery_time', e.target.value)} placeholder="Délai livraison" className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400" />
            <textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Description / spécifications" rows={1} className="px-2.5 py-2 bg-white rounded-lg border border-ink-200 text-xs outline-none focus:border-primary-400 sm:col-span-4 resize-none" />
          </div>
          <button onClick={handleAdd} disabled={!form.product_name.trim() || saving} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Ajouter le {catalogKind === 'product' ? 'produit' : 'service'}
          </button>
        </div>
        </>}

        {/* Products table */}
        <div className="rounded-xl border border-ink-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-ink-50 border-b border-ink-100">
                  <th className="text-left font-bold uppercase text-[10px] text-ink-500 px-3 py-2">Produit</th>
                  <th className="text-left font-bold uppercase text-[10px] text-ink-500 px-3 py-2">Catégorie</th>
                  <th className="text-left font-bold uppercase text-[10px] text-ink-500 px-3 py-2">Prix</th>
                  <th className="text-left font-bold uppercase text-[10px] text-ink-500 px-3 py-2">Stock</th>
                  <th className="text-left font-bold uppercase text-[10px] text-ink-500 px-3 py-2">État</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {loading ? (
                  <tr><td colSpan={6} className="text-center text-ink-400 py-6">Chargement...</td></tr>
                ) : filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-ink-400 py-6">Aucun produit dans le catalogue.</td></tr>
                ) : (
                  pageProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-ink-50/50">
                      <td className="px-3 py-2">
                        <p className="font-semibold text-ink-800">{p.product_name}</p>
                        <p className="text-[10px] text-ink-400">{[p.brand, p.model].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-2 text-ink-600">{p.category || '—'}</td>
                      <td className="px-3 py-2">
                        {p.price_usd !== null ? (
                          <>
                            <p className="font-semibold text-ink-800">${p.price_usd.toLocaleString('en-US')}</p>
                            {rate && <p className="text-[10px] text-ink-400">{formatCdf(p.price_usd * rate.rate)}</p>}
                          </>
                        ) : <span className="text-ink-400">Sur demande</span>}
                      </td>
                      <td className="px-3 py-2 text-ink-600">{p.stock} {p.unit}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${p.state === 'Disponible' ? 'bg-accent-50 text-accent-700' : p.state === 'Stock limité' ? 'bg-warning-50 text-warning-700' : 'bg-ink-100 text-ink-500'}`}>{p.state}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleDelete(p.id)} className="text-ink-400 hover:text-danger-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {!loading && filteredProducts.length > PAGE_SIZE && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
            <p className="text-xs text-ink-500">Page {currentPage} sur {pageCount} · {filteredProducts.length} éléments</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Page précédente" className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Précédent</button>
              <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={currentPage === pageCount} aria-label="Page suivante" className="inline-flex items-center gap-1 rounded-md border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40">Suivant <ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-center md:justify-start">
          <button type="button" onClick={() => setShowForm((visible) => !visible)} className="inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 md:w-auto">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Fermer le formulaire' : 'Ajouter un produit ou service'}
          </button>
        </div>
      </div>
    </div>
  );
}
