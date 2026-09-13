import { useEffect, useState, type ReactNode } from 'react';
import { FileText, RotateCcw, Trash2, CheckSquare, AlertTriangle } from 'lucide-react';
import { deleteObject, ref as storageRef } from 'firebase/storage';
import { firestore, storage } from '@/lib/firebase';
import type { DocumentItem, TaskItem } from '@/lib/types';

interface TrashViewProps { onChanged: () => void; }

export function TrashView({ onChanged }: TrashViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [documentsResult, tasksResult] = await Promise.all([
      firestore.from<DocumentItem>('documents').select(),
      firestore.from<TaskItem>('tasks').select(),
    ]);
    setDocuments(((documentsResult.data as DocumentItem[] | null) ?? []).filter((item) => item.deleted_at));
    setTasks(((tasksResult.data as TaskItem[] | null) ?? []).filter((item) => item.deleted_at));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const restoreDocument = async (document: DocumentItem) => {
    await firestore.from('documents').update({ deleted_at: null, deleted_by: null }).eq('id', document.id);
    await load(); onChanged();
  };

  const permanentlyDeleteDocument = async (document: DocumentItem) => {
    await firestore.from('documents').delete().eq('id', document.id);
    if (document.image_url) { try { await deleteObject(storageRef(storage, document.image_url)); } catch { /* The file may already be unavailable. */ } }
    await load(); onChanged();
  };

  const restoreTask = async (task: TaskItem) => {
    await firestore.from('tasks').update({ deleted_at: null, deleted_by: null }).eq('id', task.id);
    await load(); onChanged();
  };

  const permanentlyDeleteTask = async (task: TaskItem) => {
    await firestore.from('tasks').delete().eq('id', task.id);
    for (const attachment of task.attachments ?? []) { try { await deleteObject(storageRef(storage, attachment.url)); } catch { /* The file may already be unavailable. */ } }
    await load(); onChanged();
  };

  return <div className="p-6 space-y-5 max-w-5xl mx-auto animate-fade-in">
    <div className="flex items-start gap-3"><Trash2 className="h-6 w-6 text-danger-600 mt-0.5" /><div><h2 className="text-lg font-bold text-ink-900">Corbeille</h2><p className="text-sm text-ink-500 mt-1">Les documents et tâches supprimés par la Direction Générale ou l’Administrateur sont conservés ici.</p></div></div>
    <div className="flex items-center gap-2 rounded-xl border border-warning-200 bg-warning-50 p-3 text-xs text-warning-800"><AlertTriangle className="h-4 w-4 shrink-0" /> La suppression définitive efface les données et les fichiers associés pour toute l’entreprise.</div>
    {loading ? <div className="py-14 text-center text-sm text-ink-400">Chargement de la corbeille...</div> : <>
      <TrashSection title="Documents" count={documents.length} icon={FileText}>
        {documents.map((document) => <TrashRow key={document.id} title={document.title} subtitle={`${document.sender} · Supprimé le ${new Date(document.deleted_at!).toLocaleDateString('fr-FR')}`} onRestore={() => restoreDocument(document)} onDelete={() => permanentlyDeleteDocument(document)} />)}
      </TrashSection>
      <TrashSection title="Tâches" count={tasks.length} icon={CheckSquare}>
        {tasks.map((task) => <TrashRow key={task.id} title={task.title} subtitle={`${task.assignee_name} · Supprimée le ${new Date(task.deleted_at!).toLocaleDateString('fr-FR')}`} onRestore={() => restoreTask(task)} onDelete={() => permanentlyDeleteTask(task)} />)}
      </TrashSection>
    </>}
  </div>;
}

function TrashSection({ title, count, icon: Icon, children }: { title: string; count: number; icon: typeof FileText; children: ReactNode }) {
  return <section className="bg-white rounded-2xl border border-ink-200/60 shadow-card overflow-hidden"><div className="flex items-center justify-between px-5 py-4 border-b border-ink-100"><h3 className="flex items-center gap-2 text-sm font-bold text-ink-900"><Icon className="h-4 w-4 text-ink-500" />{title}</h3><span className="text-xs text-ink-500">{count}</span></div><div className="divide-y divide-ink-100">{count ? children : <p className="px-5 py-8 text-center text-xs text-ink-400">Aucun élément dans la corbeille.</p>}</div></section>;
}

function TrashRow({ title, subtitle, onRestore, onDelete }: { title: string; subtitle: string; onRestore: () => void; onDelete: () => void }) {
  return <div className="flex items-center gap-3 px-5 py-3.5"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-800 truncate">{title}</p><p className="text-xs text-ink-400 truncate">{subtitle}</p></div><button onClick={onRestore} className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100"><RotateCcw className="h-3.5 w-3.5" /> Restaurer</button><button onClick={onDelete} className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold text-danger-700 bg-danger-50 hover:bg-danger-100"><Trash2 className="h-3.5 w-3.5" /> Supprimer définitivement</button></div>;
}
