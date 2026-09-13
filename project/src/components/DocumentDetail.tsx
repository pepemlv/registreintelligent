import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft, Volume2, Square, Send, CalendarPlus, ChevronDown, StickyNote,
  MessageSquare, CheckSquare, Archive, Clock,
  Sparkles, User, Trash2, Download, FileDown, Upload as UploadIcon, FileText,
  X, ArrowDownLeft, ArrowUpRight, ClipboardList, AlertTriangle, Pencil, Save, Users, Lock, Check, ListPlus,
} from 'lucide-react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import type { DocumentItem, Note, Comment, Reminder, ActionItem, Folder } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, relativeDeadline, relativeTime, priorityColor, priorityLabel, daysUntil, isRawJsonText } from '@/lib/format';
import { getCategoryMeta } from '@/lib/categories';
import { speak, stopSpeaking, isSpeechSupported } from '@/lib/speech';
import { askDocumentQuestion, prepareFrenchReading, type AIAnswer } from '@/lib/ai';
import { auth, firestore, getActiveCompanyContext, storage } from '@/lib/firebase';
import { isTopRole } from '@/lib/documentAccess';
import FolderPicker from './FolderPicker';
import CreateTaskModal from './CreateTaskModal';

interface CompanyMember {
  owner_id: string;
  company_id: string;
  full_name: string;
  email: string;
  role_label: string;
}

interface DocumentDetailProps {
  document: DocumentItem;
  notes: Note[];
  comments: Comment[];
  reminders: Reminder[];
  actions: ActionItem[];
  folders: Folder[];
  companyProfiles: CompanyMember[];
  availableDocuments?: DocumentItem[];
  canManageTrash?: boolean;
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

const INSTRUCTION_OPTIONS = ['À traiter', 'Répondre', 'Classer', 'Transmettre', 'Pour information', 'Autre'];
const INCOMING_STATUS_OPTIONS = ['Reçu', 'En traitement', 'Traité', 'Répondu', 'Classé'];
const OUTGOING_STATUS_OPTIONS = ['Préparé', 'Envoyé', 'Délivré', 'Clôturé'];

function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export default function DocumentDetail({
  document: doc, notes, comments, reminders, actions, folders, companyProfiles, availableDocuments = [], canManageTrash = false, onBack, onDataChange, onFoldersChange,
}: DocumentDetailProps) {
  const [tab, setTab] = useState<Tab>('summary');
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
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
  const [readFull, setReadFull] = useState(false);
  const [readSummary, setReadSummary] = useState(false);
  const [preparingReading, setPreparingReading] = useState(false);
  const [uploadingOriginal, setUploadingOriginal] = useState(false);
  const [editingRegister, setEditingRegister] = useState(false);
  const [savingRegister, setSavingRegister] = useState(false);
  const [registerDraft, setRegisterDraft] = useState(doc.register);
  const [senderDraft, setSenderDraft] = useState(doc.sender);
  const [receivedDateDraft, setReceivedDateDraft] = useState(toDateInputValue(doc.received_date));
  const [dueDateDraft, setDueDateDraft] = useState(toDateInputValue(doc.due_date));
  const originalFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRegisterDraft(doc.register);
    setSenderDraft(doc.sender);
    setReceivedDateDraft(toDateInputValue(doc.received_date));
    setDueDateDraft(toDateInputValue(doc.due_date));
    setEditingRegister(false);
    setSavingRegister(false);
  }, [doc]);

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
  const activeCompanyId = getActiveCompanyContext()?.id;
  const shareableCompanyProfiles = companyProfiles.filter((member) =>
    Boolean(activeCompanyId) && member.company_id === activeCompanyId && member.owner_id !== auth.currentUser?.uid,
  );
  const sharedCompanyMemberIds = (doc.shared_with ?? []).filter((id) => shareableCompanyProfiles.some((member) => member.owner_id === id));
  const days = daysUntil(doc.due_date);
  const safeSummary = doc.summary && !isRawJsonText(doc.summary) ? doc.summary : 'Aucun résumé disponible.';
  const processedByLabel = doc.processed_by === 'claude' ? 'Claude AI'
    : doc.processed_by === 'openai' ? 'OpenAI'
    : doc.processed_by === 'local' ? 'IA locale'
    : null;

  const handleSpeak = async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setPreparingReading(true);
      const text = await prepareFrenchReading(doc, 'summary');
      setPreparingReading(false);
      speak(text, () => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleSpeakSummary = async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    setPreparingReading(true);
    const text = await prepareFrenchReading(doc, 'summary');
    setPreparingReading(false);
    speak(text, () => setIsPlaying(false));
    setIsPlaying(true);
    setReadSummary(true);
    setTimeout(() => setReadSummary(false), 2000);
  };

  const handleSpeakFull = async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
      return;
    }
    setPreparingReading(true);
    const text = await prepareFrenchReading(doc, 'full');
    setPreparingReading(false);
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
      const company = getActiveCompanyContext();
      const path = company
        ? `companies/${company.id}/documents/${Date.now()}-${file.name}`
        : `users/${auth.currentUser.uid}/documents/${Date.now()}-${file.name}`;
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

  const toggleShare = async (userId: string) => {
    if (!shareableCompanyProfiles.some((member) => member.owner_id === userId)) return;
    const allowedMemberIds = new Set(shareableCompanyProfiles.map((member) => member.owner_id));
    const current = (doc.shared_with ?? []).filter((id) => allowedMemberIds.has(id));
    const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
    setSharing(true);
    await firestore.from('documents').update({ shared_with: next }).eq('id', doc.id);
    setSharing(false);
    onDataChange();
  };

  const handleArchive = async () => {
    await firestore.from('documents').update({ status: 'archived' }).eq('id', doc.id);
    onBack();
  };

  const handleMoveToTrash = async () => {
    if (!canManageTrash) return;
    await firestore.from('documents').update({ deleted_at: new Date().toISOString(), deleted_by: auth.currentUser?.uid ?? null }).eq('id', doc.id);
    onBack();
  };

  const handleMarkRead = async () => {
    await firestore.from('documents').update({ status: 'read' }).eq('id', doc.id);
    onDataChange();
  };

  const updateRegisterDraft = (patch: Partial<NonNullable<DocumentItem['register']>>) => {
    setRegisterDraft((current) => ({ ...(current ?? {}), ...patch } as NonNullable<DocumentItem['register']>));
  };

  const cancelRegisterEdit = () => {
    setRegisterDraft(doc.register);
    setSenderDraft(doc.sender);
    setReceivedDateDraft(toDateInputValue(doc.received_date));
    setDueDateDraft(toDateInputValue(doc.due_date));
    setEditingRegister(false);
  };

  const saveRegisterEdit = async () => {
    if (!registerDraft) return;
    setSavingRegister(true);
    await firestore.from('documents').update({
      sender: senderDraft,
      received_date: receivedDateDraft ? new Date(receivedDateDraft).toISOString() : doc.received_date,
      due_date: dueDateDraft || null,
      register: registerDraft,
    }).eq('id', doc.id);
    setSavingRegister(false);
    setEditingRegister(false);
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
    <div className="flex flex-col min-h-[calc(100vh-3rem)] sm:min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-3 sm:px-6 lg:px-8 py-2 sm:py-4 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          {/* Action Buttons */}
          <div className="hidden">
            <button
              onClick={handleSpeakSummary}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                readSummary ? 'bg-emerald-50 text-emerald-700' : 'bg-usps-gray text-usps-blue hover:bg-blue-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {preparingReading ? 'Préparation...' : 'Lire le résumé'}
            </button>
            <button
              onClick={handleSpeakFull}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                readFull ? 'bg-emerald-50 text-emerald-700' : 'bg-usps-gray text-usps-blue hover:bg-blue-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              {preparingReading ? 'Préparation...' : 'Lire le texte complet'}
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              Télécharger le texte
            </button>

            {/* Partage interne avec les membres de l'entreprise */}
            <button
              onClick={() => setShowSharePicker(true)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1.5 font-medium ${
                (doc.shared_with?.length ?? 0) > 0 ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Users className="w-4 h-4" />
              Partager
              {(doc.shared_with?.length ?? 0) > 0 && (
                <span className="px-1.5 py-0.5 bg-white/60 rounded-full text-[10px] font-bold">{doc.shared_with?.length}</span>
              )}
            </button>

            {/* Créer une tâche liée à ce document */}
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-3 py-1.5 text-sm text-gray-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <ListPlus className="w-4 h-4" />
              Créer une tâche
            </button>

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
            {canManageTrash && (
              <button onClick={handleMoveToTrash} className="px-3 py-1.5 text-sm text-danger-700 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Supprimer
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
                {preparingReading ? 'Préparation...' : isPlaying ? 'Arrêter' : 'Écouter'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 sm:gap-4">
          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${cat.bgColor} flex items-center justify-center flex-shrink-0`}>
            <cat.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 mb-1 line-clamp-2">{doc.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
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
              {isTopRole(doc.owner_role) && (
                <span
                  title="Visible uniquement par la Direction Générale et l'Administrateur, sauf partage explicite"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-50 text-danger-700"
                >
                  <Lock className="w-3 h-3" />
                  Visibilité restreinte
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Key Info Bar */}
        {((doc.amount_due !== null && doc.amount_due !== 0) || doc.due_date) && (
          <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-4">
            {doc.amount_due !== null && doc.amount_due !== 0 && (
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                <div className="text-xs text-amber-600 font-medium mb-0.5">Montant dû</div>
                <div className="text-lg font-bold text-amber-900">{formatCurrency(doc.amount_due, doc.currency)}</div>
              </div>
            )}
            {doc.due_date && (
              <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border ${days !== null && days <= 3 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`text-xs font-medium mb-0.5 ${days !== null && days <= 3 ? 'text-usps-red' : 'text-gray-500'}`}>Date d'échéance</div>
                <div className={`text-lg font-bold ${days !== null && days <= 3 ? 'text-red-900' : 'text-gray-900'}`}>
                  {formatDate(doc.due_date)}
                </div>
                <div className={`text-xs ${days !== null && days <= 3 ? 'text-usps-red' : 'text-gray-500'}`}>{relativeDeadline(doc.due_date)}</div>
              </div>
            )}
            <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border ${priorityColor(doc.priority)}`}>
              <div className="text-xs font-medium opacity-70 mb-0.5">Priorité</div>
              <div className="text-lg font-bold">{priorityLabel(doc.priority)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 bg-white px-3 sm:px-6 lg:px-8">
        <div className="relative py-2 sm:hidden">
          <label htmlFor="document-detail-section" className="sr-only">Section du document</label>
          <select
            id="document-detail-section"
            value={tab}
            onChange={(event) => setTab(event.target.value as Tab)}
            className="w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm font-semibold text-gray-800 focus:border-usps-blue focus:outline-none focus:ring-2 focus:ring-usps-blue/20"
          >
            {tabs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}{item.count ? ` (${item.count})` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="hidden gap-1 overflow-x-auto sm:flex">
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
                      <details className="relative group">
                        <summary className="flex min-h-9 list-none cursor-pointer items-center justify-between gap-2 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50">
                          <span className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />Partager
                            {sharedCompanyMemberIds.length > 0 && <span className="rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold">{sharedCompanyMemberIds.length}</span>}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="absolute left-0 top-full z-30 mt-1 max-h-56 w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-ink-200 bg-white p-1.5 shadow-xl">
                          {shareableCompanyProfiles.map((member) => {
                            const checked = sharedCompanyMemberIds.includes(member.owner_id);
                            return (
                              <label key={member.owner_id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-xs text-ink-700 hover:bg-primary-50">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={sharing}
                                  onChange={() => toggleShare(member.owner_id)}
                                  className="accent-primary-600"
                                />
                                <span className="min-w-0 flex-1 truncate">{member.full_name || member.email} · {member.role_label}</span>
                                {checked && <Check className="h-3.5 w-3.5 shrink-0 text-primary-600" />}
                              </label>
                            );
                          })}
                          {shareableCompanyProfiles.length === 0 && <p className="px-2 py-2 text-xs text-ink-400">Aucun autre membre dans votre entreprise.</p>}
                        </div>
                      </details>
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
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-usps-blue" />
                          Registre du courrier {doc.direction === 'outgoing' ? 'départ' : 'arrivée'}
                        </h3>
                        {!editingRegister ? (
                          <button
                            onClick={() => setEditingRegister(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-usps-gray text-usps-blue text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Modifier
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={cancelRegisterEdit}
                              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={saveRegisterEdit}
                              disabled={savingRegister}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-usps-blue text-white text-xs font-semibold hover:bg-usps-blue-dark disabled:opacity-50 transition-colors"
                            >
                              <Save className="w-3.5 h-3.5" />
                              {savingRegister ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                          </div>
                        )}
                      </div>

                      {!editingRegister ? (
                        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm grid sm:grid-cols-2 gap-4">
                          {registerRows.map((row) => (
                            <div key={row.label}>
                              <div className="text-xs text-gray-400 font-medium uppercase mb-0.5">{row.label}</div>
                              <div className="text-sm font-medium text-gray-800">{row.value}</div>
                            </div>
                          ))}
                        </div>
                      ) : registerDraft ? (
                        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm grid sm:grid-cols-2 gap-4">
                          <EditField label={doc.direction === 'outgoing' ? "N° d'ordre / numéro de sortie" : "N° d'enregistrement"}>
                            <input value={registerDraft.registrationNumber || ''} onChange={(e) => updateRegisterDraft({ registrationNumber: e.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                          </EditField>
                          <EditField label={doc.direction === 'outgoing' ? "Date d'expédition" : 'Date de réception'}>
                            <input type="date" value={receivedDateDraft} onChange={(e) => setReceivedDateDraft(e.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                          </EditField>
                          <EditField label={doc.direction === 'outgoing' ? 'Référence du courrier' : 'N° / Référence du courrier'}>
                            <input value={registerDraft.referenceNumber || ''} onChange={(e) => updateRegisterDraft({ referenceNumber: e.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                          </EditField>
                          {doc.direction === 'incoming' && (
                            <EditField label="Date du courrier">
                              <input type="date" value={toDateInputValue(registerDraft.documentDate)} onChange={(e) => updateRegisterDraft({ documentDate: e.target.value || null })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                            </EditField>
                          )}
                          <EditField label={doc.direction === 'outgoing' ? 'Destinataire' : 'Expéditeur / Provenance'}>
                            <input value={doc.direction === 'outgoing' ? registerDraft.recipient || '' : senderDraft} onChange={(e) => (doc.direction === 'outgoing' ? updateRegisterDraft({ recipient: e.target.value }) : setSenderDraft(e.target.value))} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                          </EditField>
                          {doc.direction === 'incoming' && (
                            <EditField label="Destinataire">
                              <input value={registerDraft.recipient || ''} onChange={(e) => updateRegisterDraft({ recipient: e.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                            </EditField>
                          )}
                          <EditField label={doc.direction === 'outgoing' ? 'Service émetteur' : "Service d'affectation"}>
                            <input value={registerDraft.assignedService || ''} onChange={(e) => updateRegisterDraft({ assignedService: e.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                          </EditField>
                          {doc.direction === 'incoming' && (
                            <EditField label="Instruction / Imputation">
                              <select value={registerDraft.instruction || ''} onChange={(e) => updateRegisterDraft({ instruction: e.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none">
                                {INSTRUCTION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </EditField>
                          )}
                          {doc.direction === 'incoming' && (
                            <EditField label="Échéance">
                              <input type="date" value={dueDateDraft} onChange={(e) => setDueDateDraft(e.target.value)} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none" />
                            </EditField>
                          )}
                          <EditField label="Statut">
                            <select value={registerDraft.registerStatus || ''} onChange={(e) => updateRegisterDraft({ registerStatus: e.target.value })} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none">
                              {(doc.direction === 'outgoing' ? OUTGOING_STATUS_OPTIONS : INCOMING_STATUS_OPTIONS).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </EditField>
                          <EditField label="Observations">
                            <textarea value={registerDraft.observations || ''} onChange={(e) => updateRegisterDraft({ observations: e.target.value })} rows={2} className="w-full bg-transparent text-sm font-semibold text-gray-900 outline-none resize-none" />
                          </EditField>
                        </div>
                      ) : null}
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
                  <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900">Actions sur le document</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <button onClick={handleSpeakSummary} className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-left text-sm font-medium text-primary-700 hover:bg-primary-100">
                        <Sparkles className="h-4 w-4 shrink-0" />Lire le résumé
                      </button>
                      <button onClick={handleSpeakFull} className="flex items-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-left text-sm font-medium text-primary-700 hover:bg-primary-100">
                        <FileText className="h-4 w-4 shrink-0" />Lire le texte complet
                      </button>
                      <button onClick={handleDownload} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100">
                        <Download className="h-4 w-4 shrink-0" />Télécharger le texte
                      </button>
                      <button onClick={() => setShowCreateTask(true)} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-left text-sm font-medium text-amber-800 hover:bg-amber-100">
                        <ListPlus className="h-4 w-4 shrink-0" />Créer une tâche
                      </button>
                      <button onClick={() => setTab('notes')} className="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-left text-sm font-medium text-amber-800 hover:bg-amber-100">
                        <StickyNote className="h-4 w-4 shrink-0" />Ajouter une note
                      </button>
                      {doc.status !== 'read' && doc.status !== 'archived' && (
                        <button onClick={handleMarkRead} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100">
                          <CheckSquare className="h-4 w-4 shrink-0" />Marquer comme lu
                        </button>
                      )}
                      {doc.status !== 'archived' && (
                        <button onClick={handleArchive} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100">
                          <Archive className="h-4 w-4 shrink-0" />Archiver
                        </button>
                      )}
                      {canManageTrash && (
                        <button onClick={handleMoveToTrash} className="flex items-center gap-2 rounded-lg border border-danger-100 bg-danger-50 px-3 py-2.5 text-left text-sm font-medium text-danger-700 hover:bg-danger-100">
                          <Trash2 className="h-4 w-4 shrink-0" />Supprimer
                        </button>
                      )}
                      {isSpeechSupported() && (
                        <button onClick={handleSpeak} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100">
                          {isPlaying ? <Square className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
                          {preparingReading ? 'Préparation...' : isPlaying ? 'Arrêter' : 'Écouter'}
                        </button>
                      )}
                    </div>
                  </section>
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

      {showSharePicker && (
        <div className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-1 gap-3">
              <h3 className="font-display font-bold text-gray-900 text-lg leading-tight flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                Partager le document
              </h3>
              <button onClick={() => setShowSharePicker(false)} className="text-gray-400 hover:text-gray-600 shrink-0">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Sélectionnez une ou plusieurs personnes qui pourront voir ce document.
            </p>
            <div className="space-y-1.5">
              {companyProfiles
                .filter((member) => member.owner_id !== auth.currentUser?.uid)
                .map((member) => {
                  const checked = doc.shared_with?.includes(member.owner_id) ?? false;
                  return (
                    <label
                      key={member.owner_id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                        checked ? 'border-primary-300 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={sharing}
                        onChange={() => toggleShare(member.owner_id)}
                        className="accent-primary-600 w-4 h-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{member.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{member.role_label} · {member.email}</p>
                      </div>
                      {checked && <Check className="w-4 h-4 text-primary-600 shrink-0" />}
                    </label>
                  );
                })}
              {companyProfiles.filter((member) => member.owner_id !== auth.currentUser?.uid).length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Aucun autre membre dans votre organisation.</p>
              )}
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowSharePicker(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition-colors"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateTask && (
        <CreateTaskModal
          companyProfiles={companyProfiles}
          availableDocuments={availableDocuments}
          sourceDocument={{ id: doc.id, title: doc.title }}
          onClose={() => setShowCreateTask(false)}
          onCreated={onDataChange}
        />
      )}
    </div>
  );
}

function EditField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className="text-xs text-gray-400 font-medium uppercase mb-1">{label}</div>
      {children}
    </div>
  );
}
