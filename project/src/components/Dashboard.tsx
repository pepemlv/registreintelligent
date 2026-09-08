import { useMemo } from 'react';
import {
  CalendarClock, Clock, Bell, AlertTriangle, AlertOctagon,
  ArrowRight, FileText,
} from 'lucide-react';
import type { DocumentItem, Reminder } from '@/lib/types';
import { formatCurrency, relativeDeadline, daysUntil, formatDate, formatDateTime, priorityColor, priorityLabel } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';
import { compareNewestDocuments } from '@/lib/documentSort';

interface DashboardProps {
  documents: DocumentItem[];
  reminders: Reminder[];
  onSelectDocument: (doc: DocumentItem) => void;
  onViewInbox: () => void;
}

export default function Dashboard({ documents, reminders, onSelectDocument, onViewInbox }: DashboardProps) {
  const stats = useMemo(() => {
    const actionRequired = documents.filter((d) => d.status === 'action_required');
    const unread = documents.filter((d) => d.status === 'unread');
    const billsDue = documents.filter((d) => {
      if (d.due_date === null) return false;
      const days = daysUntil(d.due_date);
      return days !== null && days >= 0 && days <= 7;
    });
    const upcoming = documents.filter((d) => {
      if (d.due_date === null) return false;
      const days = daysUntil(d.due_date);
      return days !== null && days > 7;
    });
    const pendingReminders = reminders.filter((r) => !r.completed);
    const totalDue = billsDue.reduce((sum, d) => sum + (d.amount_due || 0), 0);
    const overdue = documents.filter((d) => {
      if (d.due_date === null || d.status === 'archived') return false;
      const days = daysUntil(d.due_date);
      return days !== null && days < 0;
    });
    return { actionRequired, unread, billsDue, upcoming, pendingReminders, totalDue, overdue };
  }, [documents, reminders]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  return (
    <div className="p-4 lg:p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">{greeting} !</h1>
        <p className="text-sm text-gray-500">Voici ce qui nécessite votre attention aujourd'hui.</p>
      </div>

      {/* Document Overview */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-usps-gray flex items-center justify-center">
              <FileText className="w-4 h-4 text-usps-blue" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{documents.length}</div>
          <div className="text-xs text-gray-500 mt-1">Documents</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4 text-usps-red" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.overdue.length}</div>
          <div className="text-xs text-gray-500 mt-1">En retard</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-usps-red" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.pendingReminders.length}</div>
          <div className="text-xs text-gray-500 mt-1">Rappels</div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <h2 className="text-base font-semibold text-gray-900">Documents récents</h2>
          </div>
          <button onClick={onViewInbox} className="text-sm text-usps-red font-medium hover:text-usps-red-dark flex items-center gap-1">
            Tout voir <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...documents]
            .sort(compareNewestDocuments)
            .slice(0, 6)
            .map((doc) => {
              const cat = getCategoryMeta(doc.category);
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className={`w-9 h-9 rounded-lg ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <cat.icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 text-sm truncate group-hover:text-usps-blue">{doc.title}</div>
                      <div className="text-xs text-gray-400">{doc.sender}</div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{doc.summary}</p>
                  <div className="flex items-center gap-2 mt-2.5">
                    {doc.status === 'action_required' && (
                      <span className="px-2 py-0.5 bg-red-50 text-usps-red rounded text-xs font-medium">Action requise</span>
                    )}
                    {doc.status === 'unread' && (
                      <span className="px-2 py-0.5 bg-usps-gray text-usps-blue rounded text-xs font-medium">Nouveau</span>
                    )}
                    {doc.status === 'read' && (
                      <span className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded text-xs font-medium">Lu</span>
                    )}
                    {doc.amount_due !== null && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs font-medium">{formatCurrency(doc.amount_due)}</span>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Action Required */}
      {stats.actionRequired.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-usps-red" />
            <h2 className="text-base font-semibold text-gray-900">Action requise</h2>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">{stats.actionRequired.length}</span>
          </div>
          <div className="space-y-2">
            {stats.actionRequired.map((doc) => {
              const cat = getCategoryMeta(doc.category);
              const days = daysUntil(doc.due_date);
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all text-left group"
                >
                  <div className={`w-10 h-10 rounded-xl ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <cat.icon className={`w-4 h-4 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate group-hover:text-usps-blue transition-colors">{doc.title}</div>
                    <div className="text-sm text-gray-500 truncate">{doc.sender}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {doc.due_date && (
                      <span className={`text-sm font-medium ${days !== null && days <= 3 ? 'text-usps-red' : 'text-gray-500'}`}>
                        {relativeDeadline(doc.due_date)}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${priorityColor(doc.priority)}`}>
                      {priorityLabel(doc.priority)}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-usps-red group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bills Due Soon */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        {/* Active Reminders */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-usps-red" />
            <h2 className="text-base font-semibold text-gray-900">Actifs</h2>
            <span className="px-2 py-0.5 bg-red-50 text-usps-red rounded-full text-xs font-semibold">{stats.pendingReminders.length}</span>
          </div>
          <div className="space-y-2">
            {stats.pendingReminders.length === 0 && (
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 text-sm text-gray-400">Aucun rappel actif.</div>
            )}
            {stats.pendingReminders.slice(0, 7).map((r) => {
              const doc = documents.find((d) => d.id === r.document_id);
              const cat = doc ? getCategoryMeta(doc.category) : null;
              const isOverdue = !r.completed && new Date(r.remind_at) < new Date();
              return (
                <button
                  key={r.id}
                  onClick={() => doc && onSelectDocument(doc)}
                  className="w-full flex items-start gap-2.5 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate group-hover:text-usps-blue transition-colors">{r.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-usps-red' : 'text-gray-400'}`} />
                      <span className={`text-xs ${isOverdue ? 'text-usps-red font-medium' : 'text-gray-500'}`}>
                        {isOverdue ? 'En retard — ' : ''}{formatDateTime(r.remind_at)}
                      </span>
                      {doc && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500 truncate">{doc.title}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {cat && (
                    <div className={`w-7 h-7 rounded-lg ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-semibold text-gray-900">Factures à échéance proche</h2>
          </div>
          <div className="space-y-2">
            {stats.billsDue.length === 0 && (
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 text-sm text-gray-400">Aucune facture à payer cette semaine.</div>
            )}
            {stats.billsDue.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate group-hover:text-usps-blue">{doc.title}</div>
                  <div className="text-xs text-gray-500">{doc.sender}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-gray-900 text-sm">{formatCurrency(doc.amount_due)}</div>
                  <div className="text-xs text-amber-600 font-medium">{relativeDeadline(doc.due_date)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-usps-red" />
            <h2 className="text-base font-semibold text-gray-900">À venir</h2>
          </div>
          <div className="space-y-2">
            {stats.upcoming.length === 0 && (
              <div className="p-3.5 rounded-xl bg-white border border-gray-100 text-sm text-gray-400">Aucune échéance à venir.</div>
            )}
            {stats.upcoming.slice(0, 7).map((doc) => {
              const cat = getCategoryMeta(doc.category);
              return (
                <button
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <div className={`w-8 h-8 rounded-lg ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <cat.icon className={`w-3.5 h-3.5 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate group-hover:text-usps-blue">{doc.title}</div>
                    <div className="text-xs text-gray-500">{relativeDeadline(doc.due_date)}</div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">{formatDate(doc.due_date)}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
