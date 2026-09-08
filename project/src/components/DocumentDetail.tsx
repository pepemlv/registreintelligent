import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Volume2, Square, Send, CalendarPlus, StickyNote,
  MessageSquare, CheckSquare, Archive, Clock,
  Sparkles, User, Trash2, Download, FileDown, Upload as UploadIcon, Share2, FileText,
  X, ArrowDownLeft, ArrowUpRight, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { DocumentItem, Note, Comment, Reminder, ActionItem, Folder } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, relativeDeadline, relativeTime, priorityColor, priorityLabel, daysUntil, isRawJsonText } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';
import { askDocumentQuestion, type AIAnswer } from '@/lib/ai';
import { auth, firestore, storage } from '@/lib/firebase';
import { frenchDocumentSender, frenchDocumentSummary, frenchDocumentTitle, frenchText } from '@/lib/frenchText';
import FolderPicker from './FolderPicker';

interface DocumentDetailProps {
  document: DocumentItem;
  notes: Note[];
  comments: Comment[];
  reminders: Reminder[];
  actions: ActionItem[];
  folders: Folder[];
  onBack: () => void;
  onDataChange: () => void;
  onFoldersChange: () => void;
}

type Tab = 'summary' | 'ask' | 'notes' | 'comments' | 'reminders' | 'actions';

const STICKER_COLORS = [
  'bg-yellow-100 border-yellow-300',
  'bg-pink-100 border-pink-300',
  'bg-green-100 border-green-300',
  'bg-blue-100 border-blue-300',
  'bg-orange-100 border-orange-300',
  'bg-purple-100 border-purple-300',
];

export default function DocumentDetail({
  document: doc, notes, comments, reminders, actions, folders, onBack, onDataChange, onFoldersChange,
}: DocumentDetailProps) {
  const [tab, setTab] = useState<Tab>('summary');
  const [isPlaying, setIsPlaying] = useState(false);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<AIAnswer[]>([]);
  const [askingAi, setAskingAi] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [newActionTitle, setNewActionTitle] = useState('');
  const [newActionAssignee, setNewActionAssignee] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [readFull, setReadFull] = useState(false);
  const [readSummary, setReadSummary] = useState(false);
  const [uploadingOriginal, setUploadingOriginal] = useState(false);
  const originalFileInputRef = useRef<HTMLInputElement>(null);

  const registerRows = useMemo(() => {
    const r = doc.register;
    if (!r) return [];
    const rows: { label: string; value: string }[] = [];
    const add = (label: string, value: string | null | undefined) => {
      if (value) rows.push({ label, value });
    };
    if (doc.direction === 'incoming') {
      add('N° d\'enregistrement', r.registrationNumber);
      add('Date de réception', formatDate(doc.received_date));
      add('N° / Référence du courrier', r.referenceNumber);
      add('Date du courrier', r.documentDate ? formatDate(r.documentDate) : '');
      add('Expéditeur / Provenance', doc.sender);
      add('Destinataire', r.recipient);
      add('Service d\'affectation', r.assignedService);
      add('Instruction / Imputation', r.instruction);
      add('Date de transmission', r.transmissionDate ? formatDate(r.transmissionDate) : '');
      add('Réception par le service', r.receivedByService);
      add('Échéance', doc.due_date ? formatDate(doc.due_date) : '');
      add('Statut', r.registerStatus);
      add('Observations', r.observations);
    } else {
      add('N° d\'ordre / numéro de sortie', r.registrationNumber);
      add('Date d\'expédition', formatDate(doc.received_date));
      add('Référence du courrier', r.referenceNumber);
      add('Destinataire', r.recipient);
      add('Adresse / institution destinataire', r.recipientAddress);
      add('Service émetteur', r.assignedService);
      add('Mode d\'expédition', r.dispatchMode);
      add('Preuve d\'envoi / accusé de réception', r.proofOfSending);
      add('Date de réception par le destinataire', r.recipientReceivedDate ? formatDate(r.recipientReceivedDate) : '');
      add('Statut', r.registerStatus);
      add('Observations', r.observations);
    }
    return rows;
  }, [doc]);

  const cat = getCategoryMeta(doc.category);
  const days = daysUntil(doc.due_date);
  const safeSummary = doc.summary && !isRawJsonText(doc.summary) ? doc.summary : 'Aucun résumé disponible.';
  const speakableTitle = frenchDocumentTitle(doc);
  const speakableSender = frenchDocumentSender(doc);
  const speakableSummary = frenchText(safeSummary || frenchDocumentSummary(doc));
  const processedByLabel = doc.processed_by === 'claude' ? 'Claude AI'
    : doc.processed_by === 'openai' ? 'OpenAI'
    : doc.processed_by === 'local' ? 'IA locale'
    : null;

  const handleSpeak = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      const text = `${speakableTitle}. De ${speakableSender}. ${speakableSummary} ${frenchText(doc.content_text)}`;
      speak(text, () => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleSpeakSummary = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    speak(speakableSummary, () => setIsPlaying(false));
    setIsPlaying(true);
    setReadSummary(true);
    setTimeout(() => setReadSummary(false), 2000);
  };

  const handleSpeakFull = () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    const text = `Texte complet de ${speakableTitle}. De ${speakableSender}. ${frenchText(doc.content_text)}`;
    speak(text, () => setIsPlaying(false));
    setIsPlaying(true);
    setReadFull(true);
    setTimeout(() => setReadFull(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([doc.content_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadOriginal = async () => {
    if (!doc.image_url) return;
    try {
      const response = await fetch(doc.image_url);
      const blob = await response.blob();
      const ext = blob.type.includes('pdf') ? 'pdf'
        : blob.type.includes('png') ? 'png'
        : blob.type.includes('webp') ? 'webp'
        : blob.type.includes('jpeg') ? 'jpg'
        : '';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_')}${ext ? `.${ext}` : ''}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(doc.image_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUploadOriginalFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !auth.currentUser) return;
    setUploadingOriginal(true);
    try {
      const path = `users/${auth.currentUser.uid}/documents/${Date.now()}-${file.name}`;
      const uploaded = await uploadBytes(storageRef(storage, path), file);
      const url = await getDownloadURL(uploaded.ref);
      await firestore.from('documents').update({ image_url: url }).eq('id', doc.id);
      onDataChange();
    } finally {
      setUploadingOriginal(false);
    }
  };

  const handleAddToFolder = async (folderId: string) => {
    await firestore.from('documents').update({ folder_id: folderId }).eq('id', doc.id);
    onDataChange();
  };

  const handleFolderCreated = (_folder: Folder) => {
    onFoldersChange();
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/?doc=${doc.id}`;
    if (navigator.share) {
      navigator.share({ title: doc.title, text: safeSummary, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl);
      setShowShareMenu(true);
      setTimeout(() => setShowShareMenu(false), 2000);
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || askingAi) return;
    const currentQuestion = question;
    setQuestion('');
    setAskingAi(true);
    try {
      const result = await askDocumentQuestion(currentQuestion, doc);
      setQaHistory((prev) => [...prev, result]);
    } finally {
      setAskingAi(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    await firestore.from('notes').insert({ document_id: doc.id, content: newNote });
    setNewNote('');
    setAddingNote(false);
    onDataChange();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    await firestore.from('comments').insert({ document_id: doc.id, author_name: 'Vous', author_role: 'Propriétaire', content: newComment });
    setNewComment('');
    setAddingComment(false);
    onDataChange();
  };

  const handleAddReminder = async () => {
    if (!newReminderTitle.trim() || !newReminderDate) return;
    await firestore.from('reminders').insert({
      document_id: doc.id,
      title: newReminderTitle,
      remind_at: new Date(newReminderDate).toISOString(),
    });
    setNewReminderTitle('');
    setNewReminderDate('');
    onDataChange();
  };

  const toggleReminder = async (r: Reminder) => {
    await firestore.from('reminders').update({ completed: !r.completed }).eq('id', r.id);
    onDataChange();
  };

  const deleteReminder = async (id: string) => {
    await firestore.from('reminders').delete().eq('id', id);
    onDataChange();
  };

  const toggleAction = async (a: ActionItem) => {
    await firestore.from('actions').update({
      completed: !a.completed,
      completed_at: !a.completed ? new Date().toISOString() : null,
    }).eq('id', a.id);
    onDataChange();
  };

  const deleteAction = async (id: string) => {
    await firestore.from('actions').delete().eq('id', id);
    onDataChange();
  };

  const deleteNote = async (id: string) => {
    await firestore.from('notes').delete().eq('id', id);
    onDataChange();
  };

  const handleAddAction = async () => {
    if (!newActionTitle.trim()) return;
    await firestore.from('actions').insert({
      document_id: doc.id,
      title: newActionTitle,
      assignee_name: newActionAssignee || 'Vous',
    });
    setNewActionTitle('');
    setNewActionAssignee('');
    onDataChange();
  };

  const toggleDirection = async () => {
    const next = doc.direction === 'outgoing' ? 'incoming' : doc.direction === 'incoming' ? 'outgoing' : 'incoming';
    await firestore.from('documents').update({ direction: next }).eq('id', doc.id);
    onDataChange();
  };

  const handleArchive = async () => {
    await firestore.from('documents').update({ status: 'archived' }).eq('id', doc.id);
    onBack();
  };

  const handleMarkRead = async () => {
    await firestore.from('documents').update({ status: 'read' }).eq('id', doc.id);
    onDataChange();
  };

  const tabs: { id: Tab; label: string; icon: typeof Sparkles; count?: number }[] = [
    { id: 'summary', label: 'Résumé IA', icon: Sparkles },
    { id: 'ask', label: 'Demander à l\'IA', icon: MessageSquare },
    { id: 'notes', label: 'Notes', icon: StickyNote, count: notes.length },
    { id: 'comments', label: 'Commentaires', icon: MessageSquare, count: comments.length },
    { id: 'reminders', label: 'Rappels', icon: CalendarPlus, count: reminders.length },
    { id: 'actions', label: 'Actions', icon: CheckSquare, count: actions.length },
  ];

  const suggestedQuestions = [
    'Combien dois-je payer ?',
    'Quelle est l\'échéance ?',
    'Que demande ce courrier ?',
    'Résume ce document',
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 lg:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4 mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSpeakSummary}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                readSummary ? 'bg-emerald-50 text-emerald-700' : 'bg-usps-gray text-usps-blue hover:bg-blue-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Lire le résumé
            </button>
            <button
              onClick={handleSpeakFull}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                readFull ? 'bg-emerald-50 text-emerald-700' : 'bg-usps-gray text-usps-blue hover:bg-blue-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Lire le texte complet
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Télécharger le texte
            </button>

            {/* Share */}
            <div className="relative">
              <button
                onClick={handleShare}
                className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-20">
                  Lien copié !
                </div>
              )}
            </div>

            {/* Add Note */}
            <button
              onClick={() => { setTab('notes'); }}
              className="px-3 py-1.5 text-sm text-gray-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <StickyNote className="w-4 h-4" />
              Ajouter une note
            </button>

            {doc.status !== 'read' && doc.status !== 'archived' && (
              <button onClick={handleMarkRead} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                Marquer comme lu
              </button>
            )}
            {doc.status !== 'archived' && (
              <button onClick={handleArchive} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5">
                <Archive className="w-4 h-4" />
                Archiver
              </button>
            )}
            {isSpeechSupported() && (
              <button
                onClick={handleSpeak}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                  isPlaying
                    ? 'bg-red-50 text-usps-red hover:bg-usps-red/10'
                    : 'bg-usps-gray text-usps-blue hover:bg-blue-100'
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isPlaying ? 'Arrêter' : 'Écouter'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
            <cat.icon className={`w-7 h-7 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 mb-1">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">{doc.sender}</span>
              <span className="text-gray-300">•</span>
              <span className={cat.color}>{cat.label}</span>
              <span className="text-gray-300">•</span>
              <span className="text-gray-500">Reçu le {formatDate(doc.received_date)}</span>
              <span className="text-gray-300">•</span>
              <button
                onClick={toggleDirection}
                title={doc.direction ? 'Basculer entrant / sortant' : 'Non classé — cliquez pour définir le sens du courrier'}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                  !doc.direction
                    ? 'bg-warning-50 text-warning-700 hover:bg-warning-100 animate-pulse-soft'
                    : doc.direction === 'outgoing'
                      ? 'bg-violet-50 text-violet-700 hover:bg-violet-100'
                      : 'bg-usps-gray text-usps-blue hover:bg-blue-100'
                }`}
              >
                {!doc.direction ? <AlertTriangle className="w-3 h-3" /> : doc.direction === 'outgoing' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                {!doc.direction ? 'Non classé' : doc.direction === 'outgoing' ? 'Sortant' : 'Entrant'}
              </button>
            </div>
          </div>
        </div>

        {/* Key Info Bar */}
        {(doc.amount_due !== null || doc.due_date) && (
          <div className="flex flex-wrap gap-3 mt-4">
            {doc.amount_due !== null && (
              <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <div className="text-xs text-amber-600 font-medium mb-0.5">Montant dû</div>
                <div className="text-lg font-bold text-amber-900">{formatCurrency(doc.amount_due, doc.currency)}</div>
              </div>
            )}
            {doc.due_date && (
              <div className={`px-4 py-2.5 rounded-xl border ${days !== null && days <= 3 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`text-xs font-medium mb-0.5 ${days !== null && days <= 3 ? 'text-usps-red' : 'text-gray-500'}`}>Date d'échéance</div>
                <div className={`text-lg font-bold ${days !== null && days <= 3 ? 'text-red-900' : 'text-gray-900'}`}>
                  {formatDate(doc.due_date)}
                </div>
                <div className={`text-xs ${days !== null && days <= 3 ? 'text-usps-red' : 'text-gray-500'}`}>{relativeDeadline(doc.due_date)}</div>
              </div>
            )}
            <div className={`px-4 py-2.5 rounded-xl border ${priorityColor(doc.priority)}`}>
              <div className="text-xs font-medium opacity-70 mb-0.5">Priorité</div>
              <div className="text-lg font-bold">{priorityLabel(doc.priority)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 bg-white px-6 lg:px-8">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'border-usps-blue text-usps-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${tab === t.id ? 'bg-blue-100 text-usps-blue' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content + Notes Sidebar */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex max-w-6xl">
          {/* Main Content */}
          <div className="flex-1 px-6 lg:px-8 py-6 min-w-0">
            <div className="max-w-3xl">
              {/* Summary Tab */}
              {tab === 'summary' && (
                <div className="space-y-6">
                  <div className="p-6 rounded-2xl bg-usps-gray border border-usps-blue/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-usps-blue" />
                      <h3 className="font-semibold text-usps-blue">Résumé IA</h3>
                    </div>
                    <p className="text-gray-700 leading-relaxed mb-4">{safeSummary}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {isSpeechSupported() && (
                        <button
                          onClick={handleSpeakSummary}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            isPlaying
                              ? 'bg-usps-red text-white hover:bg-usps-red-dark'
                              : 'bg-usps-blue text-white hover:bg-usps-blue-dark'
                          }`}
                        >
                          {isPlaying ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          {isPlaying ? 'Arrêter' : 'Lire à voix haute'}
                        </button>
                      )}
                      <FolderPicker
                        folders={folders}
                        selectedFolderId={doc.folder_id}
                        onSelect={handleAddToFolder}
                        onFolderCreated={handleFolderCreated}
                        label="Déplacer vers un dossier"
                        align="left"
                      />
                      {doc.image_url ? (
                        <button
                          onClick={handleDownloadOriginal}
                          className="px-3 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <FileDown className="w-4 h-4" />
                          Télécharger l'original
                        </button>
                      ) : (
                        <button
                          onClick={() => originalFileInputRef.current?.click()}
                          disabled={uploadingOriginal}
                          className="px-3 py-1.5 text-sm text-gray-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40"
                        >
                          <UploadIcon className="w-4 h-4" />
                          {uploadingOriginal ? 'Téléchargement...' : 'Importer l\'original'}
                        </button>
                      )}
                      <input
                        ref={originalFileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleUploadOriginalFile}
                      />
                    </div>
                    {processedByLabel && (
                      <p className="text-xs text-gray-400 mt-3">Traité par {processedByLabel}</p>
                    )}
                  </div>

                  {registerRows.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-usps-blue" />
                        Registre du courrier {doc.direction === 'outgoing' ? 'départ' : 'arrivée'}
                      </h3>
                      <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm grid sm:grid-cols-2 gap-4">
                        {registerRows.map((row) => (
                          <div key={row.label}>
                            <div className="text-xs text-gray-400 font-medium uppercase mb-0.5">{row.label}</div>
                            <div className="text-sm font-medium text-gray-800">{row.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Texte complet du document</h3>
                    <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{doc.content_text}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Ask AI Tab */}
              {tab === 'ask' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-usps-blue flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Demander à l'IA à propos de ce document</div>
                        <div className="text-xs text-gray-400">Les réponses sont générées à partir du contenu du document</div>
                      </div>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                        placeholder="Posez une question sur ce document..."
                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue focus:border-transparent"
                      />
                      <button
                        onClick={handleAsk}
                        disabled={!question.trim()}
                        className="px-4 py-2.5 bg-usps-blue text-white rounded-xl text-sm font-medium hover:bg-usps-blue-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                      >
                        <Send className="w-4 h-4" />
                        Demander
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((q) => (
                        <button
                          key={q}
                          onClick={() => { setQuestion(q); }}
                          className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs hover:bg-usps-gray hover:text-usps-blue transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {qaHistory.length > 0 && (
                    <div className="space-y-3">
                      {qaHistory.map((qa, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-end">
                            <div className="px-4 py-2.5 bg-usps-blue text-white rounded-2xl rounded-tr-sm max-w-[80%] text-sm">
                              {qa.question}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-lg bg-usps-blue flex items-center justify-center flex-shrink-0">
                              <Sparkles className="w-4 h-4 text-white" />
                            </div>
                            <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm max-w-[80%] text-sm text-gray-700 leading-relaxed shadow-sm">
                              {qa.answer}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {qaHistory.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Posez une question pour obtenir des réponses générées par l'IA sur ce document.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {tab === 'notes' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Ajoutez une note personnelle..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addingNote}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors"
                      >
                        Ajouter la note
                      </button>
                    </div>
                  </div>
                  {notes.length === 0 ? (
                    <div className="text-center py-12">
                      <StickyNote className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Aucune note pour le moment. Ajoutez votre première note ci-dessus.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {notes.map((note, i) => (
                        <div key={note.id} className={`group p-4 rounded-xl border-2 ${STICKER_COLORS[i % STICKER_COLORS.length]} shadow-sm`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{note.content}</p>
                              <div className="text-xs text-gray-500 mt-2">{relativeTime(note.created_at)}</div>
                            </div>
                            <button
                              onClick={() => deleteNote(note.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-usps-red transition-all"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comments Tab */}
              {tab === 'comments' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Écrivez un commentaire à partager avec les membres..."
                      rows={3}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addingComment}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-40 transition-colors"
                      >
                        Publier le commentaire
                      </button>
                    </div>
                  </div>
                  {comments.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Aucun commentaire pour le moment. Lancez une conversation à propos de ce document.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-3 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                          <div className="w-9 h-9 rounded-full bg-usps-blue flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">{c.author_name}</span>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">{c.author_role}</span>
                              <span className="text-xs text-gray-400">{relativeTime(c.created_at)}</span>
                            </div>
                            <p className="text-sm text-gray-700">{c.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reminders Tab */}
              {tab === 'reminders' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <input
                        type="text"
                        value={newReminderTitle}
                        onChange={(e) => setNewReminderTitle(e.target.value)}
                        placeholder="Titre du rappel..."
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue"
                      />
                      <input
                        type="date"
                        value={newReminderDate}
                        onChange={(e) => setNewReminderDate(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddReminder}
                        disabled={!newReminderTitle.trim() || !newReminderDate}
                        className="px-4 py-2 bg-usps-blue text-white rounded-lg text-sm font-medium hover:bg-usps-blue-dark disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Ajouter le rappel
                      </button>
                    </div>
                  </div>
                  {reminders.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Aucun rappel défini. Créez-en un pour être averti.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {reminders.map((r) => (
                        <div key={r.id} className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                          <button
                            onClick={() => toggleReminder(r)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              r.completed ? 'bg-usps-blue border-usps-blue' : 'border-gray-300 hover:border-usps-red/60'
                            }`}
                          >
                            {r.completed && <CheckSquare className="w-3 h-3 text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${r.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{r.title}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(r.remind_at)}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteReminder(r.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-usps-red transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Actions Tab */}
              {tab === 'actions' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-2 mb-2">
                      <input
                        type="text"
                        value={newActionTitle}
                        onChange={(e) => setNewActionTitle(e.target.value)}
                        placeholder="Élément d'action..."
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue"
                      />
                      <input
                        type="text"
                        value={newActionAssignee}
                        onChange={(e) => setNewActionAssignee(e.target.value)}
                        placeholder="Assigner à..."
                        className="sm:w-40 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-usps-blue"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={handleAddAction}
                        disabled={!newActionTitle.trim()}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                      >
                        <CheckSquare className="w-4 h-4" />
                        Ajouter l'action
                      </button>
                    </div>
                  </div>
                  {actions.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">Aucune action. Créez-en une pour suivre ce qui doit être fait.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actions.map((a) => (
                        <div key={a.id} className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                          <button
                            onClick={() => toggleAction(a)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              a.completed ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 hover:border-emerald-400'
                            }`}
                          >
                            {a.completed && <CheckSquare className="w-3 h-3 text-white" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${a.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{a.title}</div>
                            <div className="text-xs text-gray-400">
                              Assigné à {a.assignee_name}
                              {a.completed_at && ` • Terminé ${relativeTime(a.completed_at)}`}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteAction(a.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-usps-red transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notes Stickers Sidebar */}
          {notes.length > 0 && (
            <div className="hidden xl:block w-64 flex-shrink-0 py-6 pr-6">
              <div className="sticky top-6">
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
                </div>
                <div className="space-y-3">
                  {notes.map((note, i) => (
                    <div key={note.id} className={`group p-3 rounded-lg border-2 ${STICKER_COLORS[i % STICKER_COLORS.length]} shadow-sm`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs text-gray-700 leading-relaxed">{note.content}</p>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-usps-red transition-all flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-500">{relativeTime(note.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
