import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Mic, Bot, User, FileStack } from 'lucide-react';
import { initialAssistantMessages, assistantSuggestions, assistantResponses } from '@/data';
import type { AssistantMessage } from '@/types';
import { StatusBadge } from '@/components/Badges';
import { askGlobalQuestion } from '@/lib/ai';
import type { DocumentItem } from '@/lib/types';

interface AssistantViewProps {
  backendDocuments?: DocumentItem[];
}

export function AssistantView({ backendDocuments = [] }: AssistantViewProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>(initialAssistantMessages);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const userMsg: AssistantMessage = {
      id: `u${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    if (backendDocuments.length > 0) {
      try {
        const response = await askGlobalQuestion(trimmed, backendDocuments);
        setMessages((prev) => [...prev, {
          id: `a${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }]);
      } finally {
        setIsThinking(false);
      }
      return;
    }

    setTimeout(() => {
      const response = assistantResponses[trimmed] || {
        id: `a${Date.now()}`,
        role: 'assistant' as const,
        content:
          "Je peux vous aider avec vos documents, échéances, statuts de traitement et analyses. Essayez l'une des suggestions ci-dessous pour commencer.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, response]);
      setIsThinking(false);
    }, 1400);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] animate-fade-in max-w-4xl mx-auto">
      {/* Chat container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 space-y-6">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isThinking && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm shadow-card border border-ink-200/60 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse-soft" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse-soft" style={{ animationDelay: '200ms' }} />
                <span className="h-2 w-2 rounded-full bg-primary-400 animate-pulse-soft" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {messages.length <= 1 && !isThinking && (
          <div className="animate-slide-up pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary-600" />
              <span className="text-xs font-semibold text-ink-600">Suggestions de questions</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assistantSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSend(suggestion)}
                  className="text-left px-4 py-3 bg-white rounded-xl border border-ink-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-primary-100 group-hover:bg-primary-200 flex items-center justify-center shrink-0 transition-colors">
                      <Sparkles className="h-3 w-3 text-primary-600" />
                    </div>
                    <span className="text-xs font-medium text-ink-700 group-hover:text-primary-700">{suggestion}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-ink-200/60 bg-white/80 backdrop-blur-xl p-4">
        <div className="flex items-end gap-2 bg-white rounded-2xl border border-ink-200 shadow-card px-3 py-2 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
          <button className="p-2 text-ink-400 hover:text-primary-600 transition-colors">
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Demandez quelque chose à votre assistant documentaire..."
            rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-ink-400 text-ink-700 max-h-24 py-1.5"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isThinking}
            className="p-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white disabled:from-ink-300 disabled:to-ink-300 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary-600/20 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-ink-400 text-center mt-2">
          L'assistant IA connaît les statuts, échéances, responsables et historique de traitement de vos documents.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end animate-slide-up">
        <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-lg shadow-primary-600/10">
          <p className="text-sm text-white leading-relaxed">{message.content}</p>
          <p className="text-[10px] text-primary-200 mt-1.5 text-right">{message.timestamp}</p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-ink-700 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20">
        <Bot className="h-5 w-5 text-white" />
      </div>
      <div className="max-w-[80%]">
        <div className="bg-white rounded-2xl rounded-tl-sm shadow-card border border-ink-200/60 px-4 py-3">
          <p className="text-sm text-ink-700 leading-relaxed">{message.content}</p>

          {message.data?.items && message.data.items.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.data.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-ink-50 rounded-lg border border-ink-200/60"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileStack className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                    <span className="text-xs font-medium text-ink-700 truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-ink-600">{item.value}</span>
                    {item.status && <StatusBadge status={item.status} size="xs" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[10px] text-ink-400 mt-1.5 ml-1">{message.timestamp}</p>
      </div>
    </div>
  );
}
