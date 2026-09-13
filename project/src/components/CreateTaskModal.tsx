import { useRef, useState } from 'react';
import { Check, ChevronDown, FileText, Paperclip, Users, X } from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, firestore, getActiveCompanyContext, storage } from '@/lib/firebase';
import type { Priority, TaskAttachment } from '@/lib/types';

interface CompanyMemberOption {
  owner_id: string;
  full_name: string;
  email: string;
  role_label: string;
}

interface SourceDocument {
  id: string;
  title: string;
}

interface DocumentOption {
  id: string;
  title: string;
}

interface ProjectPhaseOption {
  id: string;
  name: string;
}

interface CreateTaskModalProps {
  companyProfiles: CompanyMemberOption[];
  sourceDocument?: SourceDocument | null;
  availableDocuments?: DocumentOption[];
  projectId?: string;
  projectName?: string;
  phases?: ProjectPhaseOption[];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}

const inputCls = 'w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400';
const labelCls = 'text-xs font-semibold text-ink-600 mb-1.5 block';

export default function CreateTaskModal({ companyProfiles, sourceDocument, availableDocuments = [], projectId, projectName, phases = [], onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [documentIds, setDocumentIds] = useState<string[]>(sourceDocument ? [sourceDocument.id] : []);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [project, setProject] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [weight, setWeight] = useState('');
  const [proofRequired, setProofRequired] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const membersDropdownRef = useRef<HTMLDetailsElement>(null);
  const documentsDropdownRef = useRef<HTMLDetailsElement>(null);

  const handleCreate = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
    const selectedIds = Array.from(new Set([assigneeId, ...memberIds].filter(Boolean)));
    const selectedMembers = companyProfiles.filter((member) => selectedIds.includes(member.owner_id));
    const createdBy = auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur';
    const responsible = companyProfiles.find((member) => member.owner_id === assigneeId);
    const selectedDocuments = availableDocuments.filter((document) => documentIds.includes(document.id));
    const phase = phases.find((p) => p.id === phaseId);
    const taskResult = await firestore.from('tasks').insert({
      title: title.trim(),
      notes: notes.trim(),
      project: projectId ? (projectName || '') : project.trim(),
      project_id: projectId ?? null,
      project_name: projectId ? projectName : undefined,
      phase_id: phaseId || null,
      phase_name: phase?.name,
      expected_result: expectedResult.trim(),
      weight: weight.trim() ? Number(weight) : null,
      proof_required: proofRequired,
      assignee_id: responsible?.owner_id ?? selectedMembers[0]?.owner_id ?? null,
      assignee_name: responsible?.full_name || selectedMembers[0]?.full_name || selectedMembers[0]?.email || 'Non assigné',
      assignee_ids: selectedIds,
      assignee_names: selectedMembers.map((member) => member.full_name || member.email),
      priority,
      status: 'new',
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      source_document_id: sourceDocument?.id ?? null,
      source_document_title: sourceDocument?.title ?? null,
      document_ids: documentIds,
      document_titles: selectedDocuments.map((document) => document.title),
      attachments: [],
      created_by: createdBy,
      activity: [],
    }).single();

    if (taskResult.error || !taskResult.data) throw new Error(taskResult.error?.message || 'task-create-failed');
    if (taskResult.data) {
      const taskId = (taskResult.data as { id: string }).id;
      const company = getActiveCompanyContext();
      const uploadedAttachments: TaskAttachment[] = await Promise.all(attachments.map(async (file) => {
        const path = company
          ? `companies/${company.id}/tasks/${taskId}/${Date.now()}-${file.name}`
          : `users/${auth.currentUser?.uid ?? 'unknown'}/tasks/${taskId}/${Date.now()}-${file.name}`;
        const uploaded = await uploadBytes(storageRef(storage, path), file);
        return { name: file.name, url: await getDownloadURL(uploaded.ref), type: file.type, size: file.size };
      }));
      if (uploadedAttachments.length > 0) await firestore.from('tasks').update({ attachments: uploadedAttachments }).eq('id', taskId);
      await Promise.all(selectedMembers.map((assignee) => firestore.from('notifications').insert({
        recipient_id: assignee.owner_id,
        recipient_email: assignee.email,
        type: 'task_assigned',
        title: 'Nouvelle tâche confiée',
        message: `${createdBy} vous a confié la tâche « ${title.trim()} ».`,
          task_id: taskId,
        read: false,
      })));
    }
    await onCreated();
    onClose();
    } catch (createError) {
      setError(createError instanceof Error && createError.message !== 'task-create-failed'
        ? `La tâche n’a pas pu être créée : ${createError.message}`
        : 'La tâche n’a pas pu être créée. Vérifiez votre connexion et réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-ink-900 text-lg">Créer une tâche</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sourceDocument && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-primary-50 border border-primary-200 text-xs text-primary-700">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Liée au document : <span className="font-semibold">{sourceDocument.title}</span></span>
          </div>
        )}

        {error && <p role="alert" className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Titre de la tâche</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Préparer le rapport mensuel" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Responsable</label>
              <details className="relative group">
                <summary className={`${inputCls} list-none cursor-pointer flex items-center justify-between`}>
                  <span className="truncate">{companyProfiles.find((member) => member.owner_id === assigneeId)?.full_name || 'Aucun responsable'}</span>
                  <ChevronDown className="h-4 w-4 text-ink-400 shrink-0 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-48 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl">
                  <label className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-600 hover:bg-ink-50 cursor-pointer">
                    <input type="radio" name="task-responsible" checked={!assigneeId} onChange={() => setAssigneeId('')} className="accent-primary-600" />
                    Aucun responsable
                  </label>
                  {companyProfiles.map((member) => (
                    <label key={member.owner_id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-700 hover:bg-primary-50 cursor-pointer">
                      <input type="radio" name="task-responsible" value={member.owner_id} checked={assigneeId === member.owner_id} onChange={() => setAssigneeId(member.owner_id)} className="accent-primary-600" />
                      <span className="truncate">{member.full_name || member.email}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
            <div>
              <label className={labelCls}>Projet</label>
              {projectId ? (
                <div className={`${inputCls} bg-primary-50 text-primary-700 font-medium truncate`}>{projectName}</div>
              ) : (
                <input type="text" value={project} onChange={(e) => setProject(e.target.value)} placeholder="Facultatif" className={inputCls} />
              )}
            </div>
          </div>

          {projectId && phases.length > 0 && (
            <div>
              <label className={labelCls}>Phase</label>
              <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputCls}>
                <option value="">Aucune phase précise</option>
                {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Membres associés</label>
            <details ref={membersDropdownRef} className="relative group">
              <summary className={`${inputCls} list-none cursor-pointer flex items-center justify-between`}>
                <span className="truncate">{memberIds.length ? `${memberIds.length} membre(s) sélectionné(s)` : 'Sélectionner les membres'}</span>
                <ChevronDown className="h-4 w-4 text-ink-400 shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-52 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl">
                <div className="sticky top-0 z-10 mb-1 flex items-center justify-between gap-2 border-b border-ink-100 bg-white px-1 pb-1.5">
                  <button type="button" onClick={() => setMemberIds(companyProfiles.map((member) => member.owner_id))} className="text-[11px] font-semibold text-primary-700 hover:text-primary-900">Tout sélectionner</button>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setMemberIds([])} className="text-[11px] font-medium text-ink-500 hover:text-ink-800">Effacer</button>
                    <button type="button" onClick={() => { if (membersDropdownRef.current) membersDropdownRef.current.open = false; }} className="text-[11px] font-medium text-ink-500 hover:text-ink-800">Fermer</button>
                  </div>
                </div>
                {companyProfiles.map((member) => {
                  const selected = memberIds.includes(member.owner_id);
                  return (
                    <label key={member.owner_id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-700 hover:bg-primary-50 cursor-pointer">
                      <input type="checkbox" checked={selected} onChange={() => setMemberIds((current) => selected ? current.filter((id) => id !== member.owner_id) : [...current, member.owner_id])} className="accent-primary-600" />
                      <span className="truncate">{member.full_name || member.email} · {member.role_label}</span>
                    </label>
                  );
                })}
                {companyProfiles.length === 0 && <p className="px-2 py-2 text-xs text-ink-400">Aucun utilisateur disponible.</p>}
              </div>
            </details>
            <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mt-1.5">
              <Users className="h-3 w-3" />
              {memberIds.length === 0 ? 'Aucun membre associé' : `${memberIds.length} membre(s) sélectionné(s)`}
            </div>
            {(assigneeId || memberIds.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {companyProfiles.filter((member) => [assigneeId, ...memberIds].includes(member.owner_id)).map((member) => (
                  <span key={member.owner_id} className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold text-primary-700">
                    <Check className="h-3 w-3" /> {member.full_name || member.email}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Échéance</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Priorité</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className={inputCls}>
                <option value="urgent">Urgente</option>
                <option value="high">Prioritaire</option>
                <option value="normal">Normale</option>
                <option value="low">Faible</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Preuve obligatoire ?</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setProofRequired(true)} className={`py-2 rounded-lg text-[11px] font-semibold border ${proofRequired ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-ink-600 border-ink-200'}`}>Oui</button>
              <button type="button" onClick={() => setProofRequired(false)} className={`py-2 rounded-lg text-[11px] font-semibold border ${!proofRequired ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-ink-600 border-ink-200'}`}>Non</button>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Détails, contexte, instructions..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {projectId && (
            <>
              <div>
                <label className={labelCls}>Résultat attendu</label>
                <textarea
                  value={expectedResult}
                  onChange={(e) => setExpectedResult(e.target.value)}
                  rows={2}
                  placeholder="Ex : 20 entreprises qualifiées avec coordonnées et décideurs identifiés."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Poids dans le projet (%)</label>
                <input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ex : 10" className={inputCls} />
                <p className="text-[10px] text-ink-400 mt-1">Utilisé pour calculer l'avancement réel du projet.</p>
              </div>
            </>
          )}

          <div className="pt-2 border-t border-ink-100">
            <label className={labelCls}>Documents internes à joindre</label>
            <details ref={documentsDropdownRef} className="relative group">
              <summary className={`${inputCls} list-none cursor-pointer flex items-center justify-between`}>
                <span className="truncate">{documentIds.length ? `${documentIds.length} document(s) sélectionné(s)` : 'Sélectionner des documents internes'}</span>
                <ChevronDown className="h-4 w-4 text-ink-400 shrink-0 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="absolute left-0 right-0 bottom-full mb-1 z-20 max-h-56 overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl">
                <div className="sticky top-0 z-10 mb-1 flex items-center justify-end gap-3 border-b border-ink-100 bg-white px-1 pb-1.5">
                  <button type="button" onClick={() => setDocumentIds([])} className="text-[11px] font-medium text-ink-500 hover:text-ink-800">Effacer</button>
                  <button type="button" onClick={() => { if (documentsDropdownRef.current) documentsDropdownRef.current.open = false; }} className="text-[11px] font-medium text-ink-500 hover:text-ink-800">Fermer</button>
                </div>
                {availableDocuments.map((document) => {
                  const selected = documentIds.includes(document.id);
                  return (
                    <label key={document.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-700 hover:bg-primary-50 cursor-pointer">
                      <input type="checkbox" checked={selected} onChange={() => setDocumentIds((current) => selected ? current.filter((id) => id !== document.id) : [...current, document.id])} className="accent-primary-600" />
                      <FileText className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                      <span className="truncate">{document.title}</span>
                    </label>
                  );
                })}
                {availableDocuments.length === 0 && <p className="px-2 py-2 text-xs text-ink-400">Aucun document interne disponible.</p>}
              </div>
            </details>
            {documentIds.length > 0 && (
              <ul className="mt-2 space-y-1">
                {availableDocuments.filter((document) => documentIds.includes(document.id)).map((document) => (
                  <li key={document.id} className="flex min-w-0 items-start gap-1.5 text-xs text-ink-600">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600" />
                    <span className="min-w-0 break-words">{document.title}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-ink-400 mt-1">Les documents sélectionnés seront visibles dans le détail de la tâche.</p>
          </div>

          <div>
            <label className={labelCls}>Pièces jointes</label>
            <label className="flex items-center gap-2 w-fit px-3 py-2 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-600 hover:border-primary-400 hover:text-primary-700 cursor-pointer">
              <Paperclip className="h-4 w-4" /> Ajouter des fichiers
              <input type="file" multiple onChange={(e) => setAttachments((current) => [...current, ...Array.from(e.target.files ?? [])])} className="hidden" />
            </label>
            {attachments.length > 0 && <div className="mt-2 space-y-1">{attachments.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 text-xs text-ink-600"><span className="truncate">{file.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-ink-400 hover:text-danger-600" aria-label={`Retirer ${file.name}`}><X className="h-3.5 w-3.5" /></button></div>)}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors">
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg hover:shadow-primary-600/20 transition-all"
          >
            {saving ? 'Création...' : 'Créer la tâche'}
          </button>
        </div>
      </div>
    </div>
  );
}
