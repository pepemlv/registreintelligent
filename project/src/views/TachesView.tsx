import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckSquare,
  FileText,
  Clock,
  Send,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { TaskStatusBadge, PriorityBadge } from '@/components/Badges';
import { formatDate } from '@/lib/documentConfig';
import CreateTaskModal from '@/components/CreateTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import type { DocumentItem, Priority, TaskItem, TaskStatus } from '@/lib/types';

interface CompanyMemberOption {
  owner_id: string;
  full_name: string;
  email: string;
  role_label: string;
}

interface TachesViewProps {
  tasks: TaskItem[];
  companyProfiles: CompanyMemberOption[];
  documents: DocumentItem[];
  onTasksChange: () => void;
  canManageTrash?: boolean;
}

export function TachesView({ tasks, companyProfiles, documents, onTasksChange, canManageTrash = false }: TachesViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !task.assignee_name.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [tasks, statusFilter, priorityFilter, search]);

  const counts = {
    new: tasks.filter((t) => t.status === 'new').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    submitted: tasks.filter((t) => t.status === 'submitted').length,
    overdue: tasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'closed').length,
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

  return (
    <div className="p-6 space-y-5 animate-fade-in max-w-[1600px] mx-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard icon={Clock} label="Nouvelles" value={counts.new} color="text-ink-600" bg="bg-ink-100" />
        <SummaryCard icon={CheckSquare} label="En cours" value={counts.in_progress} color="text-warning-600" bg="bg-warning-50" />
        <SummaryCard icon={Send} label="En révision" value={counts.submitted} color="text-primary-600" bg="bg-primary-50" />
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
              <option value="submitted">En révision</option>
              <option value="validated">Validées</option>
              <option value="closed">Terminées</option>
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
                const isOverdue = !!task.due_date && new Date(task.due_date) < new Date() && task.status !== 'closed';
                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="hover:bg-ink-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-lg bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0 transition-colors">
                          <CheckSquare className="h-4 w-4 text-ink-500 group-hover:text-primary-600 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700">{task.title}</p>
                          {task.source_document_title && (
                            <span className="text-[10px] text-primary-600 font-medium flex items-center gap-1 mt-0.5">
                              <FileText className="h-2.5 w-2.5" />
                              Doc: {task.source_document_title}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-medium text-ink-700">{task.assignee_name}</p>
                        {(task.assignee_ids?.length ?? 0) > 1 && <Users className="h-3.5 w-3.5 text-primary-600" aria-label="Plusieurs membres" />}
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
                      {task.due_date ? (
                        <>
                          <span className={`text-xs font-medium ${isOverdue ? 'text-danger-600' : 'text-ink-600'}`}>
                            {formatDate(task.due_date)}
                          </span>
                          {isOverdue && <span className="text-[9px] text-danger-600 font-bold block">En retard</span>}
                        </>
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
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
          {['Nouveau', 'Affecté', 'En cours', 'En révision', 'Validé', 'Terminée'].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-white rounded-lg border border-ink-200 font-medium text-ink-700">{step}</span>
              {i < 5 && <span className="text-ink-300">→</span>}
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-500 mt-3">
          Une tâche peut être créée ici ou directement depuis un document. Cliquez sur une tâche pour suivre son avancement, changer son statut et ajouter des notes.
        </p>
      </div>

      {showCreateForm && (
        <CreateTaskModal
          companyProfiles={companyProfiles}
          availableDocuments={documents}
          onClose={() => setShowCreateForm(false)}
          onCreated={onTasksChange}
        />
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
