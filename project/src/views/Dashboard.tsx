import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Mic,
  Inbox,
  FileText,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight as ArrowUp,
  Layers,
} from 'lucide-react';
import type { DocumentItem } from '@/lib/types';
import { formatCurrency, formatDate, daysUntil, relativeDeadline } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';
import { auth } from '@/lib/firebase';
import { compareNewestDocuments } from '@/lib/documentSort';
import { DashboardVoiceWidget } from '@/components/DashboardVoiceWidget';
import type { View } from '@/components/Sidebar';

interface DashboardProps {
  documents: DocumentItem[];
  onSelectAiDocument: (doc: DocumentItem) => void;
  onNavigate: (view: View) => void;
}

export function Dashboard({ documents, onSelectAiDocument, onNavigate }: DashboardProps) {
  const displayName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || '';

  const stats = useMemo(() => {
    const total = documents.length;
    const actionRequired = documents.filter((d) => d.status === 'action_required').length;
    const unread = documents.filter((d) => d.status === 'unread').length;
    const overdue = documents.filter((d) => {
      if (!d.due_date || d.status === 'archived') return false;
      const days = daysUntil(d.due_date);
      return days !== null && days < 0;
    }).length;
    const dueSoon = documents.filter((d) => {
      if (!d.due_date) return false;
      const days = daysUntil(d.due_date);
      return days !== null && days >= 0 && days <= 7;
    }).length;
    const incoming = documents.filter((d) => d.direction === 'incoming').length;
    const outgoing = documents.filter((d) => d.direction === 'outgoing').length;
    const unclassified = documents.filter((d) => !d.direction).length;
    const totalDue = documents.reduce((sum, d) => sum + (d.amount_due || 0), 0);
    return { total, actionRequired, unread, overdue, dueSoon, incoming, outgoing, unclassified, totalDue };
  }, [documents]);

  const recentDocs = useMemo(
    () => [...documents].sort(compareNewestDocuments).slice(0, 5),
    [documents],
  );

  const upcomingDeadlines = useMemo(
    () => documents
      .filter((d) => {
        if (!d.due_date) return false;
        const days = daysUntil(d.due_date);
        return days !== null && days >= 0;
      })
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
      .slice(0, 4),
    [documents],
  );

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of documents) {
      counts.set(doc.category, (counts.get(doc.category) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [documents]);

  const maxCategoryCount = Math.max(1, ...categoryBreakdown.map(([, count]) => count));
  const maxDirection = Math.max(1, stats.incoming, stats.outgoing, stats.unclassified);

  const todaySummary = [
    { icon: Inbox, label: 'Documents au total', value: stats.total, color: 'text-primary-600', bg: 'bg-primary-50' },
    { icon: FileText, label: 'À traiter', value: stats.actionRequired, color: 'text-warning-600', bg: 'bg-warning-50' },
    { icon: AlertTriangle, label: 'En retard', value: stats.overdue, color: 'text-danger-600', bg: 'bg-danger-50' },
    { icon: Calendar, label: 'Échéances sous 7 jours', value: stats.dueSoon, color: 'text-primary-600', bg: 'bg-primary-50' },
    { icon: ArrowDownLeft, label: 'Courriers entrants', value: stats.incoming, color: 'text-accent-600', bg: 'bg-accent-50' },
    { icon: DollarSign, label: 'Montant total dû', value: formatCurrency(stats.totalDue || null) || '0 €', color: 'text-warning-600', bg: 'bg-warning-50' },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Copilote banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-primary-900 p-6 text-white shadow-xl">
        <div className="absolute inset-0 grid-pattern opacity-10" />
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="absolute right-32 top-8 h-32 w-32 rounded-full bg-accent-500/15 blur-2xl" />
        <div className="relative flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-300">Copilote IA</span>
            </div>
            <p className="text-sm leading-relaxed text-white/95 max-w-2xl">
              {displayName && <span className="font-semibold">Bonjour {displayName}. </span>}
              {stats.actionRequired > 0 || stats.overdue > 0 ? (
                <>
                  <span className="font-semibold">
                    {stats.actionRequired} document{stats.actionRequired === 1 ? '' : 's'} nécessite
                    {stats.actionRequired === 1 ? '' : 'nt'} votre attention
                    {stats.overdue > 0 ? `, dont ${stats.overdue} en retard.` : '.'}
                  </span>{' '}
                  Consultez le détail ci-dessous ou demandez au copilote.
                </>
              ) : (
                <>Aucun document en retard pour le moment. Voici l'état de votre registre, connecté en direct à Firebase.</>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                onClick={() => onNavigate('assistant')}
                className="text-xs font-semibold bg-white text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors flex items-center gap-1.5"
              >
                Demander au copilote <ArrowUpRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => onNavigate('voice')}
                className="text-xs font-semibold bg-white/10 text-white px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-1.5"
              >
                <Mic className="h-3 w-3" />
                Commande vocale
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display font-bold text-ink-900 text-sm">Vue d'ensemble</h2>
          <span className="text-[10px] text-ink-400">Connecté en direct à Firebase</span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500 animate-pulse-soft" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {todaySummary.map((item, i) => (
            <div key={i} className="bg-white rounded-xl shadow-card border border-ink-200/60 p-3 flex items-center gap-3 hover:shadow-card-hover transition-all">
              <div className={`h-9 w-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                <item.icon className={`h-4 w-4 ${item.color}`} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-display font-bold text-ink-900 leading-none truncate">{item.value}</p>
                <p className="text-[10px] text-ink-500 mt-0.5 leading-tight">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice control */}
      <DashboardVoiceWidget documents={documents} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent documents */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-ink-900 text-base">Documents récents</h2>
              <p className="text-xs text-ink-500">Derniers documents synchronisés depuis Firebase</p>
            </div>
            <button onClick={() => onNavigate('assistant')} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              Tout voir <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {recentDocs.length === 0 ? (
            <div className="py-14 text-center">
              <div className="h-12 w-12 rounded-2xl bg-ink-100 mx-auto flex items-center justify-center mb-3">
                <Inbox className="h-6 w-6 text-ink-400" />
              </div>
              <p className="text-sm font-semibold text-ink-700">Aucun document pour le moment</p>
              <p className="text-xs text-ink-500 mt-1">Importez un document pour le voir apparaître ici</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-100">
              {recentDocs.map((doc) => {
                const cat = getCategoryMeta(doc.category);
                return (
                  <button
                    key={doc.id}
                    onClick={() => onSelectAiDocument(doc)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left group"
                  >
                    <div className={`h-10 w-10 rounded-xl ${cat.bgColor} flex items-center justify-center shrink-0`}>
                      <cat.icon className={`h-5 w-5 ${cat.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase inline-flex items-center gap-0.5 ${
                          !doc.direction ? 'text-warning-600' : doc.direction === 'outgoing' ? 'text-violet-600' : 'text-primary-600'
                        }`}>
                          {!doc.direction ? <AlertTriangle className="h-2.5 w-2.5" /> : doc.direction === 'outgoing' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDownLeft className="h-2.5 w-2.5" />}
                          {!doc.direction ? 'Non classé' : doc.direction === 'outgoing' ? 'Sortant' : 'Entrant'}
                        </span>
                        <span className="text-[10px] text-ink-300">·</span>
                        <span className="text-[10px] font-medium text-ink-500">{cat.label}</span>
                      </div>
                      <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700 transition-colors">
                        {doc.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-ink-500">{doc.sender}</span>
                        {doc.amount_due !== null && (
                          <span className="text-[11px] font-semibold text-ink-700">
                            · {formatCurrency(doc.amount_due, doc.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        doc.status === 'action_required' ? 'bg-danger-100 text-danger-700' :
                        doc.status === 'unread' ? 'bg-primary-100 text-primary-700' :
                        doc.status === 'archived' ? 'bg-ink-100 text-ink-500' : 'bg-accent-100 text-accent-700'
                      }`}>
                        {doc.status === 'action_required' ? 'Action requise' : doc.status === 'unread' ? 'Non lu' : doc.status === 'archived' ? 'Archivé' : 'Lu'}
                      </span>
                      <p className="text-[10px] text-ink-400 mt-1">{formatDate(doc.received_date)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-warning-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Échéances à venir</h2>
            </div>
            <p className="text-xs text-ink-500">Détectées automatiquement par l'IA</p>
          </div>
          <div className="p-4 space-y-3">
            {upcomingDeadlines.length === 0 && (
              <p className="text-xs text-ink-400 text-center py-6">Aucune échéance à venir.</p>
            )}
            {upcomingDeadlines.map((doc) => {
              const days = daysUntil(doc.due_date) ?? 0;
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectAiDocument(doc)}
                  className="w-full text-left p-3 rounded-xl border border-ink-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-ink-400">{doc.document_type}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        days <= 3 ? 'bg-danger-100 text-danger-700' : days <= 7 ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {relativeDeadline(doc.due_date)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-ink-800 truncate group-hover:text-primary-700">
                    {doc.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-ink-500">{doc.sender}</span>
                    <span className="text-[10px] font-medium text-ink-600">{formatDate(doc.due_date)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Direction breakdown */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-primary-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Courriers entrants / sortants</h2>
            </div>
            <p className="text-xs text-ink-500">Répartition réelle de votre registre</p>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-primary-600" /> Entrants
                </span>
                <span className="text-sm font-bold text-ink-800">{stats.incoming}</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${(stats.incoming / maxDirection) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
                  <ArrowUp className="h-3.5 w-3.5 text-violet-600" /> Sortants
                </span>
                <span className="text-sm font-bold text-ink-800">{stats.outgoing}</span>
              </div>
              <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${(stats.outgoing / maxDirection) * 100}%` }} />
              </div>
            </div>
            {stats.unclassified > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-warning-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Non classés
                  </span>
                  <span className="text-sm font-bold text-warning-700">{stats.unclassified}</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                  <div className="h-full bg-warning-500 transition-all duration-500" style={{ width: `${(stats.unclassified / maxDirection) * 100}%` }} />
                </div>
                <p className="text-[10px] text-warning-600 mt-1">À classer dans le Registre intelligent.</p>
              </div>
            )}
            {stats.total === 0 && <p className="text-xs text-ink-400">Aucun document importé pour le moment.</p>}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent-600" />
              <h2 className="font-display font-bold text-ink-900 text-base">Documents par catégorie</h2>
            </div>
            <p className="text-xs text-ink-500">Classement automatique par l'IA</p>
          </div>
          <div className="p-5 space-y-3">
            {categoryBreakdown.length === 0 && <p className="text-xs text-ink-400">Aucune catégorie pour le moment.</p>}
            {categoryBreakdown.map(([category, count]) => {
              const cat = getCategoryMeta(category);
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg ${cat.bgColor} flex items-center justify-center shrink-0`}>
                    <cat.icon className={`h-4 w-4 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-ink-800">{cat.label}</span>
                      <span className="text-xs font-bold text-ink-700">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full bg-accent-500 transition-all duration-500" style={{ width: `${(count / maxCategoryCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
