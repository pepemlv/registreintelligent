export type DocumentStatus =
  | 'received'
  | 'processing'
  | 'assigned'
  | 'in_review'
  | 'validated'
  | 'closed'
  | 'overdue';

export type DocumentType =
  | 'invoice'
  | 'contract'
  | 'letter'
  | 'report'
  | 'order'
  | 'delivery_note'
  | 'quote'
  | 'other';

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type SenderType = 'supplier' | 'client' | 'partner' | 'internal';

export type MailDirection = 'incoming' | 'outgoing';

export type MailStatus =
  | 'received'
  | 'prepared'
  | 'validated'
  | 'sent'
  | 'delivered'
  | 'processed'
  | 'closed';

export type TaskStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'submitted'
  | 'validated'
  | 'closed';

export type UserRole = 'ORGANIZATION_ADMIN' | 'EXECUTIVE' | 'UNIT_MANAGER' | 'UNIT_SECRETARY' | 'AGENT';

export interface DocumentParty {
  name: string;
  type: SenderType;
  avatarColor: string;
}

export interface CollaborationMessage {
  id: string;
  author: string;
  authorRole: 'client' | 'supplier' | 'internal';
  avatarColor: string;
  message: string;
  timestamp: string;
  attachments?: { name: string; type: string }[];
}

export interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  icon: 'receive' | 'assign' | 'validate' | 'comment' | 'ai' | 'close' | 'alert';
}

export interface DocDocument {
  id: string;
  reference: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  priority: Priority;
  sender: DocumentParty;
  recipient: DocumentParty;
  amount?: number;
  currency?: string;
  receivedDate: string;
  dueDate?: string;
  aiSummary: string;
  aiKeyPoints: string[];
  aiAmount?: number;
  aiDueDate?: string;
  aiConfidence: number;
  aiSuggestedDepartment?: string;
  aiSuggestedAction?: string;
  assignedTo?: string;
  assignedDepartment?: string;
  pages: number;
  hasPhysicalOriginal: boolean;
  physicalStatus?: 'in_transit' | 'delivered' | 'not_required';
  category: string;
  tags: string[];
  collaboration: CollaborationMessage[];
  activity: ActivityEntry[];
  processingTime?: number;
  direction: MailDirection;
  dossierId?: string;
  projectId?: string;
  registerNumber: string;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  data?: {
    type: 'documents' | 'stats' | 'summary' | 'list';
    items?: { label: string; value: string; status?: DocumentStatus }[];
  };
}

export interface KPIData {
  total: number;
  processed: number;
  inProgress: number;
  overdue: number;
  avgProcessingDays: number;
  onTimeRate: number;
}

export interface DepartmentPerformance {
  department: string;
  total: number;
  processed: number;
  overdue: number;
  avgDays: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedTo: string;
  assignedDepartment: string;
  dueDate: string;
  createdDate: string;
  createdBy: string;
  project?: string;
  sourceDocument?: string;
  submittedDate?: string;
  validatedDate?: string;
}

export interface Dossier {
  id: string;
  name: string;
  status: 'active' | 'closed' | 'archived';
  documentCount: number;
  documentBreakdown: { invoices: number; contracts: number; orders: number; correspondence: number; other: number };
  taskCount: number;
  deadlineCount: number;
  collaboratorCount: number;
  tags: string[];
  lastActivity: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  team: string[];
  documentCount: number;
  taskCount: number;
  deadlineCount: number;
  progress: number;
  reportCount: number;
  status: 'active' | 'completed' | 'planned';
  startDate: string;
  endDate?: string;
}

export interface ReportContribution {
  id: string;
  department: string;
  documentName: string;
  status: 'submitted' | 'pending' | 'late';
  submittedDate?: string;
  format: string;
}

export interface Report {
  id: string;
  title: string;
  period: string;
  status: 'collecting' | 'drafting' | 'review' | 'validated' | 'exported';
  contributions: ReportContribution[];
  aiSummary?: string;
  createdDate: string;
  createdBy: string;
  sections: { title: string; content?: string; status: 'ready' | 'pending' }[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  department: string;
  email: string;
  avatarColor: string;
  lastActive: string;
  documentCount: number;
  taskCount: number;
}

export interface RolePermission {
  role: UserRole;
  roleLabel: string;
  description: string;
  permissions: { label: string; granted: boolean }[];
  userCount: number;
}

export interface EscalationRule {
  id: string;
  trigger: string;
  action: string;
  timing: string;
  active: boolean;
}

export type RFQStatus = 'draft' | 'published' | 'open' | 'closing' | 'closed' | 'awarded';
export type FieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'boolean' | 'radio' | 'select' | 'quantity' | 'percentage' | 'file' | 'photo' | 'url' | 'product_table';
export type SubmissionStatus = 'pending' | 'submitted' | 'under_review' | 'awarded' | 'rejected';

export interface RFQProductLine {
  id: string;
  product: string;
  quantity: number;
  specifications: string;
  supplierFilled: boolean;
}

export interface RFQFormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface RFQSubmission {
  id: string;
  supplierName: string;
  supplierAvatarColor: string;
  status: SubmissionStatus;
  submittedDate: string;
  totalAmount: number;
  currency: string;
  deliveryDays: number;
  warranty: string;
  paymentTerms: string;
  availability: boolean;
  technicalConformity: number;
  documentsComplete: boolean;
  proformaAmount?: number;
  hasDiscrepancy?: boolean;
  discrepancyDetail?: string;
  productPrices: { productId: string; unitPrice: number; totalPrice: number }[];
  fieldResponses: { fieldId: string; value: string }[];
  score?: number;
}

export interface RFQTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  fieldCount: number;
  productCount: number;
}

export interface RFQ {
  id: string;
  reference: string;
  title: string;
  status: RFQStatus;
  createdBy: string;
  createdDate: string;
  deadline: string;
  deliveryLocation: string;
  supplierScope?: 'local' | 'national';
  supplierCategory?: 'prime' | 'fabricant' | 'revendeur' | 'prestataire' | 'sous_traitant';
  /** Who can see and respond to this RFQ: everyone, a set of service/product categories, or hand-picked companies. */
  visibility?: 'all' | 'category' | 'specific';
  visibilityCategories?: string[];
  visibilitySupplierIds?: string[];
  description: string;
  hasAttachment: boolean;
  attachmentName?: string;
  products: RFQProductLine[];
  formFields: RFQFormField[];
  submissions: RFQSubmission[];
  scoringCriteria: { label: string; weight: number }[];
  aiRecommendedSupplierId?: string;
  aiRecommendationReason?: string;
  awardedSupplierId?: string;
  awardReason?: string;
}

// ===== B2B Network =====

export type CompanyStatus = 'verified' | 'unverified' | 'external';
export type PartnerRelation = 'supplier' | 'customer' | 'both';
export type PartnerStatus = 'active' | 'pending' | 'invited' | 'inactive';
export type OpportunityStatus = 'new' | 'to_answer' | 'submitted' | 'awarded' | 'rejected' | 'closed';
export type ConsultationMode = 'private' | 'open';

export interface Company {
  id: string;
  name: string;
  logoColor: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  taxId: string;
  sectors: string[];
  productsServices: string[];
  contactPersons: { name: string; role: string; email: string; phone: string }[];
  docFlowCode: string;
  status: CompanyStatus;
  servedZones: string[];
  categories: string[];
}

export interface Partner {
  id: string;
  company: Company;
  relation: PartnerRelation;
  status: PartnerStatus;
  addedDate: string;
  notes: string;
  favorite: boolean;
  isDocFlowMember: boolean;
  invitedDate?: string;
}

export interface Opportunity {
  id: string;
  reference: string;
  title: string;
  clientName: string;
  clientLogoColor: string;
  deadline: string;
  status: OpportunityStatus;
  mode: ConsultationMode;
  description: string;
  products: { name: string; quantity: number; specifications: string }[];
  hasForm: boolean;
  submittedDate?: string;
  submittedAmount?: number;
  currency: string;
  awardAmount?: number;
}

export interface DocFlowSearchResult {
  company: Company;
  alreadyPartner: boolean;
}
