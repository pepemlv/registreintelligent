import { useState } from 'react';
import {
  FolderKanban,
  Folder,
  FileStack,
  CheckSquare,
  Calendar,
  Users,
  ChevronRight,
  FileText,
  Plus,
  Briefcase,
} from 'lucide-react';
import { dossiers, projects, documents } from '@/data';
import { formatDate, formatCurrency } from '@/lib/documentConfig';
import { compareNewestLegacyDocuments } from '@/lib/documentSort';
import type { DocDocument, Dossier, Project } from '@/types';

interface DossiersViewProps {
  onSelectDocument: (doc: DocDocument) => void;
}

export function DossiersView({ onSelectDocument }: DossiersViewProps) {
  const [selectedDossier, setSelectedDossier] = useState<Dossier | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  if (selectedProject) {
    const projectDocs = documents.filter((d) => d.projectId === selectedProject.id).sort(compareNewestLegacyDocuments);
    return (
      <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        <button onClick={() => setSelectedProject(null)} className="text-sm font-medium text-ink-600 hover:text-primary-600 flex items-center gap-1.5">
          ← Retour aux projets
        </button>

        <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent-400/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-accent-300">Espace projet</span>
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">{selectedProject.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/80">{selectedProject.team.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-white/60" />
                <span className="text-xs text-white/80">Débuté le {formatDate(selectedProject.startDate)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-ink-800">Progression du projet</span>
            <span className="text-2xl font-display font-bold text-primary-600">{selectedProject.progress}%</span>
          </div>
          <div className="h-3 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-700" style={{ width: `${selectedProject.progress}%` }} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
            <ProjectStat icon={FileStack} label="Documents" value={selectedProject.documentCount} />
            <ProjectStat icon={CheckSquare} label="Tâches" value={selectedProject.taskCount} />
            <ProjectStat icon={Calendar} label="Échéances" value={selectedProject.deadlineCount} />
            <ProjectStat icon={FileText} label="Rapports" value={selectedProject.reportCount} />
          </div>
        </div>

        {/* Project documents */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <h2 className="font-display font-bold text-ink-900 text-base">Documents du projet</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {projectDocs.length > 0 ? projectDocs.map((doc) => (
              <button key={doc.id} onClick={() => onSelectDocument(doc)} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left group">
                <div className="h-9 w-9 rounded-lg bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0">
                  <FileStack className="h-4 w-4 text-ink-500 group-hover:text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700">{doc.title}</p>
                  <span className="text-[10px] font-mono text-ink-400">{doc.reference}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-300" />
              </button>
            )) : (
              <p className="px-5 py-8 text-center text-sm text-ink-500">Aucun document directement lié</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (selectedDossier) {
    const dosDocs = documents.filter((d) => d.dossierId === selectedDossier.id).sort(compareNewestLegacyDocuments);
    return (
      <div className="p-6 space-y-5 animate-fade-in max-w-[1400px] mx-auto">
        <button onClick={() => setSelectedDossier(null)} className="text-sm font-medium text-ink-600 hover:text-primary-600 flex items-center gap-1.5">
          ← Retour aux dossiers
        </button>

        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
              <Folder className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-bold text-ink-900">{selectedDossier.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  selectedDossier.status === 'active' ? 'bg-accent-100 text-accent-700' :
                  selectedDossier.status === 'closed' ? 'bg-ink-100 text-ink-600' : 'bg-ink-100 text-ink-500'
                }`}>
                  {selectedDossier.status === 'active' ? 'Actif' : selectedDossier.status === 'closed' ? 'Clôturé' : 'Archivé'}
                </span>
                <span className="text-[10px] text-ink-400">Dernière activité: {formatDate(selectedDossier.lastActivity)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <DossierStat icon={FileStack} label="Documents" value={selectedDossier.documentCount} />
            <DossierStat icon={CheckSquare} label="Tâches" value={selectedDossier.taskCount} />
            <DossierStat icon={Calendar} label="Échéances" value={selectedDossier.deadlineCount} />
            <DossierStat icon={Users} label="Collaborateurs" value={selectedDossier.collaboratorCount} />
          </div>

          {/* Document breakdown */}
          <div className="mt-5 pt-5 border-t border-ink-100">
            <p className="text-xs font-bold text-ink-600 mb-3">Répartition des documents</p>
            <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-ink-100">
              {selectedDossier.documentBreakdown.invoices > 0 && <div className="bg-primary-500" style={{ width: `${(selectedDossier.documentBreakdown.invoices / selectedDossier.documentCount) * 100}%` }} />}
              {selectedDossier.documentBreakdown.contracts > 0 && <div className="bg-accent-500" style={{ width: `${(selectedDossier.documentBreakdown.contracts / selectedDossier.documentCount) * 100}%` }} />}
              {selectedDossier.documentBreakdown.orders > 0 && <div className="bg-warning-500" style={{ width: `${(selectedDossier.documentBreakdown.orders / selectedDossier.documentCount) * 100}%` }} />}
              {selectedDossier.documentBreakdown.correspondence > 0 && <div className="bg-danger-400" style={{ width: `${(selectedDossier.documentBreakdown.correspondence / selectedDossier.documentCount) * 100}%` }} />}
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[10px]">
              {selectedDossier.documentBreakdown.invoices > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary-500" /> {selectedDossier.documentBreakdown.invoices} factures</span>}
              {selectedDossier.documentBreakdown.contracts > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-accent-500" /> {selectedDossier.documentBreakdown.contracts} contrats</span>}
              {selectedDossier.documentBreakdown.orders > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warning-500" /> {selectedDossier.documentBreakdown.orders} commandes</span>}
              {selectedDossier.documentBreakdown.correspondence > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-danger-400" /> {selectedDossier.documentBreakdown.correspondence} courriers</span>}
            </div>
          </div>
        </div>

        {/* Dossier documents */}
        <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
          <div className="px-5 py-4 border-b border-ink-100">
            <h2 className="font-display font-bold text-ink-900 text-base">Documents du dossier</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {dosDocs.length > 0 ? dosDocs.map((doc) => (
              <button key={doc.id} onClick={() => onSelectDocument(doc)} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left group">
                <div className="h-9 w-9 rounded-lg bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0">
                  <FileStack className="h-4 w-4 text-ink-500 group-hover:text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-primary-700">{doc.title}</p>
                  <span className="text-[10px] font-mono text-ink-400">{doc.reference}</span>
                </div>
                {doc.aiAmount && <span className="text-xs font-bold text-ink-700 hidden sm:block">{formatCurrency(doc.aiAmount, doc.currency)}</span>}
                <ChevronRight className="h-4 w-4 text-ink-300" />
              </button>
            )) : (
              <p className="px-5 py-8 text-center text-sm text-ink-500">Aucun document directement lié à ce dossier</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Dossiers intelligents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary-600" />
            <h2 className="font-display font-bold text-ink-900 text-base">Dossiers intelligents</h2>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">
            <Plus className="h-3.5 w-3.5" />
            Nouveau dossier
          </button>
        </div>
        <p className="text-xs text-ink-500 mb-4">Plusieurs documents peuvent appartenir au même dossier. Retrouvez le contexte complet, pas seulement un fichier.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dossiers.map((dos) => (
            <button
              key={dos.id}
              onClick={() => setSelectedDossier(dos)}
              className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-primary-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center">
                  <Folder className="h-5 w-5 text-primary-600" />
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  dos.status === 'active' ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-600'
                }`}>
                  {dos.status === 'active' ? 'Actif' : dos.status === 'closed' ? 'Clôturé' : 'Archivé'}
                </span>
              </div>
              <p className="text-sm font-bold text-ink-800 group-hover:text-primary-700 mb-1">{dos.name}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {dos.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-ink-100 text-ink-500 rounded">#{tag}</span>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-ink-100">
                <DossierMiniStat icon={FileStack} value={dos.documentCount} label="Docs" />
                <DossierMiniStat icon={CheckSquare} value={dos.taskCount} label="Tâches" />
                <DossierMiniStat icon={Calendar} value={dos.deadlineCount} label="Éch." />
                <DossierMiniStat icon={Users} value={dos.collaboratorCount} label="Collab." />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Espaces projets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-accent-600" />
            <h2 className="font-display font-bold text-ink-900 text-base">Espaces projets</h2>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700">
            <Plus className="h-3.5 w-3.5" />
            Nouveau projet
          </button>
        </div>
        <p className="text-xs text-ink-500 mb-4">Le projet se situe un niveau au-dessus du dossier : équipe, documents, tâches, échéances et rapports consolidés.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <button
              key={proj.id}
              onClick={() => setSelectedProject(proj)}
              className="bg-white rounded-2xl shadow-card border border-ink-200/60 p-5 text-left hover:shadow-card-hover hover:border-accent-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-100 to-primary-100 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-accent-600" />
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  proj.status === 'active' ? 'bg-accent-100 text-accent-700' : 'bg-ink-100 text-ink-600'
                }`}>
                  {proj.status === 'active' ? 'Actif' : proj.status === 'completed' ? 'Terminé' : 'Planifié'}
                </span>
              </div>
              <p className="text-sm font-bold text-ink-800 group-hover:text-accent-700 mb-2">{proj.name}</p>
              <div className="flex items-center gap-1 mb-3">
                {proj.team.slice(0, 3).map((member, i) => (
                  <div key={i} className="h-6 w-6 rounded-full bg-ink-200 border-2 border-white flex items-center justify-center text-[9px] font-bold text-ink-600 -ml-1.5 first:ml-0">
                    {member.split(' ').map((n) => n[0]).join('')}
                  </div>
                ))}
                {proj.team.length > 3 && <span className="text-[10px] text-ink-400 ml-1">+{proj.team.length - 3}</span>}
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-ink-500">Progression</span>
                  <span className="text-xs font-bold text-accent-600">{proj.progress}%</span>
                </div>
                <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-500 to-primary-500 rounded-full" style={{ width: `${proj.progress}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-ink-100">
                <DossierMiniStat icon={FileStack} value={proj.documentCount} label="Docs" />
                <DossierMiniStat icon={CheckSquare} value={proj.taskCount} label="Tâches" />
                <DossierMiniStat icon={Calendar} value={proj.deadlineCount} label="Éch." />
                <DossierMiniStat icon={FileText} value={proj.reportCount} label="Rap." />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DossierStat({ icon: Icon, label, value }: { icon: typeof FileStack; label: string; value: number }) {
  return (
    <div className="p-3 bg-ink-50 rounded-xl">
      <Icon className="h-4 w-4 text-ink-500 mb-1.5" />
      <p className="text-lg font-display font-bold text-ink-900 leading-none">{value}</p>
      <p className="text-[10px] text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}

function DossierMiniStat({ icon: Icon, value, label }: { icon: typeof FileStack; value: number; label: string }) {
  return (
    <div className="text-center">
      <Icon className="h-3.5 w-3.5 text-ink-400 mx-auto mb-0.5" />
      <p className="text-sm font-bold text-ink-800 leading-none">{value}</p>
      <p className="text-[9px] text-ink-400 mt-0.5">{label}</p>
    </div>
  );
}

function ProjectStat({ icon: Icon, label, value }: { icon: typeof FileStack; label: string; value: number }) {
  return (
    <div className="p-3 bg-ink-50 rounded-xl">
      <Icon className="h-4 w-4 text-ink-500 mb-1.5" />
      <p className="text-lg font-display font-bold text-ink-900 leading-none">{value}</p>
      <p className="text-[10px] text-ink-500 mt-0.5">{label}</p>
    </div>
  );
}
