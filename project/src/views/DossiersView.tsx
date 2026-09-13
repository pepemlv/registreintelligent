import { useMemo, useState } from 'react';
import { ChevronRight, FileText, Folder, FolderOpen, FolderPlus, Search, X } from 'lucide-react';
import { firestore } from '@/lib/firebase';
import { compareNewestDocuments } from '@/lib/documentSort';
import type { DocumentItem, Folder as FolderItem } from '@/lib/types';

interface DossiersViewProps {
  folders: FolderItem[];
  documents: DocumentItem[];
  onSelectDocument: (document: DocumentItem) => void;
  onFoldersChange: () => Promise<void>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function DossiersView({ folders, documents, onSelectDocument, onFoldersChange }: DossiersViewProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) ?? null;

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents
      .filter((document) => selectedFolderId === null || document.folder_id === selectedFolderId)
      .filter((document) => !query || [document.title, document.sender, document.category].some((value) => value.toLowerCase().includes(query)))
      .sort(compareNewestDocuments);
  }, [documents, search, selectedFolderId]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || creating) return;
    setCreating(true);
    const result = await firestore.from<FolderItem>('folders').insert({ name, parent_id: selectedFolderId, icon: 'folder', color: '#f59e0b', sort_order: folders.length });
    setCreating(false);
    if (result.error) return;
    setNewFolderName('');
    setShowCreate(false);
    await onFoldersChange();
  };

  return (
    <div className="h-full min-h-[calc(100vh-76px)] bg-white p-2 sm:p-4 md:p-6 animate-fade-in">
      <div className="mx-auto flex h-[calc(100dvh-150px)] min-h-[500px] max-w-[1500px] flex-col overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card md:h-[calc(100vh-124px)] md:min-h-[560px]">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink-800">{selectedFolder ? <FolderOpen className="h-5 w-5 fill-amber-400 text-amber-600" /> : <Folder className="h-5 w-5 fill-amber-400 text-amber-600" />}<span>Explorateur de dossiers</span></div>
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-600"><span className="text-ink-400">Dossiers</span><ChevronRight className="h-3.5 w-3.5 text-ink-300" /><span className="truncate font-medium text-ink-800">{selectedFolder?.name ?? 'Tous les documents'}</span></div>
          <label className="flex w-full items-center gap-2 rounded-md border border-ink-200 px-3 py-2 text-xs text-ink-500 sm:w-64"><Search className="h-4 w-4 shrink-0" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" className="w-full bg-transparent outline-none" /></label>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"><FolderPlus className="h-4 w-4" /> Nouveau dossier</button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="max-h-[32dvh] w-full shrink-0 overflow-y-auto border-b border-ink-200 bg-white p-3 md:max-h-none md:w-64 md:border-b-0 md:border-r">
            <button onClick={() => setSelectedFolderId(null)} className={`mb-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${selectedFolderId === null ? 'bg-primary-50 font-semibold text-primary-700' : 'text-ink-700 hover:bg-ink-100'}`}><FolderOpen className="h-5 w-5 fill-amber-400 text-amber-600" /> Tous les documents</button>
            <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-wider text-ink-400">Dossiers Firebase</p>
            {folders.length === 0 ? <p className="px-3 py-5 text-xs leading-5 text-ink-500">Aucun dossier enregistré. Créez votre premier dossier.</p> : <div className="space-y-0.5">{folders.map((folder) => { const count = documents.filter((document) => document.folder_id === folder.id).length; const active = folder.id === selectedFolderId; return <button key={folder.id} onClick={() => setSelectedFolderId(folder.id)} className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${active ? 'bg-primary-50 font-semibold text-primary-700' : 'text-ink-700 hover:bg-ink-100'}`}>{active ? <FolderOpen className="h-5 w-5 shrink-0 fill-amber-400 text-amber-600" /> : <Folder className="h-5 w-5 shrink-0 fill-amber-400 text-amber-600" />}<span className="min-w-0 flex-1 truncate">{folder.name}</span><span className="text-[11px] text-ink-400">{count}</span></button>; })}</div>}
          </aside>

          <main className="min-w-0 flex-1 overflow-y-auto bg-white">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4"><div><h1 className="text-base font-bold text-ink-900">{selectedFolder?.name ?? 'Tous les documents'}</h1><p className="mt-1 text-xs text-ink-500">{visibleDocuments.length} document{visibleDocuments.length === 1 ? '' : 's'} synchronisé{visibleDocuments.length === 1 ? '' : 's'} depuis Firebase</p></div>{selectedFolder && <button onClick={() => setSelectedFolderId(null)} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-primary-700"><X className="h-3.5 w-3.5" /> Fermer le dossier</button>}</div>
            <div className="divide-y divide-ink-100">{visibleDocuments.length === 0 ? <div className="px-6 py-16 text-center"><FolderOpen className="mx-auto h-10 w-10 text-ink-300" /><p className="mt-3 text-sm font-semibold text-ink-700">Aucun contenu dans ce dossier</p><p className="mt-1 text-xs text-ink-500">Les documents classés dans Firebase apparaîtront ici.</p></div> : visibleDocuments.map((document) => <button key={document.id} onClick={() => onSelectDocument(document)} className="group flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-primary-50/50"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-50"><FileText className="h-5 w-5 text-red-500" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink-800 group-hover:text-primary-700">{document.title || 'Document sans titre'}</p><p className="mt-0.5 truncate text-xs text-ink-500">{document.sender || 'Expéditeur inconnu'} · {document.category || 'Non classé'}</p></div><div className="hidden text-right sm:block"><p className="text-xs font-medium text-ink-700">{formatDate(document.received_date || document.created_at)}</p><p className="mt-0.5 text-[11px] text-ink-400">{document.status === 'unread' ? 'Non lu' : document.status}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-primary-500" /></button>)}</div>
          </main>
        </div>
      </div>

      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 p-4" onMouseDown={(event) => event.target === event.currentTarget && setShowCreate(false)}><div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-base font-bold text-ink-900">Nouveau dossier</h2><button onClick={() => setShowCreate(false)} aria-label="Fermer"><X className="h-5 w-5 text-ink-400" /></button></div><p className="mt-1 text-xs text-ink-500">Le dossier sera enregistré dans Firebase.</p><input autoFocus value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void createFolder()} placeholder="Nom du dossier" className="mt-4 w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-primary-500" /><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowCreate(false)} className="rounded-md px-3 py-2 text-sm text-ink-600 hover:bg-ink-100">Annuler</button><button disabled={!newFolderName.trim() || creating} onClick={() => void createFolder()} className="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{creating ? 'Création...' : 'Créer le dossier'}</button></div></div></div>}
    </div>
  );
}
