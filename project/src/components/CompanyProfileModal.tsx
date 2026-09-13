import { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, Mail, X, Package, Briefcase, CheckCircle2 } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import { getUsdToCdfRate, formatCdf } from '@/lib/exchangeRate';
import type { ProductItem } from '@/lib/types';

interface RealCompany {
  id: string;
  name: string;
  organization_type?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  primary_admin_email?: string;
  is_supplier?: boolean;
  supplier_offer_type?: string;
  supplier_categories?: string[];
  logo_url?: string;
}

interface CompanyProfileModalProps {
  company: RealCompany;
  onClose: () => void;
  onRelationSaved?: () => void;
}

export default function CompanyProfileModal({ company, onClose, onRelationSaved }: CompanyProfileModalProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState<{ rate: number; isLive: boolean } | null>(null);
  const [relation, setRelation] = useState<'supplier' | 'customer' | 'both' | ''>('');
  const [relationSaved, setRelationSaved] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    firestore.from<ProductItem>('products').select().eq('company_id', company.id).then(({ data }) => {
      if (active) { setProducts((data as ProductItem[] | null) ?? []); setLoading(false); }
    });
    void getUsdToCdfRate().then((r) => active && setRate(r));
    return () => { active = false; };
  }, [company.id]);

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-11 w-11 rounded-xl object-cover shrink-0 ring-1 ring-ink-200" />
            ) : (
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {company.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="font-display font-bold text-ink-900 text-lg leading-tight">{company.name}</h3>
              <p className="text-xs text-ink-500">{company.organization_type || 'Entreprise'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {(company.city || company.country) && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-50 text-ink-600 font-medium">
              <MapPin className="h-3 w-3" /> {[company.city, company.country].filter(Boolean).join(', ')}
            </span>
          )}
          {company.phone && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-50 text-ink-600 font-medium">
              <Phone className="h-3 w-3" /> {company.phone}
            </span>
          )}
          {company.primary_admin_email && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-ink-50 text-ink-600 font-medium">
              <Mail className="h-3 w-3" /> {company.primary_admin_email}
            </span>
          )}
          {company.is_supplier && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 font-medium">
              <Briefcase className="h-3 w-3" /> Fournisseur
            </span>
          )}
        </div>

        <div className="mb-4 rounded-xl border border-primary-200 bg-primary-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-primary-800">Relation avec cette entreprise</p>
              <p className="mt-0.5 text-[10px] text-ink-500">Enregistrez Biocereal dans votre réseau commercial.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={relation} onChange={(event) => { setRelation(event.target.value as typeof relation); setRelationSaved(false); }} className="rounded-lg border border-ink-200 bg-white px-2.5 py-2 text-xs font-semibold text-ink-700 outline-none focus:border-primary-500">
                <option value="">Choisir une relation</option>
                <option value="supplier">Mon fournisseur</option>
                <option value="customer">Mon client</option>
                <option value="both">Client et fournisseur</option>
              </select>
              <button disabled={!relation} onClick={async () => { await firestore.from('company_relationships').insert({ target_company_id: company.id, target_company_name: company.name, relation }); setRelationSaved(true); onRelationSaved?.(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40">
                <CheckCircle2 className="h-3.5 w-3.5" /> {relationSaved ? 'Enregistrée' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>

        {company.supplier_categories && company.supplier_categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {company.supplier_categories.map((cat) => (
              <span key={cat} className="text-[10px] font-medium px-2 py-1 bg-accent-50 text-accent-700 rounded-lg border border-accent-200/60">{cat}</span>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-ink-100">
          <p className="text-xs font-bold text-ink-600 uppercase mb-2 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" /> Produits &amp; services
          </p>
          {rate && (
            <p className="text-[10px] text-ink-400 mb-2">Taux appliqué : 1 USD ≈ {formatCdf(rate.rate)} {rate.isLive ? '' : '(taux hors ligne)'}</p>
          )}
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {loading ? (
                    <tr><td colSpan={5} className="text-center text-ink-400 py-6">Chargement...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-ink-400 py-6 flex items-center justify-center gap-2"><Building2 className="h-4 w-4" /> Cette entreprise n'a pas encore publié de catalogue.</td></tr>
                  ) : (
                    products.map((p) => (
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
