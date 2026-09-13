import { useRef, useState, type CSSProperties } from 'react';
import { CalendarClock, Check, CheckSquare, FileText, FolderKanban, Link2, Loader2, MessageSquare, Paperclip, Send, Target, ThumbsDown, Trash2, TrendingUp, User, X } from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, firestore, getActiveCompanyContext, storage } from '@/lib/firebase';
import { taskStatusConfig, formatDate } from '@/lib/documentConfig';
import type { ContributionDecision, ContributionRating, TaskAttachment, TaskItem, TaskStatus } from '@/lib/types';

const RATING_OPTIONS: { value: ContributionRating; label: string }[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'tres_bon', label: 'Très bon' },
  { value: 'satisfaisant', label: 'Satisfaisant' },
  { value: 'a_ameliorer', label: 'À améliorer' },
];

interface CompanyMemberOption {
  owner_id: string;
  full_name: string;
  email: string;
  role_label: string;
}

interface TaskDetailModalProps {
  task: TaskItem;
  companyProfiles: CompanyMemberOption[];
  onClose: () => void;
  onChanged: () => void;
  canManageTrash?: boolean;
}

const STATUS_OPTIONS: TaskStatus[] = ['new', 'assigned', 'in_progress', 'submitted', 'validated', 'closed'];
function contributionBackground(authorId: string | null | undefined, author: string, profiles: CompanyMemberOption[]): CSSProperties {
  const normalizedAuthor = author.trim().toLocaleLowerCase();
  const memberIndex = profiles.findIndex((profile) =>
    (authorId && profile.owner_id === authorId)
    || profile.full_name.trim().toLocaleLowerCase() === normalizedAuthor
    || profile.email.trim().toLocaleLowerCase() === normalizedAuthor,
  );
  const fallbackHash = Array.from(authorId || author).reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  const hue = memberIndex >= 0
    ? (210 + memberIndex * (360 / Math.max(profiles.length, 1))) % 360
    : fallbackHash % 360;
  return { backgroundColor: `hsl(${hue} 80% 96%)`, borderColor: `hsl(${hue} 45% 82%)` };
}

export default function TaskDetailModal({ task, companyProfiles, onClose, onChanged, canManageTrash = false }: TaskDetailModalProps) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [noteText, setNoteText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [error, setError] = useState('');
  const [showContributionExtras, setShowContributionExtras] = useState(false);
  const [proposedProgress, setProposedProgress] = useState('');
  const [difficulties, setDifficulties] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextActionDeadline, setNextActionDeadline] = useState('');
  const [evaluatingIndex, setEvaluatingIndex] = useState<number | null>(null);
  const [evalRating, setEvalRating] = useState<ContributionRating>('satisfaisant');
  const [evalScore, setEvalScore] = useState('');
  const [evalComment, setEvalComment] = useState('');
  const [evalRecommendation, setEvalRecommendation] = useState('');
  const [evalNewDeadline, setEvalNewDeadline] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memberIds = Array.from(new Set([task.assignee_id, ...(task.assignee_ids ?? [])].filter((id): id is string => Boolean(id))));
  const canEvaluate = Boolean(auth.currentUser?.uid) && auth.currentUser?.uid === task.assignee_id;

  const handleStatusChange = async (next: TaskStatus) => {
    setStatus(next);
    setSavingStatus(true);
    const result = await firestore.from('tasks').update({ status: next }).eq('id', task.id);
    setSavingStatus(false);
    if (result.error) setError('Le statut n’a pas pu être mis à jour.');
    else onChanged();
  };

  const handleAddNote = async () => {
    if ((!noteText.trim() && files.length === 0) || addingNote) return;
    if (task.proof_required && files.length === 0) {
      setError('Une preuve (document, photo...) est obligatoire pour cette tâche.');
      return;
    }
    setAddingNote(true);
    setError('');
    try {
      const company = getActiveCompanyContext();
      const uploadedFiles: TaskAttachment[] = await Promise.all(files.map(async (file, index) => {
        const path = company
          ? `companies/${company.id}/tasks/${task.id}/activity/${Date.now()}-${index}-${file.name}`
          : `users/${auth.currentUser?.uid ?? 'unknown'}/tasks/${task.id}/activity/${Date.now()}-${index}-${file.name}`;
        const uploaded = await uploadBytes(storageRef(storage, path), file);
        return { name: file.name, url: await getDownloadURL(uploaded.ref), type: file.type, size: file.size };
      }));
      const entry = {
        author: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur',
        author_id: auth.currentUser?.uid ?? null,
        content: noteText.trim(),
        created_at: new Date().toISOString(),
        attachments: uploadedFiles,
        proposed_progress: proposedProgress.trim() ? Math.min(100, Math.max(0, Number(proposedProgress))) : null,
        difficulties: difficulties.trim(),
        recommendation: recommendation.trim(),
        next_action: nextAction.trim(),
        next_action_deadline: nextActionDeadline ? new Date(nextActionDeadline).toISOString() : null,
      };
      const result = await firestore.from('tasks').update({
        activity: [...(task.activity ?? []), entry],
        attachments: [...(task.attachments ?? []), ...uploadedFiles],
      }).eq('id', task.id);
      if (result.error) throw new Error(result.error.message);
      setNoteText('');
      setFiles([]);
      setProposedProgress('');
      setDifficulties('');
      setRecommendation('');
      setNextAction('');
      setNextActionDeadline('');
      setShowContributionExtras(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onChanged();
    } catch {
      setError('La note ou les pièces jointes n’ont pas pu être enregistrées. Réessayez.');
    } finally {
      setAddingNote(false);
    }
  };

  const openEvaluation = (index: number) => {
    const entry = task.activity[index];
    setEvalRating(entry.evaluation?.rating ?? 'satisfaisant');
    setEvalScore(entry.evaluation?.score != null ? String(entry.evaluation.score) : '');
    setEvalComment(entry.evaluation?.comment ?? '');
    setEvalRecommendation(entry.evaluation?.recommendation ?? '');
    setEvalNewDeadline('');
    setEvaluatingIndex(index);
  };

  const submitEvaluation = async (decision: ContributionDecision) => {
    if (evaluatingIndex === null || savingEvaluation) return;
    setSavingEvaluation(true);
    try {
      const evaluation = {
        rating: evalRating,
        score: evalScore.trim() ? Number(evalScore) : null,
        decision,
        comment: evalComment.trim(),
        recommendation: evalRecommendation.trim(),
        new_deadline: decision === 'correction_requested' && evalNewDeadline ? new Date(evalNewDeadline).toISOString() : null,
        evaluated_by: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur',
        evaluated_at: new Date().toISOString(),
      };
      const nextActivity = task.activity.map((entry, index) => index === evaluatingIndex ? { ...entry, evaluation } : entry);
      const result = await firestore.from('tasks').update({ activity: nextActivity }).eq('id', task.id);
      if (result.error) throw new Error(result.error.message);
      setEvaluatingIndex(null);
      onChanged();
    } catch {
      setError('L’évaluation n’a pas pu être enregistrée. Réessayez.');
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleMoveToTrash = async () => {
    if (!canManageTrash) return;
    await firestore.from('tasks').update({ deleted_at: new Date().toISOString(), deleted_by: auth.currentUser?.uid ?? null }).eq('id', task.id);
    onClose();
    onChanged();
  };

  return (
    <div className="relative flex h-[calc(100dvh-64px)] min-h-[500px] flex-col bg-ink-50 animate-fade-in">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700"><CheckSquare className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-ink-900 sm:text-lg">{task.title}</h1>
            <p className="truncate text-xs text-ink-500">{task.project || 'Tâche'}{task.created_at ? ` · ${formatDate(task.created_at)}` : ''}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canManageTrash && <button onClick={handleMoveToTrash} title="Supprimer la tâche" aria-label="Supprimer la tâche" className="rounded-md p-2 text-danger-600 hover:bg-danger-50"><Trash2 className="h-4 w-4" /></button>}
          <button onClick={onClose} title="Fermer" aria-label="Fermer la tâche" className="rounded-md p-2 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)] lg:overflow-hidden">
        <main className="order-2 flex min-h-[65vh] min-w-0 flex-col border-b border-ink-200 lg:order-1 lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6 lg:px-8">
            {task.notes && (
              <article className="mb-5 border-l-2 border-primary-400 pl-4 py-1">
                <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-ink-800">{task.created_by || 'Créateur de la tâche'}</span>
                  <span className="text-ink-400">· Notes initiales · {formatDate(task.created_at)}</span>
                </div>
                <div className="rounded-md border p-3" style={contributionBackground(null, task.created_by || 'Créateur de la tâche', companyProfiles)}>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-ink-700">{task.notes}</p>
                </div>
              </article>
            )}

            {task.source_document_title && (
              <div className="mb-3 flex items-center gap-2 text-xs text-primary-700"><FileText className="h-4 w-4 shrink-0" /><span className="font-medium">Document source :</span><span className="min-w-0 break-words">{task.source_document_title}</span></div>
            )}
            {(task.document_titles?.length ?? 0) > 0 && (
              <section className="mb-5 border-y border-ink-200 py-3">
                <h2 className="mb-2 text-[11px] font-bold uppercase text-ink-500">Documents liés</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-2">{task.document_titles?.map((title, index) => <span key={`${title}-${index}`} className="inline-flex min-w-0 items-center gap-1.5 text-xs text-ink-700"><FileText className="h-3.5 w-3.5 shrink-0 text-primary-600" /><span className="break-words">{title}</span></span>)}</div>
              </section>
            )}

            <div className="mb-3 flex items-center gap-2 border-b border-ink-200 pb-2">
              <MessageSquare className="h-4 w-4 text-primary-600" />
              <h2 className="text-sm font-bold text-ink-800">Contributions</h2>
              <span className="text-xs text-ink-400">{task.activity?.length ?? 0}</span>
            </div>

            <div className="flex-1 space-y-0">
              {(task.activity ?? []).length === 0 && <p className="py-6 text-sm text-ink-400">Aucune contribution pour le moment. Ajoutez une note ou un document pour commencer.</p>}
              {(task.activity ?? []).map((entry, index) => (
                <article key={`${entry.created_at}-${index}`} className="relative border-l border-ink-200 pb-6 pl-5 last:border-l-transparent last:pb-3">
                  <span className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-primary-500 ring-1 ring-primary-200" />
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-bold text-ink-800">{entry.author}</span>
                    <span className="text-[11px] text-ink-400">{formatDate(entry.created_at)}</span>
                  </div>
                  <div className="rounded-md border p-3" style={contributionBackground(entry.author_id, entry.author, companyProfiles)}>
                    {entry.content && <p className="whitespace-pre-wrap text-sm leading-6 text-ink-700">{entry.content}</p>}
                    {(entry.attachments?.length ?? 0) > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">{entry.attachments?.map((attachment, fileIndex) => <a key={`${attachment.name}-${fileIndex}`} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-md border border-white/80 bg-white/90 px-2.5 py-1.5 text-xs text-primary-700 hover:bg-white"><Paperclip className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{attachment.name}</span><Link2 className="h-3 w-3 shrink-0" /></a>)}</div>
                    )}
                    {typeof entry.proposed_progress === 'number' && (
                      <div className="mt-2.5 space-y-1.5 border-t border-white/60 pt-2.5 text-xs text-ink-700">
                        <p className="flex items-center gap-1.5 font-semibold"><TrendingUp className="h-3.5 w-3.5 shrink-0" /> Progression proposée : {entry.proposed_progress}%</p>
                        {entry.difficulties && <p><span className="font-semibold">Difficultés :</span> {entry.difficulties}</p>}
                        {entry.recommendation && <p><span className="font-semibold">Recommandation :</span> {entry.recommendation}</p>}
                        {entry.next_action && <p><span className="font-semibold">Prochaine action :</span> {entry.next_action}{entry.next_action_deadline ? ` (${formatDate(entry.next_action_deadline)})` : ''}</p>}
                      </div>
                    )}
                  </div>

                  {entry.evaluation && (
                    <div className={`mt-2 rounded-md border p-2.5 text-xs ${
                      entry.evaluation.decision === 'validated' ? 'border-accent-200 bg-accent-50 text-accent-800'
                        : entry.evaluation.decision === 'correction_requested' ? 'border-warning-200 bg-warning-50 text-warning-800'
                        : 'border-danger-200 bg-danger-50 text-danger-800'
                    }`}>
                      <p className="flex items-center gap-1.5 font-semibold">
                        {entry.evaluation.decision === 'validated' ? <Check className="h-3.5 w-3.5" /> : entry.evaluation.decision === 'rejected' ? <ThumbsDown className="h-3.5 w-3.5" /> : <Loader2 className="h-3.5 w-3.5" />}
                        {entry.evaluation.decision === 'validated' ? 'Validée' : entry.evaluation.decision === 'correction_requested' ? 'À corriger' : 'Rejetée'}
                        {entry.evaluation.rating && ` · ${RATING_OPTIONS.find((r) => r.value === entry.evaluation?.rating)?.label}`}
                        {typeof entry.evaluation.score === 'number' && ` · ${entry.evaluation.score}/10`}
                      </p>
                      {entry.evaluation.comment && <p className="mt-1">{entry.evaluation.comment}</p>}
                      {entry.evaluation.recommendation && <p className="mt-1"><span className="font-semibold">Recommandation du responsable :</span> {entry.evaluation.recommendation}</p>}
                      {entry.evaluation.new_deadline && <p className="mt-1">Nouvelle deadline : {formatDate(entry.evaluation.new_deadline)}</p>}
                      <p className="mt-1 text-[10px] opacity-70">Évalué par {entry.evaluation.evaluated_by} · {formatDate(entry.evaluation.evaluated_at)}</p>
                    </div>
                  )}

                  {canEvaluate && typeof entry.proposed_progress === 'number' && entry.author_id !== auth.currentUser?.uid && evaluatingIndex !== index && (
                    <button type="button" onClick={() => openEvaluation(index)} className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-primary-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-50">
                      <Target className="h-3.5 w-3.5" /> {entry.evaluation ? 'Réévaluer cette contribution' : 'Évaluer cette contribution'}
                    </button>
                  )}

                  {evaluatingIndex === index && (
                    <div className="mt-2 space-y-3 rounded-md border border-primary-200 bg-primary-50/50 p-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold text-ink-700">Évaluation</label>
                        <div className="flex flex-wrap gap-1.5">
                          {RATING_OPTIONS.map((option) => (
                            <button key={option.value} type="button" onClick={() => setEvalRating(option.value)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${evalRating === option.value ? 'bg-primary-600 text-white' : 'bg-white text-ink-600 border border-ink-200'}`}>{option.label}</button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-ink-700">Note (/10, facultatif)</label>
                          <input type="number" min={0} max={10} value={evalScore} onChange={(e) => setEvalScore(e.target.value)} className="w-full rounded-md border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-semibold text-ink-700">Nouvelle deadline (si correction)</label>
                          <input type="date" value={evalNewDeadline} onChange={(e) => setEvalNewDeadline(e.target.value)} className="w-full rounded-md border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-ink-700">Commentaire</label>
                        <textarea value={evalComment} onChange={(e) => setEvalComment(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-ink-700">Recommandation du responsable</label>
                        <textarea value={evalRecommendation} onChange={(e) => setEvalRecommendation(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-ink-200 px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" disabled={savingEvaluation} onClick={() => void submitEvaluation('validated')} className="inline-flex items-center gap-1.5 rounded-md bg-accent-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-accent-700 disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Valider l'évaluation</button>
                        <button type="button" disabled={savingEvaluation} onClick={() => void submitEvaluation('correction_requested')} className="inline-flex items-center gap-1.5 rounded-md bg-warning-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-warning-600 disabled:opacity-50"><Loader2 className="h-3.5 w-3.5" /> À corriger</button>
                        <button type="button" disabled={savingEvaluation} onClick={() => void submitEvaluation('rejected')} className="inline-flex items-center gap-1.5 rounded-md bg-danger-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-danger-700 disabled:opacity-50"><ThumbsDown className="h-3.5 w-3.5" /> Rejeter</button>
                        <button type="button" onClick={() => setEvaluatingIndex(null)} className="text-[11px] font-medium text-ink-500 hover:text-ink-800">Annuler</button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <section className="mt-4 border-t border-ink-200 pt-4">
              <label htmlFor="task-contribution" className="mb-2 block text-xs font-semibold text-ink-700">Ajouter une contribution</label>
              <textarea id="task-contribution" value={noteText} onChange={(event) => setNoteText(event.target.value)} rows={6} placeholder="Écrivez une note, un compte rendu ou une instruction..." className="w-full resize-y rounded-md border border-ink-300 bg-white px-3 py-3 text-sm leading-6 text-ink-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              {files.length > 0 && <div className="mt-2 space-y-1">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-2 text-xs text-ink-600"><Paperclip className="h-3.5 w-3.5 shrink-0" /><span className="break-all">{file.name}</span><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Retirer ${file.name}`} className="ml-auto shrink-0 text-ink-400 hover:text-danger-600"><X className="h-3.5 w-3.5" /></button></div>)}</div>}

              {!showContributionExtras ? (
                <button type="button" onClick={() => setShowContributionExtras(true)} className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-700 hover:text-primary-900">
                  <TrendingUp className="h-3.5 w-3.5" /> + Ajouter progression, difficultés et prochaine action
                </button>
              ) : (
                <div className="mt-3 space-y-2.5 rounded-md border border-ink-200 bg-ink-50/60 p-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-ink-700">Progression proposée (%)</label>
                    <input type="number" min={0} max={100} value={proposedProgress} onChange={(e) => setProposedProgress(e.target.value)} placeholder="Ex : 60" className="w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-ink-700">Difficultés rencontrées</label>
                    <textarea value={difficulties} onChange={(e) => setDifficulties(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-ink-700">Recommandation</label>
                    <textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} className="w-full resize-none rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink-700">Prochaine action</label>
                      <input type="text" value={nextAction} onChange={(e) => setNextAction(e.target.value)} className="w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-ink-700">Deadline de l'action</label>
                      <input type="date" value={nextActionDeadline} onChange={(e) => setNextActionDeadline(e.target.value)} className="w-full rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-primary-400" />
                    </div>
                  </div>
                </div>
              )}
              {error && <p role="alert" className="mt-2 text-xs text-danger-700">{error}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50"><Paperclip className="h-4 w-4" /> Joindre un fichier</button>
                  <input ref={fileInputRef} type="file" multiple onChange={(event) => setFiles((current) => [...current, ...Array.from(event.target.files ?? [])])} className="hidden" />
                </div>
                <button type="button" onClick={() => void handleAddNote()} disabled={(!noteText.trim() && files.length === 0) || addingNote} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50">
                  {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Publier
                </button>
              </div>
            </section>
          </div>
        </main>

        <aside className="order-1 min-w-0 bg-white px-4 py-5 sm:px-6 lg:order-2 lg:overflow-y-auto lg:border-l lg:border-ink-200">
          <section className="border-b border-ink-200 pb-4">
            <label htmlFor="task-status" className="mb-2 block text-xs font-bold uppercase text-ink-500">Statut</label>
            <select id="task-status" value={status} disabled={savingStatus} onChange={(event) => void handleStatusChange(event.target.value as TaskStatus)} className={`w-full rounded-md border border-ink-200 px-3 py-2 text-sm font-semibold outline-none focus:border-primary-400 ${taskStatusConfig[status].bg} ${taskStatusConfig[status].text}`}>
              {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{taskStatusConfig[option].label}</option>)}
            </select>
            {savingStatus && <p className="mt-1 text-[11px] text-ink-400">Mise à jour...</p>}
          </section>

          <section className="border-b border-ink-200 py-4">
            <h2 className="mb-3 text-xs font-bold uppercase text-ink-500">Responsable et membres</h2>
            <div className="space-y-3">
              {memberIds.map((id) => {
                const member = companyProfiles.find((profile) => profile.owner_id === id);
                const isResponsible = id === task.assignee_id;
                const fallbackName = task.assignee_names?.[memberIds.indexOf(id)] || task.assignee_name;
                return (
                  <div key={id} className="flex items-start gap-2.5">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isResponsible ? 'bg-primary-100 text-primary-700' : 'bg-ink-100 text-ink-600'}`}><User className="h-4 w-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-ink-800">{member?.full_name || fallbackName || member?.email || 'Membre'}</p>
                      <p className="break-all text-xs text-ink-500">{member?.email || member?.role_label || ''}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase text-ink-400">{isResponsible ? 'Responsable' : member?.role_label || 'Membre associé'}</p>
                    </div>
                  </div>
                );
              })}
              {memberIds.length === 0 && <p className="text-xs text-ink-400">Aucun membre affecté.</p>}
            </div>
          </section>

          <section className="border-b border-ink-200 py-4">
            <h2 className="mb-3 text-xs font-bold uppercase text-ink-500">Échéance et projet</h2>
            <div className="space-y-3 text-sm text-ink-700">
              {task.due_date && <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-warning-600" />{formatDate(task.due_date)}</p>}
              {task.project && <p className="flex items-center gap-2"><FolderKanban className="h-4 w-4 text-primary-500" />{task.project}{task.phase_name ? ` · ${task.phase_name}` : ''}</p>}
              {typeof task.weight === 'number' && <p className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-ink-400" />Poids dans le projet : {task.weight}%</p>}
              {task.proof_required && <p className="flex items-center gap-2 text-warning-700"><Paperclip className="h-4 w-4" />Preuve obligatoire pour les contributions</p>}
              {!task.due_date && !task.project && <p className="text-xs text-ink-400">Aucune échéance ou projet précisé.</p>}
            </div>
            {task.expected_result && (
              <div className="mt-3 rounded-md border border-ink-200 bg-ink-50 p-2.5">
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase text-ink-500"><Target className="h-3.5 w-3.5" /> Résultat attendu</p>
                <p className="text-xs text-ink-700">{task.expected_result}</p>
              </div>
            )}
          </section>

          {(task.attachments?.length ?? 0) > 0 && (
            <section className="py-4">
              <h2 className="mb-2 text-xs font-bold uppercase text-ink-500">Pièces jointes ({task.attachments?.length})</h2>
              <div className="space-y-2">{task.attachments?.map((attachment, index) => <a key={`${attachment.name}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-xs text-primary-700 hover:underline"><Paperclip className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 break-all">{attachment.name}</span><Link2 className="h-3 w-3 shrink-0" /></a>)}</div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
