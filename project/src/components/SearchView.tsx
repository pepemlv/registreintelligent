import { useState, useMemo } from 'react';
import { Search, Sparkles, Send, ArrowRight } from 'lucide-react';
import type { DocumentItem } from '@/lib/types';
import { formatCurrency, formatDate, relativeDeadline } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';
import { askGlobalQuestion, type AIAnswer } from '@/lib/ai';
import { compareNewestDocuments } from '@/lib/documentSort';

interface SearchViewProps {
  documents: DocumentItem[];
  onSelectDocument: (doc: DocumentItem) => void;
}

const SUGGESTED_QUERIES = [
  'Quelles factures dois-je payer cette semaine ?',
  'Quelle est ma prochaine échéance ?',
  'Montre-moi les documents qui nécessitent mon attention',
  'Montre tous les documents d\'assurance',
  'Lis mon dernier document',
];

export default function SearchView({ documents, onSelectDocument }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [aiAnswer, setAiAnswer] = useState<AIAnswer | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return documents.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.sender.toLowerCase().includes(q) ||
      d.summary.toLowerCase().includes(q) ||
      d.content_text.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      d.document_type.toLowerCase().includes(q)
    ).sort(compareNewestDocuments);
  }, [query, documents]);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const answer = await askGlobalQuestion(query, documents);
      setAiAnswer(answer);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Recherche intelligente</h1>
        <p className="text-gray-500">Recherchez vos documents ou posez une question en langage naturel.</p>
      </div>

      <div className="relative mb-4">
        <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-usps-blue" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Demandez n'importe quoi... ex. 'Quelles factures sont dues cette semaine ?'"
          className="w-full pl-11 pr-28 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue focus:border-transparent shadow-sm"
        />
        <button
          onClick={handleAsk}
          disabled={!query.trim() || isSearching}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          Demander à l'IA
        </button>
      </div>

      {/* Suggested queries */}
      {!query && !aiAnswer && (
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-3">Essayez de demander :</div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); }}
                className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-usps-gray hover:border-usps-blue/30 hover:text-usps-blue transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Answer */}
      {aiAnswer && (
        <div className="mb-6 p-5 rounded-2xl bg-usps-gray border border-usps-blue/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-usps-blue flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-usps-blue font-medium uppercase mb-1">Réponse de l'IA</div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{aiAnswer.answer}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {query && (
        <div>
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <Search className="w-4 h-4" />
            {results.length} résultat{results.length === 1 ? '' : 's'} pour "{query}"
          </div>
          {results.length === 0 ? (
            <div className="text-center py-16">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Aucun document trouvé. Essayez un autre terme de recherche.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((doc) => {
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
                      <div className="text-sm text-gray-500 truncate">{doc.sender} — {cat.label}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {doc.amount_due !== null && <span className="text-sm font-semibold text-gray-700">{formatCurrency(doc.amount_due)}</span>}
                      {doc.due_date && <span className="text-xs text-gray-400">{relativeDeadline(doc.due_date)}</span>}
                      <span className="text-xs text-gray-400">{formatDate(doc.received_date)}</span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-usps-red group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
