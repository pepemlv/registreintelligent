import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Plus, Search, FolderKanban, Target, Calendar, Users, DollarSign, FileText,
  ChevronRight, ChevronDown, X, Check, Paperclip, Link2, CheckSquare,
  TrendingUp, AlertTriangle, Clock, Banknote, Receipt, ShieldAlert, Camera, ClipboardList, MessageSquare,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { auth, firestore, getActiveCompanyContext, storage } from '@/lib/firebase';
import { formatDate } from '@/lib/documentConfig';
import { computeProgress, computeDaysBetween, computeDaysRemaining } from '@/lib/projectProgress';
import { PriorityBadge, TaskStatusBadge } from '@/components/Badges';
import CreateTaskModal from '@/components/CreateTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import type {
  DocumentItem, ObjectiveUnit, ObjectiveUpdateMode, ProjectDocumentFile, ProjectExpense, ProjectFinancing,
  ProjectItem, ProjectModuleKey, ProjectObjective, ProjectPhase, ProjectPriority, ProjectRevenue, ProjectRisk,
  ProjectType, ProjectVisit, TaskItem,
  ExpenseStatus, RevenueStatus, FinancingType, RiskType, RiskProbability, RiskImpact, VisitType,
} from '@/lib/types';
import {
  PROJECT_TYPES, FOLLOW_UP_FREQUENCIES, PROJECT_MODULES, DEFAULT_PROJECT_MODULES, PROJECT_TYPE_MODULE_PRESETS,
} from '@/lib/types';

interface CompanyMemberOption {
  owner_id: string;
  full_name: string;
  email: string;
  role_label: string;
}

interface ProjectsViewProps {
  companyProfiles: CompanyMemberOption[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  onTasksChange: () => void;
  canManageTrash?: boolean;
}

const OBJECTIVE_UNITS: ObjectiveUnit[] = ['Nombre', '%', 'USD', 'CDF', 'EUR', 'Jours', 'Unités', 'Autre'];
const DOCUMENT_CATEGORIES = ['Contrat', 'Cahier des charges', 'Plan commercial', 'Budget', 'Présentation', 'Document Word/PDF', 'Autre'];
const EXPENSE_CATEGORIES = ["Matériaux", "Main d'œuvre", 'Équipement', 'Transport', 'Services', 'Administratif', 'Autre'];
const FINANCING_TYPES: FinancingType[] = ['Fonds propres', 'Client', 'Banque', 'Investisseur', 'Subvention', 'Partenaire', 'Autre'];
const EXPENSE_STATUSES: ExpenseStatus[] = ['Prévue', 'Engagée', 'Payée'];
const REVENUE_STATUSES: RevenueStatus[] = ['Prévue', 'Facturée', 'Partiellement encaissée', 'Encaissée', 'En retard'];
const RISK_TYPES: RiskType[] = ['Risque', 'Problème réel'];
const RISK_PROBABILITIES: RiskProbability[] = ['Faible', 'Moyenne', 'Élevée'];
const RISK_IMPACTS: RiskImpact[] = ['Faible', 'Moyen', 'Critique'];
const VISIT_TYPES: VisitType[] = ['Visite', 'Inspection', 'Contrôle', 'Réunion terrain'];

const priorityStyles: Record<ProjectPriority, { label: string; bg: string; text: string }> = {
  normal: { label: 'Normale', bg: 'bg-ink-100', text: 'text-ink-600' },
  high: { label: 'Haute', bg: 'bg-warning-100', text: 'text-warning-700' },
  urgent: { label: 'Urgente', bg: 'bg-danger-100', text: 'text-danger-700' },
};

const inputCls = 'w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400';
const labelCls = 'text-xs font-semibold text-ink-600 mb-1.5 block';

function generateId(): string {
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function toIso(dateInput: string): string | null {
  return dateInput ? new Date(dateInput).toISOString() : null;
}

async function uploadProjectFile(projectId: string, file: File, subfolder: string, category: string): Promise<ProjectDocumentFile> {
  const company = getActiveCompanyContext();
  const path = company
    ? `companies/${company.id}/projects/${projectId}/${subfolder}/${Date.now()}-${file.name}`
    : `users/${auth.currentUser?.uid ?? 'unknown'}/projects/${projectId}/${subfolder}/${Date.now()}-${file.name}`;
  const uploaded = await uploadBytes(storageRef(storage, path), file);
  return { name: file.name, url: await getDownloadURL(uploaded.ref), type: file.type, category };
}

function hasModule(project: ProjectItem, key: ProjectModuleKey): boolean {
  return !project.modules || project.modules.includes(key);
}

// ====== MODAL SHELL ======

function ModalShell({ title, onClose, children, maxWidth = 'max-w-sm' }: { title: string; onClose: () => void; children: ReactNode; maxWidth?: string }) {
  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl ${maxWidth} w-full p-6 animate-slide-up max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-ink-900 text-lg">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FileField({ label, onSelect, fileName }: { label: string; onSelect: (file: File) => void; fileName?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-600 hover:border-primary-400 hover:text-primary-700 cursor-pointer">
        <Paperclip className="h-3.5 w-3.5" /> {fileName || 'Joindre un fichier'}
        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); }} />
      </label>
    </div>
  );
}

// ====== MAIN VIEW ======

export function ProjectsView({ companyProfiles, documents, tasks, onTasksChange, canManageTrash = false }: ProjectsViewProps) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const loadProjects = async () => {
    setLoading(true);
    const { data } = await firestore.from<ProjectItem>('projects').select();
    setProjects(((data as ProjectItem[] | null) ?? []).filter((p) => !p.deleted_at));
    setLoading(false);
  };

  useEffect(() => { void loadProjects(); }, []);

  const handleCreated = async (project: ProjectItem) => {
    await loadProjects();
    setShowCreatePage(false);
    setSelectedProjectId(project.id);
  };

  if (showCreatePage) {
    return <CreateProjectPage companyProfiles={companyProfiles} onCancel={() => setShowCreatePage(false)} onCreated={handleCreated} />;
  }

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        companyProfiles={companyProfiles}
        documents={documents}
        tasks={tasks.filter((t) => t.project_id === selectedProject.id)}
        onTasksChange={onTasksChange}
        onProjectChange={loadProjects}
        onBack={() => setSelectedProjectId(null)}
        canManageTrash={canManageTrash}
      />
    );
  }

  const filtered = projects.filter((p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-ink-900 text-base">Projets</h2>
          <p className="text-xs text-ink-500">Pilotez vos projets internes : objectifs, phases, tâches, finances, risques et contributions.</p>
        </div>
        <button onClick={() => setShowCreatePage(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all">
          <Plus className="h-3.5 w-3.5" /> Nouveau projet
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200">
          <Search className="h-4 w-4 text-ink-400 shrink-0" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un projet..." className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700" />
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-ink-500">Chargement des projets...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-16 text-center">
          <FolderKanban className="h-10 w-10 text-ink-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-ink-700">Aucun projet pour le moment</p>
          <p className="text-xs text-ink-400 mt-1">Créez votre premier projet pour commencer à suivre son avancement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const progress = project.progress_mode === 'manual' ? (project.manual_progress ?? 0) : computeProgress(projectTasks);
            const daysRemaining = computeDaysRemaining(project.deadline);
            const priority = priorityStyles[project.priority];
            return (
              <button key={project.id} onClick={() => setSelectedProjectId(project.id)} className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shrink-0"><FolderKanban className="h-5 w-5" /></div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priority.bg} ${priority.text}`}>{priority.label}</span>
                </div>
                <h3 className="text-sm font-bold text-ink-800 group-hover:text-primary-700 mb-1">{project.name}</h3>
                <p className="text-xs text-ink-500 mb-3 line-clamp-2">{project.description}</p>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] text-ink-500 mb-1"><span>{progress}% réalisé</span>{daysRemaining !== null && <span>{daysRemaining >= 0 ? `${daysRemaining} j restants` : 'Échéance dépassée'}</span>}</div>
                  <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-500 to-accent-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-ink-100 text-[10px] text-ink-500">
                  <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {projectTasks.length} tâche{projectTasks.length === 1 ? '' : 's'}</span>
                  <ChevronRight className="h-4 w-4 text-ink-300 group-hover:text-primary-500" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ====== FULL-PAGE: NOUVEAU PROJET ======

function CreateProjectPage({ companyProfiles, onCancel, onCreated }: { companyProfiles: CompanyMemberOption[]; onCancel: () => void; onCreated: (project: ProjectItem) => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ProjectType>(PROJECT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [department, setDepartment] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [contributorIds, setContributorIds] = useState<string[]>([]);
  const [priority, setPriority] = useState<ProjectPriority>('normal');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [followUpFrequency, setFollowUpFrequency] = useState<typeof FOLLOW_UP_FREQUENCIES[number]>('Hebdomadaire');
  const [moduleSet, setModuleSet] = useState<Set<ProjectModuleKey>>(new Set(DEFAULT_PROJECT_MODULES));
  const [saving, setSaving] = useState(false);

  const duration = computeDaysBetween(startDate ? new Date(startDate).toISOString() : null, deadline ? new Date(deadline).toISOString() : null);

  const handleTypeChange = (next: ProjectType) => {
    setType(next);
    const preset = PROJECT_TYPE_MODULE_PRESETS[next] ?? DEFAULT_PROJECT_MODULES;
    setModuleSet(new Set(preset));
  };

  const toggleModule = (key: ProjectModuleKey) => setModuleSet((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    const owner = companyProfiles.find((m) => m.owner_id === ownerId);
    const contributors = companyProfiles.filter((m) => contributorIds.includes(m.owner_id));
    const createdBy = auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur';
    const payload: Partial<ProjectItem> = {
      name: name.trim(),
      description: description.trim(),
      expected_result: expectedResult.trim(),
      category: type,
      department: department.trim(),
      owner_member_id: ownerId,
      owner_name: owner?.full_name || owner?.email || 'Non assigné',
      contributor_ids: contributorIds,
      contributor_names: contributors.map((c) => c.full_name || c.email),
      priority,
      start_date: toIso(startDate),
      deadline: toIso(deadline),
      reminder_days: 7,
      follow_up_frequency: followUpFrequency,
      modules: Array.from(moduleSet),
      objectives: [],
      phases: [],
      financings: [],
      expenses: [],
      revenues: [],
      risks: [],
      visits: [],
      budget_enabled: moduleSet.has('budget'),
      budget_amount: null,
      budget_currency: 'USD',
      linked_document_ids: [],
      documents: [],
      progress_mode: 'auto',
      manual_progress: null,
      status: 'active',
      created_by: createdBy,
    };
    const result = await firestore.from('projects').insert(payload).single();
    setSaving(false);
    if (result.data) onCreated(result.data as ProjectItem);
  };

  const canSubmit = Boolean(name.trim() && description.trim() && expectedResult.trim() && ownerId && startDate && deadline);

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-3xl mx-auto">
      <button onClick={onCancel} className="text-sm font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5">← Retour aux projets</button>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <h1 className="font-display font-bold text-ink-900 text-xl mb-1">Nouveau projet</h1>
        <p className="text-xs text-ink-500 mb-6">Créez la structure de base. Vous ajouterez les phases, tâches, finances et risques depuis la fiche du projet.</p>

        <div className="space-y-6">
          <section>
            <p className="text-xs font-bold uppercase text-primary-600 mb-3">Informations générales</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Nom du projet *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Lancement Registre Intelligent – Kinshasa" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Type de projet *</label>
                <select value={type} onChange={(e) => handleTypeChange(e.target.value as ProjectType)} className={inputCls}>
                  {PROJECT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Description / objectif *</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>Résultat final attendu *</label>
                <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} rows={2} placeholder="Ex : Registre Intelligent déployé et utilisé par 4 clients payants." className={`${inputCls} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Département responsable</label>
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Sélectionner..." className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Responsable du projet *</label>
                  <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
                    <option value="">Sélectionner...</option>
                    {companyProfiles.map((m) => <option key={m.owner_id} value={m.owner_id}>{m.full_name || m.email}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Contributeurs</label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-ink-200 bg-ink-50 max-h-32 overflow-y-auto">
                  {companyProfiles.map((m) => {
                    const selected = contributorIds.includes(m.owner_id);
                    return (
                      <button key={m.owner_id} type="button" onClick={() => setContributorIds((current) => selected ? current.filter((id) => id !== m.owner_id) : [...current, m.owner_id])} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${selected ? 'bg-primary-600 text-white' : 'bg-white text-ink-600 border border-ink-200'}`}>
                        {selected && <Check className="inline h-3 w-3 mr-1" />}{m.full_name || m.email}
                      </button>
                    );
                  })}
                  {companyProfiles.length === 0 && <p className="text-xs text-ink-400 px-1">Aucun membre disponible.</p>}
                </div>
              </div>
              <div>
                <label className={labelCls}>Priorité</label>
                <div className="grid grid-cols-3 gap-1.5 max-w-xs">
                  {(['normal', 'high', 'urgent'] as ProjectPriority[]).map((p) => (
                    <button key={p} type="button" onClick={() => setPriority(p)} className={`py-2 rounded-lg text-[11px] font-semibold border ${priority === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-ink-600 border-ink-200'}`}>{priorityStyles[p].label}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="pt-5 border-t border-ink-100">
            <p className="text-xs font-bold uppercase text-primary-600 mb-3">Calendrier</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className={labelCls}>Date de début *</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Deadline *</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
              </div>
            </div>
            {duration !== null && <p className="text-[11px] text-ink-500 mb-3">Durée calculée automatiquement : <strong>{duration} jours</strong></p>}
            <div className="max-w-xs">
              <label className={labelCls}>Fréquence de suivi</label>
              <select value={followUpFrequency} onChange={(e) => setFollowUpFrequency(e.target.value as typeof FOLLOW_UP_FREQUENCIES[number])} className={inputCls}>
                {FOLLOW_UP_FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
          </section>

          <section className="pt-5 border-t border-ink-100">
            <p className="text-xs font-bold uppercase text-primary-600 mb-1">Modules du projet</p>
            <p className="text-[11px] text-ink-500 mb-3">Que souhaitez-vous suivre dans ce projet ? Le type de projet précoche certains modules ; vous pouvez les ajuster librement.</p>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_MODULES.map((m) => {
                const checked = moduleSet.has(m.key);
                return (
                  <label key={m.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-xs font-medium ${checked ? 'border-primary-300 bg-primary-50 text-primary-800' : 'border-ink-200 text-ink-600'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleModule(m.key)} className="accent-primary-600" />
                    {m.label}
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex items-center gap-2 mt-7">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors">Annuler</button>
          <button onClick={() => void handleSubmit()} disabled={!canSubmit || saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg transition-all">
            {saving ? 'Création...' : 'Créer et configurer →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== PROJECT DETAIL ======

type ProjectTab = 'overview' | 'phases' | 'tasks' | 'contributions' | 'documents' | 'finances' | 'risks' | 'team' | 'reports';

function ProjectDetail({ project, companyProfiles, documents, tasks, onTasksChange, onProjectChange, onBack, canManageTrash }: {
  project: ProjectItem;
  companyProfiles: CompanyMemberOption[];
  documents: DocumentItem[];
  tasks: TaskItem[];
  onTasksChange: () => void;
  onProjectChange: () => void;
  onBack: () => void;
  canManageTrash?: boolean;
}) {
  const [tab, setTab] = useState<ProjectTab>('overview');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAttachTask, setShowAttachTask] = useState(false);
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [showAddObjective, setShowAddObjective] = useState(false);
  const [showAttachDoc, setShowAttachDoc] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);
  const [showAddFinancing, setShowAddFinancing] = useState(false);
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showChooseTask, setShowChooseTask] = useState(false);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const progress = project.progress_mode === 'manual' ? (project.manual_progress ?? 0) : computeProgress(tasks);
  const daysRemaining = computeDaysRemaining(project.deadline);
  const completedTasks = tasks.filter((t) => t.status === 'validated' || t.status === 'closed').length;
  const overdueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'closed' && t.status !== 'validated').length;
  const allContributions = tasks.flatMap((t) => (t.activity ?? []).map((entry, index) => ({ entry, task: t, index })));
  const validatedContributions = allContributions.filter((c) => c.entry.evaluation?.decision === 'validated').length;
  const pendingContributions = allContributions.filter((c) => typeof c.entry.proposed_progress === 'number' && !c.entry.evaluation).length;

  const has = (key: ProjectModuleKey) => hasModule(project, key);
  const financeEnabled = has('budget') || has('financing') || has('revenues') || has('billing');

  const updateObjectiveCurrent = async (objectiveId: string, current: number) => {
    const nextObjectives = project.objectives.map((o) => o.id === objectiveId ? { ...o, current } : o);
    await firestore.from('projects').update({ objectives: nextObjectives }).eq('id', project.id);
    onProjectChange();
  };

  if (selectedTask) {
    return (
      <TaskDetailModal
        task={selectedTask}
        companyProfiles={companyProfiles}
        onClose={() => setSelectedTaskId(null)}
        onChanged={onTasksChange}
        canManageTrash={canManageTrash}
      />
    );
  }

  const tabs: { id: ProjectTab; label: string; icon: typeof FolderKanban }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: FolderKanban },
    ...(has('phases') ? [{ id: 'phases' as const, label: 'Phases', icon: Target }] : []),
    ...(has('tasks') ? [{ id: 'tasks' as const, label: 'Tâches', icon: CheckSquare }] : []),
    ...(has('contributions') ? [{ id: 'contributions' as const, label: 'Contributions', icon: MessageSquare }] : []),
    ...(has('documents') ? [{ id: 'documents' as const, label: 'Documents', icon: FileText }] : []),
    ...(financeEnabled ? [{ id: 'finances' as const, label: 'Finances', icon: DollarSign }] : []),
    ...(has('risks') ? [{ id: 'risks' as const, label: 'Risques', icon: ShieldAlert }] : []),
    { id: 'team', label: 'Équipe', icon: Users },
    { id: 'reports', label: 'Rapports', icon: ClipboardList },
  ];
  const activeTab: ProjectTab = tabs.some((t) => t.id === tab) ? tab : 'overview';

  const addMenuItems: { label: string; action: () => void }[] = [
    ...(has('tasks') ? [{ label: 'Tâche', action: () => { setTab('tasks'); setShowCreateTask(true); } }] : []),
    ...(has('phases') ? [{ label: 'Phase', action: () => { setTab('phases'); setShowAddPhase(true); } }] : []),
    ...(has('objectives') ? [{ label: 'Objectif', action: () => { setTab('overview'); setShowAddObjective(true); } }] : []),
    ...(has('contributions') && tasks.length > 0 ? [{ label: 'Contribution', action: () => { setShowChooseTask(true); } }] : []),
    ...(has('documents') ? [{ label: 'Document', action: () => { setTab('documents'); } }] : []),
    ...(has('budget') ? [{ label: 'Dépense', action: () => { setTab('finances'); setShowAddExpense(true); } }] : []),
    ...(has('revenues') ? [{ label: 'Recette', action: () => { setTab('finances'); setShowAddRevenue(true); } }] : []),
    ...(has('financing') ? [{ label: 'Financement', action: () => { setTab('finances'); setShowAddFinancing(true); } }] : []),
    ...(has('risks') ? [{ label: 'Risque', action: () => { setTab('risks'); setShowAddRisk(true); } }] : []),
    ...(has('visits') ? [{ label: 'Visite', action: () => { setTab('reports'); setShowAddVisit(true); } }] : []),
  ];

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
      <button onClick={onBack} className="text-sm font-medium text-ink-500 hover:text-primary-600 flex items-center gap-1.5">← Retour aux projets</button>

      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityStyles[project.priority].bg} ${priorityStyles[project.priority].text}`}>{priorityStyles[project.priority].label}</span>
              <span className="text-[10px] text-ink-400">{project.category}{project.department ? ` · ${project.department}` : ''}{project.follow_up_frequency ? ` · Suivi ${project.follow_up_frequency.toLowerCase()}` : ''}</span>
            </div>
            <h1 className="font-display text-xl font-bold text-ink-900">{project.name}</h1>
            <p className="text-sm text-ink-500 mt-1">{project.description}</p>
            {project.expected_result && <p className="text-xs text-ink-500 mt-1"><span className="font-semibold text-ink-600">Résultat attendu :</span> {project.expected_result}</p>}
          </div>
          <details className="relative" open={addMenuOpen} onToggle={(e) => setAddMenuOpen((e.target as HTMLDetailsElement).open)}>
            <summary className="list-none cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all">
              <Plus className="h-3.5 w-3.5" /> Ajouter <ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <div className="absolute right-0 top-full mt-1.5 z-20 w-48 rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl">
              {addMenuItems.map((item) => (
                <button key={item.label} type="button" onClick={() => { item.action(); setAddMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-ink-700 hover:bg-primary-50 hover:text-primary-700">{item.label}</button>
              ))}
              {addMenuItems.length === 0 && <p className="px-3 py-2 text-xs text-ink-400">Aucun module activé.</p>}
            </div>
          </details>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl font-display font-bold text-primary-700">{progress}%</span>
          <span className="text-sm text-ink-500">réalisé{daysRemaining !== null && ` — ${daysRemaining >= 0 ? `${daysRemaining} jours restants` : 'échéance dépassée'}`}</span>
        </div>
        <div className="h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-500 to-accent-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} /></div>
      </div>

      <div className="flex items-center gap-1 rounded-2xl border border-ink-200 bg-white p-1.5 w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-primary-600 text-white' : 'text-ink-500 hover:bg-ink-100'}`}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {has('tasks') && <StatCard icon={CheckSquare} label="Tâches" value={`${completedTasks}/${tasks.length}`} sub="terminées" color="text-primary-600" bg="bg-primary-50" />}
            {has('tasks') && <StatCard icon={AlertTriangle} label="En retard" value={String(overdueTasks)} sub="tâches" color="text-danger-600" bg="bg-danger-50" />}
            {has('contributions') && <StatCard icon={TrendingUp} label="Contributions" value={String(allContributions.length)} sub={`${validatedContributions} validées`} color="text-accent-600" bg="bg-accent-50" />}
            {has('contributions') && <StatCard icon={Clock} label="À évaluer" value={String(pendingContributions)} sub="contributions" color="text-warning-600" bg="bg-warning-50" />}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(250px,0.8fr)_minmax(0,1.8fr)]">
            <section className="rounded-xl border border-ink-200 bg-white p-5">
              <h3 className="text-sm font-bold text-ink-800">Évolution du projet</h3>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <CircleChart value={progress} size={148} color="#2563eb" label="Avancement global du projet" />
                <div className="space-y-3 text-center sm:text-left">
                  <div><p className="text-lg font-bold text-ink-900">{completedTasks} / {tasks.length}</p><p className="text-xs text-ink-500">Tâches terminées</p></div>
                  <div><p className="text-lg font-bold text-danger-700">{overdueTasks}</p><p className="text-xs text-ink-500">Tâches en retard</p></div>
                  <p className="text-[11px] text-ink-400">{project.progress_mode === 'manual' ? 'Progression définie manuellement' : 'Calculée selon le poids et l’état des tâches'}</p>
                </div>
              </div>
            </section>

            {has('objectives') && <section className="rounded-xl border border-ink-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold text-ink-800">Indicateurs clés (KPI)</h3><p className="mt-1 text-xs text-ink-500">Progression mesurée par objectif</p></div>
                <span className="text-xs text-ink-400">{project.objectives.length} objectif{project.objectives.length === 1 ? '' : 's'}</span>
              </div>
              {project.objectives.length === 0 ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-ink-200 px-4 text-center text-xs text-ink-500">Ajoutez un objectif mesurable pour suivre un KPI.</div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                  {project.objectives.map((objective, index) => {
                    const kpiProgress = objective.target > 0 ? Math.round(Math.max(0, Math.min(100, objective.current / objective.target * 100))) : 0;
                    const kpiColors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#0891b2', '#4f46e5'];
                    return (
                      <div key={objective.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-ink-100 p-3">
                        <CircleChart value={kpiProgress} size={76} color={kpiColors[index % kpiColors.length]} label={`Progression de ${objective.label}`} />
                        <div className="min-w-0"><p className="break-words text-xs font-semibold text-ink-800">{objective.label}</p><p className="mt-1 text-[11px] text-ink-500">{objective.current} / {objective.target} {objective.unit}</p>{objective.deadline && <p className="mt-1 text-[10px] text-ink-400">Échéance : {formatDate(objective.deadline)}</p>}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>}
          </div>

          {has('objectives') && (
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-ink-800 flex items-center gap-2"><Target className="h-4 w-4 text-primary-600" /> Objectifs mesurables</h3>
                <button onClick={() => setShowAddObjective(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900"><Plus className="h-3 w-3" /> Ajouter un objectif</button>
              </div>
              {project.objectives.length === 0 ? <p className="text-xs text-ink-400">Aucun objectif pour le moment.</p> : (
                <div className="space-y-2.5">
                  {project.objectives.map((obj) => (
                    <div key={obj.id} className="flex items-center gap-3">
                      <span className="text-sm text-ink-700 flex-1">{obj.label}</span>
                      {obj.update_mode === 'manual' ? (
                        <input
                          type="number"
                          defaultValue={obj.current}
                          onBlur={(e) => { const v = Number(e.target.value); if (v !== obj.current) void updateObjectiveCurrent(obj.id, v); }}
                          className="w-16 px-2 py-1 rounded-lg border border-ink-200 text-xs text-center outline-none focus:border-primary-400"
                        />
                      ) : (
                        <span className="w-16 text-xs text-center text-ink-500" title={obj.update_mode === 'from_tasks' ? 'Mis à jour depuis les tâches' : 'Mis à jour automatiquement'}>{obj.current}</span>
                      )}
                      <span className="text-xs text-ink-400 w-10">/ {obj.target}</span>
                      <span className="text-[10px] font-semibold text-ink-500 w-10">{obj.unit}</span>
                      <div className="w-20 h-1.5 bg-ink-100 rounded-full overflow-hidden shrink-0"><div className="h-full bg-accent-500" style={{ width: `${obj.target > 0 ? Math.min(100, (obj.current / obj.target) * 100) : 0}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {has('phases') && project.phases.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
              <h3 className="text-sm font-bold text-ink-800 mb-3">Phases</h3>
              <div className="space-y-2">
                {project.phases.map((phase) => {
                  const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
                  const phaseProgress = computeProgress(phaseTasks);
                  const dot = phaseProgress >= 100 ? '🟢' : phaseProgress > 0 ? '🟡' : '⚪';
                  return (
                    <div key={phase.id} className="flex items-center gap-3">
                      <span>{dot}</span>
                      <span className="text-sm text-ink-700 flex-1 truncate">{phase.name}</span>
                      <span className="text-xs text-ink-500 w-10">{phaseProgress}%</span>
                      <div className="w-32 h-1.5 bg-ink-100 rounded-full overflow-hidden shrink-0"><div className="h-full bg-primary-500" style={{ width: `${phaseProgress}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'phases' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setShowAddPhase(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"><Plus className="h-3.5 w-3.5" /> Ajouter une phase</button></div>
          {project.phases.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-12 text-center"><Target className="h-8 w-8 text-ink-300 mx-auto mb-2" /><p className="text-sm text-ink-500">Aucune phase pour le moment.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {project.phases.map((phase, index) => {
                const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
                const phaseProgress = computeProgress(phaseTasks);
                const linkedObjective = project.objectives.find((o) => o.id === phase.linked_objective_id);
                return (
                  <div key={phase.id} className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
                    <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-bold uppercase text-ink-400">Phase {index + 1}{typeof phase.weight === 'number' ? ` · Poids ${phase.weight}%` : ''}</span><span className="text-xs font-semibold text-primary-700">{phaseProgress}%</span></div>
                    <h4 className="text-sm font-bold text-ink-800 mb-1">{phase.name}</h4>
                    {phase.description && <p className="text-xs text-ink-500 mb-2">{phase.description}</p>}
                    <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mb-3"><div className="h-full bg-primary-500" style={{ width: `${phaseProgress}%` }} /></div>
                    <div className="space-y-1 text-xs text-ink-600">
                      {phase.expected_result && <p className="flex items-center gap-1.5"><Target className="h-3 w-3 text-ink-400 shrink-0" /> {phase.expected_result}</p>}
                      {phase.deadline && <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-ink-400" /> {formatDate(phase.deadline)}</p>}
                      {phase.budget !== null && phase.budget !== undefined && <p className="flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-ink-400" /> {phase.budget} USD</p>}
                      {phase.owner_name && <p className="flex items-center gap-1.5"><Users className="h-3 w-3 text-ink-400" /> {phase.owner_name}{phase.contributor_names.length > 0 ? `, ${phase.contributor_names.join(', ')}` : ''}</p>}
                      {linkedObjective && <p className="flex items-center gap-1.5 text-accent-700"><Target className="h-3 w-3 shrink-0" /> Objectif : {linkedObjective.label}</p>}
                      <p className="text-ink-400">{phaseTasks.length} tâche{phaseTasks.length === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAttachTask(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-ink-100 text-ink-700 hover:bg-ink-200"><Link2 className="h-3.5 w-3.5" /> Attacher une tâche existante</button>
            <button onClick={() => setShowCreateTask(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"><Plus className="h-3.5 w-3.5" /> Créer une nouvelle tâche</button>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-ink-100 bg-ink-50/50">
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-3">Tâche</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Responsable</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Phase</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Poids</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Échéance</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Priorité</th>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Statut</th>
                </tr></thead>
                <tbody className="divide-y divide-ink-100">
                  {tasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTaskId(task.id)} className="hover:bg-ink-50/50 cursor-pointer">
                      <td className="px-5 py-3.5 text-sm font-semibold text-ink-800">{task.title}{task.proof_required && <Paperclip className="inline h-3 w-3 ml-1.5 text-warning-600" />}</td>
                      <td className="px-3 py-3.5 text-xs text-ink-700">{task.assignee_name}</td>
                      <td className="px-3 py-3.5 text-xs text-ink-600">{task.phase_name || '—'}</td>
                      <td className="px-3 py-3.5 text-xs text-ink-600">{typeof task.weight === 'number' ? `${task.weight}%` : '—'}</td>
                      <td className="px-3 py-3.5 text-xs text-ink-600">{task.due_date ? formatDate(task.due_date) : '—'}</td>
                      <td className="px-3 py-3.5"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-3 py-3.5"><TaskStatusBadge status={task.status} size="xs" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tasks.length === 0 && <div className="py-16 text-center"><CheckSquare className="h-10 w-10 text-ink-300 mx-auto mb-3" /><p className="text-sm font-semibold text-ink-700">Aucune tâche liée à ce projet</p></div>}
          </div>
        </div>
      )}

      {activeTab === 'contributions' && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          {allContributions.length === 0 ? (
            <div className="py-16 text-center"><MessageSquare className="h-10 w-10 text-ink-300 mx-auto mb-3" /><p className="text-sm font-semibold text-ink-700">Aucune contribution pour le moment</p></div>
          ) : (
            <div className="divide-y divide-ink-100">
              {[...allContributions].reverse().map(({ entry, task, index }) => (
                <button key={`${task.id}-${index}`} onClick={() => setSelectedTaskId(task.id)} className="w-full text-left p-4 hover:bg-ink-50/60 flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink-800">{entry.author} <span className="font-normal text-ink-400">· {task.title}</span></span>
                    <span className="text-[10px] text-ink-400">{formatDate(entry.created_at)}</span>
                  </div>
                  {entry.content && <p className="text-xs text-ink-600 line-clamp-2">{entry.content}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    {typeof entry.proposed_progress === 'number' && <span className="text-[10px] font-semibold text-primary-700">{entry.proposed_progress}% proposé</span>}
                    {entry.evaluation && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${entry.evaluation.decision === 'validated' ? 'bg-accent-100 text-accent-700' : entry.evaluation.decision === 'correction_requested' ? 'bg-warning-100 text-warning-700' : 'bg-danger-100 text-danger-700'}`}>
                        {entry.evaluation.decision === 'validated' ? 'Validée' : entry.evaluation.decision === 'correction_requested' ? 'À corriger' : 'Rejetée'}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && <ProjectDocumentsTab project={project} documents={documents} onProjectChange={onProjectChange} showAttach={showAttachDoc} setShowAttach={setShowAttachDoc} />}
      {activeTab === 'finances' && (
        <ProjectFinancesTab
          project={project}
          hasBudget={has('budget')}
          hasFinancing={has('financing')}
          hasRevenues={has('revenues')}
          onProjectChange={onProjectChange}
          showAddExpense={showAddExpense} setShowAddExpense={setShowAddExpense}
          showAddRevenue={showAddRevenue} setShowAddRevenue={setShowAddRevenue}
          showAddFinancing={showAddFinancing} setShowAddFinancing={setShowAddFinancing}
        />
      )}
      {activeTab === 'risks' && <ProjectRisksTab project={project} onProjectChange={onProjectChange} showAddRisk={showAddRisk} setShowAddRisk={setShowAddRisk} />}
      {activeTab === 'team' && <ProjectTeamTab project={project} tasks={tasks} companyProfiles={companyProfiles} />}
      {activeTab === 'reports' && (
        <ProjectReportsTab
          project={project}
          tasks={tasks}
          progress={progress}
          hasVisits={has('visits')}
          onProjectChange={onProjectChange}
          showAddVisit={showAddVisit} setShowAddVisit={setShowAddVisit}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          companyProfiles={companyProfiles}
          projectId={project.id}
          projectName={project.name}
          phases={project.phases.map((p) => ({ id: p.id, name: p.name }))}
          availableDocuments={documents}
          onClose={() => setShowCreateTask(false)}
          onCreated={onTasksChange}
        />
      )}

      {showAttachTask && (
        <AttachTaskModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowAttachTask(false)}
          onAttached={onTasksChange}
        />
      )}

      {showAddPhase && (
        <AddPhaseModal project={project} companyProfiles={companyProfiles} onClose={() => setShowAddPhase(false)} onAdded={onProjectChange} />
      )}

      {showAddObjective && (
        <AddObjectiveModal project={project} companyProfiles={companyProfiles} onClose={() => setShowAddObjective(false)} onAdded={onProjectChange} />
      )}

      {showChooseTask && (
        <ChooseTaskModal tasks={tasks} onClose={() => setShowChooseTask(false)} onChosen={(taskId) => { setSelectedTaskId(taskId); setShowChooseTask(false); }} />
      )}
    </div>
  );
}

function CircleChart({ value, size, color, label }: { value: number; size: number; color: string; label: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div role="img" aria-label={`${label} : ${safeValue}%`} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - safeValue / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center"><span className="text-base font-bold text-ink-800">{safeValue}%</span></div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: { icon: typeof CheckSquare; label: string; value: string; sub: string; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
      <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-2`}><Icon className={`h-4.5 w-4.5 ${color}`} /></div>
      <p className="text-xl font-display font-bold text-ink-900 leading-none">{value}</p>
      <p className="text-[11px] text-ink-500 mt-1">{label} · {sub}</p>
    </div>
  );
}

// ====== CHOOSE TASK (for a Contribution) ======

function ChooseTaskModal({ tasks, onClose, onChosen }: { tasks: TaskItem[]; onClose: () => void; onChosen: (taskId: string) => void }) {
  const [search, setSearch] = useState('');
  const filtered = tasks.filter((t) => !search.trim() || t.title.toLowerCase().includes(search.toLowerCase()));
  return (
    <ModalShell title="Choisir une tâche" onClose={onClose} maxWidth="max-w-md">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une tâche..." className={`${inputCls} mb-3`} />
      {filtered.length === 0 ? <p className="text-xs text-ink-400 text-center py-6">Aucune tâche dans ce projet.</p> : (
        <div className="space-y-1.5">
          {filtered.map((task) => (
            <button key={task.id} onClick={() => onChosen(task.id)} className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-ink-100 hover:border-primary-300 hover:bg-primary-50/40 text-left">
              <span className="text-sm text-ink-700 truncate">{task.title}</span>
              <ChevronRight className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ====== ATTACH EXISTING TASK ======

function AttachTaskModal({ projectId, projectName, onClose, onAttached }: { projectId: string; projectName: string; onClose: () => void; onAttached: () => void }) {
  const [allTasks, setAllTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void firestore.from<TaskItem>('tasks').select().then(({ data }) => {
      setAllTasks(((data as TaskItem[] | null) ?? []).filter((t) => !t.deleted_at && !t.project_id));
      setLoading(false);
    });
  }, []);

  const attach = async (task: TaskItem) => {
    await firestore.from('tasks').update({ project_id: projectId, project_name: projectName, project: projectName }).eq('id', task.id);
    onAttached();
    onClose();
  };

  const filtered = allTasks.filter((t) => !search.trim() || t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <ModalShell title="Attacher une tâche existante" onClose={onClose} maxWidth="max-w-md">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une tâche..." className={`${inputCls} mb-3`} />
      {loading ? <p className="text-xs text-ink-400 text-center py-6">Chargement...</p> : filtered.length === 0 ? (
        <p className="text-xs text-ink-400 text-center py-6">Aucune tâche indépendante disponible.</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((task) => (
            <button key={task.id} onClick={() => void attach(task)} className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-ink-100 hover:border-primary-300 hover:bg-primary-50/40 text-left">
              <span className="text-sm text-ink-700 truncate">{task.title}</span>
              <Link2 className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

// ====== AJOUTER UN OBJECTIF ======

function AddObjectiveModal({ project, companyProfiles, onClose, onAdded }: { project: ProjectItem; companyProfiles: CompanyMemberOption[]; onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [initialValue, setInitialValue] = useState('0');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState<ObjectiveUnit>('Nombre');
  const [deadline, setDeadline] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [weight, setWeight] = useState('');
  const [updateMode, setUpdateMode] = useState<ObjectiveUpdateMode>('manual');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!label.trim() || !target.trim() || saving) return;
    setSaving(true);
    const owner = companyProfiles.find((m) => m.owner_id === ownerId);
    const newObjective: ProjectObjective = {
      id: generateId(),
      label: label.trim(),
      initial_value: Number(initialValue) || 0,
      target: Number(target) || 0,
      unit,
      current: Number(initialValue) || 0,
      deadline: toIso(deadline),
      owner_member_id: ownerId || null,
      owner_name: owner?.full_name || owner?.email || '',
      weight: weight.trim() ? Number(weight) : null,
      update_mode: updateMode,
    };
    await firestore.from('projects').update({ objectives: [...project.objectives, newObjective] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Ajouter un objectif" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Nom de l'indicateur *</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Nombre de clients payants" className={inputCls} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Valeur initiale</label>
            <input type="number" value={initialValue} onChange={(e) => setInitialValue(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Valeur cible *</label>
            <input type="number" value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Unité</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as ObjectiveUnit)} className={inputCls}>
              {OBJECTIVE_UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Responsable</label>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
              <option value="">Sélectionner...</option>
              {companyProfiles.map((m) => <option key={m.owner_id} value={m.owner_id}>{m.full_name || m.email}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Poids dans l'évolution du projet (%)</label>
          <input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Comment la valeur est-elle mise à jour ?</label>
          <div className="grid grid-cols-3 gap-1.5">
            {([['manual', 'Manuellement'], ['from_tasks', 'Depuis les tâches'], ['automatic', 'Automatiquement']] as [ObjectiveUpdateMode, string][]).map(([value, lbl]) => (
              <button key={value} type="button" onClick={() => setUpdateMode(value)} className={`py-2 rounded-lg text-[10px] font-semibold border ${updateMode === value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-ink-600 border-ink-200'}`}>{lbl}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200">Annuler</button>
        <button onClick={() => void handleAdd()} disabled={!label.trim() || !target.trim() || saving} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Ajout...' : 'Ajouter'}</button>
      </div>
    </ModalShell>
  );
}

// ====== AJOUTER UNE PHASE ======

function AddPhaseModal({ project, companyProfiles, onClose, onAdded }: { project: ProjectItem; companyProfiles: CompanyMemberOption[]; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [contributorIds, setContributorIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [linkedObjectiveId, setLinkedObjectiveId] = useState('');
  const [budget, setBudget] = useState('');
  const [weight, setWeight] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const owner = companyProfiles.find((m) => m.owner_id === ownerId);
    const contributors = companyProfiles.filter((m) => contributorIds.includes(m.owner_id));
    const newPhase: ProjectPhase = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      deadline: toIso(deadline),
      start_date: toIso(startDate),
      budget: budget.trim() ? Number(budget) : null,
      owner_member_id: ownerId || null,
      owner_name: owner?.full_name || owner?.email || '',
      contributor_ids: contributorIds,
      contributor_names: contributors.map((c) => c.full_name || c.email),
      expected_result: expectedResult.trim(),
      linked_objective_id: linkedObjectiveId || null,
      weight: weight.trim() ? Number(weight) : null,
    };
    await firestore.from('projects').update({ phases: [...project.phases, newPhase] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Ajouter une phase" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Nom *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Prospection et démonstrations" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Responsable *</label>
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
            <option value="">Sélectionner...</option>
            {companyProfiles.map((m) => <option key={m.owner_id} value={m.owner_id}>{m.full_name || m.email}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Contributeurs</label>
          <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-ink-200 bg-ink-50 max-h-28 overflow-y-auto">
            {companyProfiles.map((m) => {
              const selected = contributorIds.includes(m.owner_id);
              return (
                <button key={m.owner_id} type="button" onClick={() => setContributorIds((cur) => selected ? cur.filter((id) => id !== m.owner_id) : [...cur, m.owner_id])} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${selected ? 'bg-primary-600 text-white' : 'bg-white text-ink-600 border border-ink-200'}`}>
                  {selected && <Check className="inline h-3 w-3 mr-1" />}{m.full_name || m.email}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Date de début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Deadline</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Résultat attendu</label>
          <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} rows={2} placeholder="Ex : 5 démonstrations qualifiées réalisées" className={`${inputCls} resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Objectif associé</label>
          <select value={linkedObjectiveId} onChange={(e) => setLinkedObjectiveId(e.target.value)} className={inputCls}>
            <option value="">Aucun</option>
            {project.objectives.map((o) => <option key={o.id} value={o.id}>{o.label} : {o.target}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Budget prévu</label>
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="USD" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Poids dans le projet (%)</label>
            <input type="number" min={0} max={100} value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>
      <button onClick={() => void handleAdd()} disabled={!name.trim() || saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Ajout...' : 'Ajouter la phase'}</button>
    </ModalShell>
  );
}

// ====== DOCUMENTS TAB ======

function ProjectDocumentsTab({ project, documents, onProjectChange, showAttach, setShowAttach }: { project: ProjectItem; documents: DocumentItem[]; onProjectChange: () => void; showAttach: boolean; setShowAttach: (v: boolean) => void }) {
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded = await Promise.all(Array.from(files).map((file) => uploadProjectFile(project.id, file, 'documents', category)));
    await firestore.from('projects').update({ documents: [...(project.documents ?? []), ...uploaded] }).eq('id', project.id);
    setUploading(false);
    onProjectChange();
  };

  const linkedDocuments = documents.filter((d) => project.linked_document_ids?.includes(d.id));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
        <h3 className="text-sm font-bold text-ink-800 mb-3">Documents de démarrage</h3>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-xs outline-none focus:border-primary-400">
            {DOCUMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-primary-300 text-xs font-semibold text-primary-700 hover:bg-primary-50 cursor-pointer">
            <Paperclip className="h-3.5 w-3.5" /> {uploading ? 'Envoi...' : 'Ajouter un document'}
            <input type="file" multiple className="hidden" disabled={uploading} onChange={(e) => void handleUpload(e.target.files)} />
          </label>
          <button onClick={() => setShowAttach(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ink-100 text-ink-700 text-xs font-semibold hover:bg-ink-200"><Link2 className="h-3.5 w-3.5" /> Attacher un document existant</button>
        </div>
        {(project.documents?.length ?? 0) === 0 ? (
          <p className="text-xs text-ink-400 py-4 text-center">Aucun document ajouté.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {project.documents?.map((doc, index) => (
              <a key={`${doc.name}-${index}`} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg border border-ink-100 hover:border-primary-300 hover:bg-primary-50/40">
                <FileText className="h-4 w-4 text-primary-600 shrink-0" />
                <div className="min-w-0 flex-1"><p className="text-xs font-medium text-ink-800 truncate">{doc.name}</p><p className="text-[10px] text-ink-400">{doc.category}</p></div>
              </a>
            ))}
          </div>
        )}
      </div>

      {linkedDocuments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <h3 className="text-sm font-bold text-ink-800 mb-3">Documents du registre liés</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {linkedDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-ink-100"><FileText className="h-4 w-4 text-primary-600 shrink-0" /><p className="text-xs font-medium text-ink-800 truncate">{doc.title}</p></div>
            ))}
          </div>
        </div>
      )}

      {showAttach && (
        <AttachDocumentModal project={project} documents={documents} onClose={() => setShowAttach(false)} onAttached={onProjectChange} />
      )}
    </div>
  );
}

function AttachDocumentModal({ project, documents, onClose, onAttached }: { project: ProjectItem; documents: DocumentItem[]; onClose: () => void; onAttached: () => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(project.linked_document_ids ?? []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = documents.filter((d) => !search.trim() || d.title.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    setSaving(true);
    await firestore.from('projects').update({ linked_document_ids: selectedIds }).eq('id', project.id);
    setSaving(false);
    onAttached();
    onClose();
  };

  return (
    <ModalShell title="Attacher un document" onClose={onClose} maxWidth="max-w-md">
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un document du registre..." className={`${inputCls} mb-3`} />
      <div className="space-y-1.5 max-h-72 overflow-y-auto mb-4">
        {filtered.length === 0 && <p className="text-xs text-ink-400 text-center py-6">Aucun document trouvé.</p>}
        {filtered.map((doc) => {
          const selected = selectedIds.includes(doc.id);
          return (
            <label key={doc.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${selected ? 'border-primary-300 bg-primary-50' : 'border-ink-100'}`}>
              <input type="checkbox" checked={selected} onChange={() => setSelectedIds((cur) => selected ? cur.filter((id) => id !== doc.id) : [...cur, doc.id])} className="accent-primary-600" />
              <FileText className="h-4 w-4 text-primary-600 shrink-0" />
              <span className="text-sm text-ink-700 truncate">{doc.title}</span>
            </label>
          );
        })}
      </div>
      <button onClick={() => void handleSave()} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
    </ModalShell>
  );
}

// ====== TEAM TAB ======

function ProjectTeamTab({ project, tasks, companyProfiles }: { project: ProjectItem; tasks: TaskItem[]; companyProfiles: CompanyMemberOption[] }) {
  const members = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; taskCount: number; isOwner: boolean }>();
    if (project.owner_member_id) map.set(project.owner_member_id, { id: project.owner_member_id, name: project.owner_name, role: 'Responsable du projet', taskCount: 0, isOwner: true });
    project.contributor_ids.forEach((id, i) => {
      if (!map.has(id)) map.set(id, { id, name: project.contributor_names[i] || id, role: 'Contributeur', taskCount: 0, isOwner: false });
    });
    tasks.forEach((task) => {
      (task.assignee_ids ?? [task.assignee_id].filter(Boolean) as string[]).forEach((id) => {
        if (!map.has(id)) {
          const profile = companyProfiles.find((p) => p.owner_id === id);
          map.set(id, { id, name: profile?.full_name || task.assignee_name, role: profile?.role_label || 'Membre', taskCount: 0, isOwner: false });
        }
        const entry = map.get(id);
        if (entry) entry.taskCount += 1;
      });
    });
    return Array.from(map.values());
  }, [project, tasks, companyProfiles]);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
      <h3 className="text-sm font-bold text-ink-800 mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-primary-600" /> Équipe du projet</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${m.isOwner ? 'bg-primary-600 text-white' : 'bg-ink-200 text-ink-600'}`}>{m.name.slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-800 truncate">{m.name}</p><p className="text-[10px] text-ink-500">{m.role} · {m.taskCount} tâche{m.taskCount === 1 ? '' : 's'}</p></div>
          </div>
        ))}
        {members.length === 0 && <p className="text-xs text-ink-400">Aucun membre pour le moment.</p>}
      </div>
    </div>
  );
}

// ====== FINANCES TAB (Budget + Financement + Dépenses + Recettes) ======

function ProjectFinancesTab({ project, hasBudget, hasFinancing, hasRevenues, onProjectChange, showAddExpense, setShowAddExpense, showAddRevenue, setShowAddRevenue, showAddFinancing, setShowAddFinancing }: {
  project: ProjectItem; hasBudget: boolean; hasFinancing: boolean; hasRevenues: boolean; onProjectChange: () => void;
  showAddExpense: boolean; setShowAddExpense: (v: boolean) => void;
  showAddRevenue: boolean; setShowAddRevenue: (v: boolean) => void;
  showAddFinancing: boolean; setShowAddFinancing: (v: boolean) => void;
}) {
  const phasesBudgetSum = project.phases.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const plannedTotal = project.budget_amount ?? phasesBudgetSum;
  const spentTotal = project.expenses.filter((e) => e.status === 'Payée').reduce((sum, e) => sum + e.amount, 0);
  const receivedTotal = project.revenues.reduce((sum, r) => sum + r.collected_amount, 0);

  return (
    <div className="space-y-4">
      {hasBudget && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-ink-800">Budget global</h3>
            <span className="text-lg font-display font-bold text-primary-700">{spentTotal} / {plannedTotal} {project.budget_currency}</span>
          </div>
          <div className="h-2.5 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary-500 to-accent-500" style={{ width: `${plannedTotal > 0 ? Math.min(100, (spentTotal / plannedTotal) * 100) : 0}%` }} /></div>
          <p className="text-[11px] text-ink-400 mt-2">Dépensé / planifié{receivedTotal > 0 ? ` · ${receivedTotal} ${project.budget_currency} encaissés` : ''}</p>
        </div>
      )}

      {hasFinancing && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink-800 flex items-center gap-2"><Banknote className="h-4 w-4 text-primary-600" /> Financement</h3>
            <button onClick={() => setShowAddFinancing(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900"><Plus className="h-3 w-3" /> Ajouter une source</button>
          </div>
          {project.financings.length === 0 ? <p className="text-xs text-ink-400">Aucune source de financement.</p> : (
            <div className="space-y-2">
              {project.financings.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-ink-50">
                  <div><span className="font-semibold text-ink-800">{f.source}</span><span className="text-ink-400 text-xs ml-1.5">{f.type}</span></div>
                  <span className="text-xs font-semibold text-ink-700">{f.received_amount ?? 0} / {f.planned_amount ?? 0} {f.currency}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasBudget && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink-800 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary-600" /> Dépenses</h3>
            <button onClick={() => setShowAddExpense(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900"><Plus className="h-3 w-3" /> Enregistrer une dépense</button>
          </div>
          {project.expenses.length === 0 ? <p className="text-xs text-ink-400">Aucune dépense enregistrée.</p> : (
            <div className="space-y-2">
              {project.expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-ink-50">
                  <div><span className="font-semibold text-ink-800">{e.label}</span><span className="text-ink-400 text-xs ml-1.5">{e.category}{e.phase_name ? ` · ${e.phase_name}` : ''}</span></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${e.status === 'Payée' ? 'bg-accent-100 text-accent-700' : e.status === 'Engagée' ? 'bg-warning-100 text-warning-700' : 'bg-ink-100 text-ink-600'}`}>{e.status}</span>
                    <span className="text-xs font-semibold text-ink-700">{e.amount} {e.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasRevenues && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink-800 flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary-600" /> Recettes</h3>
            <button onClick={() => setShowAddRevenue(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900"><Plus className="h-3 w-3" /> Ajouter une recette</button>
          </div>
          {project.revenues.length === 0 ? <p className="text-xs text-ink-400">Aucune recette enregistrée.</p> : (
            <div className="space-y-2">
              {project.revenues.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-ink-50">
                  <div><span className="font-semibold text-ink-800">{r.label}</span><span className="text-ink-400 text-xs ml-1.5">{r.source_client}{r.phase_name ? ` · ${r.phase_name}` : ''}</span></div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.status === 'Encaissée' ? 'bg-accent-100 text-accent-700' : r.status === 'En retard' ? 'bg-danger-100 text-danger-700' : 'bg-ink-100 text-ink-600'}`}>{r.status}</span>
                    <span className="text-xs font-semibold text-ink-700">{r.collected_amount} / {r.expected_amount} {r.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddExpense && <AddExpenseModal project={project} onClose={() => setShowAddExpense(false)} onAdded={onProjectChange} />}
      {showAddRevenue && <AddRevenueModal project={project} onClose={() => setShowAddRevenue(false)} onAdded={onProjectChange} />}
      {showAddFinancing && <AddFinancingModal project={project} onClose={() => setShowAddFinancing(false)} onAdded={onProjectChange} />}
    </div>
  );
}

function AddFinancingModal({ project, onClose, onAdded }: { project: ProjectItem; onClose: () => void; onAdded: () => void }) {
  const [source, setSource] = useState('');
  const [type, setType] = useState<FinancingType>(FINANCING_TYPES[0]);
  const [plannedAmount, setPlannedAmount] = useState('');
  const [currency, setCurrency] = useState(project.budget_currency || 'USD');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [receivedDate, setReceivedDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!source.trim() || saving) return;
    setSaving(true);
    const document = file ? await uploadProjectFile(project.id, file, 'financings', 'Justificatif') : null;
    const entry: ProjectFinancing = {
      id: generateId(), source: source.trim(), type, planned_amount: plannedAmount.trim() ? Number(plannedAmount) : null,
      currency, received_amount: receivedAmount.trim() ? Number(receivedAmount) : null,
      planned_date: toIso(plannedDate), received_date: toIso(receivedDate), document, created_at: new Date().toISOString(),
    };
    await firestore.from('projects').update({ financings: [...project.financings, entry] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Ajouter une source de financement" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div>
          <label className={labelCls}>Source *</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex : Fonds propres" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as FinancingType)} className={inputCls}>
            {FINANCING_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2"><label className={labelCls}>Montant prévu</label><input type="number" value={plannedAmount} onChange={(e) => setPlannedAmount(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Devise</label><input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} /></div>
        </div>
        <div>
          <label className={labelCls}>Montant reçu</label>
          <input type="number" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Date prévue</label><input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Date reçue</label><input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputCls} /></div>
        </div>
        <FileField label="Document justificatif" fileName={file?.name} onSelect={setFile} />
      </div>
      <button onClick={() => void handleAdd()} disabled={!source.trim() || saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Ajout...' : 'Ajouter'}</button>
    </ModalShell>
  );
}

function AddExpenseModal({ project, onClose, onAdded }: { project: ProjectItem; onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(project.budget_currency || 'USD');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [phaseId, setPhaseId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<ExpenseStatus>('Prévue');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!label.trim() || !amount.trim() || saving) return;
    setSaving(true);
    const phase = project.phases.find((p) => p.id === phaseId);
    const document = file ? await uploadProjectFile(project.id, file, 'expenses', 'Facture') : null;
    const entry: ProjectExpense = {
      id: generateId(), label: label.trim(), amount: Number(amount) || 0, currency, category,
      phase_id: phaseId || null, phase_name: phase?.name ?? '', supplier: supplier.trim(), date: toIso(date), status, document, created_at: new Date().toISOString(),
    };
    await firestore.from('projects').update({ expenses: [...project.expenses, entry] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Enregistrer une dépense" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div><label className={labelCls}>Libellé *</label><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Achat ciment" className={inputCls} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2"><label className={labelCls}>Montant *</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Devise</label><input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Catégorie</label><select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className={labelCls}>Phase</label><select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputCls}><option value="">Aucune</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
        <div><label className={labelCls}>Fournisseur</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value as ExpenseStatus)} className={inputCls}>{EXPENSE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <FileField label="Facture / justificatif" fileName={file?.name} onSelect={setFile} />
      </div>
      <button onClick={() => void handleAdd()} disabled={!label.trim() || !amount.trim() || saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
    </ModalShell>
  );
}

function AddRevenueModal({ project, onClose, onAdded }: { project: ProjectItem; onClose: () => void; onAdded: () => void }) {
  const [label, setLabel] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [currency, setCurrency] = useState(project.budget_currency || 'USD');
  const [expectedDate, setExpectedDate] = useState('');
  const [sourceClient, setSourceClient] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [paymentCondition, setPaymentCondition] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [status, setStatus] = useState<RevenueStatus>('Prévue');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!label.trim() || !expectedAmount.trim() || saving) return;
    setSaving(true);
    const phase = project.phases.find((p) => p.id === phaseId);
    const document = file ? await uploadProjectFile(project.id, file, 'revenues', 'Contrat') : null;
    const entry: ProjectRevenue = {
      id: generateId(), label: label.trim(), expected_amount: Number(expectedAmount) || 0, currency, expected_date: toIso(expectedDate),
      source_client: sourceClient.trim(), phase_id: phaseId || null, phase_name: phase?.name ?? '', payment_condition: paymentCondition.trim(),
      collected_amount: Number(collectedAmount) || 0, status, document, created_at: new Date().toISOString(),
    };
    await firestore.from('projects').update({ revenues: [...project.revenues, entry] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Ajouter une recette" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div><label className={labelCls}>Libellé *</label><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex : Paiement première tranche client" className={inputCls} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2"><label className={labelCls}>Montant attendu *</label><input type="number" value={expectedAmount} onChange={(e) => setExpectedAmount(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Devise</label><input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Date attendue</label><input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Source / Client</label><input value={sourceClient} onChange={(e) => setSourceClient(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Phase associée</label><select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputCls}><option value="">Aucune</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className={labelCls}>Condition de paiement</label><input value={paymentCondition} onChange={(e) => setPaymentCondition(e.target.value)} placeholder="Ex : Après validation des fondations" className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Montant encaissé</label><input type="number" value={collectedAmount} onChange={(e) => setCollectedAmount(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Statut</label><select value={status} onChange={(e) => setStatus(e.target.value as RevenueStatus)} className={inputCls}>{REVENUE_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        </div>
        <FileField label="Contrat / facture" fileName={file?.name} onSelect={setFile} />
      </div>
      <button onClick={() => void handleAdd()} disabled={!label.trim() || !expectedAmount.trim() || saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Ajout...' : 'Ajouter'}</button>
    </ModalShell>
  );
}

// ====== RISKS TAB ======

function ProjectRisksTab({ project, onProjectChange, showAddRisk, setShowAddRisk }: { project: ProjectItem; onProjectChange: () => void; showAddRisk: boolean; setShowAddRisk: (v: boolean) => void }) {
  const impactColor: Record<RiskImpact, string> = { Faible: 'bg-ink-100 text-ink-600', Moyen: 'bg-warning-100 text-warning-700', Critique: 'bg-danger-100 text-danger-700' };

  const toggleResolved = async (risk: ProjectRisk) => {
    const nextRisks = project.risks.map((r) => r.id === risk.id ? { ...r, status: r.status === 'open' ? 'resolved' as const : 'open' as const } : r);
    await firestore.from('projects').update({ risks: nextRisks }).eq('id', project.id);
    onProjectChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><button onClick={() => setShowAddRisk(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700"><Plus className="h-3.5 w-3.5" /> Signaler un risque</button></div>
      {project.risks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-12 text-center"><ShieldAlert className="h-8 w-8 text-ink-300 mx-auto mb-2" /><p className="text-sm text-ink-500">Aucun risque signalé pour le moment.</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {project.risks.map((risk) => (
            <div key={risk.id} className={`bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 ${risk.status === 'resolved' ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-ink-400">{risk.type}</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${impactColor[risk.impact]}`}>Impact {risk.impact}</span>
              </div>
              <h4 className="text-sm font-bold text-ink-800 mb-1">{risk.title}</h4>
              {risk.description && <p className="text-xs text-ink-500 mb-2">{risk.description}</p>}
              <div className="space-y-1 text-xs text-ink-600">
                <p>Probabilité : <span className="font-semibold">{risk.probability}</span></p>
                {risk.phase_name && <p>Phase : {risk.phase_name}</p>}
                {risk.owner_name && <p>Responsable : {risk.owner_name}</p>}
                {risk.corrective_action && <p><span className="font-semibold">Mesure corrective :</span> {risk.corrective_action}</p>}
                {risk.resolution_deadline && <p>Deadline de résolution : {formatDate(risk.resolution_deadline)}</p>}
              </div>
              <button onClick={() => void toggleResolved(risk)} className={`mt-3 text-[11px] font-semibold ${risk.status === 'resolved' ? 'text-ink-500' : 'text-accent-700 hover:text-accent-900'}`}>
                {risk.status === 'resolved' ? '↺ Rouvrir' : '✓ Marquer résolu'}
              </button>
            </div>
          ))}
        </div>
      )}
      {showAddRisk && <AddRiskModal project={project} onClose={() => setShowAddRisk(false)} onAdded={onProjectChange} />}
    </div>
  );
}

function AddRiskModal({ project, onClose, onAdded }: { project: ProjectItem; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<RiskType>('Risque');
  const [probability, setProbability] = useState<RiskProbability>('Moyenne');
  const [impact, setImpact] = useState<RiskImpact>('Moyen');
  const [phaseId, setPhaseId] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [description, setDescription] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [resolutionDeadline, setResolutionDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    const phase = project.phases.find((p) => p.id === phaseId);
    const entry: ProjectRisk = {
      id: generateId(), title: title.trim(), type, probability, impact, phase_id: phaseId || null, phase_name: phase?.name ?? '',
      owner_name: ownerName.trim(), description: description.trim(), corrective_action: correctiveAction.trim(),
      resolution_deadline: toIso(resolutionDeadline), status: 'open', created_at: new Date().toISOString(),
    };
    await firestore.from('projects').update({ risks: [...project.risks, entry] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Signaler un risque" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div><label className={labelCls}>Titre *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Retard livraison matériaux" className={inputCls} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className={labelCls}>Type</label><select value={type} onChange={(e) => setType(e.target.value as RiskType)} className={inputCls}>{RISK_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className={labelCls}>Probabilité</label><select value={probability} onChange={(e) => setProbability(e.target.value as RiskProbability)} className={inputCls}>{RISK_PROBABILITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><label className={labelCls}>Impact</label><select value={impact} onChange={(e) => setImpact(e.target.value as RiskImpact)} className={inputCls}>{RISK_IMPACTS.map((i) => <option key={i}>{i}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Phase concernée</label><select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputCls}><option value="">Aucune</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div><label className={labelCls}>Responsable</label><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        <div><label className={labelCls}>Mesure corrective</label><textarea value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        <div><label className={labelCls}>Deadline de résolution</label><input type="date" value={resolutionDeadline} onChange={(e) => setResolutionDeadline(e.target.value)} className={inputCls} /></div>
      </div>
      <button onClick={() => void handleAdd()} disabled={!title.trim() || saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Ajout...' : 'Ajouter'}</button>
    </ModalShell>
  );
}

// ====== REPORTS TAB (incl. Visites / Inspections) ======

function ProjectReportsTab({ project, tasks, progress, hasVisits, onProjectChange, showAddVisit, setShowAddVisit }: {
  project: ProjectItem; tasks: TaskItem[]; progress: number; hasVisits: boolean; onProjectChange: () => void;
  showAddVisit: boolean; setShowAddVisit: (v: boolean) => void;
}) {
  const daysRemaining = computeDaysRemaining(project.deadline);
  const completedTasks = tasks.filter((t) => t.status === 'validated' || t.status === 'closed').length;
  const allContributions = tasks.flatMap((t) => t.activity ?? []);
  const validatedContributions = allContributions.filter((c) => c.evaluation?.decision === 'validated').length;
  const openRisks = project.risks.filter((r) => r.status === 'open').length;
  const spentTotal = project.expenses.filter((e) => e.status === 'Payée').reduce((sum, e) => sum + e.amount, 0);
  const receivedTotal = project.revenues.reduce((sum, r) => sum + r.collected_amount, 0);
  const financeEnabled = hasModule(project, 'budget') || hasModule(project, 'financing') || hasModule(project, 'revenues');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
        <h3 className="text-sm font-bold text-ink-800 mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary-600" /> Synthèse du projet</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-xl font-display font-bold text-primary-700">{progress}%</p><p className="text-[11px] text-ink-500">Avancement{daysRemaining !== null ? ` · ${daysRemaining >= 0 ? `${daysRemaining} j restants` : 'en retard'}` : ''}</p></div>
          <div><p className="text-xl font-display font-bold text-ink-900">{completedTasks}/{tasks.length}</p><p className="text-[11px] text-ink-500">Tâches terminées</p></div>
          <div><p className="text-xl font-display font-bold text-ink-900">{validatedContributions}/{allContributions.length}</p><p className="text-[11px] text-ink-500">Contributions validées</p></div>
          <div><p className="text-xl font-display font-bold text-ink-900">{openRisks}</p><p className="text-[11px] text-ink-500">Risques ouverts</p></div>
        </div>
        {financeEnabled && (
          <div className="mt-4 pt-4 border-t border-ink-100 grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-sm font-bold text-ink-800">{project.budget_amount ?? 0} {project.budget_currency}</p><p className="text-[11px] text-ink-500">Budget planifié</p></div>
            <div><p className="text-sm font-bold text-ink-800">{spentTotal} {project.budget_currency}</p><p className="text-[11px] text-ink-500">Dépensé</p></div>
            <div><p className="text-sm font-bold text-ink-800">{receivedTotal} {project.budget_currency}</p><p className="text-[11px] text-ink-500">Encaissé</p></div>
          </div>
        )}
      </div>

      {hasVisits && (
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink-800 flex items-center gap-2"><Camera className="h-4 w-4 text-primary-600" /> Visites / Inspections</h3>
            <button onClick={() => setShowAddVisit(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-900"><Plus className="h-3 w-3" /> Ajouter une visite</button>
          </div>
          {project.visits.length === 0 ? <p className="text-xs text-ink-400">Aucune visite enregistrée.</p> : (
            <div className="space-y-2">
              {[...project.visits].reverse().map((v) => (
                <div key={v.id} className="p-3 rounded-xl bg-ink-50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-ink-800">{v.type}{v.location ? ` · ${v.location}` : ''}</span>
                    <span className="text-[10px] text-ink-400">{v.date ? formatDate(v.date) : ''}</span>
                  </div>
                  {v.observations && <p className="text-xs text-ink-600">{v.observations}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-500">
                    {typeof v.observed_progress === 'number' && <span>Progression observée : {v.observed_progress}%</span>}
                    {v.next_visit_date && <span>Prochaine visite : {formatDate(v.next_visit_date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddVisit && <AddVisitModal project={project} onClose={() => setShowAddVisit(false)} onAdded={onProjectChange} />}
        </div>
      )}
    </div>
  );
}

function AddVisitModal({ project, onClose, onAdded }: { project: ProjectItem; onClose: () => void; onAdded: () => void }) {
  const [type, setType] = useState<VisitType>('Visite');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [participants, setParticipants] = useState('');
  const [phaseId, setPhaseId] = useState('');
  const [observations, setObservations] = useState('');
  const [observedProgress, setObservedProgress] = useState('');
  const [anomalies, setAnomalies] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [nextVisitDate, setNextVisitDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (saving) return;
    setSaving(true);
    const phase = project.phases.find((p) => p.id === phaseId);
    const photos = await Promise.all(photoFiles.map((f) => uploadProjectFile(project.id, f, 'visits', 'Photo')));
    const docs = await Promise.all(docFiles.map((f) => uploadProjectFile(project.id, f, 'visits', 'Document')));
    const entry: ProjectVisit = {
      id: generateId(), type, date: toIso(date), location: location.trim(), participants: participants.trim(),
      phase_id: phaseId || null, phase_name: phase?.name ?? '', observations: observations.trim(),
      observed_progress: observedProgress.trim() ? Number(observedProgress) : null, anomalies: anomalies.trim(),
      recommendations: recommendations.trim(), photos, documents: docs, next_visit_date: toIso(nextVisitDate), created_at: new Date().toISOString(),
    };
    await firestore.from('projects').update({ visits: [...project.visits, entry] }).eq('id', project.id);
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <ModalShell title="Visite / Inspection" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Type</label><select value={type} onChange={(e) => setType(e.target.value as VisitType)} className={inputCls}>{VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div><label className={labelCls}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Lieu</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Participants</label><input value={participants} onChange={(e) => setParticipants(e.target.value)} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Phase concernée</label><select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className={inputCls}><option value="">Aucune</option>{project.phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label className={labelCls}>Constats</label><textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        <div><label className={labelCls}>Progression observée (%)</label><input type="number" min={0} max={100} value={observedProgress} onChange={(e) => setObservedProgress(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Anomalies</label><textarea value={anomalies} onChange={(e) => setAnomalies(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        <div><label className={labelCls}>Recommandations</label><textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} rows={2} className={`${inputCls} resize-none`} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}>Photos</label>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-600 hover:border-primary-400 hover:text-primary-700 cursor-pointer">
              <Camera className="h-3.5 w-3.5" /> {photoFiles.length ? `${photoFiles.length} photo(s)` : 'Ajouter'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setPhotoFiles((cur) => [...cur, ...Array.from(e.target.files ?? [])])} />
            </label>
          </div>
          <div>
            <label className={labelCls}>Documents</label>
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-ink-300 text-xs font-semibold text-ink-600 hover:border-primary-400 hover:text-primary-700 cursor-pointer">
              <Paperclip className="h-3.5 w-3.5" /> {docFiles.length ? `${docFiles.length} fichier(s)` : 'Ajouter'}
              <input type="file" multiple className="hidden" onChange={(e) => setDocFiles((cur) => [...cur, ...Array.from(e.target.files ?? [])])} />
            </label>
          </div>
        </div>
        <div><label className={labelCls}>Prochaine visite</label><input type="date" value={nextVisitDate} onChange={(e) => setNextVisitDate(e.target.value)} className={inputCls} /></div>
      </div>
      <button onClick={() => void handleAdd()} disabled={saving} className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
    </ModalShell>
  );
}
