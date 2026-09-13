import { useCallback, useRef, useState } from 'react';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import { analyzeDocumentFile, type AIProcessResult, type AnalysisStep } from '@/lib/ai';
import { auth, storage, firestore, getActiveCompanyContext } from '@/lib/firebase';
import type { DocumentDirection, Folder, RegisterInfo } from '@/lib/types';
import type { UserRole } from '@/types';
import { getArchiveDirectoryHandle, readStoragePreferences, saveFileToArchiveDirectory, saveFileToServer, type StorageMode } from '@/lib/storagePreferences';

export type UploadStage = 'processing' | 'result' | 'saved' | 'error';
export type UploadSource = 'upload' | 'camera' | 'scanner';
export type StepStatus = 'pending' | 'active' | 'done';

export interface AnalysisStepState {
  id: AnalysisStep;
  label: string;
  status: StepStatus;
}

/** One document being scanned/analyzed/reviewed. Multiple can be in flight at once. */
export interface UploadJob {
  id: string;
  fileName: string;
  stage: UploadStage;
  steps: AnalysisStepState[];
  edited: AIProcessResult | null;
  error: string | null;
  selectedFile: File | null;
  activeSource: UploadSource | null;
  direction: DocumentDirection;
  receivedDate: string;
  register: RegisterInfo;
  selectedFolderId: string | null;
}

const STEP_LABELS: Record<AnalysisStep, string> = {
  extract: 'Extraction du texte du document',
  identify: "Identification du type de document et de l'expéditeur",
  detect: 'Détection des montants, dates et échéances',
};
const STEP_ORDER: AnalysisStep[] = ['extract', 'identify', 'detect'];

function initialSteps(): AnalysisStepState[] {
  return STEP_ORDER.map((id, i) => ({ id, label: STEP_LABELS[id], status: i === 0 ? 'active' : 'pending' }));
}

export const EMPTY_REGISTER: RegisterInfo = {
  registrationNumber: '',
  referenceNumber: '',
  documentDate: null,
  recipient: '',
  recipientAddress: '',
  assignedService: '',
  instruction: '',
  transmissionDate: null,
  receivedByService: '',
  dispatchMode: '',
  proofOfSending: '',
  recipientReceivedDate: null,
  registerStatus: '',
  observations: '',
};

export const INSTRUCTION_OPTIONS = ['À traiter', 'Répondre', 'Classer', 'Transmettre', 'Pour information', 'Autre'];
export const DISPATCH_MODE_OPTIONS = ['Courrier postal', 'Coursier', 'Email', 'Fax', 'Main propre', 'Autre'];
export const INCOMING_STATUS_OPTIONS = ['Reçu', 'En traitement', 'Traité', 'Répondu', 'Classé'];
export const OUTGOING_STATUS_OPTIONS = ['Préparé', 'Envoyé', 'Délivré', 'Clôturé'];

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function newJobId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function generateRegistrationNumber(direction: DocumentDirection): Promise<string> {
  const prefix = direction === 'incoming' ? 'ENT' : 'SOR';
  const year = new Date().getFullYear();
  try {
    const res = await firestore.from<Record<string, unknown>>('documents').select().eq('direction', direction);
    const seq = ((res.data as unknown[] | null)?.length ?? 0) + 1;
    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
  } catch {
    return `${prefix}-${year}-${Date.now().toString().slice(-4)}`;
  }
}

function buildDefaultRegister(direction: DocumentDirection, registrationNumber: string): RegisterInfo {
  return {
    ...EMPTY_REGISTER,
    registrationNumber,
    documentDate: direction === 'incoming' ? todayISODate() : null,
    instruction: direction === 'incoming' ? INSTRUCTION_OPTIONS[0] : '',
    dispatchMode: direction === 'outgoing' ? DISPATCH_MODE_OPTIONS[0] : '',
    registerStatus: direction === 'incoming' ? INCOMING_STATUS_OPTIONS[0] : OUTGOING_STATUS_OPTIONS[0],
  };
}

interface UseUploadFlowOptions {
  folders: Folder[];
  onUploaded: () => void;
  onFoldersChange: () => void;
  /** Snapshotted onto each uploaded document as `owner_role` — drives the DG/Admin visibility rule. */
  uploaderRole?: UserRole | null;
}

export function useUploadFlow({ folders, onUploaded, onFoldersChange, uploaderRole }: UseUploadFlowOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draftDirection, setDraftDirection] = useState<DocumentDirection>('incoming');
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set());
  const [storageMode, setStorageMode] = useState<StorageMode>(() => readStoragePreferences(getActiveCompanyContext()?.id).mode);

  const foldersRef = useRef(folders);
  foldersRef.current = folders;

  const activeJob = jobs.find((j) => j.id === activeJobId) ?? null;
  const isDraft = !activeJob;
  const isSaving = activeJobId !== null && savingJobIds.has(activeJobId);

  const updateJob = useCallback((id: string, patch: Partial<UploadJob> | ((job: UploadJob) => Partial<UploadJob>)) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...(typeof patch === 'function' ? patch(j) : patch) } : j)));
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  /** Switches the modal to the "pick direction + source" screen without touching any running job. */
  const startNewScan = useCallback(() => {
    setActiveJobId(null);
    setDraftDirection('incoming');
    setIsOpen(true);
  }, []);

  const selectJob = useCallback((id: string) => {
    setActiveJobId(id);
    setIsOpen(true);
  }, []);

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setActiveJobId((prev) => (prev === id ? null : prev));
  }, []);

  const markJobStepDone = useCallback((id: string, stepId: AnalysisStep) => {
    updateJob(id, (job) => ({
      steps: job.steps.map((step, i) => {
        if (step.id === stepId) return { ...step, status: 'done' };
        const idx = STEP_ORDER.indexOf(stepId);
        if (i === idx + 1 && step.status === 'pending') return { ...step, status: 'active' };
        return step;
      }),
    }));
  }, [updateJob]);

  const startProcessing = useCallback((file: File | null, source: UploadSource) => {
    const id = newJobId();
    const direction = draftDirection;

    if (!file) {
      const job: UploadJob = {
        id, fileName: '', stage: 'error', steps: initialSteps(), edited: null,
        error: "Choisissez un fichier PDF, Word (.doc/.docx) ou une image pour que l’IA puisse en extraire le texte.",
        selectedFile: null, activeSource: source, direction, receivedDate: todayISODate(),
        register: EMPTY_REGISTER, selectedFolderId: null,
      };
      setJobs((prev) => [...prev, job]);
      setActiveJobId(id);
      return;
    }

    const job: UploadJob = {
      id, fileName: file.name, stage: 'processing', steps: initialSteps(), edited: null, error: null,
      selectedFile: file, activeSource: source, direction, receivedDate: todayISODate(),
      register: EMPTY_REGISTER, selectedFolderId: null,
    };
    setJobs((prev) => [...prev, job]);
    setActiveJobId(id);

    void (async () => {
      try {
        const processed = await analyzeDocumentFile(file, (step) => markJobStepDone(id, step));
        const registrationNumber = await generateRegistrationNumber(direction);
        const match = foldersRef.current.find((f) => f.parent_id === null && f.name.toLowerCase() === processed.category.toLowerCase());
        updateJob(id, {
          edited: processed,
          register: buildDefaultRegister(direction, registrationNumber),
          selectedFolderId: match?.id ?? null,
          stage: 'result',
        });
      } catch (err) {
        updateJob(id, {
          error: err instanceof Error ? err.message : "Le service d'extraction IA n'a pas pu traiter ce document.",
          stage: 'error',
        });
      }
    })();
  }, [draftDirection, markJobStepDone, updateJob]);

  /** "Rescanner" / "Essayer un autre fichier": drop this job and return to the picker. */
  const retryJob = useCallback(() => {
    if (activeJobId) dismissJob(activeJobId);
  }, [activeJobId, dismissJob]);

  /** After a save failure, go back to the filled-in result screen instead of discarding it. */
  const retrySave = useCallback(() => {
    if (activeJobId) updateJob(activeJobId, { stage: 'result', error: null });
  }, [activeJobId, updateJob]);

  const updateEdited = useCallback((patch: Partial<AIProcessResult>) => {
    if (!activeJobId) return;
    updateJob(activeJobId, (job) => ({ edited: job.edited ? { ...job.edited, ...patch } : job.edited }));
  }, [activeJobId, updateJob]);

  const updateRegister = useCallback((patch: Partial<RegisterInfo>) => {
    if (!activeJobId) return;
    updateJob(activeJobId, (job) => ({ register: { ...job.register, ...patch } }));
  }, [activeJobId, updateJob]);

  const setReceivedDate = useCallback((date: string) => {
    if (activeJobId) updateJob(activeJobId, { receivedDate: date });
  }, [activeJobId, updateJob]);

  const setSelectedFolderId = useCallback((folderId: string | null) => {
    if (activeJobId) updateJob(activeJobId, { selectedFolderId: folderId });
  }, [activeJobId, updateJob]);

  const handleFolderCreated = useCallback((folder: Folder) => {
    onFoldersChange();
    if (activeJobId) updateJob(activeJobId, (job) => ({ selectedFolderId: job.selectedFolderId ?? folder.id }));
  }, [activeJobId, onFoldersChange, updateJob]);

  const handleSave = useCallback(async () => {
    const job = activeJob;
    if (!job || !job.edited) return;
    const id = job.id;

    setSavingJobIds((prev) => new Set(prev).add(id));
    try {
      let imageUrl = '';

      if (job.selectedFile && auth.currentUser) {
        if ((storageMode === 'local' || storageMode === 'hybrid') && !(await getArchiveDirectoryHandle())) {
          throw new Error('Choisissez d’abord votre dossier d’archivage local dans Paramètres.');
        }
        const company = getActiveCompanyContext();
        const storagePreferences = readStoragePreferences(company?.id);
        const fileName = `${Date.now()}-${job.selectedFile.name}`;
        if (storageMode === 'server' && !storagePreferences.serverUrl) throw new Error('Configurez d’abord l’URL du serveur local dans Paramètres.');
        if (storageMode === 'cloud' || storageMode === 'hybrid') {
          const path = company
            ? `companies/${company.id}/documents/${fileName}`
            : `users/${auth.currentUser.uid}/documents/${fileName}`;
          const uploaded = await uploadBytes(storageRef(storage, path), job.selectedFile);
          imageUrl = await getDownloadURL(uploaded.ref);
        }
        if (storageMode === 'local' || storageMode === 'hybrid') await saveFileToArchiveDirectory(job.selectedFile, fileName);
        if (storageMode === 'server' || (storageMode === 'hybrid' && storagePreferences.serverUrl)) {
          const serverUrl = storagePreferences.serverUrl;
          const serverUrlResult = await saveFileToServer(job.selectedFile, serverUrl, fileName);
          if (!imageUrl && serverUrlResult) imageUrl = serverUrlResult;
        }
      }

      const { data: savedDoc, error: insertError } = await firestore.from('documents').insert({
        folder_id: job.selectedFolderId,
        title: job.edited.title,
        sender: job.edited.sender,
        category: job.edited.category,
        document_type: job.edited.document_type,
        summary: job.edited.summary,
        content_text: job.edited.content_text,
        amount_due: job.edited.amount_due,
        due_date: job.edited.due_date,
        status: job.edited.status,
        priority: job.edited.priority,
        direction: job.direction,
        received_date: new Date(job.receivedDate).toISOString(),
        image_url: imageUrl,
        processed_by: job.edited.processed_by ?? null,
        register: job.register,
        owner_role: uploaderRole ?? null,
      }).select().single();

      if (insertError) throw new Error(insertError.message);

      const savedDocId = (savedDoc as { id?: string } | null)?.id;
      if (!savedDocId) throw new Error("L'enregistrement du document a échoué (aucun identifiant renvoyé).");

      if (job.edited.due_date) {
        await firestore.from('reminders').insert({
          document_id: savedDocId,
          title: `${job.edited.title} à échéance`,
          remind_at: job.edited.due_date,
        });
      }

      updateJob(id, { stage: 'saved' });
      setTimeout(() => {
        onUploaded();
        dismissJob(id);
        setIsOpen(false);
      }, 1200);
    } catch (err) {
      updateJob(id, {
        stage: 'error',
        error: err instanceof Error
          ? `Échec de l'enregistrement : ${err.message}`
          : "Échec de l'enregistrement du document. Réessayez.",
      });
    } finally {
      setSavingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [activeJob, dismissJob, onUploaded, storageMode, updateJob, uploaderRole]);

  return {
    isOpen,
    open,
    close,
    jobs,
    activeJob,
    isDraft,
    isSaving,
    draftDirection,
    setDraftDirection,
    dragOver,
    setDragOver,
    folders,
    startNewScan,
    selectJob,
    dismissJob,
    retryJob,
    startProcessing,
    updateEdited,
    updateRegister,
    setReceivedDate,
    setSelectedFolderId,
    handleFolderCreated,
    handleSave,
    retrySave,
    storageMode,
    setStorageMode,
  };
}

export type UploadFlow = ReturnType<typeof useUploadFlow>;
