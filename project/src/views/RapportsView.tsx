import { useEffect, useState } from 'react';
import {
  FileText, Plus, Sparkles, X, Paperclip, Layers, CheckCircle2, Clock, Loader2, DollarSign, Calendar, Download, Volume2,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, firestore, getActiveCompanyContext, storage } from '@/lib/firebase';
import { formatDate } from '@/lib/documentConfig';
import { analyzeDocumentFile, consolidateReportSummaries } from '@/lib/ai';
import { speak, stopSpeaking } from '@/lib/speech';
import type { ReportContributionEntry, ReportItem, ReportMode } from '@/lib/types';

const inputCls = 'w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400';
const labelCls = 'text-xs font-semibold text-ink-600 mb-1.5 block';

function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function uploadReportFile(file: File): Promise<{ name: string; url: string }> {
  const company = getActiveCompanyContext();
  const path = company
    ? `companies/${company.id}/reports/${Date.now()}-${file.name}`
    : `users/${auth.currentUser?.uid ?? 'unknown'}/reports/${Date.now()}-${file.name}`;
  const uploaded = await uploadBytes(storageRef(storage, path), file);
  return { name: file.name, url: await getDownloadURL(uploaded.ref) };
}

async function downloadOriginalFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

async function analyzeFileToContribution(file: File): Promise<ReportContributionEntry> {
  const [analysis, uploaded] = await Promise.all([analyzeDocumentFile(file), uploadReportFile(file)]);
  return {
    id: generateId(),
    contributor_id: auth.currentUser?.uid ?? null,
    contributor_name: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur',
    document_name: uploaded.name,
    document_url: uploaded.url,
    document_type: analysis.document_type,
    summary: analysis.summary,
    key_points: analysis.key_points ?? [],
    amount_due: analysis.amount_due,
    due_date: analysis.due_date,
    engine: analysis.processed_by ?? null,
    submitted_at: new Date().toISOString(),
  };
}

async function runConsolidation(report: ReportItem): Promise<void> {
  const { consolidated, engine } = await consolidateReportSummaries(
    report.contributions.map((c) => ({ label: c.contributor_name, summary: c.summary })),
  );
  await firestore.from('reports').update({
    consolidated_summary: consolidated.summary,
    consolidated_key_points: consolidated.keyPoints,
    consolidated_engine: engine,
    consolidated_at: new Date().toISOString(),
    status: 'consolidated',
  }).eq('id', report.id);
}

export function RapportsView() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reports.find((r) => r.id === selectedId) ?? null;

  const load = async () => {
    setLoading(true);
    const { data } = await firestore.from<ReportItem>('reports').select();
    setReports(((data as ReportItem[] | null) ?? []).filter((r) => !r.deleted_at));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleCreated = async (reportId: string) => {
    await load();
    setShowCreate(false);
    setSelectedId(reportId);
  };

  if (selected) {
    return <ReportDetail report={selected} onBack={() => setSelectedId(null)} onChanged={load} />;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-ink-900 text-base">Rapports intelligents</h2>
          <p className="text-xs text-ink-500">Importez un document pour l'analyser, ou créez un rapport consolidé auquel plusieurs personnes ajoutent leur propre rapport.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all">
          <Plus className="h-3.5 w-3.5" /> Nouveau rapport
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-ink-500">Chargement des rapports...</div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-16 text-center">
          <FileText className="h-10 w-10 text-ink-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-700">Aucun rapport pour le moment</p>
          <p className="text-xs text-ink-400 mt-1">Créez votre premier rapport pour l'analyser ou le consolider avec l'IA.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <button key={report.id} onClick={() => setSelectedId(report.id)} className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary-600" />
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${report.status === 'consolidated' ? 'bg-accent-100 text-accent-700' : 'bg-warning-100 text-warning-700'}`}>
                  {report.status === 'consolidated' ? 'Consolidé' : 'Collecte'}
                </span>
              </div>
              <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700 mb-1">{report.title}</p>
              <p className="text-[10px] text-ink-400 mb-3">{report.mode === 'single' ? 'Rapport unique' : 'Rapport consolidé'} · Créé le {formatDate(report.created_at)}</p>
              {report.consolidated_summary ? (
                <p className="text-xs text-ink-600 line-clamp-3">{report.consolidated_summary}</p>
              ) : (
                <p className="text-xs text-ink-400 italic">Synthèse pas encore générée.</p>
              )}
              <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-ink-100 text-[10px] text-ink-500">
                <Layers className="h-3 w-3" /> {report.contributions.length} contribution{report.contributions.length === 1 ? '' : 's'}
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateReportModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
    </div>
  );
}

// ====== CREATE REPORT ======

function CreateReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: (reportId: string) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<ReportMode>('single');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');

  const canSubmit = Boolean(title.trim() && (mode === 'consolidated' || file));

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      const createdBy = auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur';
      let contributions: ReportContributionEntry[] = [];
      if (mode === 'single' && file) {
        setStep('Analyse du document en cours...');
        contributions = [await analyzeFileToContribution(file)];
      }
      const payload: Partial<ReportItem> = {
        title: title.trim(),
        description: description.trim(),
        mode,
        status: 'collecting',
        contributions,
        consolidated_summary: null,
        consolidated_key_points: [],
        consolidated_at: null,
        consolidated_engine: null,
        created_by: createdBy,
      };
      const result = await firestore.from('reports').insert(payload).single();
      if (result.error || !result.data) throw new Error(result.error?.message || 'create-failed');
      const report = result.data as ReportItem;
      if (mode === 'single' && contributions.length > 0) {
        setStep('Génération du résumé...');
        await runConsolidation({ ...report, contributions });
      }
      onCreated(report.id);
    } catch (createError) {
      setError(createError instanceof Error && createError.message !== 'create-failed'
        ? `Le rapport n'a pas pu être créé : ${createError.message}`
        : 'Le rapport n\'a pas pu être créé. Vérifiez votre connexion et réessayez.');
    } finally {
      setSaving(false);
      setStep('');
    }
  };

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-ink-900 text-lg">Nouveau rapport</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">{error}</p>}

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Titre *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Rapport mensuel des ventes" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Type de rapport</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setMode('single')} className={`p-2.5 rounded-lg text-left border ${mode === 'single' ? 'border-primary-400 bg-primary-50' : 'border-ink-200'}`}>
                <p className="text-xs font-bold text-ink-800">Rapport unique</p>
                <p className="text-[10px] text-ink-500 mt-0.5">Importez un seul document à analyser.</p>
              </button>
              <button type="button" onClick={() => setMode('consolidated')} className={`p-2.5 rounded-lg text-left border ${mode === 'consolidated' ? 'border-primary-400 bg-primary-50' : 'border-ink-200'}`}>
                <p className="text-xs font-bold text-ink-800">Rapport consolidé</p>
                <p className="text-[10px] text-ink-500 mt-0.5">Chacun ajoute son rapport, l'IA consolide.</p>
              </button>
            </div>
          </div>
          {mode === 'single' && (
            <div>
              <label className={labelCls}>Document à analyser *</label>
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-primary-300 text-xs font-semibold text-primary-700 hover:bg-primary-50 cursor-pointer">
                <Paperclip className="h-3.5 w-3.5" /> {file ? file.name : 'Choisir un fichier (PDF, Word, image)'}
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
        </div>

        {saving && step && (
          <div className="flex items-center gap-2 mt-4 text-xs text-primary-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {step}</div>
        )}

        <div className="flex items-center gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200">Annuler</button>
          <button onClick={() => void handleSubmit()} disabled={!canSubmit || saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg transition-all">
            {saving ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== REPORT DETAIL ======

function ReportDetail({ report, onBack, onChanged }: { report: ReportItem; onBack: () => void; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingContributionId, setPlayingContributionId] = useState<string | null>(null);
  const summaryText = report.consolidated_summary || (report.mode === 'single' ? report.contributions[0]?.summary : null);

  const handleConsolidate = async () => {
    if (consolidating || report.contributions.length === 0) return;
    setConsolidating(true);
    setError('');
    try {
      await runConsolidation(report);
      onChanged();
    } catch {
      setError('La synthèse consolidée n\'a pas pu être générée. Réessayez.');
    } finally {
      setConsolidating(false);
    }
  };

  const handleSpeakSummary = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    if (!summaryText) return;
    speak(summaryText, () => setIsPlaying(false));
    setIsPlaying(true);
  };

  const handleSpeakContribution = (id: string, text: string) => {
    if (playingContributionId === id) {
      stopSpeaking();
      setPlayingContributionId(null);
      return;
    }
    stopSpeaking();
    setIsPlaying(false);
    speak(text, () => setPlayingContributionId(null));
    setPlayingContributionId(id);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1200px] mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5">← Retour aux rapports</button>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${report.status === 'consolidated' ? 'bg-accent-100 text-accent-700' : 'bg-warning-100 text-warning-700'}`}>
                {report.status === 'consolidated' ? 'Consolidé' : 'Collecte en cours'}
              </span>
              <span className="text-[10px] text-ink-400">{report.mode === 'single' ? 'Rapport unique' : 'Rapport consolidé'} · Créé par {report.created_by}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900">{report.title}</h1>
            {report.description && <p className="text-sm text-ink-500 mt-1">{report.description}</p>}
          </div>
          {report.mode === 'consolidated' && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-ink-100 text-ink-700 hover:bg-ink-200"><Plus className="h-3.5 w-3.5" /> Ajouter un rapport</button>
              {report.contributions.length > 0 && (
                <button onClick={() => void handleConsolidate()} disabled={consolidating} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:shadow-lg disabled:opacity-50">
                  {consolidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {report.status === 'consolidated' ? 'Régénérer la synthèse' : 'Générer la synthèse consolidée'}
                </button>
              )}
            </div>
          )}
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">{error}</p>}
      </div>

      {summaryText && (
        <div className="bg-gradient-to-br from-white to-primary-50/40 rounded-2xl shadow-card border border-primary-200/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-primary-100/60 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-ink-800">{report.mode === 'single' ? 'Résumé du rapport' : 'Synthèse IA consolidée'}</span>
          </div>
          <div className="p-5 space-y-3">
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{summaryText}</p>
            {report.consolidated_key_points.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase text-ink-500 mb-1.5">Informations importantes détectées</p>
                <ul className="space-y-1">
                  {report.consolidated_key_points.map((point, i) => (
                    <li key={i} className="text-xs text-ink-600 flex items-start gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-accent-600 shrink-0 mt-0.5" /> {point}</li>
                  ))}
                </ul>
              </div>
            )}
            {report.consolidated_at && <p className="text-[10px] text-ink-400">Généré {report.consolidated_engine ? `via ${report.consolidated_engine}` : ''} le {formatDate(report.consolidated_at)}</p>}
            <button onClick={handleSpeakSummary} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${isPlaying ? 'bg-danger-600 hover:bg-danger-700' : 'bg-accent-600 hover:bg-accent-700'}`}>
              <Volume2 className="h-3.5 w-3.5" /> {isPlaying ? 'Arrêter' : 'Lire le résumé'}
            </button>
          </div>
        </div>
      )}

      {report.contributions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary-600" />
            <h2 className="font-display font-bold text-ink-900 text-base">Tableau récapitulatif</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-2.5">Document</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-2.5">Contributeur</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-2.5">Type</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-2.5">Montant détecté</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-2.5">Échéance détectée</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-2.5">Soumis le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {[...report.contributions].reverse().map((contrib) => (
                  <tr key={contrib.id} className="hover:bg-ink-50/50">
                    <td className="px-5 py-3">
                      <button onClick={() => void downloadOriginalFile(contrib.document_url, contrib.document_name)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:underline">
                        <Download className="h-3.5 w-3.5 shrink-0" /> {contrib.document_name}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-ink-700">{contrib.contributor_name}</td>
                    <td className="px-3 py-3 text-xs text-ink-600">{contrib.document_type || '—'}</td>
                    <td className="px-3 py-3 text-xs text-ink-600">{contrib.amount_due !== null ? contrib.amount_due : '—'}</td>
                    <td className="px-3 py-3 text-xs text-ink-600">{contrib.due_date ? formatDate(contrib.due_date) : '—'}</td>
                    <td className="px-3 py-3 text-xs text-ink-500">{formatDate(contrib.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary-600" />
          <h2 className="font-display font-bold text-ink-900 text-base">Contributions</h2>
          <span className="text-xs text-ink-400">{report.contributions.length}</span>
        </div>
        {report.contributions.length === 0 ? (
          <div className="py-16 text-center"><Clock className="h-8 w-8 text-ink-300 mx-auto mb-2" /><p className="text-sm text-ink-500">Aucun rapport ajouté pour le moment.</p></div>
        ) : (
          <div className="divide-y divide-ink-100">
            {[...report.contributions].reverse().map((contrib) => {
              // A short, reliable recap built from the structured fields we actually extracted
              // (not free-text AI bullets), topped up with AI key points only if there's room left.
              const structuredPoints = [
                `Rapport écrit par : ${contrib.contributor_name}`,
                `Type de document : ${contrib.document_type || 'Non déterminé'}`,
                ...(contrib.amount_due !== null ? [`Montant détecté : ${contrib.amount_due}`] : []),
                ...(contrib.due_date ? [`Deadline détectée : ${formatDate(contrib.due_date)}`] : []),
              ];
              const importantPoints = [...structuredPoints, ...(contrib.key_points ?? []).slice(0, Math.max(0, 4 - structuredPoints.length))];
              return (
              <div key={contrib.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-bold text-ink-800">{contrib.contributor_name}</span>
                  <span className="text-[10px] text-ink-400">{formatDate(contrib.submitted_at)}</span>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed whitespace-pre-wrap mb-2">{contrib.summary}</p>
                {contrib.summary && (
                  <button
                    onClick={() => handleSpeakContribution(contrib.id, contrib.summary)}
                    className={`mb-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${playingContributionId === contrib.id ? 'bg-danger-600 hover:bg-danger-700' : 'bg-accent-600 hover:bg-accent-700'}`}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    {playingContributionId === contrib.id ? 'Arrêter' : 'Lire le résumé'}
                  </button>
                )}
                {importantPoints.length > 0 && (
                  <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50/50 p-3">
                    <h3 className="mb-2 text-[11px] font-bold uppercase text-ink-600">Informations importantes détectées</h3>
                    <ul className="space-y-1.5">
                      {importantPoints.map((point, index) => (
                        <li key={`${contrib.id}-point-${index}`} className="flex items-start gap-2 text-xs leading-relaxed text-ink-700">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-500 mb-2">
                  {contrib.amount_due !== null && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {contrib.amount_due}</span>}
                  {contrib.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(contrib.due_date)}</span>}
                </div>
                <button onClick={() => void downloadOriginalFile(contrib.document_url, contrib.document_name)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ink-200 bg-ink-50 text-xs font-semibold text-ink-700 hover:bg-ink-100">
                  <FileText className="h-3.5 w-3.5 text-primary-600" /> {contrib.document_name} <span className="text-ink-400 font-normal">· {contrib.document_type}</span> <Download className="h-3.5 w-3.5 ml-1 text-ink-400" />
                </button>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && <AddReportContributionModal report={report} onClose={() => setShowAdd(false)} onAdded={onChanged} />}
    </div>
  );
}

// ====== ADD CONTRIBUTION (consolidated report) ======

function AddReportContributionModal({ report, onClose, onAdded }: { report: ReportItem; onClose: () => void; onAdded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!file || saving) return;
    setSaving(true);
    setError('');
    try {
      const entry = await analyzeFileToContribution(file);
      await firestore.from('reports').update({ contributions: [...report.contributions, entry] }).eq('id', report.id);
      onAdded();
      onClose();
    } catch {
      setError('Le document n\'a pas pu être analysé. Vérifiez le fichier et réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-ink-900 text-lg">Ajouter un rapport</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>
        {error && <p role="alert" className="mb-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">{error}</p>}
        <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-primary-300 text-xs font-semibold text-primary-700 hover:bg-primary-50 cursor-pointer w-fit">
          <Paperclip className="h-3.5 w-3.5" /> {file ? file.name : 'Choisir un fichier (PDF, Word, image)'}
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {saving && <div className="flex items-center gap-2 mt-4 text-xs text-primary-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse du document en cours...</div>}
        <button onClick={() => void handleAdd()} disabled={!file || saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Analyse...' : 'Analyser et ajouter'}</button>
      </div>
    </div>
  );
}
