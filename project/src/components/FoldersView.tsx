import { useMemo, useState } from 'react';
import { Folder as FolderIcon, ChevronRight, ArrowLeft, Inbox as InboxIcon, Plus, X, FolderPlus } from 'lucide-react';
import type { Folder, DocumentItem } from '@/lib/types';
import { FOLDER_ICONS, getCategoryMeta } from '@/lib/categories';
import { formatCurrency, formatDate, relativeDeadline } from '@/lib/format';
import { compareNewestDocuments } from '@/lib/documentSort';
import type { LucideIcon } from 'lucide-react';
import { firestore } from '@/lib/firebase';

interface FoldersViewProps {
  folders: Folder[];
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
}

const FOLDER_COLOR_OPTIONS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

export default function FoldersView({ folders, documents, onSelectDocument }: FoldersViewProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<Folder[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');

  const rootFolders = useMemo(() =>
    folders.filter((f) => f.parent_id === null).sort((a, b) => a.sort_order - b.sort_order),
  [folders]);

  const childFolders = useMemo(() =>
    folders.filter((f) => f.parent_id === currentFolderId).sort((a, b) => a.sort_order - b.sort_order),
  [folders, currentFolderId]);

  const folderDocs = useMemo(() =>
    documents
      .filter((d) => {
        if (!currentFolderId) return false;
        // Check if doc is in this folder or any child folder
        const isInFolder = (folderId: string): boolean => {
          if (d.folder_id === folderId) return true;
          const children = folders.filter((f) => f.parent_id === folderId);
          return children.some((c) => isInFolder(c.id));
        };
        return isInFolder(currentFolderId);
      })
      .sort(compareNewestDocuments),
  [documents, currentFolderId, folders]);

  const navigateToFolder = (folder: Folder) => {
    setBreadcrumb((prev) => [...prev, folder]);
    setCurrentFolderId(folder.id);
  };

  const navigateToBreadcrumb = (index: number) => {
    const target = breadcrumb[index];
    setBreadcrumb(breadcrumb.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const goRoot = () => {
    setBreadcrumb([]);
    setCurrentFolderId(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const maxSort = folders.filter((f) => f.parent_id === (currentFolderId ?? null)).reduce((max, f) => Math.max(max, f.sort_order), 0);
    await firestore.from('folders').insert({
      name: newFolderName.trim(),
      parent_id: currentFolderId,
      icon: 'FolderIcon',
      color: newFolderColor,
      sort_order: maxSort + 1,
    });
    setNewFolderName('');
    setShowCreate(false);
    window.location.reload();
  };

  const getFolderIcon = (iconName: string): LucideIcon => {
    return FOLDER_ICONS[iconName] || FolderIcon;
  };

  const getFolderColor = (folder: Folder): string => folder.color || '#3b82f6';

  const folderDocCount = (folderId: string): number => {
    const count = (fid: string): number => {
      const direct = documents.filter((d) => d.folder_id === fid).length;
      const children = folders.filter((f) => f.parent_id === fid);
      return direct + children.reduce((sum, c) => sum + count(c.id), 0);
    };
    return count(folderId);
  };

  if (!currentFolderId) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Dossiers</h1>
            <p className="text-gray-500">{rootFolders.length} dossiers</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau dossier
          </button>
        </div>

        {showCreate && (
          <div className="mb-6 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Créer un nouveau dossier</h3>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase mb-1 block">Nom du dossier</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="ex. Dossiers médicaux"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase mb-1 block">Couleur</label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewFolderColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${newFolderColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                <FolderPlus className="w-4 h-4" />
                Créer le dossier
              </button>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rootFolders.map((folder) => {
            const Icon = getFolderIcon(folder.icon);
            const count = folderDocCount(folder.id);
            return (
              <button
                key={folder.id}
                onClick={() => navigateToFolder(folder)}
                className="group p-5 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${getFolderColor(folder)}15` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: getFolderColor(folder) }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate group-hover:text-usps-blue transition-colors">{folder.name}</div>
                    <div className="text-sm text-gray-400">{count} document{count === 1 ? '' : 's'}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-usps-red group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={goRoot} className="text-gray-500 hover:text-gray-900 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Dossiers
        </button>
        {breadcrumb.map((f, i) => (
          <div key={f.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <button
              onClick={() => i < breadcrumb.length - 1 && navigateToBreadcrumb(i)}
              className={i === breadcrumb.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-900'}
            >
              {f.name}
            </button>
          </div>
        ))}
      </div>

      {/* Subfolders */}
      {childFolders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Sous-dossiers</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {childFolders.map((folder) => {
              const Icon = getFolderIcon(folder.icon);
              const count = folderDocCount(folder.id);
              return (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder)}
                  className="group p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${getFolderColor(folder)}15` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: getFolderColor(folder) }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate text-sm group-hover:text-usps-blue">{folder.name}</div>
                      <div className="text-xs text-gray-400">{count} document{count === 1 ? '' : 's'}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-usps-red" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents in this folder */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Documents ({folderDocs.length})
        </h2>
        {folderDocs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <InboxIcon className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">Aucun document dans ce dossier pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {folderDocs.map((doc) => {
              const cat = getCategoryMeta(doc.category);
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className={`w-11 h-11 rounded-xl ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <cat.icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate group-hover:text-usps-blue">{doc.title}</div>
                    <div className="text-sm text-gray-500 truncate">{doc.sender}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {doc.amount_due !== null && <span className="text-sm font-semibold text-gray-700">{formatCurrency(doc.amount_due)}</span>}
                    {doc.due_date && <span className="text-xs text-gray-400">{relativeDeadline(doc.due_date)}</span>}
                    <span className="text-xs text-gray-400">{formatDate(doc.received_date)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
