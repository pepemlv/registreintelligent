import { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  Calendar,
  DollarSign,
  User,
  Building2,
  Package,
  Truck,
  CheckCircle2,
  Send,
  Paperclip,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Bot,
  X,
  Tag,
} from 'lucide-react';
import type { DocDocument, CollaborationMessage } from '@/types';
import { StatusBadge, PriorityBadge, Avatar } from '@/components/Badges';
import { formatDate, formatCurrency, typeConfig } from '@/lib/documentConfig';

interface DocumentDetailProps {
  document: DocDocument;
  onBack: () => void;
}

const activityIconMap = {
  receive: FileText,
  assign: User,
  validate: CheckCircle,
  comment: MessageSquare,
  ai: Bot,
  close: CheckCircle2,
  alert: AlertTriangle,
};

export function DocumentDetail({ document: doc, onBack }: DocumentDetailProps) {
  const [messages, setMessages] = useState<CollaborationMessage[]>(doc.collaboration);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const newMsg: CollaborationMessage = {
      id: `m${Date.now()}`,
      author: 'Pierre Durand',
      authorRole: 'client',
      avatarColor: 'bg-ink-700',
      message: input.trim(),
      timestamp: new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages([...messages, newMsg]);
    setInput('');
  };

  return (
    <div className="animate-fade-in max-w-[1600px] mx-auto">
      {/* Sticky header */}
      <div className="sticky top-16 z-20 bg-white/80 backdrop-blur-xl border-b border-ink-200/60 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <div className="h-5 w-px bg-ink-200" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-ink-400">{doc.reference}</span>
              <StatusBadge status={doc.status} size="xs" />
              <PriorityBadge priority={doc.priority} />
            </div>
            <h2 className="font-display font-bold text-ink-900 text-base truncate">{doc.title}</h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-ink-600 bg-ink-100 hover:bg-ink-200 transition-colors">
              Télécharger
            </button>
            <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Valider
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 p-6">
        {/* Left: Document preview + AI analysis */}
        <div className="xl:col-span-2 space-y-6">
          {/* Document preview mock */}
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-ink-400" />
                <span className="text-sm font-semibold text-ink-800">Aperçu du document</span>
              </div>
              <span className="text-[10px] text-ink-400">{doc.pages} page{doc.pages > 1 ? 's' : ''}</span>
            </div>
            <div className="p-8 bg-ink-50/50 flex items-center justify-center min-h-[280px]">
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full border border-ink-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="h-6 w-24 bg-ink-200 rounded mb-2" />
                    <div className="h-3 w-16 bg-ink-100 rounded" />
                  </div>
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-ink-100 rounded w-full" />
                  <div className="h-2 bg-ink-100 rounded w-5/6" />
                  <div className="h-2 bg-ink-100 rounded w-4/6" />
                </div>
                <div className="mt-4 pt-4 border-t border-ink-100 space-y-2">
                  <div className="flex justify-between">
                    <div className="h-2 bg-ink-100 rounded w-12" />
                    <div className="h-4 bg-primary-100 rounded w-20" />
                  </div>
                  <div className="flex justify-between">
                    <div className="h-2 bg-ink-100 rounded w-16" />
                    <div className="h-2 bg-ink-100 rounded w-14" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-gradient-to-br from-white to-primary-50/40 rounded-2xl shadow-card border border-primary-200/40 overflow-hidden">
            <div className="px-5 py-3 border-b border-primary-100/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-ink-800">Analyse IA</span>
                  <span className="text-[10px] text-ink-500 ml-2">Confiance {doc.aiConfidence}%</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative h-8 w-8">
                  <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="rgb(226 232 240)" strokeWidth="3" />
                    <circle
                      cx="16"
                      cy="16"
                      r="13"
                      fill="none"
                      stroke={doc.aiConfidence >= 95 ? 'rgb(16 185 129)' : 'rgb(245 158 11)'}
                      strokeWidth="3"
                      strokeDasharray={`${(doc.aiConfidence / 100) * 81.7} 81.7`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Bot className="h-3.5 w-3.5 text-primary-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">Résumé</span>
                </div>
                <p className="text-sm text-ink-700 leading-relaxed">{doc.aiSummary}</p>
              </div>

              {/* Extracted key points */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-accent-600">Données extraites</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {doc.aiKeyPoints.map((point, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-ink-200/60"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-accent-500 shrink-0" />
                      <span className="text-xs text-ink-700">{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  Reformuler
                </button>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Poser une question
                </button>
                <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-ink-200 text-ink-600 hover:bg-ink-50 transition-colors flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  Extraire plus
                </button>
              </div>
            </div>
          </div>

          {/* Collaboration thread */}
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-ink-400" />
                <span className="text-sm font-semibold text-ink-800">Discussion collaborative</span>
              </div>
              <span className="text-[10px] text-ink-500">{messages.length} message{messages.length > 1 ? 's' : ''}</span>
            </div>
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto scrollbar-thin">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-ink-300 mx-auto mb-2" />
                  <p className="text-sm text-ink-500">Aucun message pour l'instant</p>
                  <p className="text-xs text-ink-400 mt-1">Démarrez la conversation avec l'expéditeur</p>
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 animate-slide-up">
                  <Avatar name={msg.author} color={msg.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-ink-800">{msg.author}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          msg.authorRole === 'supplier'
                            ? 'bg-primary-100 text-primary-700'
                            : msg.authorRole === 'internal'
                              ? 'bg-ink-100 text-ink-600'
                              : 'bg-accent-100 text-accent-700'
                        }`}
                      >
                        {msg.authorRole === 'supplier' ? 'Fournisseur' : msg.authorRole === 'internal' ? 'Interne' : 'Client'}
                      </span>
                      <span className="text-[10px] text-ink-400">{msg.timestamp}</span>
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed bg-ink-50 rounded-xl px-3 py-2">
                      {msg.message}
                    </p>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.attachments.map((att, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary-50 border border-primary-200 rounded-lg"
                          >
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
            {/* Message input */}
            <div className="border-t border-ink-100 p-3">
              <div className="flex items-end gap-2 bg-ink-50 rounded-xl border border-ink-200 px-3 py-2">
                <button className="p-1 text-ink-400 hover:text-primary-600 transition-colors">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Écrivez un message..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm outline-none resize-none placeholder:text-ink-400 text-ink-700 max-h-24"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-lg bg-primary-600 text-white disabled:bg-ink-300 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metadata + Activity */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100">
              <span className="text-sm font-semibold text-ink-800">Informations</span>
            </div>
            <div className="p-5 space-y-4">
              <MetaRow icon={Building2} label="Expéditeur" value={doc.sender.name} />
              <MetaRow icon={User} label="Destinataire" value={doc.recipient.name} />
              {doc.aiAmount && (
                <MetaRow
                  icon={DollarSign}
                  label="Montant"
                  value={formatCurrency(doc.aiAmount, doc.currency)}
                  highlight
                />
              )}
              {doc.dueDate && (
                <MetaRow
                  icon={Calendar}
                  label="Échéance"
                  value={formatDate(doc.dueDate)}
                  urgent={doc.status === 'overdue'}
                />
              )}
              {doc.assignedTo && (
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-1.5">
                    <User className="h-3 w-3" />
                    Affecté à
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-primary-50 rounded-lg">
                    <Avatar name={doc.assignedTo} color="bg-primary-600" size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-ink-800">{doc.assignedTo}</p>
                      <p className="text-[10px] text-ink-500">{doc.assignedDepartment}</p>
                    </div>
                  </div>
                </div>
              )}
              <MetaRow icon={Package} label="Type" value={typeConfig[doc.type].label} />
              <MetaRow icon={Clock} label="Reçu le" value={formatDate(doc.receivedDate)} />
              {doc.processingTime !== undefined && (
                <MetaRow icon={Clock} label="Délai de traitement" value={`${doc.processingTime} jours`} />
              )}

              {/* Physical original */}
              {doc.hasPhysicalOriginal && (
                <div className="pt-3 border-t border-ink-100">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">
                    <Truck className="h-3 w-3" />
                    Original physique
                  </div>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      doc.physicalStatus === 'delivered'
                        ? 'bg-accent-50 border border-accent-200'
                        : doc.physicalStatus === 'in_transit'
                          ? 'bg-warning-50 border border-warning-200'
                          : 'bg-ink-50 border border-ink-200'
                    }`}
                  >
                    {doc.physicalStatus === 'delivered' ? (
                      <CheckCircle2 className="h-4 w-4 text-accent-600" />
                    ) : doc.physicalStatus === 'in_transit' ? (
                      <Truck className="h-4 w-4 text-warning-600 animate-pulse-soft" />
                    ) : (
                      <X className="h-4 w-4 text-ink-400" />
                    )}
                    <span className="text-xs font-medium text-ink-700">
                      {doc.physicalStatus === 'delivered'
                        ? 'Livré'
                        : doc.physicalStatus === 'in_transit'
                          ? 'En cours d\'acheminement'
                          : 'Non requis'}
                    </span>
                  </div>
                  {doc.physicalStatus === 'in_transit' && (
                    <p className="text-[10px] text-ink-500 mt-1.5 leading-relaxed">
                      La copie numérique permet de commencer le traitement sans attendre l'original.
                    </p>
                  )}
                </div>
              )}

              {/* Tags */}
              <div className="pt-3 border-t border-ink-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400 mb-2">
                  <Tag className="h-3 w-3" />
                  Étiquettes
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-0.5 bg-ink-100 text-ink-600 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="bg-white rounded-2xl shadow-card border border-ink-200/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100">
              <span className="text-sm font-semibold text-ink-800">Historique</span>
            </div>
            <div className="p-5">
              <div className="relative space-y-4">
                {doc.activity.map((entry, i) => {
                  const Icon = activityIconMap[entry.icon];
                  const isLast = i === doc.activity.length - 1;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 relative">
                      {!isLast && (
                        <div className="absolute left-[15px] top-8 bottom-[-16px] w-px bg-ink-200" />
                      )}
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                          entry.icon === 'ai'
                            ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                            : entry.icon === 'alert'
                              ? 'bg-warning-100'
                              : entry.icon === 'validate' || entry.icon === 'close'
                                ? 'bg-accent-100'
                                : 'bg-ink-100'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            entry.icon === 'ai'
                              ? 'text-white'
                              : entry.icon === 'alert'
                                ? 'text-warning-600'
                                : entry.icon === 'validate' || entry.icon === 'close'
                                  ? 'text-accent-600'
                                  : 'text-ink-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-xs font-medium text-ink-800">{entry.action}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-ink-500">{entry.actor}</span>
                          <span className="text-[10px] text-ink-300">·</span>
                          <span className="text-[10px] text-ink-400">{entry.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  highlight,
  urgent,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  highlight?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <span
        className={`text-xs font-semibold ${
          highlight ? 'text-primary-700' : urgent ? 'text-danger-600' : 'text-ink-700'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
