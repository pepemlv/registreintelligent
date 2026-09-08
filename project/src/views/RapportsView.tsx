import { useState } from 'react';
import {
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Layers,
  Download,
  Edit3,
  ChevronRight,
  FileStack,
} from 'lucide-react';
import { reports } from '@/data';
import { formatDate } from '@/lib/documentConfig';
import type { Report } from '@/types';

export function RapportsView() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  if (selectedReport) {
    const submittedCount = selectedReport.contributions.filter((c) => c.status === 'submitted').length;
    const totalCount = selectedReport.contributions.length;
    const allSubmitted = submittedCount === totalCount;

    return (
      <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        <button onClick={() => setSelectedReport(null)} className="text-sm font-medium text-ink-600 hover:text-primary-600 flex items-center gap-1.5">
          ← Retour aux rapports
        </button>

        {/* Report header */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-ink-900">{selectedReport.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  selectedReport.status === 'collecting' ? 'bg-warning-100 text-warning-700' :
                  selectedReport.status === 'review' ? 'bg-primary-100 text-primary-700' :
                  selectedReport.status === 'validated' ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-600'
                }`}>
                  {selectedReport.status === 'collecting' ? 'Collecte en cours' :
                   selectedReport.status === 'review' ? 'En révision' :
                   selectedReport.status === 'validated' ? 'Validé' : 'Exporté'}
                </span>
                <span className="text-[10px] text-ink-400">{selectedReport.period}</span>
                <span className="text-[10px] text-ink-400">· Créé par {selectedReport.createdBy}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" />
                Modifier
              </button>
              <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Exporter
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contributions */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-4 border-b border-ink-100">
              <h2 className="font-display font-bold text-ink-900 text-base">Contributions</h2>
              <p className="text-xs text-ink-500">{submittedCount}/{totalCount} soumises</p>
            </div>
            <div className="p-4 space-y-3">
              {selectedReport.contributions.map((contrib) => (
                <div key={contrib.id} className={`p-3 rounded-xl border ${contrib.status === 'submitted' ? 'border-accent-200 bg-accent-50/30' : contrib.status === 'pending' ? 'border-warning-200 bg-warning-50/30' : 'border-danger-200 bg-danger-50/30'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-800">{contrib.department}</span>
                    {contrib.status === 'submitted' ? (
                      <CheckCircle2 className="h-4 w-4 text-accent-600" />
                    ) : contrib.status === 'pending' ? (
                      <Clock className="h-4 w-4 text-warning-600 animate-pulse-soft" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-danger-600" />
                    )}
                  </div>
                  <p className="text-[10px] text-ink-600">{contrib.documentName}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] text-ink-400">{contrib.format}</span>
                    {contrib.submittedDate && <span className="text-[9px] text-ink-400">{formatDate(contrib.submittedDate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Consolidation + Sections */}
          <div className="lg:col-span-2 space-y-5">
            {selectedReport.aiSummary && (
              <div className="bg-gradient-to-br from-white to-primary-50/40 rounded-2xl shadow-card border border-primary-200/40 overflow-hidden">
                <div className="px-5 py-3 border-b border-primary-100/60 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-ink-800">Synthèse IA consolidée</span>
                </div>
                <div className="p-5">
                  <p className="text-sm text-ink-700 leading-relaxed">{selectedReport.aiSummary}</p>
                </div>
              </div>
            )}

            {/* Report sections */}
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary-600" />
                <h2 className="font-display font-bold text-ink-900 text-base">Sections du rapport</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {selectedReport.sections.map((section, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-ink-400">{String(i + 1).padStart(2, '0')}</span>
                        <span className="text-sm font-semibold text-ink-800">{section.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${section.status === 'ready' ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-500'}`}>
                        {section.status === 'ready' ? 'Prêt' : 'En attente'}
                      </span>
                    </div>
                    {section.content && (
                      <p className="text-xs text-ink-600 leading-relaxed pl-7">{section.content}</p>
                    )}
                  </div>
                ))}
              </div>
              {!allSubmitted && (
                <div className="p-4 border-t border-ink-100 bg-warning-50/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning-600" />
                    <p className="text-xs text-warning-800">
                      En attente de {totalCount - submittedCount} contribution{totalCount - submittedCount > 1 ? 's' : ''}. L'IA consolidera les sections restantes dès réception.
                    </p>
                  </div>
                </div>
              )}
              {allSubmitted && (
                <div className="p-4 border-t border-ink-100">
                  <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:shadow-lg hover:shadow-primary-600/20 transition-all">
                    <Sparkles className="h-4 w-4" />
                    Générer le rapport consolidé final
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-ink-900 text-base">Rapports intelligents</h2>
          <p className="text-xs text-ink-500">Le manager crée un rapport, demande des contributions, l'IA collecte, analyse, résume, harmonise et consolide.</p>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all">
          <Plus className="h-3.5 w-3.5" />
          Créer un rapport
        </button>
      </div>

      {/* Pipeline */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50/40 rounded-2xl border border-primary-200/40 p-5">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {[
            { label: 'Collecte', icon: FileStack },
            { label: 'Analyse IA', icon: Sparkles },
            { label: 'Résumé', icon: Layers },
            { label: 'Harmonisation', icon: Edit3 },
            { label: 'Consolidation', icon: CheckCircle2 },
            { label: 'Export', icon: Download },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-ink-200/60">
                <step.icon className="h-3.5 w-3.5 text-primary-600" />
                <span className="text-xs font-medium text-ink-700">{step.label}</span>
              </div>
              {i < 5 && <ChevronRight className="h-4 w-4 text-ink-300" />}
            </div>
          ))}
        </div>
      </div>

      {/* Reports list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {reports.map((report) => {
          const submitted = report.contributions.filter((c) => c.status === 'submitted').length;
          const total = report.contributions.length;
          const pct = Math.round((submitted / total) * 100);
          return (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-600" />
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  report.status === 'collecting' ? 'bg-warning-100 text-warning-700' :
                  report.status === 'review' ? 'bg-primary-100 text-primary-700' :
                  report.status === 'validated' ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-600'
                }`}>
                  {report.status === 'collecting' ? 'Collecte' :
                   report.status === 'review' ? 'Révision' :
                   report.status === 'validated' ? 'Validé' : 'Exporté'}
                </span>
              </div>
              <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700 mb-1">{report.title}</p>
              <p className="text-[10px] text-ink-400 mb-4">{report.period} · Créé le {formatDate(report.createdDate)}</p>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-ink-500">Contributions</span>
                  <span className="text-[10px] font-bold text-ink-700">{submitted}/{total}</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-3 border-t border-ink-100">
                {report.contributions.map((c) => (
                  <div key={c.id} className={`h-1.5 w-1.5 rounded-full ${c.status === 'submitted' ? 'bg-accent-500' : c.status === 'pending' ? 'bg-warning-400 animate-pulse-soft' : 'bg-danger-400'}`} />
                ))}
                <span className="text-[9px] text-ink-400 ml-2">{report.sections.filter((s) => s.status === 'ready').length}/{report.sections.length} sections prêtes</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
