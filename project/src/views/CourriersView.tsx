import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Inbox,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight as ArrowUp,
  AlertTriangle,
} from 'lucide-react';
import { Avatar } from '@/components/Badges';
import { formatDate } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';
import { firestore } from '@/lib/firebase';
import { compareNewestDocuments } from '@/lib/documentSort';
import type { DocumentItem, DocumentStatus } from '@/lib/types';

interface CourriersViewProps {
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
  onDocumentsChange: () => void;
}

type Tab = 'incoming' | 'outgoing' | 'unclassified';

const STATUS_LABELS: Record<DocumentStatus, string> = {
  unread: 'Non lu',
  read: 'Lu',
  action_required: 'Action requise',
  archived: 'Archivé',
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  unread: 'bg-primary-100 text-primary-700',
  read: 'bg-accent-100 text-accent-700',
  action_required: 'bg-danger-100 text-danger-700',
  archived: 'bg-ink-100 text-ink-500',
};

export function CourriersView({ documents, onSelectDocument, onDocumentsChange }: CourriersViewProps) {
  const [tab, setTab] = useState<Tab>('incoming');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const incomingCount = documents.filter((d) => d.direction === 'incoming').length;
  const outgoingCount = documents.filter((d) => d.direction === 'outgoing').length;
  const unclassifiedCount = documents.filter((d) => !d.direction).length;

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (tab === 'incoming' && doc.direction !== 'incoming') return false;
      if (tab === 'outgoing' && doc.direction !== 'outgoing') return false;
      if (tab === 'unclassified' && doc.direction) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !doc.title.toLowerCase().includes(q) &&
          !doc.sender.toLowerCase().includes(q) &&
          !(doc.register?.registrationNumber || '').toLowerCase().includes(q) &&
          !(doc.register?.referenceNumber || '').toLowerCase().includes(q)
        )
          return false;
      }
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
      return true;
    }).sort(compareNewestDocuments);
  }, [documents, tab, search, categoryFilter]);

  const categoryOptions = useMemo(() => [...new Set(documents.map((d) => d.category))].sort(), [documents]);

  const assignDirection = async (doc: DocumentItem, direction: 'incoming' | 'outgoing') => {
    await firestore.from('documents').update({ direction }).eq('id', doc.id);
    onDocumentsChange();
  };

  const heading = tab === 'incoming' ? 'entrant' : tab === 'outgoing' ? 'sortant' : 'non classé';
  const partyColumnLabel = tab === 'outgoing' ? 'Destinataire' : 'Expéditeur';

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-2xl shadow-card border border-ink-200/60 p-2">
        <button
          onClick={() => { setTab('incoming'); setSearch(''); setCategoryFilter('all'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'incoming'
              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20'
              : 'text-ink-600 hover:bg-ink-50'
          }`}
        >
          <ArrowDownLeft className="h-4 w-4" />
          Courriers entrants
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'incoming' ? 'bg-white/20' : 'bg-ink-100 text-ink-600'}`}>
            {incomingCount}
          </span>
        </button>
        <button
          onClick={() => { setTab('outgoing'); setSearch(''); setCategoryFilter('all'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'outgoing'
              ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20'
              : 'text-ink-600 hover:bg-ink-50'
          }`}
        >
          <ArrowUp className="h-4 w-4" />
          Courriers sortants
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === 'outgoing' ? 'bg-white/20' : 'bg-ink-100 text-ink-600'}`}>
            {outgoingCount}
          </span>
        </button>
        <button
          onClick={() => { setTab('unclassified'); setSearch(''); setCategoryFilter('all'); }}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            tab === 'unclassified'
              ? 'bg-gradient-to-r from-warning-500 to-warning-600 text-white shadow-lg shadow-warning-600/20'
              : unclassifiedCount > 0
                ? 'text-warning-700 hover:bg-warning-50'
                : 'text-ink-600 hover:bg-ink-50'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Non classés
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            tab === 'unclassified' ? 'bg-white/20' : unclassifiedCount > 0 ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'
          }`}>
            {unclassifiedCount}
          </span>
        </button>
      </div>

      {tab === 'unclassified' && unclassifiedCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-warning-50 border border-warning-200">
          <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0 mt-0.5" />
          <p className="text-sm text-warning-800">
            Ces documents (souvent créés depuis l'application mobile) n'ont pas encore de sens défini. Utilisez les boutons
            <span className="font-semibold"> Entrant </span> / <span className="font-semibold">Sortant</span> ci-dessous pour les classer.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 flex-1">
            <Search className="h-4 w-4 text-ink-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par n° registre, référence, titre ou expéditeur..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-ink-200 hover:border-ink-300 transition-colors">
            <Filter className="h-3.5 w-3.5 text-ink-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-medium text-ink-700 bg-transparent outline-none cursor-pointer"
            >
              <option value="all">Toutes les catégories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{getCategoryMeta(category).label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Registry table */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100">
          <h2 className="font-display font-bold text-ink-900 text-base">
            Registre {heading}
          </h2>
          <p className="text-xs text-ink-500">
            {filtered.length} document{filtered.length > 1 ? 's' : ''} · L'IA lit, résume, classe et détecte les délais à rappeler
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/50">
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-3">N° Registre</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Document</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">{partyColumnLabel}</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3 hidden lg:table-cell">Échéance</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3 hidden lg:table-cell">Resp.</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((doc) => {
                const cat = getCategoryMeta(doc.category);
                const party = tab === 'outgoing' ? (doc.register?.recipient || doc.sender) : doc.sender;
                const isUnclassified = !doc.direction;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className={`hover:bg-primary-50/40 transition-colors cursor-pointer group ${isUnclassified ? 'bg-warning-50/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {isUnclassified && <AlertTriangle className="h-3 w-3 text-warning-500 shrink-0" />}
                        <span className="text-[10px] font-mono font-bold text-primary-600">
                          {doc.register?.registrationNumber || '—'}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-400 mt-0.5">{formatDate(doc.received_date)}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700 max-w-[200px]">{doc.title}</p>
                      <span className="text-[10px] font-mono text-ink-400">{doc.register?.referenceNumber || doc.document_type}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={party || '?'} color="bg-ink-600" size="sm" />
                        <span className="text-xs text-ink-700 truncate max-w-[120px]">{party || '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-ink-600">{cat.label}</span>
                    </td>
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      {doc.due_date ? (
                        <span className="text-xs font-medium text-ink-600">{formatDate(doc.due_date)}</span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      {doc.register?.assignedService ? (
                        <span className="text-xs font-medium text-ink-700">{doc.register.assignedService}</span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {isUnclassified ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning-100 text-warning-700">
                            <AlertTriangle className="h-3 w-3" />
                            Non classé
                          </span>
                          <button
                            onClick={() => assignDirection(doc, 'incoming')}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-ink-200 bg-white hover:border-primary-300 hover:text-primary-700 transition-colors"
                          >
                            Entrant
                          </button>
                          <button
                            onClick={() => assignDirection(doc, 'outgoing')}
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-ink-200 bg-white hover:border-violet-300 hover:text-violet-700 transition-colors"
                          >
                            Sortant
                          </button>
                        </div>
                      ) : (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${STATUS_STYLES[doc.status]}`}>
                          {doc.register?.registerStatus || STATUS_LABELS[doc.status]}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-ink-100 mx-auto flex items-center justify-center mb-4">
              <Inbox className="h-7 w-7 text-ink-400" />
            </div>
            <p className="text-sm font-semibold text-ink-700">Aucun courrier {heading}</p>
            <p className="text-xs text-ink-500 mt-1">Les documents apparaîtront ici dès réception</p>
          </div>
        )}
      </div>

      {/* Auto-registration info */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50/40 rounded-2xl border border-primary-200/40 p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-ink-800">Enregistrement automatique</p>
          <p className="text-xs text-ink-600 leading-relaxed mt-1">
            Chaque courrier entrant ou sortant, facture, proforma, contrat ou autre document reçoit automatiquement un numéro de registre,
            une date, un expéditeur, un destinataire, un objet, un type, une référence, un dossier, un responsable, une échéance,
            une priorité et un statut. L'IA détecte les délais, prépare les rappels, résume le contenu et propose le bon service.
          </p>
        </div>
      </div>
    </div>
  );
}
