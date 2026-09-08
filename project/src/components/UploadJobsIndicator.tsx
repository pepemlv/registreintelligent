import { useState } from 'react';
import { AlertTriangle, Check, FileText, Loader2, Plus, Sparkles, X } from 'lucide-react';
import type { UploadJob } from '@/hooks/useUploadFlow';

interface UploadJobsIndicatorProps {
  jobs: UploadJob[];
  onSelectJob: (id: string) => void;
  onDismissJob: (id: string) => void;
  onStartNew: () => void;
}

function statusMeta(job: UploadJob) {
  if (job.stage === 'error') return { label: "Échec de l'analyse", icon: AlertTriangle, cls: 'text-danger-600' };
  if (job.stage === 'result') return { label: 'Prêt — compléter la fiche', icon: Sparkles, cls: 'text-accent-600' };
  if (job.stage === 'saved') return { label: 'Enregistré', icon: Check, cls: 'text-accent-600' };
  return { label: 'Analyse en cours…', icon: Loader2, cls: 'text-primary-600' };
}

export function UploadJobsIndicator({ jobs, onSelectJob, onDismissJob, onStartNew }: UploadJobsIndicatorProps) {
  const [open, setOpen] = useState(false);
  const processingCount = jobs.filter((j) => j.stage === 'processing').length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-semibold border border-primary-200 hover:bg-primary-100 transition-colors"
      >
        {processingCount > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        <span className="hidden sm:inline">
          {jobs.length} document{jobs.length > 1 ? 's' : ''} {processingCount > 0 ? 'en traitement' : 'à compléter'}
        </span>
        <span className="sm:hidden">{jobs.length}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-ink-200/60 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
              <span className="text-xs font-bold text-ink-500 uppercase tracking-wide">Documents en cours</span>
              <button
                onClick={() => { onStartNew(); setOpen(false); }}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-ink-100">
              {jobs.map((job) => {
                const meta = statusMeta(job);
                return (
                  <div
                    key={job.id}
                    onClick={() => { onSelectJob(job.id); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ink-50 transition-colors text-left cursor-pointer group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-ink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate">{job.edited?.title || job.fileName || 'Nouveau document'}</p>
                      <p className={`text-xs flex items-center gap-1 ${meta.cls}`}>
                        <meta.icon className={`h-3 w-3 ${job.stage === 'processing' ? 'animate-spin' : ''}`} />
                        {meta.label}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDismissJob(job.id); }}
                      title="Annuler"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-ink-200 text-ink-400 hover:text-danger-600 transition-all shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
