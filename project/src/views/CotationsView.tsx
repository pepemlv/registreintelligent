import { useEffect, useRef, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Sparkles,
  FileText,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Link2,
  Send,
  Award,
  Package,
  Laptop,
  Car,
  HardHat,
  Briefcase,
  Truck,
  Printer,
  ArrowRight,
  Bot,
  Eye,
  Download,
  Trash2,
  Type,
  AlignLeft,
  Hash,
  DollarSign,
  CalendarDays,
  ToggleLeft,
  ListOrdered,
  ChevronDown as ChevronDownIcon,
  Percent,
  Paperclip,
  Image,
  Link as LinkIcon,
  Table,
  GripVertical,
  Upload,
  CheckSquare,
} from 'lucide-react';
import { rfqTemplates } from '@/data';
import { formatDate, formatCurrency } from '@/lib/documentConfig';
import type { RFQ, RFQTemplate, RFQStatus, RFQProductLine, RFQFormField, FieldType } from '@/types';
import { analyzeDocumentFile } from '@/lib/ai';
import { firestore, getActiveCompanyContext } from '@/lib/firebase';
import type { Folder } from '@/lib/types';
import CreateTaskModal from '@/components/CreateTaskModal';
import FolderPicker from '@/components/FolderPicker';
import { BUSINESS_CATEGORIES } from '@/lib/businessCategories';
import { isDrc } from '@/lib/geo';

const statusConfig: Record<RFQStatus, { label: string; bg: string; text: string; dot: string }> = {
  draft: { label: 'Brouillon', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
  published: { label: 'Publié', bg: 'bg-primary-100', text: 'text-primary-700', dot: 'bg-primary-500' },
  open: { label: 'Ouvert', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
  closing: { label: 'Clôture imminente', bg: 'bg-warning-100', text: 'text-warning-700', dot: 'bg-warning-500' },
  closed: { label: 'Clôturé', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
  awarded: { label: 'Attribué', bg: 'bg-accent-100', text: 'text-accent-700', dot: 'bg-accent-500' },
};

const templateIconMap: Record<string, typeof Package> = {
  Package, Laptop, Car, HardHat, Briefcase, Truck, Printer,
};

const fieldTypeConfig: Record<FieldType, { label: string; icon: typeof Type }> = {
  text: { label: 'Texte court', icon: Type },
  textarea: { label: 'Texte long', icon: AlignLeft },
  number: { label: 'Nombre', icon: Hash },
  currency: { label: 'Montant / Devise', icon: DollarSign },
  date: { label: 'Date', icon: CalendarDays },
  boolean: { label: 'Oui / Non', icon: ToggleLeft },
  radio: { label: 'Choix multiple', icon: ListOrdered },
  select: { label: 'Liste déroulante', icon: ChevronDownIcon },
  quantity: { label: 'Quantité', icon: Hash },
  percentage: { label: 'Pourcentage', icon: Percent },
  file: { label: 'Fichier / PDF', icon: Paperclip },
  photo: { label: 'Photo', icon: Image },
  url: { label: 'URL', icon: LinkIcon },
  product_table: { label: 'Tableau de produits', icon: Table },
};

const allFieldTypes = Object.keys(fieldTypeConfig) as FieldType[];

const pipelineSteps = [
  'Besoin', 'Formulaire', 'Publication', 'Lien fournisseurs', 'Soumissions',
  'Proformas', 'Analyse IA', 'Dépouillement', 'Comparaison', 'Recommandation',
  'Validation', 'Attribution', 'Archivage',
];

const defaultScoringCriteria = [
  { label: 'Prix', weight: 30 },
  { label: 'Délai de livraison', weight: 20 },
  { label: 'Conformité technique', weight: 25 },
  { label: 'Garantie', weight: 10 },
  { label: 'Conditions de paiement', weight: 10 },
  { label: 'Disponibilité', weight: 5 },
];

const aiFieldPresets: Record<string, { label: string; type: FieldType; required?: boolean; options?: string[] }[]> = {
  laptop: [
    { label: 'Quantité', type: 'number', required: true },
    { label: 'Marque proposée', type: 'text' },
    { label: 'Processeur', type: 'text', required: true },
    { label: 'RAM', type: 'text', required: true },
    { label: 'Stockage', type: 'text', required: true },
    { label: 'Système d\'exploitation', type: 'text' },
    { label: 'Garantie', type: 'radio', required: true, options: ['6 mois', '12 mois', '24 mois', 'Autre'] },
    { label: 'Prix unitaire', type: 'currency', required: true },
    { label: 'Prix total', type: 'currency', required: true },
    { label: 'Disponibilité', type: 'boolean', required: true },
    { label: 'Délai de livraison', type: 'number', required: true },
    { label: 'Conditions de paiement', type: 'textarea', required: true },
  ],
  vehicule: [
    { label: 'Kilométrage mensuel inclus', type: 'number', required: true },
    { label: 'Chauffeur inclus ?', type: 'boolean', required: true },
    { label: 'Tarif mensuel par véhicule', type: 'currency', required: true },
    { label: 'Assurance incluse ?', type: 'radio', required: true, options: ['Oui, tous risques', 'Oui, au tiers', 'Non'] },
    { label: 'Délai de mise à disposition', type: 'number', required: true },
    { label: 'Conditions de paiement', type: 'textarea', required: true },
  ],
  nettoyage: [
    { label: 'Nombre d\'agents proposés', type: 'number', required: true },
    { label: 'Produits et équipements fournis', type: 'textarea', required: true },
    { label: 'Coût mensuel proposé', type: 'currency', required: true },
    { label: 'Fréquence des prestations', type: 'select', required: true, options: ['Quotidien', '2x/semaine', 'Hebdomadaire'] },
    { label: 'Disponibilité', type: 'boolean', required: true },
  ],
  bureau: [
    { label: 'Marque proposée', type: 'text' },
    { label: 'Prix unitaire', type: 'currency', required: true },
    { label: 'Prix total', type: 'currency', required: true },
    { label: 'Disponibilité', type: 'boolean', required: true },
    { label: 'Délai de livraison', type: 'number', required: true },
    { label: 'Conditions de paiement', type: 'textarea', required: true },
  ],
};

function detectAIContext(prompt: string): keyof typeof aiFieldPresets {
  const p = prompt.toLowerCase();
  if (p.includes('laptop') || p.includes('ordinateur') || p.includes('pc') || p.includes('informatique')) return 'laptop';
  if (p.includes('véhicule') || p.includes('vehicule') || p.includes('voiture') || p.includes('location')) return 'vehicule';
  if (p.includes('nettoyage') || p.includes('cleaning')) return 'nettoyage';
  if (p.includes('bureau') || p.includes('fourniture') || p.includes('papeterie') || p.includes('imprimante') || p.includes('photocopieuse') || p.includes('copieur')) return 'bureau';
  return 'bureau';
}

function detectAIProducts(prompt: string): { product: string; quantity: number; specifications: string }[] {
  const source = prompt.trim();
  const lower = source.toLocaleLowerCase('fr-FR');
  const numberWords: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10 };
  const knownProducts = [
    { pattern: /laptops?|ordinateurs?(?: portables?)?|pc(?:s)?/i, label: 'Ordinateur' },
    { pattern: /imprimantes?/i, label: 'Imprimante' },
    { pattern: /photocopieuses?|copieurs?/i, label: 'Photocopieuse' },
    { pattern: /[ée]crans?/i, label: 'Écran' },
    { pattern: /v[ée]hicules?|voitures?/i, label: 'Véhicule' },
    { pattern: /ramettes?|papier/i, label: 'Papier' },
  ];

  return knownProducts
    .map(({ pattern, label }) => {
      const match = pattern.exec(source);
      if (!match) return null;
      const before = lower.slice(Math.max(0, match.index - 18), match.index);
      const quantityMatch = before.match(/(?:^|\s)(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s*$/i);
      const rawQuantity = quantityMatch?.[1];
      const quantity = rawQuantity ? (numberWords[rawQuantity.toLowerCase()] ?? Number(rawQuantity)) : 1;
      return { product: label, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1, specifications: '', position: match.index };
    })
    .filter((product): product is { product: string; quantity: number; specifications: string; position: number } => Boolean(product))
    .sort((a, b) => a.position - b.position)
    .map(({ position: _position, ...product }) => product);
}

function generateReference(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `RFQ-2026-${num}`;
}

function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

interface CotationsProps { companyProfiles?: { owner_id: string; full_name: string; email: string; role_label: string }[]; folders?: Folder[]; }

export function CotationsView({ companyProfiles = [], folders = [] }: CotationsProps) {
  const [rfqList, setRfqList] = useState<RFQ[]>([]);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [showAICreate, setShowAICreate] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createInitial, setCreateInitial] = useState<{
    title?: string;
    description?: string;
    products?: { product: string; quantity: number; specifications: string }[];
    fields?: { label: string; type: FieldType; required?: boolean; options?: string[] }[];
  } | null>(null);
  const [search, setSearch] = useState('');
  const [analyzingTender, setAnalyzingTender] = useState(false);
  const [tenderError, setTenderError] = useState('');
  const tenderInputRef = useRef<HTMLInputElement>(null);

  const handleTenderUpload = async (file: File | undefined) => {
    if (!file) return;
    setAnalyzingTender(true);
    setTenderError('');
    try {
      const result = await analyzeDocumentFile(file);
      const products = detectAIProducts(`${result.title} ${result.content_text} ${result.summary}`);
      const fields = aiFieldPresets[detectAIContext(`${result.title} ${result.content_text}`)] || aiFieldPresets.laptop;
      setCreateInitial({ title: result.title, description: result.summary || result.content_text.slice(0, 1000), products, fields });
      setShowCreateForm(true);
    } catch (error) {
      setTenderError(error instanceof Error ? error.message : 'Impossible d’analyser cet appel d’offre.');
    } finally {
      setAnalyzingTender(false);
    }
  };

  if (showSupplierForm && selectedRFQ) {
    return <SupplierForm rfq={selectedRFQ} onBack={() => setShowSupplierForm(false)} />;
  }

  if (selectedRFQ) {
    return <RFQDetail rfq={selectedRFQ} folders={folders} companyProfiles={companyProfiles} onBack={() => setSelectedRFQ(null)} onShowSupplierForm={() => setShowSupplierForm(true)} />;
  }

  if (showCreateForm) {
    return (
      <CreateRFQForm
        initial={createInitial}
        supplierProfiles={companyProfiles}
        onBack={() => { setShowCreateForm(false); setCreateInitial(null); }}
        onCreate={(rfq) => {
          setRfqList([rfq, ...rfqList]);
          // FirestoreBuilder only runs its query when `.then()` is actually invoked (it's
          // lazily-executed, unlike a real Promise) — a bare `void builder.insert(...)`
          // never calls `.then()`, so the write would silently never happen without this.
          void firestore.from('rfqs').insert({ ...rfq, status: rfq.status === 'draft' ? 'draft' : 'active' }).then(() => undefined);
          setShowCreateForm(false);
          setCreateInitial(null);
          setSelectedRFQ(rfq);
        }}
      />
    );
  }

  const handleAIGenerate = (prompt: string, fields: { label: string; type: FieldType; required?: boolean; options?: string[] }[], products: { product: string; quantity: number; specifications: string }[]) => {
    setShowAICreate(false);
    setCreateInitial({
      title: prompt,
      description: prompt,
      products,
      fields,
    });
    setShowCreateForm(true);
  };

  const filtered = rfqList.filter((rfq) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return rfq.title.toLowerCase().includes(q) || rfq.reference.toLowerCase().includes(q);
  });

  const openCount = rfqList.filter((r) => r.status === 'open' || r.status === 'published').length;
  const closedCount = rfqList.filter((r) => r.status === 'closed' || r.status === 'awarded').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-center sm:text-left">
          <h2 className="font-display font-bold text-ink-900 text-base">Demandes de cotation intelligentes</h2>
          <p className="text-xs text-ink-500">Créez, publiez, recevez les offres et laissez l'IA comparer et recommander</p>
        </div>
        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
          <input ref={tenderInputRef} type="file" accept="application/pdf,image/*,.doc,.docx" onChange={(event) => { void handleTenderUpload(event.target.files?.[0]); event.target.value = ''; }} className="hidden" />
          <button onClick={() => tenderInputRef.current?.click()} disabled={analyzingTender} className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 disabled:opacity-50 transition-colors sm:w-auto">
            <Upload className="h-3.5 w-3.5" /> {analyzingTender ? 'Analyse en cours...' : 'Importer un appel d’offre'}
          </button>
          <button
            onClick={() => setShowAICreate(true)}
            className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Créer avec l'IA
          </button>
          <button
            onClick={() => { setCreateInitial(null); setShowCreateForm(true); }}
            className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors sm:w-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer manuellement
          </button>
        </div>
      </div>
      {tenderError && <div className="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">{tenderError}</div>}

      <section className="hidden rounded-2xl border border-primary-200/60 bg-gradient-to-r from-primary-50 to-accent-50/50 p-5 sm:block">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center shrink-0"><ShoppingCart className="h-5 w-5 text-white" /></div>
          <div>
            <h2 className="text-base font-bold text-ink-900">Présentation des achats</h2>
            <p className="text-sm text-ink-600 mt-1 max-w-3xl">Suivez chaque demande de cotation depuis l’état de besoin jusqu’à la comparaison des offres et à l’attribution. Les fournisseurs, prix, proformas, délais et décisions restent visibles et traçables dans un même espace.</p>
          </div>
        </div>
      </section>

      <div className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-4">
        <SummaryCard icon={ShoppingCart} label="Total demandes" value={rfqList.length.toString()} color="text-primary-600" bg="bg-primary-50" />
        <SummaryCard icon={Clock} label="En cours" value={openCount.toString()} color="text-accent-600" bg="bg-accent-50" />
        <SummaryCard icon={CheckCircle2} label="Clôturées" value={closedCount.toString()} color="text-ink-600" bg="bg-ink-100" />
        <SummaryCard icon={Users} label="Soumissions reçues" value={rfqList.reduce((acc, r) => acc + r.submissions.length, 0).toString()} color="text-warning-600" bg="bg-warning-50" />
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200">
          <Search className="h-4 w-4 text-ink-400 shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par titre ou référence..." className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((rfq) => {
          const cfg = statusConfig[rfq.status];
          const submissionCount = rfq.submissions.length;
          const daysLeft = Math.ceil((new Date(rfq.deadline).getTime() - new Date('2026-09-06').getTime()) / (1000 * 60 * 60 * 24));
          return (
            <button key={rfq.id} onClick={() => setSelectedRFQ(rfq)} className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary-600" />
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-[10px] px-2 py-1 ${cfg.bg} ${cfg.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </div>
              <p className="text-[10px] font-mono text-ink-400 mb-1">{rfq.reference}</p>
              <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700 mb-2">{rfq.title}</p>
              <p className="text-xs text-ink-500 line-clamp-2 mb-3">{rfq.description}</p>
              <div className="flex items-center gap-3 text-[10px] text-ink-500 mb-3">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(rfq.deadline)}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {rfq.deliveryLocation}</span>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-ink-100">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-ink-600">
                    <Users className="h-3 w-3" /> {submissionCount} soumission{submissionCount > 1 ? 's' : ''}
                  </span>
                  {rfq.products.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-500">
                      <Package className="h-3 w-3" /> {rfq.products.length} produit{rfq.products.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {rfq.status === 'open' || rfq.status === 'published' ? (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${daysLeft <= 3 ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'}`}>
                    {daysLeft > 0 ? `${daysLeft}j restants` : 'Clôturé'}
                  </span>
                ) : rfq.status === 'awarded' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-accent-700">
                    <Award className="h-3 w-3" /> Attribué
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-primary-50 to-accent-50/40 rounded-2xl border border-primary-200/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-ink-800">Processus complet d'achat</span>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {pipelineSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[10px] font-medium px-2 py-1 bg-white rounded-lg border border-ink-200/60 text-ink-700">{step}</span>
              {i < pipelineSteps.length - 1 && <ArrowRight className="h-3 w-3 text-ink-300" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-500 mt-3">Tout reste connecté à votre coeur documentaire : les demandes, offres, proformas, échanges, validations et décisions deviennent automatiquement un dossier archivé et traçable.</p>
      </div>

      {showAICreate && (
        <AICreateModal onClose={() => setShowAICreate(false)} onGenerate={handleAIGenerate} />
      )}
    </div>
  );
}

function RFQDetail({ rfq, folders, companyProfiles, onBack, onShowSupplierForm }: { rfq: RFQ; folders: Folder[]; companyProfiles: { owner_id: string; full_name: string; email: string; role_label: string }[]; onBack: () => void; onShowSupplierForm: () => void }) {
  const [showTask, setShowTask] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const sortedSubs = [...rfq.submissions].sort((a, b) => (b.score || 0) - (a.score || 0));
  const recommended = rfq.submissions.find((s) => s.id === rfq.aiRecommendedSupplierId);
  const cfg = statusConfig[rfq.status];

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-ink-600 hover:text-primary-600 flex items-center gap-1.5">← Retour aux demandes</button>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-ink-400">{rfq.reference}</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-[10px] px-2 py-0.5 ${cfg.bg} ${cfg.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
              </span>
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900">{rfq.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-ink-500">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Date limite: {formatDate(rfq.deadline)}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {rfq.deliveryLocation}</span>
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Créé par {rfq.createdBy}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Copier le lien
            </button>
            {(rfq.status === 'open' || rfq.status === 'published') && (
              <button onClick={onShowSupplierForm} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" /> Vue fournisseur
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-ink-600 leading-relaxed mt-4">{rfq.description}</p>
        {rfq.hasAttachment && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
            <FileText className="h-4 w-4 text-primary-600" />
            <span className="text-xs font-medium text-primary-700">{rfq.attachmentName}</span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-ink-100">
          <button onClick={() => setShowTask(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700"><CheckSquare className="h-3.5 w-3.5" /> Créer une tâche</button>
          <FolderPicker folders={folders} selectedFolderId={folderId} onSelect={async (id) => { setFolderId(id); await firestore.from('rfq_folder_links').insert({ rfq_id: rfq.id, folder_id: id, title: rfq.title }); }} onFolderCreated={() => undefined} label="Placer dans un dossier" align="left" />
          <span className="text-[10px] text-ink-400">La demande reste visible dans la liste originale.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {rfq.products.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100">
                <h2 className="font-display font-bold text-ink-900 text-base">Produits / Services demandés</h2>
                <p className="text-xs text-ink-500">Certaines colonnes sont définies par l'entreprise, d'autres par le fournisseur</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-3">Produit</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Qté</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3 hidden sm:table-cell">Spécifications</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Prix unit.</th>
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Prix total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {rfq.products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-ink-50/50 transition-colors">
                        <td className="px-5 py-3"><span className="text-sm font-medium text-ink-800">{prod.product}</span></td>
                        <td className="px-3 py-3"><span className="text-sm text-ink-700">{prod.quantity}</span></td>
                        <td className="px-3 py-3 hidden sm:table-cell"><span className="text-xs text-ink-600">{prod.specifications}</span></td>
                        <td className="px-3 py-3"><span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">Fournisseur</span></td>
                        <td className="px-3 py-3"><span className="text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">Auto</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rfq.submissions.length >= 2 && (
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary-600" />
                <div>
                  <h2 className="font-display font-bold text-ink-900 text-base">Tableau de dépouillement automatique</h2>
                  <p className="text-xs text-ink-500">Comparaison structurée des offres reçues</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/50">
                      <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-3">Critère</th>
                      {sortedSubs.map((sub) => (
                        <th key={sub.id} className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className={`h-5 w-5 rounded-full ${sub.supplierAvatarColor} flex items-center justify-center text-white text-[8px] font-bold`}>
                              {sub.supplierName.slice(0, 2).toUpperCase()}
                            </div>
                            {sub.supplierName}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    <ComparisonRow label="Prix" values={sortedSubs.map((s) => ({ value: formatCurrency(s.totalAmount, s.currency), highlight: s.id === rfq.aiRecommendedSupplierId }))} />
                    <ComparisonRow label="Livraison" values={sortedSubs.map((s) => ({ value: `${s.deliveryDays} j`, highlight: s.id === rfq.aiRecommendedSupplierId }))} />
                    <ComparisonRow label="Garantie" values={sortedSubs.map((s) => ({ value: s.warranty, highlight: s.id === rfq.aiRecommendedSupplierId }))} />
                    <ComparisonRow label="Paiement" values={sortedSubs.map((s) => ({ value: s.paymentTerms, highlight: s.id === rfq.aiRecommendedSupplierId }))} />
                    <ComparisonRow label="Disponibilité" values={sortedSubs.map((s) => ({ value: s.availability ? 'Oui' : 'Non', highlight: s.id === rfq.aiRecommendedSupplierId }))} />
                    <ComparisonRow label="Conforme technique" values={sortedSubs.map((s) => ({ value: `${s.technicalConformity}%`, highlight: s.id === rfq.aiRecommendedSupplierId, color: s.technicalConformity === 100 ? 'text-accent-600' : s.technicalConformity >= 90 ? 'text-ink-700' : 'text-warning-600' }))} />
                    <ComparisonRow label="Documents" values={sortedSubs.map((s) => ({ value: s.documentsComplete ? 'OK' : 'Incomplet', highlight: s.id === rfq.aiRecommendedSupplierId, color: s.documentsComplete ? 'text-accent-600' : 'text-warning-600' }))} />
                    <ComparisonRow label="Score" values={sortedSubs.map((s) => ({ value: `${s.score}/100`, highlight: s.id === rfq.aiRecommendedSupplierId, bold: true, color: s.id === rfq.aiRecommendedSupplierId ? 'text-accent-600' : 'text-ink-700' }))} />
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rfq.submissions.filter((s) => s.hasDiscrepancy).length > 0 && (
            <div className="bg-danger-50 rounded-2xl border border-danger-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-danger-600" />
                <h3 className="text-sm font-bold text-danger-800">Incohérences détectées par l'IA</h3>
              </div>
              {rfq.submissions.filter((s) => s.hasDiscrepancy).map((s) => (
                <div key={s.id} className="p-3 bg-white rounded-xl border border-danger-200 mb-2">
                  <p className="text-xs font-semibold text-ink-800 mb-1">{s.supplierName}</p>
                  <p className="text-xs text-danger-700">{s.discrepancyDetail}</p>
                  <p className="text-[10px] text-ink-500 mt-1">Vérification recommandée.</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
              <h2 className="font-display font-bold text-ink-900 text-base">Soumissions reçues</h2>
              <p className="text-xs text-ink-500">{rfq.submissions.length} offre{rfq.submissions.length > 1 ? 's' : ''} reçue{rfq.submissions.length > 1 ? 's' : ''}</p>
            </div>
            {rfq.submissions.length === 0 ? (
              <div className="py-12 text-center">
                <Send className="h-10 w-10 text-ink-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-ink-600">Aucune soumission pour l'instant</p>
                <p className="text-xs text-ink-400 mt-1">Les fournisseurs peuvent soumettre via le lien partagé</p>
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {sortedSubs.map((sub, i) => (
                  <div key={sub.id} className="px-5 py-4 hover:bg-ink-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full ${sub.supplierAvatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                        {sub.supplierName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-800">{sub.supplierName}</p>
                          {i === 0 && rfq.aiRecommendedSupplierId === sub.id && (
                            <span className="text-[9px] font-bold text-accent-700 bg-accent-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Award className="h-2.5 w-2.5" /> Recommandé
                            </span>
                          )}
                          {sub.hasDiscrepancy && (
                            <span className="text-[9px] font-bold text-danger-700 bg-danger-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Incohérence
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] text-ink-500">
                          <span>Montant: <strong className="text-ink-700">{formatCurrency(sub.totalAmount, sub.currency)}</strong></span>
                          <span>Livraison: <strong className="text-ink-700">{sub.deliveryDays}j</strong></span>
                          <span>Garantie: <strong className="text-ink-700">{sub.warranty}</strong></span>
                          <span>Conformité: <strong className="text-ink-700">{sub.technicalConformity}%</strong></span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {sub.score && <div className={`text-2xl font-display font-bold ${i === 0 && rfq.aiRecommendedSupplierId === sub.id ? 'text-accent-600' : 'text-ink-700'}`}>{sub.score}</div>}
                        <p className="text-[9px] text-ink-400">/ 100</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {recommended && (
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-300">Recommandation IA</span>
                </div>
                <p className="text-lg font-display font-bold mb-2">{recommended.supplierName}</p>
                <p className="text-xs text-white/80 leading-relaxed mb-4">{rfq.aiRecommendationReason}</p>
                <div className="space-y-2">
                  <button className="w-full py-2 rounded-xl bg-white text-primary-700 text-xs font-bold hover:bg-primary-50 transition-colors flex items-center justify-center gap-1.5">
                    <Award className="h-3.5 w-3.5" /> Approuver la recommandation
                  </button>
                  <button className="w-full py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">Choisir une autre offre</button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
              <h3 className="font-display font-bold text-ink-900 text-sm">Critères de scoring</h3>
            </div>
            <div className="p-4 space-y-3">
              {rfq.scoringCriteria.map((crit) => (
                <div key={crit.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-ink-700">{crit.label}</span>
                    <span className="text-xs font-bold text-ink-600">{crit.weight}%</span>
                  </div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" style={{ width: `${crit.weight}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
              <h3 className="font-display font-bold text-ink-900 text-sm">Formulaire personnalisé</h3>
              <p className="text-[10px] text-ink-500">{rfq.formFields.length} questions pour les fournisseurs</p>
            </div>
            <div className="p-4 space-y-2">
              {rfq.formFields.map((field, i) => (
                <div key={field.id} className="p-3 bg-ink-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-xs font-medium text-ink-800 flex-1">{field.label}</span>
                    {field.required && <span className="text-[9px] font-bold text-danger-600">Obligatoire</span>}
                  </div>
                  <span className="text-[9px] text-ink-400 uppercase tracking-wide">{field.type.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {showTask && <CreateTaskModal companyProfiles={companyProfiles} sourceDocument={{ id: rfq.id, title: rfq.title }} onClose={() => setShowTask(false)} onCreated={() => undefined} />}
    </div>
  );
}

function ComparisonRow({ label, values }: { label: string; values: { value: string; highlight?: boolean; color?: string; bold?: boolean }[] }) {
  return (
    <tr className="hover:bg-ink-50/30 transition-colors">
      <td className="px-5 py-3"><span className="text-xs font-semibold text-ink-700">{label}</span></td>
      {values.map((v, i) => (
        <td key={i} className={`px-3 py-3 ${v.highlight ? 'bg-accent-50/40' : ''}`}>
          <span className={`text-xs ${v.bold ? 'font-bold' : 'font-medium'} ${v.color || 'text-ink-700'}`}>{v.value}</span>
        </td>
      ))}
    </tr>
  );
}

// ====== CREATE RFQ FORM (full page form builder) ======

interface CreateRFQFormProps {
  initial: {
    title?: string;
    description?: string;
    products?: { product: string; quantity: number; specifications: string }[];
    fields?: { label: string; type: FieldType; required?: boolean; options?: string[] }[];
  } | null;
  onBack: () => void;
  onCreate: (rfq: RFQ) => void;
  supplierProfiles: { owner_id: string; full_name: string; email: string; role_label: string; company_id?: string; company_name?: string }[];
}

function CreateRFQForm({ initial, onBack, onCreate, supplierProfiles }: CreateRFQFormProps) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initial?.title || '');
  const [reference] = useState(generateReference());
  const [deadline, setDeadline] = useState('2026-09-30');
  const [deliveryLocation, setDeliveryLocation] = useState('Kinshasa');
  const [supplierScope, setSupplierScope] = useState<'local' | 'national'>('local');
  const [supplierCategory, setSupplierCategory] = useState<'prime' | 'fabricant' | 'revendeur' | 'prestataire' | 'sous_traitant'>('prime');
  const [companyIsDrc, setCompanyIsDrc] = useState(true);
  const [visibility, setVisibility] = useState<'all' | 'category' | 'specific'>('all');
  const [visibilityCategories, setVisibilityCategories] = useState<string[]>([]);
  const [visibilitySupplierIds, setVisibilitySupplierIds] = useState<string[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [description, setDescription] = useState(initial?.description || '');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [products, setProducts] = useState<RFQProductLine[]>(
    (initial?.products || []).map((p) => ({ id: generateId(), product: p.product, quantity: p.quantity, specifications: p.specifications, supplierFilled: true }))
  );
  const [formFields, setFormFields] = useState<RFQFormField[]>(
    (initial?.fields || []).map((f) => ({
      id: generateId(),
      type: f.type,
      label: f.label,
      required: f.required || false,
      options: f.options,
    }))
  );
  const [scoringCriteria, setScoringCriteria] = useState(defaultScoringCriteria);

  useEffect(() => {
    const company = getActiveCompanyContext();
    if (!company) return;
    firestore.from<{ country?: string }>('companies').select().eq('id', company.id).single().then(({ data }) => {
      const record = data as { country?: string } | null;
      if (record?.country) setCompanyIsDrc(isDrc(record.country));
    });
  }, []);

  const supplierOptions = supplierProfiles.reduce<{ id: string; name: string; city: string; logoColor: string }[]>((list, profile) => {
    const id = profile.company_id || profile.owner_id;
    const name = profile.company_name || profile.full_name;
    if (!list.some((company) => company.id === id)) list.push({ id, name, city: 'Entreprise enregistrée', logoColor: 'bg-primary-600' });
    return list;
  }, []);
  const supplierSearchResults = supplierOptions.filter((co) => {
    if (!supplierSearch.trim()) return false;
    const q = supplierSearch.toLowerCase();
    return co.name.toLowerCase().includes(q) || co.city.toLowerCase().includes(q);
  });

  const toggleVisibilityCategory = (cat: string) => {
    setVisibilityCategories((current) => current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat]);
  };

  const toggleVisibilitySupplier = (id: string) => {
    setVisibilitySupplierIds((current) => current.includes(id) ? current.filter((c) => c !== id) : [...current, id]);
  };

  const addCriterion = () => {
    setScoringCriteria([...scoringCriteria, { label: 'Nouveau critère', weight: 5 }]);
  };

  const updateCriterion = (index: number, key: 'label' | 'weight', value: string | number) => {
    setScoringCriteria(scoringCriteria.map((c, i) => (i === index ? { ...c, [key]: value } : c)));
  };

  const removeCriterion = (index: number) => {
    setScoringCriteria(scoringCriteria.filter((_, i) => i !== index));
  };

  const steps = ['Informations générales', 'Produits / Services', 'Formulaire', 'Critères', 'Publication'];

  const addProduct = () => {
    setProducts([...products, { id: generateId(), product: '', quantity: 1, specifications: '', supplierFilled: true }]);
  };

  const updateProduct = (id: string, key: keyof RFQProductLine, value: string | number) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const addField = () => {
    setFormFields([...formFields, { id: generateId(), type: 'text', label: '', required: false }]);
  };

  const updateField = (id: string, key: keyof RFQFormField, value: string | boolean | string[] | undefined) => {
    setFormFields(formFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const removeField = (id: string) => {
    setFormFields(formFields.filter((f) => f.id !== id));
  };

  const canPublish = title.trim() && deadline && deliveryLocation.trim();
  const scoringTotal = scoringCriteria.reduce((acc, c) => acc + c.weight, 0);
  const scoringExceeded = scoringTotal > 100;

  const handlePublish = (status: RFQStatus) => {
    const newRFQ: RFQ = {
      id: generateId(),
      reference,
      title: title.trim(),
      status,
      createdBy: 'Pierre Durand',
      createdDate: '2026-09-06',
      deadline,
      deliveryLocation,
      supplierScope,
      supplierCategory,
      visibility,
      visibilityCategories: visibility === 'category' ? visibilityCategories : [],
      visibilitySupplierIds: visibility === 'specific' ? visibilitySupplierIds : [],
      description: description.trim() || title.trim(),
      hasAttachment,
      attachmentName: hasAttachment ? attachmentName || 'Cahier-des-charges.pdf' : undefined,
      products,
      formFields,
      submissions: [],
      scoringCriteria,
    };
    onCreate(newRFQ);
  };

  return (
    <div className="min-h-screen bg-ink-50 animate-fade-in">
      <div className="bg-white border-b border-ink-200/60 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button onClick={onBack} className="text-xs font-medium text-ink-500 hover:text-primary-600 mb-2">← Retour</button>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] font-mono text-ink-400">{reference}</span>
          </div>
          <h1 className="font-display font-bold text-ink-900 text-lg">Nouvelle demande de cotation</h1>
          <div className="flex items-center gap-1 mt-4 overflow-x-auto scrollbar-thin pb-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    i === step ? 'bg-primary-600 text-white' : i < step ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold">
                    {i < step ? '✓' : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </button>
                {i < steps.length - 1 && <span className="text-ink-300 text-[10px]">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Step 0: General info */}
        {step === 0 && (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4 animate-fade-in">
            <h2 className="font-display font-bold text-ink-900 text-base">1 — Informations générales</h2>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Titre *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Fourniture d'ordinateurs portables" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Référence</label>
                <input type="text" value={reference} disabled className="w-full px-3 py-2.5 bg-ink-100 rounded-xl border border-ink-200 text-sm text-ink-500 font-mono" />
              </div>
              <div>
                <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Date limite *</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Lieu de livraison *</label>
              <input type="text" value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} placeholder="Ex: Kinshasa" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Description du besoin</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Décrivez votre besoin en détail..." className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Cahier des charges (optionnel)</label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 cursor-pointer hover:bg-primary-50 hover:border-primary-300 transition-colors">
                  <input type="checkbox" checked={hasAttachment} onChange={(e) => setHasAttachment(e.target.checked)} className="text-primary-600" />
                  <Paperclip className="h-3.5 w-3.5 text-ink-400" />
                  <span className="text-xs text-ink-600">Joindre un fichier</span>
                </label>
                {hasAttachment && (
                  <input type="text" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Nom du fichier (ex: Cahier-des-charges.pdf)" className="flex-1 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Products */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-ink-900 text-base">2 — Produits / Services</h2>
                <p className="text-xs text-ink-500">Ajoutez autant de lignes que nécessaire</p>
              </div>
              <button onClick={addProduct} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
              </button>
            </div>
            {products.length === 0 ? (
              <div className="py-8 text-center">
                <Package className="h-8 w-8 text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500">Aucun produit ajouté. Cliquez sur "Ajouter une ligne" pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((prod, i) => (
                  <div key={prod.id} className="p-3 bg-ink-50 rounded-xl border border-ink-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="h-4 w-4 text-ink-300" />
                      <span className="text-[10px] font-bold text-ink-400">Ligne {i + 1}</span>
                      <button onClick={() => removeProduct(prod.id)} className="ml-auto text-ink-400 hover:text-danger-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Produit demandé</label>
                        <input type="text" value={prod.product} onChange={(e) => updateProduct(prod.id, 'product', e.target.value)} placeholder="Ex: Laptop Core i7" className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Qté</label>
                        <input type="number" value={prod.quantity} onChange={(e) => updateProduct(prod.id, 'quantity', parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                      </div>
                      <div className="col-span-8 sm:col-span-5">
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Spécifications</label>
                        <input type="text" value={prod.specifications} onChange={(e) => updateProduct(prod.id, 'specifications', e.target.value)} placeholder="Ex: 16GB / 512GB SSD" className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 bg-primary-50/50 rounded-xl border border-primary-200/40">
              <p className="text-[10px] text-ink-500">
                <strong className="text-primary-700">Prix unitaire</strong> et <strong className="text-primary-700">Prix total</strong> sont automatiquement remplis par le fournisseur lors de sa soumission.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Form builder */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-ink-900 text-base">3 — Formulaire personnalisable</h2>
                <p className="text-xs text-ink-500">Ajoutez vos propres questions pour les fournisseurs</p>
              </div>
              <button onClick={addField} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ajouter une question
              </button>
            </div>
            {formFields.length === 0 ? (
              <div className="py-8 text-center">
                <ListOrdered className="h-8 w-8 text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500">Aucune question ajoutée. Cliquez sur "Ajouter une question" pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formFields.map((field, i) => {
              const FIcon = fieldTypeConfig[field.type]?.icon || Type;
              return (
                <div key={field.id} className="p-3 bg-ink-50 rounded-xl border border-ink-200/60">
                  <div className="flex items-center gap-2 mb-2">
                    <GripVertical className="h-4 w-4 text-ink-300" />
                    <span className="text-[10px] font-bold text-ink-400">Question {i + 1}</span>
                    <button onClick={() => removeField(field.id)} className="ml-auto text-ink-400 hover:text-danger-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-12 sm:col-span-7">
                      <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Libellé de la question</label>
                      <input type="text" value={field.label} onChange={(e) => updateField(field.id, 'label', e.target.value)} placeholder="Ex: Quelle est votre durée de garantie ?" className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                    </div>
                    <div className="col-span-8 sm:col-span-3">
                      <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Type de champ</label>
                      <div className="relative">
                        <FIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400 z-10" />
                        <select value={field.type} onChange={(e) => updateField(field.id, 'type', e.target.value as FieldType)} className="w-full pl-7 pr-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400 cursor-pointer">
                          {allFieldTypes.map((ft) => (
                            <option key={ft} value={ft}>{fieldTypeConfig[ft].label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Obligatoire</label>
                      <label className="flex items-center justify-center px-2 py-1.5 bg-white rounded-lg border border-ink-200 cursor-pointer hover:border-primary-300 transition-colors h-[34px]">
                        <input type="checkbox" checked={field.required} onChange={(e) => updateField(field.id, 'required', e.target.checked)} className="text-primary-600" />
                      </label>
                    </div>
                  </div>
                  {(field.type === 'radio' || field.type === 'select') && (
                    <div>
                      <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Options (séparées par des virgules)</label>
                      <input
                        type="text"
                        value={(field.options || []).join(', ')}
                        onChange={(e) => updateField(field.id, 'options', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                        placeholder="Ex: 6 mois, 12 mois, 24 mois, Autre"
                        className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400"
                      />
                    </div>
                  )}
                </div>
              );
            })}
              </div>
            )}
            <div className="p-3 bg-primary-50/50 rounded-xl border border-primary-200/40">
              <p className="text-[10px] text-ink-500">
                <strong className="text-primary-700">Types disponibles :</strong> texte court, texte long, nombre, montant/devise, date, oui/non, choix multiple, liste déroulante, quantité, pourcentage, fichier/PDF, photo, URL, tableau de produits.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Scoring criteria */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-ink-900 text-base">4 — Critères de scoring</h2>
                <p className="text-xs text-ink-500">L'IA utilisera ces critères pondérés pour comparer et classer les offres</p>
              </div>
              <button onClick={addCriterion} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ajouter un critère
              </button>
            </div>
            <div className="space-y-2">
              {scoringCriteria.map((crit, i) => {
                const total = scoringCriteria.reduce((acc, c) => acc + c.weight, 0);
                return (
                  <div key={i} className="p-3 bg-ink-50 rounded-xl border border-ink-200/60">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="h-4 w-4 text-ink-300" />
                      <span className="text-[10px] font-bold text-ink-400">Critère {i + 1}</span>
                      <button onClick={() => removeCriterion(i)} className="ml-auto text-ink-400 hover:text-danger-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 sm:col-span-7">
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Nom du critère</label>
                        <input type="text" value={crit.label} onChange={(e) => updateCriterion(i, 'label', e.target.value)} placeholder="Ex: Prix, Délai, Qualité..." className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                      </div>
                      <div className="col-span-8 sm:col-span-3">
                        <label className="text-[10px] font-semibold text-ink-600 mb-1 block">Poids (%)</label>
                        <input type="number" min={0} max={100} value={crit.weight} onChange={(e) => updateCriterion(i, 'weight', parseInt(e.target.value) || 0)} className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <div className="h-[34px] flex items-center justify-center rounded-lg bg-white border border-ink-200">
                          <div className="w-full px-1">
                            <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all" style={{ width: `${total > 0 ? Math.round((crit.weight / total) * 100) : 0}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {scoringCriteria.length === 0 && (
              <div className="py-8 text-center">
                <Percent className="h-8 w-8 text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500">Aucun critère défini. Cliquez sur "Ajouter un critère" pour commencer.</p>
              </div>
            )}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${scoringCriteria.reduce((acc, c) => acc + c.weight, 0) === 100 ? 'bg-accent-50 border-accent-200' : 'bg-warning-50 border-warning-200'}`}>
              <span className="text-xs font-semibold text-ink-700">Total des poids</span>
              <span className={`text-sm font-bold ${scoringCriteria.reduce((acc, c) => acc + c.weight, 0) === 100 ? 'text-accent-700' : 'text-warning-700'}`}>
                {scoringCriteria.reduce((acc, c) => acc + c.weight, 0)}%
                {scoringCriteria.reduce((acc, c) => acc + c.weight, 0) !== 100 && (
                  <span className="text-[10px] font-normal ml-2">
                    {scoringCriteria.reduce((acc, c) => acc + c.weight, 0) < 100 ? 'Il reste de la marge' : 'Le total dépasse 100%'}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Step 4: Publish */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6 space-y-4 animate-fade-in">
            <h2 className="font-display font-bold text-ink-900 text-base">5 — Vérification et publication</h2>
            <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 space-y-3">
              <div><p className="text-xs font-bold text-primary-800">Fournisseurs autorisés à voir cette offre</p><p className="text-[10px] text-ink-500 mt-1">Ces critères déterminent qui pourra consulter et répondre à la demande.</p></div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-ink-600 mb-1 block">Portée géographique</label><select value={supplierScope} onChange={(e) => setSupplierScope(e.target.value as 'local' | 'national')} className="w-full px-3 py-2 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400"><option value="local">{companyIsDrc ? 'Local — même province' : 'Local — même ville'}</option><option value="national">National — tout le pays</option></select></div>
                <div><label className="text-[10px] font-semibold text-ink-600 mb-1 block">Catégorie de fournisseur</label><select value={supplierCategory} onChange={(e) => setSupplierCategory(e.target.value as typeof supplierCategory)} className="w-full px-3 py-2 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400"><option value="prime">Fournisseur principal</option><option value="fabricant">Fabricant</option><option value="revendeur">Revendeur</option><option value="prestataire">Prestataire de services</option><option value="sous_traitant">Sous-traitant</option></select></div>
              </div>

              <div className="pt-3 border-t border-primary-200/60">
                <p className="text-[10px] font-semibold text-ink-600 mb-1.5">Visibilité de l'offre</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {([
                    { id: 'all' as const, label: 'Tous les fournisseurs' },
                    { id: 'category' as const, label: 'Par catégorie de service' },
                    { id: 'specific' as const, label: 'Fournisseurs spécifiques' },
                  ]).map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVisibility(v.id)}
                      className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-all ${
                        visibility === v.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-ink-600 border-ink-200 hover:border-primary-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {visibility === 'category' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {BUSINESS_CATEGORIES.map((cat) => {
                      const checked = visibilityCategories.includes(cat);
                      return (
                        <label key={cat} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer ${checked ? 'bg-primary-50 border-primary-400 text-primary-700 font-medium' : 'bg-white border-ink-200 text-ink-600'}`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleVisibilityCategory(cat)} className="accent-primary-600" />
                          <span className="truncate">{cat}</span>
                        </label>
                      );
                    })}
                    {visibilityCategories.length === 0 && (
                      <p className="col-span-full text-[10px] text-warning-600 mt-1">Sélectionnez au moins une catégorie.</p>
                    )}
                  </div>
                )}

                {visibility === 'specific' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-ink-200">
                      <Search className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                      <input
                        type="text"
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        placeholder="Rechercher un fournisseur par nom..."
                        className="bg-transparent text-xs outline-none flex-1 placeholder:text-ink-400 text-ink-700"
                      />
                    </div>
                    {supplierSearch.trim() && (
                      <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-ink-200 bg-white p-1.5">
                        {supplierSearchResults.length === 0 ? (
                          <p className="text-[11px] text-ink-400 px-2 py-2">Aucun fournisseur trouvé.</p>
                        ) : (
                          supplierSearchResults.map((co) => {
                            const checked = visibilitySupplierIds.includes(co.id);
                            return (
                              <label key={co.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${checked ? 'bg-primary-50' : 'hover:bg-ink-50'}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleVisibilitySupplier(co.id)} className="accent-primary-600" />
                                <div className={`h-6 w-6 rounded-md ${co.logoColor} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>{co.name.slice(0, 2).toUpperCase()}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-ink-800 truncate">{co.name}</p>
                                  <p className="text-[10px] text-ink-400 flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> {co.city}</p>
                                </div>
                                {checked && <CheckCircle2 className="h-4 w-4 text-primary-600 shrink-0" />}
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                    {visibilitySupplierIds.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Users className="h-3 w-3 text-ink-400" />
                        <span className="text-[10px] text-ink-500">{visibilitySupplierIds.length} fournisseur(s) sélectionné(s)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 bg-ink-50 rounded-xl space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Titre</p>
                <p className="text-sm font-medium text-ink-800">{title || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Référence</p>
                  <p className="text-sm font-mono text-ink-700">{reference}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Date limite</p>
                  <p className="text-sm text-ink-700">{formatDate(deadline)}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Lieu de livraison</p>
                <p className="text-sm text-ink-700">{deliveryLocation || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Visibilité fournisseur</p><p className="text-sm text-ink-700">{supplierScope === 'local' ? (companyIsDrc ? 'Local — même province' : 'Local — même ville') : 'National — tout le pays'}</p></div>
                <div><p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Catégorie fournisseur</p><p className="text-sm text-ink-700">{supplierCategory === 'prime' ? 'Fournisseur principal' : supplierCategory}</p></div>
              </div>
              {description && (
                <div>
                  <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Description</p>
                  <p className="text-xs text-ink-600">{description}</p>
                </div>
              )}
              <div className="pt-2 border-t border-ink-200">
                <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Produits ({products.length})</p>
                {products.length > 0 ? products.map((p) => (
                  <p key={p.id} className="text-xs text-ink-600">{p.product} (x{p.quantity}) — {p.specifications}</p>
                )) : <p className="text-xs text-ink-400">Aucun produit</p>}
              </div>
              <div className="pt-2 border-t border-ink-200">
                <p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Questions du formulaire ({formFields.length})</p>
                {formFields.length > 0 ? formFields.map((f) => (
                  <p key={f.id} className="text-xs text-ink-600">{f.label} <span className="text-[9px] text-ink-400">({fieldTypeConfig[f.type].label}{f.required ? ', obligatoire' : ''})</span></p>
                )) : <p className="text-xs text-ink-400">Aucune question</p>}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handlePublish('draft')}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                Enregistrer en brouillon
              </button>
              <button
                onClick={() => handlePublish('published')}
                disabled={!canPublish}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-accent-600 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                Publier la demande
              </button>
            </div>
            {!canPublish && <p className="text-[10px] text-danger-600 text-center">Le titre, la date limite et le lieu de livraison sont obligatoires pour publier.</p>}
          </div>
        )}

        {/* Navigation */}
        {step === 3 && scoringExceeded && (
          <div className="flex items-center gap-2 p-3 bg-danger-50 rounded-xl border border-danger-200 animate-fade-in">
            <AlertTriangle className="h-4 w-4 text-danger-600 shrink-0" />
            <p className="text-xs font-semibold text-danger-700">Le total des poids ({scoringTotal}%) dépasse 100%. Réduisez les poids pour pouvoir continuer.</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-white border border-ink-200 hover:bg-ink-50 transition-colors">Précédent</button>
          )}
          {step < 4 && (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 3 && scoringExceeded}
              className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:bg-ink-300 disabled:cursor-not-allowed disabled:hover:bg-ink-300"
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== SUPPLIER FORM ======

function SupplierForm({ rfq, onBack }: { rfq: RFQ; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const [supplierName, setSupplierName] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
  const [fieldResponses, setFieldResponses] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const steps = ['Informations fournisseur', 'Produits et prix', 'Questions techniques', 'Conditions commerciales', 'Documents', 'Vérification'];

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-accent-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-accent-600" />
          </div>
          <h2 className="font-display text-xl font-bold text-ink-900 mb-2">Offre soumise !</h2>
          <p className="text-sm text-ink-500 mb-6">Votre soumission a été transmise à {rfq.createdBy}. Elle sera analysée par l'IA et comparée aux autres offres.</p>
          <button onClick={onBack} className="px-6 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors">Retour à la demande</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 animate-fade-in">
      <div className="bg-white border-b border-ink-200/60 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <button onClick={onBack} className="text-xs font-medium text-ink-500 hover:text-primary-600 mb-2">← Retour</button>
          <div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-mono text-ink-400">{rfq.reference}</span></div>
          <h1 className="font-display font-bold text-ink-900 text-lg">{rfq.title}</h1>
          <p className="text-xs text-ink-500">Date limite: {formatDate(rfq.deadline)} · {rfq.deliveryLocation}</p>
          <div className="flex items-center gap-1 mt-4 overflow-x-auto scrollbar-thin pb-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                <button onClick={() => setStep(i)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${i === step ? 'bg-primary-600 text-white' : i < step ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-500'}`}>
                  <span className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold">{i < step ? '✓' : i + 1}</span>
                  <span className="hidden sm:inline">{s}</span>
                </button>
                {i < steps.length - 1 && <span className="text-ink-300 text-[10px]">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display font-bold text-ink-900 text-base">1 — Informations fournisseur</h2>
              <div><label className="text-xs font-semibold text-ink-600 mb-1.5 block">Nom de l'entreprise *</label><input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Ex: CongoTech SARL" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" /></div>
              <div><label className="text-xs font-semibold text-ink-600 mb-1.5 block">Email *</label><input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} placeholder="contact@entreprise.com" className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" /></div>
              <div><label className="text-xs font-semibold text-ink-600 mb-1.5 block">Téléphone</label><input type="tel" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} placeholder="+243 ..." className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" /></div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display font-bold text-ink-900 text-base">2 — Produits et prix</h2>
              {rfq.products.length > 0 ? (
                <div className="space-y-3">
                  {rfq.products.map((prod) => (
                    <div key={prod.id} className="p-3 bg-ink-50 rounded-xl border border-ink-200/60">
                      <div className="flex items-center justify-between mb-2"><span className="text-sm font-semibold text-ink-800">{prod.product}</span><span className="text-xs text-ink-500">Qté: {prod.quantity}</span></div>
                      <p className="text-[10px] text-ink-500 mb-2">Spécifications: {prod.specifications}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[10px] font-semibold text-ink-600 mb-1 block">Prix unitaire *</label><input type="number" value={productPrices[prod.id] || ''} onChange={(e) => setProductPrices({ ...productPrices, [prod.id]: e.target.value })} placeholder="0.00" className="w-full px-2 py-1.5 bg-white rounded-lg border border-ink-200 text-sm outline-none focus:border-primary-400" /></div>
                        <div><label className="text-[10px] font-semibold text-ink-600 mb-1 block">Prix total</label><div className="px-2 py-1.5 bg-primary-50 rounded-lg border border-primary-200 text-sm font-bold text-primary-700">{productPrices[prod.id] ? (parseFloat(productPrices[prod.id]) * prod.quantity).toLocaleString('fr-FR') : '—'}</div></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-ink-500 py-8 text-center">Aucun produit à chiffrer pour cette demande.</p>}
            </div>
          )}

          {(step === 2 || step === 3) && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display font-bold text-ink-900 text-base">{step + 1} — {steps[step]}</h2>
              {rfq.formFields.filter((_, i) => (step === 2 ? i < Math.ceil(rfq.formFields.length / 2) : i >= Math.ceil(rfq.formFields.length / 2))).map((field) => (
                <div key={field.id}>
                  <label className="text-xs font-semibold text-ink-600 mb-1.5 block">{field.label}{field.required && <span className="text-danger-600 ml-1">*</span>}</label>
                  {field.helpText && <p className="text-[10px] text-ink-400 mb-1.5">{field.helpText}</p>}
                  {field.type === 'text' || field.type === 'number' || field.type === 'currency' || field.type === 'date' || field.type === 'url' ? (
                    <input type={field.type === 'number' || field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'} value={fieldResponses[field.id] || ''} onChange={(e) => setFieldResponses({ ...fieldResponses, [field.id]: e.target.value })} placeholder={field.placeholder || ''} className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
                  ) : field.type === 'textarea' ? (
                    <textarea value={fieldResponses[field.id] || ''} onChange={(e) => setFieldResponses({ ...fieldResponses, [field.id]: e.target.value })} rows={3} className="w-full px-3 py-2.5 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400 resize-none" />
                  ) : field.type === 'radio' || field.type === 'select' ? (
                    <div className="space-y-1.5">
                      {field.options?.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-lg border border-ink-200 cursor-pointer hover:bg-primary-50 hover:border-primary-300 transition-colors">
                          <input type="radio" name={field.id} value={opt} checked={fieldResponses[field.id] === opt} onChange={(e) => setFieldResponses({ ...fieldResponses, [field.id]: e.target.value })} className="text-primary-600" />
                          <span className="text-sm text-ink-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'boolean' ? (
                    <div className="flex gap-2">
                      {['Oui', 'Non'].map((val) => (
                        <label key={val} className={`flex-1 px-3 py-2 rounded-lg border cursor-pointer text-center transition-colors ${fieldResponses[field.id] === val ? (val === 'Oui' ? 'bg-accent-50 border-accent-300 text-accent-700' : 'bg-danger-50 border-danger-300 text-danger-700') : 'bg-ink-50 border-ink-200 text-ink-700 hover:bg-primary-50 hover:border-primary-300'}`}>
                          <input type="radio" name={field.id} value={val} checked={fieldResponses[field.id] === val} onChange={(e) => setFieldResponses({ ...fieldResponses, [field.id]: e.target.value })} className="hidden" />
                          <span className="text-sm">{val}</span>
                        </label>
                      ))}
                    </div>
                  ) : field.type === 'file' || field.type === 'photo' ? (
                    <div className="px-3 py-6 bg-ink-50 rounded-xl border-2 border-dashed border-ink-300 text-center cursor-pointer hover:border-primary-400 transition-colors">
                      <FileText className="h-6 w-6 text-ink-400 mx-auto mb-2" />
                      <p className="text-xs text-ink-500">Cliquez pour ajouter un {field.type === 'photo' ? 'photo' : 'PDF'}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display font-bold text-ink-900 text-base">5 — Documents</h2>
              <div className="px-4 py-8 bg-ink-50 rounded-xl border-2 border-dashed border-ink-300 text-center cursor-pointer hover:border-primary-400 transition-colors">
                <FileText className="h-8 w-8 text-ink-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-ink-600">Joindre votre facture proforma</p>
                <p className="text-xs text-ink-400 mt-1">Format PDF, max 10 Mo</p>
              </div>
              <div className="px-4 py-8 bg-ink-50 rounded-xl border-2 border-dashed border-ink-300 text-center cursor-pointer hover:border-primary-400 transition-colors">
                <Download className="h-8 w-8 text-ink-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-ink-600">Joindre votre catalogue (facultatif)</p>
                <p className="text-xs text-ink-400 mt-1">Format PDF</p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <h2 className="font-display font-bold text-ink-900 text-base">6 — Vérification</h2>
              <div className="p-4 bg-ink-50 rounded-xl space-y-3">
                <div><p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Fournisseur</p><p className="text-sm font-medium text-ink-800">{supplierName || '—'}</p><p className="text-xs text-ink-500">{supplierEmail || '—'}</p></div>
                <div className="pt-3 border-t border-ink-200"><p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Produits</p>{rfq.products.map((p) => (<div key={p.id} className="flex items-center justify-between text-xs py-1"><span className="text-ink-700">{p.product} (x{p.quantity})</span><span className="font-bold text-ink-700">{productPrices[p.id] ? formatCurrency(parseFloat(productPrices[p.id]) * p.quantity, 'USD') : '—'}</span></div>))}</div>
                <div className="pt-3 border-t border-ink-200"><p className="text-[10px] font-bold uppercase text-ink-400 mb-1">Réponses au formulaire</p>{rfq.formFields.map((f) => (<div key={f.id} className="flex items-center justify-between text-xs py-0.5"><span className="text-ink-500">{f.label}</span><span className="font-medium text-ink-700">{fieldResponses[f.id] || '—'}</span></div>))}</div>
              </div>
              <div className="p-3 bg-warning-50 rounded-lg border border-warning-200"><p className="text-xs text-warning-800">En soumettant, vous confirmez que les informations fournies sont exactes et que votre proforma concorde avec les montants indiqués.</p></div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-ink-100">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors">Précédent</button>}
            {step < 5 ? <button onClick={() => setStep(step + 1)} className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors">Suivant</button> : <button onClick={() => setSubmitted(true)} className="ml-auto px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-accent-500 to-accent-600 hover:shadow-lg hover:shadow-accent-600/20 transition-all flex items-center gap-2"><Send className="h-4 w-4" />SOUMETTRE MON OFFRE</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== TEMPLATES MODAL ======

function TemplatesModal({ onClose, onSelectTemplate, onCreateCustom }: { onClose: () => void; onSelectTemplate: (tpl: RFQTemplate) => void; onCreateCustom: () => void }) {
  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-slide-up max-h-[80vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-ink-900 text-lg">Choisir un modèle</h3>
            <p className="text-xs text-ink-500">Ne recommencez pas de zéro à chaque fois</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rfqTemplates.map((tpl) => {
            const Icon = templateIconMap[tpl.icon] || Package;
            return (
              <button key={tpl.id} onClick={() => onSelectTemplate(tpl)} className="p-4 rounded-xl border border-ink-200/60 hover:border-primary-300 hover:bg-primary-50/30 transition-all text-left group">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700">{tpl.name}</p>
                    <p className="text-[10px] text-ink-500 mt-0.5">{tpl.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] font-medium px-1.5 py-0.5 bg-ink-100 text-ink-600 rounded">{tpl.category}</span>
                      <span className="text-[9px] text-ink-400">{tpl.fieldCount} questions · {tpl.productCount} produits</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500 mt-1" />
                </div>
              </button>
            );
          })}
          <button onClick={onCreateCustom} className="p-4 rounded-xl border-2 border-dashed border-primary-300 hover:bg-primary-50/30 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                <Plus className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary-700">Créer mon modèle</p>
                <p className="text-[10px] text-ink-500">Personnaliser de A à Z</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== AI CREATE MODAL ======

function AICreateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (prompt: string, fields: { label: string; type: FieldType; required?: boolean; options?: string[] }[], products: { product: string; quantity: number; specifications: string }[]) => void }) {
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState(false);

  const context = generated ? detectAIContext(prompt) : 'bureau';
  const aiFields = generated ? (aiFieldPresets[context] || []) : [];
  const aiProducts = generated ? detectAIProducts(prompt) : [];

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-slide-up max-h-[80vh] overflow-y-auto scrollbar-thin">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-display font-bold text-ink-900 text-lg">Créer avec l'IA</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl leading-none">×</button>
        </div>

        {!generated ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-600">Décrivez votre besoin en langage naturel. L'IA construira automatiquement le formulaire adapté.</p>
            <div className="flex items-end gap-2 bg-ink-50 rounded-xl border border-ink-200 px-3 py-2">
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (prompt.trim()) setGenerated(true); } }} placeholder="Ex: Nous voulons acheter 20 laptops Core i7 pour notre personnel." rows={3} className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-ink-400 text-ink-700" />
            </div>
            <button onClick={() => prompt.trim() && setGenerated(true)} disabled={!prompt.trim()} className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-accent-600 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg transition-all flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4" /> Générer le formulaire
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 bg-accent-50 rounded-xl border border-accent-200">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="h-4 w-4 text-accent-600" />
                <span className="text-xs font-bold text-accent-700">Formulaire généré par l'IA</span>
              </div>
              <p className="text-xs text-ink-600">"{prompt}"</p>
            </div>

            {aiProducts.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-600 mb-2">Produits détectés ({aiProducts.length})</p>
                <div className="space-y-1.5">
                  {aiProducts.map((p, i) => (
                    <div key={i} className="p-2.5 bg-ink-50 rounded-lg border border-ink-200/60">
                      <p className="text-sm font-medium text-ink-800">{p.product}</p>
                      <p className="text-[10px] text-ink-500">Quantité: {p.quantity} · {p.specifications || 'Caractéristiques non précisées'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold text-ink-600 mb-2">Champs du formulaire ({aiFields.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {aiFields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-ink-50 rounded-lg">
                    <CheckCircle2 className="h-3 w-3 text-accent-500 shrink-0" />
                    <span className="text-xs text-ink-700">{field.label}</span>
                    {field.required && <span className="text-[8px] font-bold text-danger-500">*</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-ink-100">
              <button onClick={() => setGenerated(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors">Modifier le prompt</button>
              <button onClick={() => onGenerate(prompt, aiFields, aiProducts)} className="ml-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                Modifier et publier
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: { icon: typeof ShoppingCart; label: string; value: string; color: string; bg: string }) {
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
