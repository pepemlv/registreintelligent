import type { UserRole } from '@/types';

export type DocumentStatus = 'unread' | 'read' | 'action_required' | 'archived';
export type Priority = 'urgent' | 'high' | 'normal' | 'low';
export type DocumentDirection = 'incoming' | 'outgoing';

/**
 * Fields from the standard incoming/outgoing mail register (registre du courrier
 * arrivée / départ). Which subset applies depends on the document's direction —
 * e.g. `instruction`/`transmissionDate`/`receivedByService` are incoming-only,
 * `recipientAddress`/`dispatchMode`/`proofOfSending`/`recipientReceivedDate` are
 * outgoing-only. All fields are plain strings/dates so the form stays editable
 * even when a value wasn't extracted by the AI.
 */
export interface RegisterInfo {
  registrationNumber: string;
  referenceNumber: string;
  documentDate: string | null;
  recipient: string;
  recipientAddress: string;
  assignedService: string;
  instruction: string;
  transmissionDate: string | null;
  receivedByService: string;
  dispatchMode: string;
  proofOfSending: string;
  recipientReceivedDate: string | null;
  registerStatus: string;
  observations: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  owner_id?: string;
  /** Role of whoever uploaded this document, snapshotted at upload time — drives the DG/Admin visibility rule. */
  owner_role?: UserRole;
  /** User ids (profile owner_id) explicitly granted access via "Partager le document", beyond the default visibility rule. */
  shared_with?: string[];
  company_id?: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  folder_id: string | null;
  title: string;
  sender: string;
  category: string;
  document_type: string;
  summary: string;
  content_text: string;
  amount_due: number | null;
  currency: string;
  due_date: string | null;
  status: DocumentStatus;
  priority: Priority;
  /** Undefined means the document (typically created by the mobile app) hasn't been classified yet. */
  direction?: DocumentDirection;
  received_date: string;
  image_url: string;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  register?: RegisterInfo;
}

export interface Reminder {
  id: string;
  document_id: string;
  title: string;
  remind_at: string;
  completed: boolean;
  created_at: string;
}

export interface Note {
  id: string;
  document_id: string;
  content: string;
  created_at: string;
}

export interface Comment {
  id: string;
  document_id: string;
  author_name: string;
  author_role: string;
  content: string;
  created_at: string;
}

export interface ActionItem {
  id: string;
  document_id: string;
  title: string;
  assignee_name: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface DocumentDetail extends DocumentItem {
  reminders?: Reminder[];
  notes?: Note[];
  comments?: Comment[];
  actions?: ActionItem[];
  folder?: Folder | null;
}

export type TaskStatus = 'new' | 'assigned' | 'in_progress' | 'submitted' | 'validated' | 'closed';

export type ContributionRating = 'excellent' | 'tres_bon' | 'satisfaisant' | 'a_ameliorer';
export type ContributionDecision = 'validated' | 'correction_requested' | 'rejected';

export interface ContributionEvaluation {
  rating?: ContributionRating;
  score?: number | null;
  decision: ContributionDecision;
  comment?: string;
  recommendation?: string;
  new_deadline?: string | null;
  evaluated_by: string;
  evaluated_at: string;
}

export interface TaskNoteEntry {
  author: string;
  author_id?: string | null;
  content: string;
  created_at: string;
  attachments?: TaskAttachment[];
  /** Fields below turn a plain note into a structured project "contribution" (§8 of the project spec). */
  proposed_progress?: number | null;
  difficulties?: string;
  recommendation?: string;
  next_action?: string;
  next_action_deadline?: string | null;
  evaluation?: ContributionEvaluation | null;
}

export interface TaskItem {
  id: string;
  owner_id?: string;
  company_id?: string;
  title: string;
  notes: string;
  project: string;
  /** Set when the task belongs to a real Project record rather than the free-text `project` label. */
  project_id?: string | null;
  project_name?: string;
  phase_id?: string | null;
  phase_name?: string;
  /** Weight (%) of this task within its project's automatic progress calculation. */
  weight?: number | null;
  expected_result?: string;
  proof_required?: boolean;
  assignee_id: string | null;
  assignee_name: string;
  assignee_ids?: string[];
  assignee_names?: string[];
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  source_document_id: string | null;
  source_document_title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  activity: TaskNoteEntry[];
  deleted_at?: string | null;
  deleted_by?: string | null;
  document_ids?: string[];
  document_titles?: string[];
  attachments?: TaskAttachment[];
}

export type ProjectPriority = 'normal' | 'high' | 'urgent';
export type ObjectiveUnit = 'Nombre' | '%' | 'USD' | 'CDF' | 'EUR' | 'Jours' | 'Unités' | 'Autre';
export type ObjectiveUpdateMode = 'manual' | 'from_tasks' | 'automatic';

export const PROJECT_TYPES = [
  'Commercial', 'Construction & Travaux', 'Informatique', 'Administration', 'RH',
  'Marketing', 'Finance', 'Investissement', 'Programme', 'Autre',
] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

export const FOLLOW_UP_FREQUENCIES = ['Hebdomadaire', 'Quotidienne', 'Bimensuelle', 'Mensuelle', 'Trimestrielle'] as const;
export type FollowUpFrequency = typeof FOLLOW_UP_FREQUENCIES[number];

export type ProjectModuleKey =
  | 'objectives' | 'phases' | 'tasks' | 'contributions' | 'documents' | 'budget'
  | 'financing' | 'revenues' | 'billing' | 'risks' | 'visits' | 'media';

export const PROJECT_MODULES: { key: ProjectModuleKey; label: string }[] = [
  { key: 'objectives', label: 'Objectifs et indicateurs' },
  { key: 'phases', label: 'Phases / Jalons' },
  { key: 'tasks', label: 'Tâches' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'documents', label: 'Documents' },
  { key: 'budget', label: 'Budget / Dépenses' },
  { key: 'financing', label: 'Financement' },
  { key: 'revenues', label: 'Recettes' },
  { key: 'billing', label: 'Facturation / Encaissements' },
  { key: 'risks', label: 'Risques / Problèmes' },
  { key: 'visits', label: 'Visites / Inspections' },
  { key: 'media', label: 'Photos / Vidéos terrain' },
];

export const DEFAULT_PROJECT_MODULES: ProjectModuleKey[] = ['objectives', 'phases', 'tasks', 'contributions', 'documents', 'budget'];

export const PROJECT_TYPE_MODULE_PRESETS: Partial<Record<ProjectType, ProjectModuleKey[]>> = {
  'Construction & Travaux': ['objectives', 'phases', 'tasks', 'contributions', 'documents', 'budget', 'financing', 'risks', 'visits', 'media'],
  'Investissement': ['objectives', 'phases', 'tasks', 'contributions', 'documents', 'budget', 'financing', 'revenues', 'risks'],
  'Programme': ['objectives', 'phases', 'tasks', 'contributions', 'documents', 'budget', 'risks', 'visits'],
  'Finance': ['objectives', 'phases', 'tasks', 'contributions', 'documents', 'budget', 'revenues', 'billing'],
  'Commercial': ['objectives', 'phases', 'tasks', 'contributions', 'documents', 'budget', 'revenues', 'billing'],
};

export interface ProjectObjective {
  id: string;
  label: string;
  initial_value: number;
  target: number;
  unit: ObjectiveUnit;
  current: number;
  deadline?: string | null;
  owner_member_id?: string | null;
  owner_name?: string;
  weight?: number | null;
  update_mode: ObjectiveUpdateMode;
}

export interface ProjectPhase {
  id: string;
  name: string;
  description?: string;
  deadline: string | null;
  start_date?: string | null;
  budget: number | null;
  owner_member_id?: string | null;
  owner_name: string;
  contributor_ids?: string[];
  contributor_names: string[];
  expected_result?: string;
  linked_objective_id?: string | null;
  weight?: number | null;
}

export interface ProjectDocumentFile {
  name: string;
  url: string;
  type: string;
  category: string;
}

export type FinancingType = 'Fonds propres' | 'Client' | 'Banque' | 'Investisseur' | 'Subvention' | 'Partenaire' | 'Autre';
export interface ProjectFinancing {
  id: string;
  source: string;
  type: FinancingType;
  planned_amount: number | null;
  currency: string;
  received_amount: number | null;
  planned_date: string | null;
  received_date: string | null;
  document?: ProjectDocumentFile | null;
  created_at: string;
}

export type ExpenseStatus = 'Prévue' | 'Engagée' | 'Payée';
export interface ProjectExpense {
  id: string;
  label: string;
  amount: number;
  currency: string;
  category: string;
  phase_id?: string | null;
  phase_name?: string;
  supplier?: string;
  date: string | null;
  status: ExpenseStatus;
  document?: ProjectDocumentFile | null;
  created_at: string;
}

export type RevenueStatus = 'Prévue' | 'Facturée' | 'Partiellement encaissée' | 'Encaissée' | 'En retard';
export interface ProjectRevenue {
  id: string;
  label: string;
  expected_amount: number;
  currency: string;
  expected_date: string | null;
  source_client?: string;
  phase_id?: string | null;
  phase_name?: string;
  payment_condition?: string;
  collected_amount: number;
  status: RevenueStatus;
  document?: ProjectDocumentFile | null;
  created_at: string;
}

export type RiskType = 'Risque' | 'Problème réel';
export type RiskProbability = 'Faible' | 'Moyenne' | 'Élevée';
export type RiskImpact = 'Faible' | 'Moyen' | 'Critique';
export type RiskStatus = 'open' | 'resolved';
export interface ProjectRisk {
  id: string;
  title: string;
  type: RiskType;
  probability: RiskProbability;
  impact: RiskImpact;
  phase_id?: string | null;
  phase_name?: string;
  owner_name?: string;
  description?: string;
  corrective_action?: string;
  resolution_deadline: string | null;
  status: RiskStatus;
  created_at: string;
}

export type VisitType = 'Visite' | 'Inspection' | 'Contrôle' | 'Réunion terrain';
export interface ProjectVisit {
  id: string;
  type: VisitType;
  date: string | null;
  location?: string;
  participants?: string;
  phase_id?: string | null;
  phase_name?: string;
  observations?: string;
  observed_progress?: number | null;
  anomalies?: string;
  recommendations?: string;
  photos?: ProjectDocumentFile[];
  documents?: ProjectDocumentFile[];
  next_visit_date: string | null;
  created_at: string;
}

export interface ProjectItem {
  id: string;
  owner_id?: string;
  company_id?: string;
  name: string;
  description: string;
  expected_result: string;
  category: string;
  department: string;
  owner_member_id: string | null;
  owner_name: string;
  contributor_ids: string[];
  contributor_names: string[];
  priority: ProjectPriority;
  start_date: string | null;
  deadline: string | null;
  reminder_days: number;
  follow_up_frequency: FollowUpFrequency;
  modules: ProjectModuleKey[];
  objectives: ProjectObjective[];
  phases: ProjectPhase[];
  financings: ProjectFinancing[];
  expenses: ProjectExpense[];
  revenues: ProjectRevenue[];
  risks: ProjectRisk[];
  visits: ProjectVisit[];
  budget_enabled: boolean;
  budget_amount: number | null;
  budget_currency: string;
  linked_document_ids?: string[];
  documents?: ProjectDocumentFile[];
  progress_mode: 'auto' | 'manual';
  manual_progress?: number | null;
  status: 'active' | 'completed' | 'archived';
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

export interface TaskAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface NotificationItem {
  id: string;
  owner_id?: string;
  company_id?: string;
  recipient_id: string;
  recipient_email?: string;
  type: string;
  title: string;
  message: string;
  task_id?: string;
  read: boolean;
  created_at: string;
}

export type ProductState = 'Disponible' | 'Stock limité' | 'Indisponible';

/** One row of a company's product/service catalog, shown to other network members. */
export interface ProductItem {
  id: string;
  owner_id?: string;
  company_id?: string;
  company_name?: string;
  ref: string;
  category: string;
  product_name: string;
  brand: string;
  model: string;
  description: string;
  /** Optional: sellers aren't required to publish a price. */
  price_usd: number | null;
  stock: number;
  unit: string;
  warranty_months: number | null;
  state: ProductState;
  location: string;
  delivery_time: string;
  created_at: string;
  updated_at: string;
}

// ===== Rapports intelligents =====

export type ReportMode = 'single' | 'consolidated';
export type ReportStatus = 'collecting' | 'consolidated';

export interface ReportContributionEntry {
  id: string;
  contributor_id: string | null;
  contributor_name: string;
  document_name: string;
  document_url: string;
  document_type: string;
  summary: string;
  key_points?: string[];
  amount_due: number | null;
  due_date: string | null;
  engine: string | null;
  submitted_at: string;
}

export interface ReportItem {
  id: string;
  owner_id?: string;
  company_id?: string;
  title: string;
  description: string;
  mode: ReportMode;
  status: ReportStatus;
  contributions: ReportContributionEntry[];
  consolidated_summary: string | null;
  consolidated_key_points: string[];
  consolidated_at: string | null;
  consolidated_engine: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
}
