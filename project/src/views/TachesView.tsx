import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckSquare,
  FileText,
  Clock,
  Send,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { tasks } from '@/data';
import { TaskStatusBadge, PriorityBadge } from '@/components/Badges';
import { formatDate } from '@/lib/documentConfig';
import type { Task, TaskStatus, Priority } from '@/types';

export function TachesView() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [taskList, setTaskList] = useState<Task[]>(tasks);

  const filtered = useMemo(() => {
    return taskList.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !task.assignedTo.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [taskList, statusFilter, priorityFilter, search]);

  const counts = {
    new: taskList.filter((t) => t.status === 'new').length,
    in_progress: taskList.filter((t) => t.status === 'in_progress').length,
    submitted: taskList.filter((t) => t.status === 'submitted').length,
    overdue: taskList.filter((t) => new Date(t.dueDate) < new Date('2026-09-06') && t.status !== 'closed').length,
  };

  const handleCreate = (title: string, assignee: string, department: string, dueDate: string, priority: Priority) => {
    const newTask: Task = {
      id: `t${Date.now()}`,
      title,
      description: '',
      status: 'new',
      priority,
      assignedTo: assignee,
      assignedDepartment: department,
      dueDate,
      createdDate: '2026-09-06',
      createdBy: 'Pierre Durand',
    };
    setTaskList([newTask, ...taskList]);
    setShowCreateForm(false);
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Clock} label="Nouvelles" value={counts.new} color="text-ink-600" bg="bg-ink-100" />
        <SummaryCard icon={CheckSquare} label="En cours" value={counts.in_progress} color="text-warning-600" bg="bg-warning-50" />
        <SummaryCard icon={Send} label="Soumises" value={counts.submitted} color="text-primary-600" bg="bg-primary-50" />
        <SummaryCard icon={AlertTriangle} label="En retard" value={counts.overdue} color="text-danger-600" bg="bg-danger-50" />
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 flex-1">
            <Search className="h-4 w-4 text-ink-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une tâche..."
              className="bg-transparent text-sm outline-none flex-1 placeholder:text-ink-400 text-ink-700"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="text-xs font-medium text-ink-700 bg-white border border-ink-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts</option>
              <option value="new">Nouvelles</option>
              <option value="assigned">Affectées</option>
              <option value="in_progress">En cours</option>
              <option value="submitted">Soumises</option>
              <option value="validated">Validées</option>
              <option value="closed">Clôturées</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
              className="text-xs font-medium text-ink-700 bg-white border border-ink-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
            >
              <option value="all">Toutes priorités</option>
              <option value="urgent">Urgentes</option>
              <option value="high">Prioritaires</option>
              <option value="normal">Normales</option>
              <option value="low">Faibles</option>
            </select>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Créer une tâche
            </button>
          </div>
        </div>
      </div>

      {/* Tasks table */}
      <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/50">
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-5 py-3">Tâche</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3 hidden md:table-cell">Responsable</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3 hidden lg:table-cell">Projet</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Échéance</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Priorité</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-ink-500 px-3 py-3">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((task) => {
                const isOverdue = new Date(task.dueDate) < new Date('2026-09-06') && task.status !== 'closed';
                return (
                  <tr key={task.id} className="hover:bg-ink-50/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                          <CheckSquare className="h-4 w-4 text-ink-500 group-hover:text-primary-600 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-800 truncate">{task.title}</p>
                          {task.sourceDocument && (
                            <span className="text-[10px] text-primary-600 font-medium flex items-center gap-1 mt-0.5">
                              <FileText className="h-2.5 w-2.5" />
                              Doc: {task.sourceDocument}
                            </span>
                          )}
                          {task.createdBy === 'Système IA' && (
                            <span className="text-[10px] text-accent-600 font-medium flex items-center gap-1 mt-0.5">
                              <Sparkles className="h-2.5 w-2.5" />
                              Générée par l'IA
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <div>
                        <p className="text-xs font-medium text-ink-700">{task.assignedTo}</p>
                        <p className="text-[10px] text-ink-400">{task.assignedDepartment}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden lg:table-cell">
                      {task.project ? (
                        <span className="text-xs text-ink-600">{task.project}</span>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-xs font-medium ${isOverdue ? 'text-danger-600' : 'text-ink-600'}`}>
                        {formatDate(task.dueDate)}
                      </span>
                      {isOverdue && <span className="text-[9px] text-danger-600 font-bold block">En retard</span>}
                    </td>
                    <td className="px-3 py-3.5">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-3 py-3.5">
                      <TaskStatusBadge status={task.status} size="xs" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <CheckSquare className="h-10 w-10 text-ink-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-ink-700">Aucune tâche trouvée</p>
          </div>
        )}
      </div>

      {/* Lifecycle info */}
      <div className="bg-gradient-to-r from-primary-50 to-accent-50/40 rounded-2xl border border-primary-200/40 p-5">
        <p className="text-sm font-bold text-ink-800 mb-2">Cycle de traitement des tâches</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {['Nouveau', 'Affecté', 'En traitement', 'À valider', 'Traité', 'Clôturé', 'Archivé'].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-white rounded-lg border border-ink-200 font-medium text-ink-700">{step}</span>
              {i < 6 && <span className="text-ink-300">→</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Un document peut également générer automatiquement une tâche. Le DG crée une tâche qui est assignée à un employé, qui travaille puis soumet, puis validation et clôture.
        </p>
      </div>

      {/* Create form modal */}
      {showCreateForm && (
        <CreateTaskModal onClose={() => setShowCreateForm(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }: { icon: typeof Clock; label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-white rounded-xl shadow-card border border-ink-200/60 p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} strokeWidth={2} />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-ink-900 leading-none">{value}</p>
        <p className="text-xs text-ink-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

function CreateTaskModal({ onClose, onCreate }: { onClose: () => void; onCreate: (title: string, assignee: string, department: string, dueDate: string, priority: Priority) => void }) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [dueDate, setDueDate] = useState('2026-09-15');
  const [priority, setPriority] = useState<Priority>('normal');

  return (
    <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-ink-900 text-lg">Créer une tâche</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-600 text-xl leading-none">×</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Titre de la tâche</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Préparer le rapport mensuel" className="w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Responsable</label>
              <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Ex: Chantal" className="w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Département</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400">
                <option>Administration</option>
                <option>Comptabilité</option>
                <option>Juridique</option>
                <option>Commercial</option>
                <option>Opérations</option>
                <option>Direction Générale</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Échéance</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600 mb-1.5 block">Priorité</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full px-3 py-2 bg-ink-50 rounded-xl border border-ink-200 text-sm outline-none focus:border-primary-400">
                <option value="urgent">Urgente</option>
                <option value="high">Prioritaire</option>
                <option value="normal">Normale</option>
                <option value="low">Faible</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors">Annuler</button>
          <button
            onClick={() => title.trim() && onCreate(title, assignee || 'Non assigné', department, dueDate, priority)}
            disabled={!title.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 disabled:from-ink-300 disabled:to-ink-300 hover:shadow-lg hover:shadow-primary-600/20 transition-all"
          >
            Créer la tâche
          </button>
        </div>
      </div>
    </div>
  );
}
