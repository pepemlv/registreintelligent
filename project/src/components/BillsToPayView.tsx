import { useMemo } from 'react';
import { Receipt, ArrowRight, AlertCircle } from 'lucide-react';
import type { DocumentItem } from '@/lib/types';
import { formatCurrency, relativeDeadline, daysUntil } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';

interface BillsToPayViewProps {
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
}

export default function BillsToPayView({ documents, onSelectDocument }: BillsToPayViewProps) {
  const bills = useMemo(() => {
    return documents
      .filter((d) => d.amount_due !== null && d.status !== 'archived')
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
  }, [documents]);

  const totalDue = useMemo(() => bills.reduce((sum, d) => sum + (d.amount_due || 0), 0), [bills]);
  const overdueCount = useMemo(
    () => bills.filter((d) => d.due_date && (daysUntil(d.due_date) ?? 0) < 0).length,
    [bills]
  );

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Factures à payer</h1>
        <p className="text-gray-500">{bills.length} facture{bills.length === 1 ? '' : 's'} avec un montant dû</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-8 p-5 rounded-2xl bg-usps-blue text-white shadow-sm">
        <div className="flex-1 min-w-[160px]">
          <div className="text-sm text-blue-100">Total dû</div>
          <div className="text-3xl font-bold">{formatCurrency(totalDue)}</div>
        </div>
        {overdueCount > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-white/15 text-sm font-semibold">
            {overdueCount} en retard
          </div>
        )}
      </div>

      {bills.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400">Aucune facture à payer. Les documents avec un montant dû apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bills.map((doc) => {
            const cat = getCategoryMeta(doc.category);
            const days = daysUntil(doc.due_date);
            const overdue = days !== null && days < 0;
            return (
              <button
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group ${
                  overdue ? 'bg-red-50/40 border-red-100 hover:bg-red-50' : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <cat.icon className={`w-6 h-6 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium truncate text-gray-900 group-hover:text-usps-blue">{doc.title}</span>
                    {overdue && <AlertCircle className="w-4 h-4 text-usps-red flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{doc.sender}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 text-sm">{formatCurrency(doc.amount_due)}</div>
                    {doc.due_date && (
                      <div className={`text-xs ${overdue ? 'text-usps-red font-medium' : 'text-gray-400'}`}>
                        {relativeDeadline(doc.due_date)}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-usps-red group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
