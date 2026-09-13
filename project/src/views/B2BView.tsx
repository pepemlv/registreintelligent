import { useEffect, useState } from 'react';
import {
  Building2,
  Search,
  Star,
  ChevronRight,
  ArrowLeftRight,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  FileText,
  Send,
  Shield,
  Award,
  Package,
  ShoppingBag,
  ShoppingCart,
  X,
  ExternalLink,
  QrCode,
  UserPlus,
  Briefcase,
  Truck,
  HardHat,
  Laptop,
  Printer,
  Wrench,
  HeartPulse,
  Inbox,
  Calendar,
  CheckSquare,
  Camera,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { formatDate, formatCurrency } from '@/lib/documentConfig';
import type { Partner, Company, Opportunity, PartnerRelation, PartnerStatus, OpportunityStatus, CompanyStatus } from '@/types';
import type { Folder } from '@/lib/types';
import { firestore, getActiveCompanyContext, storage } from '@/lib/firebase';
import CreateTaskModal from '@/components/CreateTaskModal';
import FolderPicker from '@/components/FolderPicker';
import ProductCatalogManager from '@/components/ProductCatalogManager';
import CompanyProfileModal from '@/components/CompanyProfileModal';

const statusBadge: Record<CompanyStatus, { label: string; bg: string; text: string }> = {
  verified: { label: 'Vérifié', bg: 'bg-accent-100', text: 'text-accent-700' },
  unverified: { label: 'Non vérifié', bg: 'bg-warning-100', text: 'text-warning-700' },
  external: { label: 'Externe', bg: 'bg-ink-100', text: 'text-ink-600' },
};

const relationBadge: Record<PartnerRelation, { label: string; bg: string; text: string }> = {
  supplier: { label: 'Fournisseur', bg: 'bg-primary-100', text: 'text-primary-700' },
  customer: { label: 'Client', bg: 'bg-accent-100', text: 'text-accent-700' },
  both: { label: 'Fournisseur & Client', bg: 'bg-warning-100', text: 'text-warning-700' },
};

const partnerStatusBadge: Record<PartnerStatus, { label: string; bg: string; text: string; dot: string }> = {
  active: { label: 'Actif', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  pending: { label: 'En attente', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  invited: { label: 'Invité', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  inactive: { label: 'Inactif', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
};

const oppStatusConfig: Record<OpportunityStatus, { label: string; bg: string; text: string; dot: string }> = {
  new: { label: 'Nouvelle', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  to_answer: { label: 'À répondre', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  submitted: { label: 'Offre envoyée', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  awarded: { label: 'Attribué', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-600' },
  rejected: { label: 'Non retenue', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
  closed: { label: 'Clôturée', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
};

const categoryIconMap: Record<string, typeof Package> = {
  Informatique: Laptop,
  Électronique: Laptop,
  Construction: HardHat,
  BTP: HardHat,
  Transport: Truck,
  Logistique: Truck,
  'Fournitures de bureau': Printer,
  Mobilier: Package,
  Aménagement: Package,
  Services: Wrench,
  Nettoyage: Wrench,
  Médical: HeartPulse,
  Pharmaceutique: HeartPulse,
  Télécoms: Phone,
};

function generateDocFlowCode(name: string): string {
  const prefix = name.slice(0, 2).toUpperCase().replace(/[^A-Z]/g, '');
  const num = Math.floor(Math.random() * 90000) + 10000;
  return `DF-${prefix}-${num}`;
}

function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

type Tab = 'all' | 'suppliers' | 'customers';
export type SubView = 'list' | 'detail' | 'add' | 'opportunities' | 'oppDetail';

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
  directory_status?: string;
  logo_url?: string;
}

export function B2BView({ initialSubView = 'list', companyProfiles = [], folders = [] }: { initialSubView?: SubView; companyProfiles?: { owner_id: string; full_name: string; email: string; role_label: string; company_id?: string; company_name?: string }[]; folders?: Folder[] }) {
  const [subView, setSubView] = useState<SubView>(initialSubView);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [partnerList, setPartnerList] = useState<Partner[]>([]);
  const [oppList, setOppList] = useState<Opportunity[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'external' | 'favorites'>('all');
  const [realCompanies, setRealCompanies] = useState<RealCompany[]>([]);
  const [selectedRealCompany, setSelectedRealCompany] = useState<RealCompany | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [myCompany, setMyCompany] = useState<RealCompany | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const activeCompany = getActiveCompanyContext();

  useEffect(() => {
    const loadCompaniesAndRelations = async () => {
      const [companiesResult, relationsResult] = await Promise.all([
        firestore.from<RealCompany>('companies').select(),
        firestore.from<{ target_company_id: string; relation: PartnerRelation }>('company_relationships').select(),
      ]);
      const everyone = (companiesResult.data as RealCompany[] | null) ?? [];
      setMyCompany(everyone.find((company) => company.id === activeCompany?.id) ?? null);
      const all = everyone.filter((company) => company.id !== activeCompany?.id && company.directory_status !== 'suspended');
      const relations = (relationsResult.data as { target_company_id: string; relation: PartnerRelation }[] | null) ?? [];
      setRealCompanies(all);
      setPartnerList(relations.map((item) => {
        const company = all.find((candidate) => candidate.id === item.target_company_id);
        if (!company) return null;
        return {
          id: `relationship-${company.id}`,
          company: {
            id: company.id,
            name: company.name,
            logoColor: 'bg-primary-600',
            address: company.address || '',
            city: company.city || '—',
            country: company.country || 'RDC',
            phone: company.phone || '',
            email: company.primary_admin_email || '',
            taxId: '—',
            sectors: company.supplier_categories || [],
            productsServices: [],
            contactPersons: [],
            docFlowCode: company.id,
            status: company.is_supplier ? 'verified' : 'unverified',
            servedZones: [],
            categories: company.supplier_categories || [],
          },
          relation: item.relation,
          status: 'active',
          addedDate: new Date().toISOString(),
          notes: '',
          favorite: false,
          isDocFlowMember: true,
        } as Partner;
      }).filter((partner): partner is Partner => Boolean(partner)));
    };
    void loadCompaniesAndRelations();
  }, [activeCompany?.id]);

  // ===== DETAIL VIEW =====
  if (subView === 'detail' && selectedPartner) {
    return <PartnerDetail partner={selectedPartner} onBack={() => { setSubView('list'); setSelectedPartner(null); }} />;
  }

  // ===== ADD PARTNER VIEW =====
  if (subView === 'add') {
    return (
      <AddPartnerFlow
        onBack={() => setSubView('list')}
        onAdd={(partner) => {
          setPartnerList([partner, ...partnerList]);
          setSubView('list');
          setSelectedPartner(partner);
        }}
        existingPartners={partnerList}
        companyProfiles={companyProfiles}
      />
    );
  }

  // ===== OPPORTUNITY DETAIL =====
  if (subView === 'oppDetail' && selectedOpp) {
    return (
      <OpportunityDetail
        opp={selectedOpp}
        folders={folders}
        companyProfiles={companyProfiles}
        onBack={() => { setSubView('opportunities'); setSelectedOpp(null); }}
        onSubmit={() => {
          setOppList(oppList.map((o) => (o.id === selectedOpp.id ? { ...o, status: 'submitted', submittedDate: '2026-09-06' } : o)));
          setSubView('opportunities');
          setSelectedOpp(null);
        }}
      />
    );
  }

  // ===== OPPORTUNITIES LIST =====
  if (subView === 'opportunities') {
    return (
      <OpportunitiesView
        opportunities={oppList}
        onBack={() => setSubView('list')}
        onSelect={(opp) => { setSelectedOpp(opp); setSubView('oppDetail'); }}
      />
    );
  }

  // ===== MAIN LIST VIEW =====
  const filtered = partnerList.filter((p) => {
    if (tab === 'suppliers' && p.relation !== 'supplier' && p.relation !== 'both') return false;
    if (tab === 'customers' && p.relation !== 'customer' && p.relation !== 'both') return false;
    if (filterStatus === 'active' && p.status !== 'active') return false;
    if (filterStatus === 'external' && p.isDocFlowMember) return false;
    if (filterStatus === 'favorites' && !p.favorite) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.company.name.toLowerCase().includes(q) ||
        p.company.city.toLowerCase().includes(q) ||
        p.company.docFlowCode.toLowerCase().includes(q) ||
        p.company.sectors.some((s) => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const supplierCount = partnerList.filter((p) => p.relation === 'supplier' || p.relation === 'both').length;
  const customerCount = partnerList.filter((p) => p.relation === 'customer' || p.relation === 'both').length;
  const externalCount = partnerList.filter((p) => !p.isDocFlowMember).length;
  const newOppCount = oppList.filter((o) => o.status === 'new' || o.status === 'to_answer').length;

  const handleLogoUpload = async (file: File) => {
    if (!activeCompany) return;
    setUploadingLogo(true);
    try {
      const path = `companies/${activeCompany.id}/logo/${Date.now()}-${file.name}`;
      const uploaded = await uploadBytes(storageRef(storage, path), file);
      const logoUrl = await getDownloadURL(uploaded.ref);
      await firestore.from('companies').update({ logo_url: logoUrl }).eq('id', activeCompany.id);
      setMyCompany((current) => (current ? { ...current, logo_url: logoUrl } : current));
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="relative h-11 w-11 rounded-xl overflow-hidden shrink-0 cursor-pointer group ring-1 ring-ink-200" title="Changer le logo de mon entreprise">
            {myCompany?.logo_url ? (
              <img src={myCompany.logo_url} alt={myCompany.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
                {(myCompany?.name || activeCompany?.name || '??').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 bg-ink-900/0 group-hover:bg-ink-900/50 transition-colors flex items-center justify-center">
              <Camera className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingLogo}
              onChange={(e) => { const file = e.target.files?.[0]; if (file) void handleLogoUpload(file); e.target.value = ''; }}
            />
          </label>
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base">Partenaires B2B</h2>
            <p className="text-xs text-ink-500">{uploadingLogo ? 'Envoi du logo...' : 'Une même entreprise peut être votre fournisseur et votre client'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatalog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-accent-700 bg-accent-50 hover:bg-accent-100 transition-colors"
          >
            <Package className="h-3.5 w-3.5" />
            Mon catalogue
          </button>
          <button
            onClick={() => setSubView('opportunities')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors"
          >
            <Inbox className="h-3.5 w-3.5" />
            Opportunités
            {newOppCount > 0 && <span className="ml-0.5 px-1.5 py-0.5 bg-primary-600 text-white rounded-full text-[9px] font-bold">{newOppCount}</span>}
          </button>
          <button
            onClick={() => setSubView('add')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Ajouter un partenaire
          </button>
        </div>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard icon={Users} label="Total partenaires" value={partnerList.length.toString()} color="text-primary-600" bg="bg-primary-50" />
        <DashboardCard icon={Briefcase} label="Fournisseurs" value={supplierCount.toString()} color="text-accent-600" bg="bg-accent-50" />
        <DashboardCard icon={ShoppingBag} label="Clients" value={customerCount.toString()} color="text-warning-600" bg="bg-warning-50" />
        <DashboardCard icon={ExternalLink} label="Externes" value={externalCount.toString()} color="text-ink-600" bg="bg-ink-100" />
      </div>

      {/* Tabs + Search + Filters */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4 space-y-3">
        <div className="flex items-center gap-1 border-b border-ink-100 pb-3">
          {([
            { id: 'all' as Tab, label: 'Tous', count: partnerList.length },
            { id: 'suppliers' as Tab, label: 'Mes fournisseurs', count: supplierCount },
            { id: 'customers' as Tab, label: 'Mes clients', count: customerCount },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === t.id ? 'bg-primary-600 text-white' : 'text-ink-500 hover:bg-ink-100'
              }`}
            >
              {t.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-ink-100'}`}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 flex-1">
            <Search className="h-4 w-4 text-ink-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, ville, code Registre intelligent, secteur..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
            />
          </div>
          <div className="flex items-center gap-1">
            {([
              { id: 'all' as const, label: 'Tous statuts' },
              { id: 'active' as const, label: 'Actifs' },
              { id: 'external' as const, label: 'Externes' },
              { id: 'favorites' as const, label: 'Favoris' },
            ]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterStatus(f.id)}
                className={`px-2.5 py-2 rounded-lg text-[10px] font-medium transition-colors ${
                  filterStatus === f.id ? 'bg-ink-800 text-white' : 'bg-ink-50 text-ink-500 hover:bg-ink-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Partner list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-12 text-center">
          <Users className="h-10 w-10 text-ink-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-600">Aucun partenaire trouvé</p>
          <p className="text-xs text-ink-400 mt-1">Modifiez votre recherche ou ajoutez un nouveau partenaire</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((partner) => {
            const rCfg = relationBadge[partner.relation];
            const sCfg = partnerStatusBadge[partner.status];
            const cCfg = statusBadge[partner.company.status];
            const CatIcon = categoryIconMap[partner.company.categories[0]] || Building2;
            return (
              <button
                key={partner.id}
                onClick={() => { setSelectedPartner(partner); setSubView('detail'); }}
                className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl ${partner.company.logoColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {partner.company.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700">{partner.company.name}</p>
                      <p className="text-[10px] font-mono text-ink-400">{partner.company.docFlowCode}</p>
                    </div>
                  </div>
                  {partner.favorite && <Star className="h-4 w-4 text-warning-500 fill-warning-500 shrink-0" />}
                </div>

                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 ${rCfg.bg} ${rCfg.text}`}>
                    {rCfg.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 ${sCfg.bg} ${sCfg.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${sCfg.dot}`} />
                    {sCfg.label}
                  </span>
                  {!partner.isDocFlowMember && (
                    <span className="inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 bg-warning-50 text-warning-600 border border-warning-200">
                      <ExternalLink className="h-2.5 w-2.5" /> Externe
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-ink-500 mb-3">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {partner.company.city}</span>
                  <span className="flex items-center gap-1"><CatIcon className="h-3 w-3" /> {partner.company.sectors[0]}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-ink-100">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${cCfg.bg} ${cCfg.text} px-1.5 py-0.5 rounded`}>
                    {partner.company.status === 'verified' && <Shield className="h-2.5 w-2.5" />}
                    {cCfg.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* All registered companies on the network */}
      {tab === 'all' && (() => {
        const realFiltered = realCompanies.filter((c) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return c.name.toLowerCase().includes(q) || (c.city ?? '').toLowerCase().includes(q) || (c.supplier_categories ?? []).some((cat) => cat.toLowerCase().includes(q));
        });
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-bold text-ink-800">Toutes les entreprises inscrites sur Registre intelligent</h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ink-100 text-ink-500">{realFiltered.length}</span>
            </div>
            {realFiltered.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-8 text-center">
                <p className="text-xs text-ink-400">Aucune autre entreprise inscrite pour le moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {realFiltered.map((co) => (
                  <button
                    key={co.id}
                    onClick={() => setSelectedRealCompany(co)}
                    className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {co.logo_url ? (
                        <img src={co.logo_url} alt={co.name} className="h-11 w-11 rounded-xl object-cover shrink-0 ring-1 ring-ink-200" />
                      ) : (
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {co.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700 truncate">{co.name}</p>
                        <p className="text-[10px] text-ink-400">{co.organization_type || 'Entreprise'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-ink-500 mb-3">
                      {co.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {co.city}</span>}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-ink-100">
                      {co.is_supplier ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded"><Briefcase className="h-2.5 w-2.5" /> Fournisseur</span>
                      ) : (
                        <span className="text-[9px] text-ink-400">Profil entreprise</span>
                      )}
                      <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Company code explainer */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50/40 rounded-2xl border border-primary-200/40 p-5">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
            <QrCode className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink-800 mb-1">Code Registre intelligent entreprise</p>
            <p className="text-xs text-ink-500 leading-relaxed mb-3">
              Chaque entreprise reçoit un identifiant unique (ex: DF-CT-83921) qui permet de la trouver, l'ajouter comme partenaire,
              lui envoyer un document ou une demande de cotation. Le code est un identifiant de recherche, pas un secret.
            </p>
            <div className="flex flex-wrap gap-2">
              {['Rechercher une entreprise', 'Ajouter un partenaire', 'Envoyer une cotation', 'Inviter à collaborer'].map((use) => (
                <span key={use} className="text-[10px] font-medium px-2 py-1 bg-white rounded-lg border border-ink-200/60 text-ink-600">{use}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCatalog && activeCompany && (
        <ProductCatalogManager companyId={activeCompany.id} companyName={activeCompany.name} onClose={() => setShowCatalog(false)} />
      )}
      {selectedRealCompany && (
        <CompanyProfileModal company={selectedRealCompany} onClose={() => setSelectedRealCompany(null)} onRelationSaved={() => { setSelectedRealCompany(null); window.location.reload(); }} />
      )}
    </div>
  );
}

// ====== PARTNER DETAIL ======

function PartnerDetail({ partner, onBack }: { partner: Partner; onBack: () => void }) {
  const co = partner.company;
  const rCfg = relationBadge[partner.relation];
  const cCfg = statusBadge[co.status];
  const [showRfqActions, setShowRfqActions] = useState(false);

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1200px] mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5">← Retour aux partenaires</button>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <div className="flex items-start gap-4">
          <div className={`h-16 w-16 rounded-2xl ${co.logoColor} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
            {co.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-display text-xl font-bold text-ink-900">{co.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full font-semibold text-[10px] px-2 py-0.5 ${cCfg.bg} ${cCfg.text}`}>
                {co.status === 'verified' && <Shield className="h-3 w-3" />}
                {cCfg.label}
              </span>
            </div>
            <p className="text-[10px] font-mono text-ink-400 mb-2">Code Registre intelligent : {co.docFlowCode}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 ${rCfg.bg} ${rCfg.text}`}>{rCfg.label}</span>
              {!partner.isDocFlowMember && (
                <span className="inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 bg-warning-50 text-warning-600 border border-warning-200">
                  <ExternalLink className="h-2.5 w-2.5" /> Fournisseur externe
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!partner.isDocFlowMember && (
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Inviter à Registre intelligent
              </button>
            )}
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors flex items-center gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Envoyer un document
            </button>
            <button onClick={() => setShowRfqActions(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              Envoyer une demande de cotation
            </button>
          </div>
        </div>
      </div>

      {showRfqActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowRfqActions(false)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-ink-900">Envoyer une demande de cotation</h2><button onClick={() => setShowRfqActions(false)} aria-label="Fermer"><X className="h-5 w-5 text-ink-400" /></button></div>
            <p className="mt-1 text-xs text-ink-500">Choisissez une demande existante ou préparez-en une nouvelle pour {co.name}.</p>
            <div className="mt-4 space-y-2">
              <button disabled className="w-full rounded-lg border border-ink-200 px-3 py-3 text-left text-sm text-ink-400 disabled:cursor-not-allowed"><span className="block font-semibold">Sélectionner une cotation existante</span><span className="text-xs">Aucune demande de cotation disponible.</span></button>
              <button onClick={() => setShowRfqActions(false)} className="w-full rounded-lg bg-primary-600 px-3 py-3 text-left text-sm font-semibold text-white hover:bg-primary-700"><span className="block">Créer une nouvelle demande</span><span className="text-xs font-normal text-white/80">La demande pourra ensuite être adressée à {co.name}.</span></button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Company info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
            <h2 className="font-display font-bold text-ink-900 text-sm mb-4">Informations entreprise</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={MapPin} label="Adresse" value={`${co.address}, ${co.city}, ${co.country}`} />
              <InfoRow icon={Phone} label="Téléphone" value={co.phone} />
              <InfoRow icon={Mail} label="E-mail" value={co.email} />
              <InfoRow icon={FileText} label="N° fiscal / RCCM" value={co.taxId} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
            <h2 className="font-display font-bold text-ink-900 text-sm mb-4">Secteurs d'activité</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              {co.sectors.map((s) => {
                const Icon = categoryIconMap[s] || Briefcase;
                return (
                  <span key={s} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg border border-primary-200/60">
                    <Icon className="h-3 w-3" /> {s}
                  </span>
                );
              })}
            </div>
            <h3 className="text-xs font-bold text-ink-600 mb-2">Produits / Services</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {co.productsServices.map((p) => (
                <div key={p} className="flex items-center gap-2 p-2 bg-ink-50 rounded-lg">
                  <Package className="h-3.5 w-3.5 text-ink-400" />
                  <span className="text-xs text-ink-700">{p}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
            <h2 className="font-display font-bold text-ink-900 text-sm mb-4">Personnes de contact</h2>
            <div className="space-y-3">
              {co.contactPersons.map((cp, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-ink-50 rounded-xl">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {cp.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800">{cp.name}</p>
                    <p className="text-[10px] text-ink-500">{cp.role}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-ink-500">
                      <span className="flex items-center gap-1"><Mail className="h-2.5 w-2.5" /> {cp.email}</span>
                      <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> {cp.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
            <h2 className="font-display font-bold text-ink-900 text-sm mb-4">Zones desservies</h2>
            <div className="flex flex-wrap gap-2">
              {co.servedZones.map((z) => (
                <span key={z} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-accent-50 text-accent-700 rounded-lg border border-accent-200/60">
                  <MapPin className="h-3 w-3" /> {z}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Notes, categories, actions */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
            <h3 className="font-display font-bold text-ink-900 text-sm mb-3">Notes internes</h3>
            <p className="text-xs text-ink-600 leading-relaxed">{partner.notes}</p>
            <div className="mt-3 pt-3 border-t border-ink-100">
              <p className="text-[10px] text-ink-400">Ajouté le {formatDate(partner.addedDate)}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
            <h3 className="font-display font-bold text-ink-900 text-sm mb-3">Catégories d'activité</h3>
            <div className="space-y-2">
              {co.categories.map((c) => {
                const Icon = categoryIconMap[c] || Briefcase;
                return (
                  <div key={c} className="flex items-center gap-2 p-2 bg-ink-50 rounded-lg">
                    <Icon className="h-3.5 w-3.5 text-primary-600" />
                    <span className="text-xs text-ink-700">{c}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-white" />
              <span className="text-xs font-bold">Actions rapides</span>
            </div>
            <div className="space-y-2">
              <button className="w-full py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5" /> Créer une demande de cotation
              </button>
              <button className="w-full py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Envoyer un document
              </button>
              <button className="w-full py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors flex items-center justify-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Envoyer un message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-3.5 w-3.5 text-ink-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-[10px] font-bold uppercase text-ink-400">{label}</p>
        <p className="text-xs text-ink-700">{value}</p>
      </div>
    </div>
  );
}

// ====== ADD PARTNER FLOW ======

type AddMethod = 'choose' | 'search' | 'external';

function AddPartnerFlow({ onBack, onAdd, existingPartners, companyProfiles }: { onBack: () => void; onAdd: (p: Partner) => void; existingPartners: Partner[]; companyProfiles: { owner_id: string; full_name: string; email: string; role_label: string; company_id?: string; company_name?: string }[] }) {
  const [method, setMethod] = useState<AddMethod>('choose');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [relation, setRelation] = useState<PartnerRelation>('supplier');
  const [notes, setNotes] = useState('');
  const [favorite, setFavorite] = useState(false);

  // External form
  const [extName, setExtName] = useState('');
  const [extAddress, setExtAddress] = useState('');
  const [extCity, setExtCity] = useState('');
  const [extPhone, setExtPhone] = useState('');
  const [extEmail, setExtEmail] = useState('');
  const [extContact, setExtContact] = useState('');
  const [extSector, setExtSector] = useState('');
  const [extProducts, setExtProducts] = useState('');
  const [extTaxId, setExtTaxId] = useState('');
  const [extNotes, setExtNotes] = useState('');

  const registeredCompanies: Company[] = companyProfiles.map((profile) => ({
    id: profile.company_id || profile.owner_id,
    name: profile.company_name || profile.full_name,
    logoColor: 'bg-primary-600',
    address: '', city: 'Entreprise enregistrée', country: 'RDC', phone: '', email: profile.email, taxId: '—',
    sectors: [], productsServices: [], contactPersons: [], docFlowCode: profile.company_id || profile.owner_id,
    status: 'verified', servedZones: [], categories: [],
  }));
  const searchResults = registeredCompanies.filter((c) => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.docFlowCode.toLowerCase().includes(q) ||
      c.sectors.some((s) => s.toLowerCase().includes(q)) ||
      c.categories.some((cat) => cat.toLowerCase().includes(q))
    );
  });

  const handleAddExisting = () => {
    if (!selectedCompany) return;
    const partner: Partner = {
      id: generateId(),
      company: selectedCompany,
      relation,
      status: 'active',
      addedDate: '2026-09-06',
      notes: notes || `Partenaire ${relationBadge[relation].label.toLowerCase()}`,
      favorite,
      isDocFlowMember: true,
    };
    onAdd(partner);
  };

  const handleAddExternal = () => {
    if (!extName.trim()) return;
    const company: Company = {
      id: generateId(),
      name: extName.trim(),
      logoColor: 'bg-ink-600',
      address: extAddress,
      city: extCity || '—',
      country: 'RDC',
      phone: extPhone,
      email: extEmail,
      taxId: extTaxId || '—',
      sectors: extSector ? [extSector] : [],
      productsServices: extProducts ? extProducts.split(',').map((s) => s.trim()).filter(Boolean) : [],
      contactPersons: extContact ? [{ name: extContact, role: 'Contact', email: extEmail, phone: extPhone }] : [],
      docFlowCode: generateDocFlowCode(extName),
      status: 'external',
      servedZones: extCity ? [extCity] : [],
      categories: extSector ? [extSector] : [],
    };
    const partner: Partner = {
      id: generateId(),
      company,
      relation,
      status: 'pending',
      addedDate: '2026-09-06',
      notes: extNotes || 'Fournisseur externe non inscrit sur Registre intelligent.',
      favorite: false,
      isDocFlowMember: false,
    };
    onAdd(partner);
  };

  return (
    <div className="min-h-screen bg-ink-50 animate-fade-in">
      <div className="bg-white border-b border-ink-200/60 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <button onClick={onBack} className="text-xs font-medium text-ink-500 hover:text-primary-600 mb-2">← Retour</button>
          <h1 className="font-display font-bold text-ink-900 text-lg">Ajouter un partenaire</h1>
          <p className="text-xs text-ink-500">Rechercher dans le réseau Registre intelligent ou créer un fournisseur externe</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Method selector */}
        {method === 'choose' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => setMethod('search')} className="p-5 bg-white rounded-2xl shadow-card border border-ink-200/60 hover:border-primary-300 hover:shadow-card-hover transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center shrink-0">
                    <Search className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700">Rechercher dans Registre intelligent</p>
                    <p className="text-xs text-ink-500 mt-0.5">Trouver une entreprise par nom, ville, secteur ou code Registre intelligent</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-300 group-hover:text-primary-500" />
                </div>
              </button>

              <button onClick={() => setMethod('external')} className="p-5 bg-white rounded-2xl shadow-card border border-ink-200/60 hover:border-primary-300 hover:shadow-card-hover transition-all text-left group">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning-50 flex items-center justify-center shrink-0">
                    <ExternalLink className="h-6 w-6 text-warning-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700">Créer un fournisseur externe</p>
                    <p className="text-xs text-ink-500 mt-0.5">Entreprise non inscrite sur Registre intelligent. Vous pourrez l'inviter plus tard.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-ink-300 group-hover:text-primary-500" />
                </div>
              </button>
            </div>

            <div className="p-4 bg-primary-50/50 rounded-xl border border-primary-200/40">
              <div className="flex items-start gap-2">
                <QrCode className="h-4 w-4 text-primary-600 shrink-0 mt-0.5" />
                <p className="text-xs text-ink-500">
                  <strong className="text-primary-700">Astuce :</strong> Le code Registre intelligent (ex: DF-CT-83921) permet de trouver rapidement une entreprise.
                  Saisissez-le dans la recherche pour l'identifier.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search in network */}
        {method === 'search' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setMethod('choose')} className="text-xs font-medium text-ink-500 hover:text-primary-600">← Changer de méthode</button>
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200">
                <Search className="h-4 w-4 text-ink-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nom, ville, secteur ou code Registre intelligent (ex: DF-CT-83921)..."
                  className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
                  autoFocus
                />
              </div>
            </div>

            {!searchQuery && (
              <div className="py-12 text-center">
                <Search className="h-10 w-10 text-ink-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-ink-600">Recherchez une entreprise Registre intelligent</p>
                <p className="text-xs text-ink-400 mt-1">Par nom, ville, secteur d'activité ou code Registre intelligent</p>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-ink-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-ink-600">Aucune entreprise trouvée</p>
                <p className="text-xs text-ink-400 mt-1">Essayez un autre terme ou créez un fournisseur externe</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-ink-500">{searchResults.length} entreprise{searchResults.length > 1 ? 's' : ''} trouvée{searchResults.length > 1 ? 's' : ''}</p>
                {searchResults.map((co) => {
                  const alreadyPartner = existingPartners.some((p) => p.company.id === co.id);
                  const isSel = selectedCompany?.id === co.id;
                  const cCfg = statusBadge[co.status];
                  const CatIcon = categoryIconMap[co.categories[0]] || Building2;
                  return (
                    <button
                      key={co.id}
                      onClick={() => setSelectedCompany(isSel ? null : co)}
                      className={`w-full p-4 bg-white rounded-2xl border transition-all text-left ${isSel ? 'border-primary-400 ring-2 ring-primary-200' : 'border-ink-200/60 hover:border-primary-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl ${co.logoColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                          {co.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-ink-800">{co.name}</p>
                            <span className={`inline-flex items-center gap-1 text-[9px] font-semibold ${cCfg.bg} ${cCfg.text} px-1.5 py-0.5 rounded`}>
                              {co.status === 'verified' && <Shield className="h-2.5 w-2.5" />}
                              {cCfg.label}
                            </span>
                            {alreadyPartner && <span className="text-[9px] font-semibold text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded">Déjà partenaire</span>}
                          </div>
                          <p className="text-[10px] font-mono text-ink-400">{co.docFlowCode}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-ink-500">
                            <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {co.city}</span>
                            <span className="flex items-center gap-1"><CatIcon className="h-2.5 w-2.5" /> {co.sectors[0]}</span>
                          </div>
                        </div>
                        {isSel && <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Relation selector + add button */}
            {selectedCompany && (
              <div className="bg-white rounded-2xl shadow-card border border-primary-300 p-5 space-y-4 animate-slide-up">
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-2 block">Quelle relation ?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: 'supplier' as PartnerRelation, label: 'Mon fournisseur', icon: Briefcase },
                      { id: 'customer' as PartnerRelation, label: 'Mon client', icon: ShoppingBag },
                      { id: 'both' as PartnerRelation, label: 'Client et fournisseur', icon: ArrowLeftRight },
                    ]).map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setRelation(r.id)}
                        className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-semibold transition-all ${
                          relation === r.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-primary-300'
                        }`}
                      >
                        <r.icon className="h-4 w-4" />
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Notes internes (optionnel)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex: Fournisseur principal, bons délais..." className="w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400 resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="text-primary-600" />
                  <span className="text-xs text-ink-600 flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning-500" /> Marquer comme favori</span>
                </label>
                <button onClick={handleAddExisting} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" /> Ajouter à mes partenaires
                </button>
              </div>
            )}
          </div>
        )}

        {/* External partner form */}
        {method === 'external' && (
          <div className="space-y-4 animate-fade-in">
            <button onClick={() => setMethod('choose')} className="text-xs font-medium text-ink-500 hover:text-primary-600">← Changer de méthode</button>
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-warning-50 rounded-xl border border-warning-200">
                <ExternalLink className="h-4 w-4 text-warning-600 shrink-0" />
                <p className="text-xs text-warning-800">Ce fournisseur ne sera pas inscrit sur Registre intelligent. Vous pourrez l'inviter plus tard à rejoindre le réseau.</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Nom de l'entreprise *</label>
                <input type="text" value={extName} onChange={(e) => setExtName(e.target.value)} placeholder="Ex: Fournitures Express" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-600 mb-2 block">Quelle relation ?</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'supplier' as PartnerRelation, label: 'Mon fournisseur', icon: Briefcase },
                    { id: 'customer' as PartnerRelation, label: 'Mon client', icon: ShoppingBag },
                    { id: 'both' as PartnerRelation, label: 'Client et fournisseur', icon: ArrowLeftRight },
                  ]).map((r) => (
                    <button key={r.id} onClick={() => setRelation(r.id)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${relation === r.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-ink-50 text-ink-600 border-ink-200 hover:border-primary-300'}`}>
                      <r.icon className="h-4 w-4" /> {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Adresse</label>
                  <input type="text" value={extAddress} onChange={(e) => setExtAddress(e.target.value)} placeholder="Adresse" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Ville</label>
                  <input type="text" value={extCity} onChange={(e) => setExtCity(e.target.value)} placeholder="Ex: Kinshasa" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Téléphone</label>
                  <input type="tel" value={extPhone} onChange={(e) => setExtPhone(e.target.value)} placeholder="+243 ..." className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">E-mail</label>
                  <input type="email" value={extEmail} onChange={(e) => setExtEmail(e.target.value)} placeholder="contact@..." className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Personne de contact</label>
                  <input type="text" value={extContact} onChange={(e) => setExtContact(e.target.value)} placeholder="Nom du contact" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Secteur / Catégorie</label>
                  <input type="text" value={extSector} onChange={(e) => setExtSector(e.target.value)} placeholder="Ex: Informatique" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Produits / Services</label>
                  <input type="text" value={extProducts} onChange={(e) => setExtProducts(e.target.value)} placeholder="Séparés par des virgules" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">N° fiscal / RCCM</label>
                  <input type="text" value={extTaxId} onChange={(e) => setExtTaxId(e.target.value)} placeholder="Identifiant fiscal" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Notes internes</label>
                <textarea value={extNotes} onChange={(e) => setExtNotes(e.target.value)} rows={2} placeholder="Notes sur ce partenaire..." className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400 resize-none" />
              </div>

              <div className="p-3 bg-ink-50 rounded-xl border border-ink-200/60">
                <p className="text-[10px] text-ink-500">Code Registre intelligent généré automatiquement : <span className="font-mono font-bold text-ink-700">{extName ? generateDocFlowCode(extName) : 'DF-XX-XXXXX'}</span></p>
              </div>

              <button onClick={handleAddExternal} disabled={!extName.trim()} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-ink-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                <UserPlus className="h-4 w-4" /> Créer le partenaire externe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== OPPORTUNITIES VIEW ======

function OpportunitiesView({ opportunities, onBack, onSelect }: { opportunities: Opportunity[]; onBack: () => void; onSelect: (o: Opportunity) => void }) {
  const [tab, setTab] = useState<'all' | 'new' | 'submitted' | 'awarded' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const filtered = opportunities.filter((o) => {
    if (tab === 'new' && o.status !== 'new' && o.status !== 'to_answer') return false;
    if (tab === 'submitted' && o.status !== 'submitted') return false;
    if (tab === 'awarded' && o.status !== 'awarded') return false;
    if (tab === 'rejected' && o.status !== 'rejected') return false;
    if (search) {
      const q = search.toLowerCase();
      return o.title.toLowerCase().includes(q) || o.clientName.toLowerCase().includes(q) || o.reference.toLowerCase().includes(q);
    }
    return true;
  });

  const newCount = opportunities.filter((o) => o.status === 'new' || o.status === 'to_answer').length;
  const submittedCount = opportunities.filter((o) => o.status === 'submitted').length;
  const awardedCount = opportunities.filter((o) => o.status === 'awarded').length;
  const rejectedCount = opportunities.filter((o) => o.status === 'rejected').length;

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5">← Retour aux partenaires</button>

      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-ink-900 text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary-600" />
          Opportunités / Demandes reçues
        </h2>
        <p className="text-xs text-ink-500">Les demandes de cotation qui vous sont adressées en tant que fournisseur</p>
      </div>

      {/* Dashboard cards */}
      <div className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
        <DashboardCard icon={Clock} label="À répondre" value={newCount.toString()} color="text-warning-600" bg="bg-warning-50" />
        <DashboardCard icon={Send} label="Offres envoyées" value={submittedCount.toString()} color="text-accent-600" bg="bg-accent-50" />
        <DashboardCard icon={Award} label="Attribuées" value={awardedCount.toString()} color="text-accent-600" bg="bg-accent-100" />
        <DashboardCard icon={X} label="Non retenues" value={rejectedCount.toString()} color="text-ink-600" bg="bg-ink-100" />
      </div>

      {/* Tabs + Search */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4 space-y-3">
        <div className="hidden items-center gap-1 border-b border-ink-100 pb-3 overflow-x-auto scrollbar-thin sm:flex">
          {([
            { id: 'all' as const, label: 'Toutes', count: opportunities.length },
            { id: 'new' as const, label: 'À répondre', count: newCount },
            { id: 'submitted' as const, label: 'Offres envoyées', count: submittedCount },
            { id: 'awarded' as const, label: 'Attribuées', count: awardedCount },
            { id: 'rejected' as const, label: 'Non retenues', count: rejectedCount },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${tab === t.id ? 'bg-primary-600 text-white' : 'text-ink-500 hover:bg-ink-100'}`}>
              {t.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-ink-100'}`}>{t.count}</span>
            </button>
          ))}
        </div>
        <div className="border-b border-ink-100 pb-3 sm:hidden">
          <label htmlFor="opportunity-status-filter" className="sr-only">Filtrer les opportunités</label>
          <select
            id="opportunity-status-filter"
            value={tab}
            onChange={(event) => setTab(event.target.value as typeof tab)}
            className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink-700 outline-none focus:border-primary-400"
          >
            <option value="all">Toutes ({opportunities.length})</option>
            <option value="new">À répondre ({newCount})</option>
            <option value="submitted">Offres envoyées ({submittedCount})</option>
            <option value="awarded">Attribuées ({awardedCount})</option>
            <option value="rejected">Non retenues ({rejectedCount})</option>
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200">
          <Search className="h-4 w-4 text-ink-400 shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par titre, client ou référence..." className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700" />
        </div>
      </div>

      {/* Opportunity list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-12 text-center">
          <Inbox className="h-10 w-10 text-ink-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-600">Aucune opportunité</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((opp) => {
            const cfg = oppStatusConfig[opp.status];
            const daysLeft = Math.ceil((new Date(opp.deadline).getTime() - new Date('2026-09-06').getTime()) / (1000 * 60 * 60 * 24));
            return (
              <button
                key={opp.id}
                onClick={() => onSelect(opp)}
                className="w-full bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl ${opp.clientLogoColor} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                    {opp.clientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-[10px] font-mono text-ink-400">{opp.reference}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 ${cfg.bg} ${cfg.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                      </span>
                      {opp.mode === 'open' && (
                        <span className="inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 bg-primary-50 text-primary-600 border border-primary-200">
                          <TrendingUp className="h-2.5 w-2.5" /> Consultation ouverte
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700">{opp.title}</p>
                    <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{opp.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-ink-500">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {opp.clientName}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(opp.deadline)}</span>
                      <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {opp.products.length} produit{opp.products.length > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {(opp.status === 'new' || opp.status === 'to_answer') && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${daysLeft <= 3 ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'}`}>
                        {daysLeft > 0 ? `${daysLeft}j restants` : 'Clôturé'}
                      </span>
                    )}
                    {opp.status === 'submitted' && opp.submittedAmount && (
                      <div>
                        <p className="text-sm font-bold text-accent-700">{formatCurrency(opp.submittedAmount, opp.currency)}</p>
                        <p className="text-[9px] text-ink-400">Votre offre</p>
                      </div>
                    )}
                    {opp.status === 'awarded' && opp.awardAmount && (
                      <div>
                        <p className="text-sm font-bold text-accent-700 flex items-center gap-1 justify-end"><Award className="h-3.5 w-3.5" /> {formatCurrency(opp.awardAmount, opp.currency)}</p>
                        <p className="text-[9px] text-accent-600">Contrat attribué</p>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500 mt-2 ml-auto" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====== OPPORTUNITY DETAIL ======

function OpportunityDetail({ opp, folders, companyProfiles, onBack, onSubmit }: { opp: Opportunity; folders: Folder[]; companyProfiles: { owner_id: string; full_name: string; email: string; role_label: string }[]; onBack: () => void; onSubmit: () => void }) {
  const cfg = oppStatusConfig[opp.status];
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [warranty, setWarranty] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [availability, setAvailability] = useState<'yes' | 'no' | ''>('');
  const [showTask, setShowTask] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);

  const canSubmit = opp.products.every((_, i) => productPrices[`p${i}`]);

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1000px] mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5">← Retour aux opportunités</button>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 rounded-2xl ${opp.clientLogoColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {opp.clientName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono text-ink-400">{opp.reference}</span>
              <span className={`inline-flex items-center gap-1 rounded-full font-semibold text-[10px] px-2 py-0.5 ${cfg.bg} ${cfg.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
              </span>
              {opp.mode === 'open' && (
                <span className="inline-flex items-center gap-1 rounded-full font-semibold text-[9px] px-2 py-0.5 bg-primary-50 text-primary-600 border border-primary-200">
                  <TrendingUp className="h-2.5 w-2.5" /> Consultation ouverte
                </span>
              )}
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900">{opp.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {opp.clientName}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Date limite: {formatDate(opp.deadline)}</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-ink-600 leading-relaxed mt-4">{opp.description}</p>
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-ink-100">
          <button onClick={() => setShowTask(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700"><CheckSquare className="h-3.5 w-3.5" /> Créer une tâche</button>
          <FolderPicker folders={folders} selectedFolderId={folderId} onSelect={async (id) => { setFolderId(id); await firestore.from('opportunity_folder_links').insert({ opportunity_id: opp.id, folder_id: id, title: opp.title }); }} onFolderCreated={() => undefined} label="Placer dans un dossier" align="left" />
          <span className="text-[10px] text-ink-400">L’opportunité reste visible dans sa liste originale.</span>
        </div>
      </div>

      {/* Products */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <h2 className="font-display font-bold text-ink-900 text-base mb-4">Produits demandés</h2>
        <div className="space-y-3">
          {opp.products.map((prod, i) => {
            const price = productPrices[`p${i}`];
            const total = price ? parseFloat(price) * prod.quantity : 0;
            return (
              <div key={i} className="p-4 bg-ink-50 rounded-xl border border-ink-200/60">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-800">{prod.name}</p>
                    <p className="text-[10px] text-ink-500">Qté: {prod.quantity} · {prod.specifications}</p>
                  </div>
                  {opp.status === 'to_answer' || opp.status === 'new' ? (
                    <div className="grid grid-cols-2 gap-2 w-64">
                      <div>
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Prix unitaire *</label>
                        <input type="number" value={price || ''} onChange={(e) => setProductPrices({ ...productPrices, [`p${i}`]: e.target.value })} placeholder="0.00" className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Prix total</label>
                        <div className="px-2 py-1.5 bg-primary-50 rounded-lg border border-primary-200 text-sm font-bold text-primary-700">{price ? formatCurrency(total, opp.currency) : '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-right">
                      {opp.submittedAmount && <p className="text-sm font-bold text-accent-700">{formatCurrency(opp.submittedAmount, opp.currency)}</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Commercial conditions (only if to_answer) */}
      {(opp.status === 'to_answer' || opp.status === 'new') && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4">
          <h2 className="font-display font-bold text-ink-900 text-base">Conditions commerciales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Garantie proposée</label>
              <input type="text" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="Ex: 24 mois" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Délai de livraison (jours)</label>
              <input type="number" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} placeholder="Ex: 15" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Conditions de paiement</label>
              <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ex: 50% à la commande, 50% à la livraison" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Disponibilité</label>
              <div className="flex gap-2">
                {[
                  { val: 'yes' as const, label: 'Disponible' },
                  { val: 'no' as const, label: 'Sur commande' },
                ].map((opt) => (
                  <button key={opt.val} onClick={() => setAvailability(opt.val)} className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${availability === opt.val ? (opt.val === 'yes' ? 'bg-accent-50 border-accent-300 text-accent-700' : 'bg-warning-50 border-warning-300 text-warning-700') : 'bg-ink-50 border-ink-200 text-ink-600 hover:border-primary-300'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-ink-50 rounded-xl border border-ink-200/60">
            <p className="text-[10px] text-ink-500 mb-2">Joindre votre facture proforma (PDF, max 10 Mo)</p>
            <div className="px-4 py-6 bg-white rounded-xl border-2 border-dashed border-ink-300 text-center cursor-pointer hover:border-primary-400 transition-colors">
              <FileText className="h-6 w-6 text-ink-400 mx-auto mb-2" />
              <p className="text-xs text-ink-500">Cliquez pour ajouter votre proforma</p>
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent-500 to-accent-600 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg hover:shadow-accent-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" /> Soumettre mon offre
          </button>
          {!canSubmit && <p className="text-[10px] text-danger-600 text-center">Veuillez renseigner le prix unitaire de chaque produit.</p>}
        </div>
      )}

      {/* If already submitted */}
      {opp.status === 'submitted' && (
        <div className="bg-accent-50 rounded-2xl border border-accent-200 p-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="h-6 w-6 text-accent-600" />
          </div>
          <p className="text-sm font-bold text-accent-800">Offre soumise le {opp.submittedDate && formatDate(opp.submittedDate)}</p>
          {opp.submittedAmount && <p className="text-lg font-display font-bold text-accent-700 mt-1">{formatCurrency(opp.submittedAmount, opp.currency)}</p>}
          <p className="text-xs text-ink-500 mt-2">Votre offre est en cours d'analyse par le client. Vous serez notifié du résultat.</p>
        </div>
      )}

      {opp.status === 'awarded' && (
        <div className="bg-gradient-to-br from-accent-500 to-accent-700 rounded-2xl p-6 text-white text-center shadow-xl">
          <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-3">
            <Award className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-bold">Contrat attribué !</p>
          {opp.awardAmount && <p className="text-2xl font-display font-bold mt-1">{formatCurrency(opp.awardAmount, opp.currency)}</p>}
          <p className="text-xs text-white/80 mt-2">Félicitations, votre offre a été retenue par {opp.clientName}.</p>
        </div>
      )}

      {opp.status === 'rejected' && (
        <div className="bg-ink-50 rounded-2xl border border-ink-200 p-6 text-center">
          <div className="h-12 w-12 rounded-xl bg-ink-100 flex items-center justify-center mx-auto mb-3">
            <X className="h-6 w-6 text-ink-400" />
          </div>
          <p className="text-sm font-bold text-ink-600">Offre non retenue</p>
          <p className="text-xs text-ink-400 mt-1">Le client a choisi une autre offre. Vous retrouverez les opportunités disponibles dans votre espace.</p>
        </div>
      )}
      {showTask && <CreateTaskModal companyProfiles={companyProfiles} sourceDocument={{ id: opp.id, title: opp.title }} onClose={() => setShowTask(false)} onCreated={() => undefined} />}
    </div>
  );
}

// ====== SHARED COMPONENTS ======

function DashboardCard({ icon: Icon, label, value, color, bg }: { icon: typeof Users; label: string; value: string; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-200/60 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-ink-900 leading-none">{value}</p>
        <p className="text-xs text-ink-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
