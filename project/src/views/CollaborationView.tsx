import { useState } from 'react';
import {
  Users,
  MessageSquare,
  FileStack,
  Send,
  Paperclip,
} from 'lucide-react';
import { documents } from '@/data';
import { StatusBadge, Avatar } from '@/components/Badges';
import { formatCurrency } from '@/lib/documentConfig';
import { compareNewestLegacyDocuments } from '@/lib/documentSort';
import type { DocDocument, CollaborationMessage } from '@/types';

interface CollaborationViewProps {
  onSelectDocument: (doc: DocDocument) => void;
}

export function CollaborationView({ onSelectDocument }: CollaborationViewProps) {
  const docsCollab = documents.filter((d) => d.collaboration.length > 0).sort(compareNewestLegacyDocuments);
  const [selectedId, setSelectedId] = useState<string | null>(docsCollab[0]?.id || null);
  const selected = docsCollab.find((d) => d.id === selectedId);
  const [messages, setMessages] = useState<Record<string, CollaborationMessage[]>>({});
  const [input, setInput] = useState('');

  const currentMessages = selected ? (messages[selected.id] || selected.collaboration) : [];

  const handleSend = () => {
    if (!input.trim() || !selected) return;
    const newMsg: CollaborationMessage = {
      id: `m${Date.now()}`,
      author: 'Pierre Durand',
      authorRole: 'internal',
      avatarColor: 'bg-ink-700',
      message: input.trim(),
      timestamp: new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    };
    setMessages({ ...messages, [selected.id]: [...currentMessages, newMsg] });
    setInput('');
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      {/* Document list */}
      <div className="w-80 shrink-0 bg-white border-r border-ink-200/60 overflow-y-auto scrollbar-thin">
        <div className="px-4 py-4 border-b border-ink-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            <h2 className="font-display font-bold text-ink-900 text-sm">Documents collaboratifs</h2>
          </div>
          <p className="text-[10px] text-ink-500 mt-0.5">Espaces de discussion actifs</p>
        </div>
        <div className="divide-y divide-ink-100">
          {docsCollab.map((doc) => (
            <button
              key={doc.id}
              onClick={() => setSelectedId(doc.id)}
              className={`w-full p-4 text-left transition-colors ${selectedId === doc.id ? 'bg-primary-50' : 'hover:bg-ink-50'}`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-mono text-ink-400">{doc.reference}</span>
                <StatusBadge status={doc.status} size="xs" />
              </div>
              <p className="text-xs font-semibold text-ink-800 truncate">{doc.title}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <MessageSquare className="h-3 w-3 text-ink-400" />
                <span className="text-[10px] text-ink-500">{doc.collaboration.length} messages</span>
                <div className="flex -space-x-1 ml-auto">
                  {Array.from(new Set(doc.collaboration.map((m) => m.author))).slice(0, 3).map((author, i) => {
                    const msg = doc.collaboration.find((m) => m.author === author)!;
                    return <Avatar key={i} name={author} color={msg.avatarColor} size="sm" />;
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-5 py-3 bg-white border-b border-ink-200/60 flex items-center gap-3">
              <button onClick={() => onSelectDocument(selected)} className="flex items-center gap-2 text-left group">
                <div className="h-9 w-9 rounded-lg bg-ink-100 group-hover:bg-primary-100 flex items-center justify-center shrink-0">
                  <FileStack className="h-4 w-4 text-ink-500 group-hover:text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-800 group-hover:text-primary-700">{selected.title}</p>
                  <span className="text-[10px] font-mono text-ink-400">{selected.reference}</span>
                </div>
              </button>
              {selected.aiAmount && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm font-bold text-ink-700">{formatCurrency(selected.aiAmount, selected.currency)}</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-4 bg-ink-50/30">
              {currentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 animate-slide-up">
                  <Avatar name={msg.author} color={msg.avatarColor} size="md" />
                  <div className="flex-1 min-w-0 max-w-[70%]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-ink-800">{msg.author}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        msg.authorRole === 'supplier' ? 'bg-primary-100 text-primary-700' :
                        msg.authorRole === 'internal' ? 'bg-ink-100 text-ink-600' : 'bg-accent-100 text-accent-700'
                      }`}>
                        {msg.authorRole === 'supplier' ? 'Fournisseur' : msg.authorRole === 'internal' ? 'Interne' : 'Client'}
                      </span>
                      <span className="text-[10px] text-ink-400">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed bg-white rounded-xl px-3 py-2 shadow-sm border border-ink-200/60">
                      {msg.message}
                    </p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-50 border border-primary-200 rounded-lg">
                            <Paperclip className="h-3 w-3 text-primary-600" />
                            <span className="text-xs font-medium text-primary-700">{att.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-ink-200/60 bg-white p-3">
              <div className="flex items-end gap-2 bg-ink-50 rounded-xl border border-ink-200 px-3 py-2">
                <button className="p-1 text-ink-400 hover:text-primary-600 transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Écrivez un message..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-ink-400 text-ink-700 max-h-24"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg bg-primary-600 text-white disabled:bg-ink-300 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-ink-400 text-center mt-2">
                Les échanges restent attachés au document. Plus structuré qu'une chaîne d'e-mails.
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Users className="h-12 w-12 text-ink-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-ink-600">Sélectionnez un document</p>
              <p className="text-xs text-ink-400 mt-1">Pour voir son espace collaboratif</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
