import { useState, useMemo } from 'react';
import {
  Archive,
  Search,
  FileStack,
  Calendar,
  HardDrive,
  Cloud,
  Sparkles,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { documents } from '@/data';
import { formatDate, typeConfig } from '@/lib/documentConfig';
import { compareNewestLegacyDocuments } from '@/lib/documentSort';
import type { DocDocument } from '@/types';

interface ArchiveViewProps {
  onSelectDocument: (doc: DocDocument) => void;
}

const categories = [
  { name: 'Factures', count: 94, icon: 'Receipt', color: 'bg-primary-50 text-primary-600' },
  { name: 'Contrats', count: 43, icon: 'FileText', color: 'bg-accent-50 text-accent-600' },
  { name: 'Courriers', count: 67, icon: 'Mail', color: 'bg-warning-50 text-warning-600' },
  { name: 'Rapports', count: 52, icon: 'BarChart3', color: 'bg-ink-100 text-ink-600' },
  { name: 'Commandes', count: 30, icon: 'ShoppingCart', color: 'bg-primary-50 text-primary-600' },
];

const storageInfo = {
  local: { used: 12.4, total: 50, unit: 'Go' },
  cloud: { used: 48.2, total: 500, unit: 'Go' },
};

export function ArchiveView({ onSelectDocument }: ArchiveViewProps) {
  const [search, setSearch] = useState('');

  const archived = useMemo(
    () =>
      documents.filter(
        (d) => d.status === 'closed' || d.status === 'validated',
      ).sort(compareNewestLegacyDocuments),
    [],
  );

  const filtered = archived.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.reference.toLowerCase().includes(q);
  }).sort(compareNewestLegacyDocuments);

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Storage cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StorageCard
          icon={HardDrive}
          title="Stockage local"
          used={storageInfo.local.used}
          total={storageInfo.local.total}
          unit={storageInfo.local.unit}
          color="primary"
        />
        <StorageCard
          icon={Cloud}
          title="Stockage cloud"
          used={storageInfo.cloud.used}
          total={storageInfo.cloud.total}
          unit={storageInfo.cloud.unit}
          color="accent"
        />
      </div>

      {/* Smart categories */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
          <Folder className="h-4 w-4 text-ink-400" />
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base">Classement automatique</h2>
            <p className="text-xs text-ink-500">Catégories détectées par l'IA</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.name}
              className="p-4 rounded-xl border border-ink-200/60 hover:border-primary-300 hover:bg-primary-50/30 transition-all text-left group"
            >
              <div className={`h-9 w-9 rounded-lg ${cat.color} flex items-center justify-center mb-2`}>
                <FileStack className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-ink-800 group-hover:text-primary-700">{cat.name}</p>
              <p className="text-xs text-ink-500">{cat.count} documents</p>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200">
          <Search className="h-4 w-4 text-ink-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherche intelligente dans les archives..."
            className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
          />
          <Sparkles className="h-4 w-4 text-primary-500" />
        </div>
      </div>

      {/* Archived documents */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-ink-400" />
            <h2 className="font-display font-bold text-ink-900 text-base">Documents archivés</h2>
          </div>
          <span className="text-xs text-ink-500">{filtered.length} document{filtered.length > 1 ? 's' : ''}</span>
        </div>
        <div className="divide-y divide-ink-100">
          {filtered.map((doc) => {
            const tCfg = typeConfig[doc.type];
            return (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                  <FileStack className="h-5 w-5 text-ink-500 group-hover:text-primary-600 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-ink-400">{doc.reference}</span>
                    <span className="text-[10px] text-ink-300">·</span>
                    <span className="text-[10px] text-ink-500">{tCfg.label}</span>
                    <span className="text-[10px] text-ink-300">·</span>
                    <span className="text-[10px] text-ink-500">{doc.category}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-ink-400">
                  <Calendar className="h-3 w-3" />
                  {formatDate(doc.receivedDate)}
                </div>
                <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500 transition-colors" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Archive className="h-10 w-10 text-ink-300 mx-auto mb-3" />
              <p className="text-sm text-ink-500">Aucun document archivé trouvé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StorageCard({
  icon: Icon,
  title,
  used,
  total,
  unit,
  color,
}: {
  icon: typeof HardDrive;
  title: string;
  used: number;
  total: number;
  unit: string;
  color: 'primary' | 'accent';
}) {
  const pct = (used / total) * 100;
  const colorMap = {
    primary: { bg: 'bg-primary-500', text: 'text-primary-600', light: 'bg-primary-50' },
    accent: { bg: 'bg-accent-500', text: 'text-accent-600', light: 'bg-accent-50' },
  };
  const c = colorMap[color];
  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${c.light} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${c.text}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-ink-800">{title}</p>
            <p className="text-[10px] text-ink-500">{pct.toFixed(1)}% utilisé</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-ink-600">
          {used} / {total} {unit}
        </span>
      </div>
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div className={`h-full ${c.bg} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
