import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Receipt,
  FileText,
  Mail,
  BarChart3,
  ShoppingCart,
  Package,
  Calculator,
  File,
  Sparkles,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { documents } from '@/data';
import { StatusBadge, PriorityBadge, Avatar } from '@/components/Badges';
import { typeConfig, formatDate, formatCurrency } from '@/lib/documentConfig';
import { compareNewestLegacyDocuments } from '@/lib/documentSort';
import type { DocDocument, DocumentStatus, DocumentType } from '@/types';

interface DocumentsViewProps {
  onSelectDocument: (doc: DocDocument) => void;
}

const iconMap: Record<string, typeof Receipt> = {
  Receipt,
  FileText,
  Mail,
  BarChart3,
  ShoppingCart,
  Package,
  Calculator,
  File,
};

type FilterType = 'all' | DocumentType;
type FilterStatus = 'all' | DocumentStatus;

export function DocumentsView({ onSelectDocument }: DocumentsViewProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showAIOnly, setShowAIOnly] = useState(false);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !doc.title.toLowerCase().includes(q) &&
          !doc.reference.toLowerCase().includes(q) &&
          !doc.sender.name.toLowerCase().includes(q)
        )
          return false;
      }
      if (typeFilter !== 'all' && doc.type !== typeFilter) return false;
      if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
      if (showAIOnly && doc.aiConfidence < 95) return false;
      return true;
    }).sort(compareNewestLegacyDocuments);
  }, [search, typeFilter, statusFilter, showAIOnly]);

  const typeOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Tous les types' },
    { value: 'invoice', label: 'Factures' },
    { value: 'contract', label: 'Contrats' },
    { value: 'letter', label: 'Courriers' },
    { value: 'report', label: 'Rapports' },
    { value: 'order', label: 'Commandes' },
    { value: 'quote', label: 'Devis' },
  ];

  const statusOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'received', label: 'Reçus' },
    { value: 'in_review', label: 'En révision' },
    { value: 'assigned', label: 'Affectés' },
    { value: 'validated', label: 'Validés' },
    { value: 'closed', label: 'Clôturés' },
    { value: 'overdue', label: 'En retard' },
  ];

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* Filters bar */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 flex-1">
            <Search className="h-4 w-4 text-ink-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, référence ou expéditeur..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              icon={Filter}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as FilterType)}
              options={typeOptions}
            />
            <FilterSelect
              icon={ArrowUpDown}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as FilterStatus)}
              options={statusOptions}
            />
            <button
              onClick={() => setShowAIOnly(!showAIOnly)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                showAIOnly
                  ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-600/20'
                  : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              IA ≥ 95%
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">
          <span className="font-bold text-ink-800">{filtered.length}</span> document
          {filtered.length > 1 ? 's' : ''} {filtered.length !== documents.length && '(filtré)'}
        </p>
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/50">
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-3">Document</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Expéditeur</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Montant IA</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Échéance</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Affecté à</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Statut</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((doc) => {
                const tCfg = typeConfig[doc.type];
                const Icon = iconMap[tCfg.icon] || File;
                return (
                  <tr
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="hover:bg-primary-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                          <Icon className="h-4 w-4 text-ink-500 group-hover:text-primary-600 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700">{doc.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-ink-400">{doc.reference}</span>
                            <PriorityBadge priority={doc.priority} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar name={doc.sender.name} color={doc.sender.avatarColor} size="sm" />
                        <span className="text-xs text-ink-700 truncate max-w-[120px]">{doc.sender.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {doc.aiAmount ? (
                        <div>
                          <span className="text-sm font-bold text-ink-800">{formatCurrency(doc.aiAmount, doc.currency)}</span>
                          <p className="text-[9px] text-accent-600 font-medium">Extrait par IA</p>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {doc.dueDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-ink-400" />
                          <span className={`text-xs font-medium ${doc.status === 'overdue' ? 'text-danger-600' : 'text-ink-600'}`}>
                            {formatDate(doc.dueDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      {doc.assignedTo ? (
                        <div>
                          <span className="text-xs font-medium text-ink-700">{doc.assignedTo}</span>
                          <p className="text-[10px] text-ink-400">{doc.assignedDepartment}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-ink-400">Non affecté</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <StatusBadge status={doc.status} size="xs" />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative h-7 w-7">
                          <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                            <circle cx="14" cy="14" r="11" fill="none" stroke="rgb(226 232 240)" strokeWidth="3" />
                            <circle
                              cx="14"
                              cy="14"
                              r="11"
                              fill="none"
                              stroke={doc.aiConfidence >= 95 ? 'rgb(16 185 129)' : 'rgb(245 158 11)'}
                              strokeWidth="3"
                              strokeDasharray={`${(doc.aiConfidence / 100) * 69.1} 69.1`}
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <span className={`text-xs font-bold ${doc.aiConfidence >= 95 ? 'text-accent-600' : 'text-warning-600'}`}>
                          {doc.aiConfidence}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="lg:hidden divide-y divide-ink-100">
          {filtered.map((doc) => {
            const tCfg = typeConfig[doc.type];
            const Icon = iconMap[tCfg.icon] || File;
            return (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="w-full flex items-start gap-3 p-4 hover:bg-ink-50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-ink-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate">{doc.title}</p>
                  <span className="text-[10px] font-mono text-ink-400">{doc.reference}</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={doc.status} size="xs" />
                    {doc.aiAmount && (
                      <span className="text-xs font-bold text-ink-700">{formatCurrency(doc.aiAmount, doc.currency)}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-ink-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-ink-400" />
            </div>
            <p className="text-sm font-semibold text-ink-700">Aucun document trouvé</p>
            <p className="text-xs text-ink-500 mt-1">Essayez de modifier vos filtres</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  icon: Icon,
  value,
  onChange,
  options,
}: {
  icon: typeof Filter;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-xl border border-ink-200 hover:border-ink-300 transition-colors">
      <Icon className="h-3.5 w-3.5 text-ink-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-medium text-ink-700 bg-transparent outline-none cursor-pointer pr-1"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
