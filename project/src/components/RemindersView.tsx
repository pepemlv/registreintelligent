import { useMemo } from 'react';
import { Bell, Clock, CheckSquare, Trash2, Calendar } from 'lucide-react';
import type { Reminder, DocumentItem } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';

interface RemindersViewProps {
  reminders: Reminder[];
  documents: DocumentItem[];
  onToggle: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  onSelectDocument: (doc: DocumentItem) => void;
}

export default function RemindersView({ reminders, documents, onToggle, onDelete, onSelectDocument }: RemindersViewProps) {
  const sorted = useMemo(() => {
    return [...reminders].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime();
    });
  }, [reminders]);

  const pending = sorted.filter((r) => !r.completed);
  const completed = sorted.filter((r) => r.completed);

  const getDoc = (docId: string): DocumentItem | undefined => documents.find((d) => d.id === docId);

  const renderReminder = (r: Reminder) => {
    const doc = getDoc(r.document_id);
    const cat = doc ? getCategoryMeta(doc.category) : null;
    const isOverdue = !r.completed && new Date(r.remind_at) < new Date();
    return (
      <div key={r.id} className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
        <button
          onClick={() => onToggle(r)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
            r.completed ? 'bg-usps-blue border-usps-blue' : 'border-gray-300 hover:border-usps-red/60'
          }`}
        >
          {r.completed && <CheckSquare className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${r.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{r.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
            <span className={`text-xs ${isOverdue ? 'text-usps-red font-medium' : 'text-gray-400'}`}>
              {isOverdue ? 'En retard — ' : ''}{formatDateTime(r.remind_at)}
            </span>
            {doc && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => onSelectDocument(doc)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-usps-blue transition-colors"
                >
                  {cat && <cat.icon className={`w-3 h-3 ${cat.color}`} />}
                  {doc.title}
                </button>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(r.id)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-usps-red transition-all flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Rappels</h1>
        <p className="text-gray-500">{pending.length} actif{pending.length === 1 ? '' : 's'}, {completed.length} terminé{completed.length === 1 ? '' : 's'}</p>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-usps-red" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase">Actifs</h2>
          </div>
          <div className="space-y-2">
            {pending.map(renderReminder)}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase">Terminés</h2>
          </div>
          <div className="space-y-2">
            {completed.map(renderReminder)}
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400">Aucun rappel pour le moment. Créez-en un depuis la page de détail d'un document.</p>
        </div>
      )}
    </div>
  );
}
