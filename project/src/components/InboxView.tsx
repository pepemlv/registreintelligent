import { useMemo, useState } from 'react';
import { Search, Filter, Inbox as InboxIcon, ArrowRight, AlertCircle } from 'lucide-react';
import type { DocumentItem } from '@/lib/types';
import { formatCurrency, relativeDeadline, priorityColor, priorityLabel, daysUntil } from '@/lib/format';
import { getCategoryMeta, CATEGORIES } from '@/lib/categories';
import { compareNewestDocuments } from '@/lib/documentSort';

interface InboxViewProps {
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
}

type StatusFilter = 'all' | 'unread' | 'action_required' | 'read' | 'archived';

export default function InboxView({ documents, onSelectDocument }: InboxViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          d.title.toLowerCase().includes(q) ||
          d.sender.toLowerCase().includes(q) ||
          d.summary.toLowerCase().includes(q) ||
          d.content_text.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort(compareNewestDocuments);
  }, [documents, search, statusFilter, categoryFilter]);

  const statusTabs: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'action_required', label: 'Action requise' },
    { id: 'unread', label: 'Non lus' },
    { id: 'read', label: 'Lus' },
    { id: 'archived', label: 'Archivés' },
  ];

  const categoryOptions = Object.keys(CATEGORIES);

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Documents</h1>
        <p className="text-gray-500">{filtered.length} document{filtered.length === 1 ? '' : 's'}</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, expéditeur ou contenu..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue focus:border-transparent transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Filter className="w-4 h-4" />
          </div>
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                statusFilter === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              categoryFilter === 'all' ? 'bg-usps-blue text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            Toutes les catégories
          </button>
          {categoryOptions.map((cat) => {
            const meta = getCategoryMeta(cat);
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  categoryFilter === cat ? 'bg-usps-blue text-white' : `${meta.bgColor} ${meta.color} border border-gray-200 hover:bg-gray-100`
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Document List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <InboxIcon className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400">Aucun document ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const cat = getCategoryMeta(doc.category);
            const days = daysUntil(doc.due_date);
            const isUrgent = days !== null && days <= 3 && days >= 0;
            return (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${
                  doc.status === 'unread'
                    ? 'bg-usps-gray/30 border-usps-blue/20 hover:bg-usps-gray'
                    : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <cat.icon className={`w-6 h-6 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-medium truncate ${doc.status === 'unread' ? 'text-gray-900' : 'text-gray-700'} group-hover:text-usps-blue`}>
                      {doc.title}
                    </span>
                    {doc.status === 'unread' && <span className="w-2 h-2 rounded-full bg-usps-gray0 flex-shrink-0" />}
                    {doc.status === 'action_required' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{doc.sender} — {doc.summary}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {doc.amount_due !== null && (
                    <div className="text-right hidden sm:block">
                      <div className="font-semibold text-gray-900 text-sm">{formatCurrency(doc.amount_due)}</div>
                      <div className="text-xs text-gray-400">{doc.due_date ? relativeDeadline(doc.due_date) : ''}</div>
                    </div>
                  )}
                  {doc.due_date && !doc.amount_due && (
                    <div className={`text-sm font-medium ${isUrgent ? 'text-usps-red' : 'text-gray-500'}`}>
                      {relativeDeadline(doc.due_date)}
                    </div>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${priorityColor(doc.priority)}`}>
                    {priorityLabel(doc.priority)}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-usps-red group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
