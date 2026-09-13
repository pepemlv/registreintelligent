import { useState } from 'react';
import { FolderInput, ChevronDown, FolderPlus, X, Check } from 'lucide-react';
import type { Folder } from '@/lib/types';
import { firestore } from '@/lib/firebase';

interface FolderPickerProps {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelect: (folderId: string) => void;
  onFolderCreated: (folder: Folder) => void;
  label?: string;
  align?: 'left' | 'right';
}

const FOLDER_COLOR_OPTIONS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

export default function FolderPicker({ folders, selectedFolderId, onSelect, onFolderCreated, label, align = 'right' }: FolderPickerProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(FOLDER_COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const rootFolders = folders.filter((f) => f.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);
  const selected = folders.find((f) => f.id === selectedFolderId);

  const close = () => {
    setOpen(false);
    setCreating(false);
    setNewName('');
  };

  const handleSelect = (folderId: string) => {
    onSelect(folderId);
    close();
  };

  const handleCreate = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    const maxSort = rootFolders.reduce((max, f) => Math.max(max, f.sort_order), 0);
    const { data } = await firestore.from<Record<string, unknown>>('folders').insert({
      name: newName.trim(),
      parent_id: null,
      icon: 'FolderIcon',
      color: newColor,
      sort_order: maxSort + 1,
    }).select().single();
    setSaving(false);
    if (data) {
      const row = Array.isArray(data) ? data[0] : data;
      const folder: Folder = {
        id: String(row.id),
        name: String(row.name),
        parent_id: (row.parent_id as string | null) ?? null,
        icon: String(row.icon ?? 'FolderIcon'),
        color: String(row.color ?? newColor),
        sort_order: Number(row.sort_order ?? maxSort + 1),
        created_at: String(row.created_at ?? new Date().toISOString()),
      };
      onFolderCreated(folder);
      onSelect(folder.id);
    }
    close();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 text-sm font-semibold text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg transition-colors flex items-center gap-1.5"
      >
        <FolderInput className="w-4 h-4" />
        {selected ? selected.name : (label ?? 'Ajouter à un dossier')}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-1`}>
            {!creating ? (
              <>
                <div className="max-h-56 overflow-y-auto">
                  {rootFolders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleSelect(f.id)}
                      className={`w-full flex items-center justify-between text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        selectedFolderId === f.id ? 'text-usps-blue font-medium' : 'text-gray-700'
                      }`}
                    >
                      {f.name}
                      {selectedFolderId === f.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                  {rootFolders.length === 0 && (
                    <div className="px-4 py-2 text-sm text-gray-400">Aucun dossier pour l'instant</div>
                  )}
                </div>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-usps-blue hover:bg-usps-gray transition-colors font-medium"
                  >
                    <FolderPlus className="w-4 h-4" />
                    Créer un nouveau dossier
                  </button>
                </div>
              </>
            ) : (
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Nouveau dossier</span>
                  <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Nom du dossier"
                  autoFocus
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-usps-blue"
                />
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {FOLDER_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-6 h-6 rounded-full transition-all ${newColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || saving}
                  className="w-full px-3 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Création...' : 'Créer et sélectionner'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
