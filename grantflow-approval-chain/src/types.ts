export type UserRole =
  | 'Admin'
  | 'DepartmentHead'
  | 'Officer'
  | 'ProposalLead'
  | 'Reviewer'
  | 'FinalApprover'
  | 'Viewer';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName?: string;
  role: UserRole;
  roles?: UserRole[];
  departmentId?: string;
  departmentName?: string;
  staffId?: string;
  jobTitle?: string;
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
  isDemoUser?: boolean;
  isSuperAdmin?: boolean;
  hasMultiOrgAccess?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface StaffInvitation {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  email: string;
  fullName: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  role: UserRole;
  roles?: UserRole[];
  invitedBy: string;
  invitedByEmail: string;
  status: 'Pending' | 'Accepted' | 'Revoked' | 'Expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export interface AuthSessionResponse {
  user: AppUser;
  organization: OrgProfile;
  token: string;
}

export interface OrgDepartment {
  id: string;
  name: string; // e.g. 'Programmes', 'Finance', 'Monitoring & Evaluation', 'Grants / Resource Mobilisation', 'Communications', 'Administration / Operations', 'Executive Management'
  code: string; // e.g. 'PROG', 'FIN', 'ME', 'GRANTS', 'COMMS', 'OPS', 'EXEC'
  headStaffId: string; // Staff member ID of Department Head
  headStaffName: string; // Full name of Department Head
  deputyStaffId?: string; // Optional alternate approver
  deputyStaffName?: string;
  mandate?: string;
  color?: string; // UI badge color theme
}

export interface StaffMember {
  id: string;
  userId?: string;
  fullName: string;
  jobTitle: string;
  department: string;
  departmentId?: string;
  email: string;
  lineManagerId?: string;
  lineManagerName?: string;
  isDepartmentHead?: boolean;
  isDeputyHead?: boolean;
  functionalRole?: 'Contributor' | 'DepartmentHead' | 'ProposalLead' | 'FinalApprover' | 'Admin';
  role?: UserRole;
  roles?: UserRole[];
  status: 'Active' | 'Inactive';
  joinedDate?: string;
}

export type OrgDocumentCategory =
  | 'Legal & Registration'
  | 'Policies & Compliance'
  | 'Financial & Audit'
  | 'Organisational Information'
  | 'Staff & Governance'
  | 'Donor & Project Experience';

export type OrgDocumentStatus =
  | 'Current Approved'
  | 'Under Review'
  | 'Draft'
  | 'Superseded'
  | 'Expired';

export type OrgDocumentAccessLevel = 'General' | 'Restricted' | 'Management Only';

export interface OrgDocumentVersion {
  version: string;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  fileSize?: string;
  changeNotes?: string;
  status: OrgDocumentStatus;
}

export interface OrgDocument {
  id: string;
  title: string;
  documentType: string; // e.g. 'Certificate', 'Policy', 'Audit Report', 'Organogram', 'Strategic Plan', 'Reference Letter', 'CV'
  category: OrgDocumentCategory;
  year?: string; // e.g. '2024' or '2024-2028'
  version: string; // e.g. 'v2.0'
  isCurrentApproved: boolean;
  status: OrgDocumentStatus;
  approvalDate?: string; // ISO date
  expiryDate?: string; // ISO date
  nextReviewDate?: string; // ISO date
  accessLevel: OrgDocumentAccessLevel;
  fileName: string;
  fileSize?: string;
  fileFormat: 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'IMAGE';
  maintainedBy: string; // Staff member name
  maintainedByStaffId?: string;
  description: string;
  tags: string[];
  donorUses?: string[]; // e.g. ['UN Women', 'USAID', 'EU-ACT']
  previousVersions?: OrgDocumentVersion[];
  linkedRequirementsCount?: number;
  lastUpdated: string;
}

// A single configurable stage in an organisation's approval chain.
// 'FinalApprover' is always required as the last stage; all others are optional.
export type ApprovalChainStage =
  | 'DepartmentHead'
  | 'ProposalLead'
  | 'Reviewer'
  | 'FinalApprover';

export const APPROVAL_STAGE_LABELS: Record<ApprovalChainStage, string> = {
  DepartmentHead: 'Department Head / Line Manager',
  ProposalLead: 'Proposal Lead',
  Reviewer: 'Internal Reviewer',
  FinalApprover: 'Final Approver (Sign-off)'
};

export const DEFAULT_APPROVAL_CHAIN: ApprovalChainStage[] = ['DepartmentHead', 'ProposalLead', 'FinalApprover'];

export interface OrgProfile {
  id: string;
  organizationId?: string;
  isDemo?: boolean;
  name: string;
  country: string;
  yearEstablished: number;
  registrationStatus: string;
  orgType: string;
  thematicAreas: string[];
  geographicAreas: string[];
  yearsExperience: number;
  annualBudgetRange: string;
  annualBudgetUsdEstimate: number;
  staffCount: number;
  adminEmail?: string;
  onboardingComplete?: boolean;
  // Configurable approval chain. The organisation picks which stages form their
  // application approval path. All stages except FinalApprover are optional.
  // Example lean chain: ['FinalApprover']
  // Example full chain: ['DepartmentHead','ProposalLead','Reviewer','FinalApprover']
  approvalChain?: ApprovalChainStage[];
  fieldProvenance?: Record<string, Record<string, 'derived' | 'added' | 'verified'>>;
  staffDirectory?: StaffMember[];
  departments?: OrgDepartment[];
  documentLibrary?: OrgDocument[];
  smallNgoMode?: boolean; // When true, allows lean small-NGO collapsed roles
  requireIntermediateReviewer?: boolean; // Configurable approval hierarchy
  defaultFinalApproverId?: string;
  defaultFinalApproverName?: string;
  previousDonors: string[];
  auditedAccountsAvailable: boolean;
  auditedAccountsYears: number;
  safeguardingPolicy: boolean;
  genderPolicy: boolean;
  antiFraudPolicy: boolean;
  meCapacity: string;
  description: string;
  contactEmail: string;
  fundingPreferences?: FundingPreferences;
  updatedAt: string;
}

export interface FundingPreferences {
  thematicAreas: string[];
  geographicEligibility: string[];
  beneficiaryGroups: string[];
  orgType: string;
  preferredFundingMin?: string;
  preferredFundingMax?: string;
  minUsefulGrantSize?: string;
  preferredProjectDuration?: string;
  preferredDonorTypes: string[];
  fundingTypes: string[];
  keywords: string[];
  excludedSectors: string[];
  excludedCountries: string[];
  acceptsConsortium: boolean;
}

export interface ExtractedRequirement {
  id: string;
  category: 'Eligibility' | 'Financial' | 'Governance' | 'Technical' | 'Documentation';
  requirement: string;
  mandatory: boolean;
  details: string;
  sourceSnippet?: string;
  isAmbiguous?: boolean;
}

export type FactVerificationStatus =
  | 'Confirmed from Source'
  | 'Human Verified'
  | 'Needs Verification'
  | 'Not Stated in Source';

export interface VerifiedField<T = string> {
  value: T;
  sourceSnippet?: string; // Exact verbatim supporting source text
  sourceReference?: string; // Page/Section reference (e.g. "Section 1: Eligibility", "Page 2", "NOFO Header")
  verificationStatus: FactVerificationStatus;
  verificationNotes?: string; // e.g. "Needs Verification — GrantFlow could not confidently identify this field."
}

export interface CriticalDonorFacts {
  donorName: VerifiedField<string>;
  opportunityTitle: VerifiedField<string>;
  applicationDeadline: VerifiedField<string>;
  fundingAmount: VerifiedField<string>;
  currency: VerifiedField<string>;
  eligibleCountries: VerifiedField<string[]>;
  eligibleOrgTypes: VerifiedField<string[]>;
  coFundingRequirement: VerifiedField<string>;
  requiredSupportingDocs: VerifiedField<string[]>;
  wordLimits: VerifiedField<string>;
  submissionMethod: VerifiedField<string>;
}

export type DeadlineVerificationStatus = FactVerificationStatus;

export interface FundingCallExtraction {
  donor: string;
  opportunityTitle: string;
  fundingAmount: string;
  currency: string;
  applicationDeadline: string; // ISO date string or formatted date
  deadlineVerificationStatus?: DeadlineVerificationStatus;
  deadlineToSourceSnippet?: string;
  criticalFacts?: CriticalDonorFacts;
  eligibleCountries: string[];
  eligibleOrgTypes: string[];
  thematicPriorities: string[];
  targetBeneficiaries: string[];
  projectDuration: string;
  coFundingRequirement: string;
  minOrgExperience: string;
  financialRequirements: string;
  requiredPolicies: string[];
  requiredSupportingDocs: string[];
  proposalSections: string[];
  wordLimits: string;
  submissionMethod: string;
  submissionUrlOrEmail: string;
  contactInfo: string;
  specialRestrictions: string;
  otherEligibilityConditions: string[];
  rawSummary: string;
  sourceType: 'text' | 'url' | 'document';
  sourceReference?: string;
}

export interface EligibilityCriterion {
  criterion: string;
  category: 'Geography' | 'Registration' | 'Financial & Audit' | 'Policies' | 'Thematic & Experience' | 'Co-Funding / Other';
  status: 'MET' | 'REVIEW_REQUIRED' | 'UNMET' | 'NOT_STATED';
  details: string;
  orgEvidence: string;
  donorRequirement: string;
  needsHumanVerification: boolean;
}

export interface EligibilityAssessment {
  overallStatus: 'LIKELY ELIGIBLE' | 'REVIEW REQUIRED' | 'LIKELY INELIGIBLE';
  confidenceScoreRationale: string;
  criteria: EligibilityCriterion[];
  strongestMatches: string[];
  importantRisks: string[];
  missingInformation: string[];
  humanVerificationRequired: string[];
  overallFitSummary: string;
  strategicRecommendation: string;
  assessedAt: string;
}

export type PipelineStage =
  | 'Identified'
  | 'Assessing'
  | 'Go / No-Go'
  | 'Preparing Application'
  | 'Internal Review'
  | 'Ready for Submission'
  | 'Submitted'
  | 'Awaiting Decision'
  | 'Awarded'
  | 'Rejected';

export type DepartmentReviewStatus =
  | 'Drafting'
  | 'Submitted to Department Head'
  | 'Department Approved'
  | 'Approved'
  | 'Returned for Revision';

export type FinalApprovalStatus =
  | 'Drafting'
  | 'Pending Final Review'
  | 'Approved for Submission'
  | 'Returned for Revision';

export interface WorkspaceDocument {
  id: string;
  name: string;
  mandatory: boolean;
  category: 'Governance' | 'Financial' | 'Technical Proposal' | 'Budget' | 'Partner/Endorsement' | 'Other';
  departmentName?: string;
  departmentHeadName?: string;
  status: 'Missing' | 'Drafting' | 'Under Review' | 'Ready' | 'Signed';
  departmentReviewStatus?: DepartmentReviewStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  fileName?: string;
  assignedTo?: string;
  notes?: string;
  lastUpdated?: string;
  libraryDocId?: string;
  libraryVersion?: string;
}

export type AssignmentStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted for Review'
  | 'Completed';

export interface OpportunityOfficerAssignment {
  id: string;
  staffId: string;
  staffName: string;
  staffEmail?: string;
  department: string;
  responsibility: string; // e.g. "Lead Proposal Writer", "Budget & Financial Narrative", "MEAL Framework", "Technical Approach", "Safeguarding & Governance"
  assignedRole?: string;
  deadline: string;
  instructions?: string;
  status: AssignmentStatus;
  submissionNotes?: string;
  submittedAt?: string;
  assignedBy?: string;
  assignedAt: string;
  lastUpdated?: string;
}

export type TaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted for Review'
  | 'Complete'
  | 'Completed'
  | 'Blocked'
  | 'Overdue';

export type BlockerReason =
  | 'Waiting for Finance'
  | 'Awaiting Management Approval'
  | 'Waiting for Partner'
  | 'Missing Organisational Document'
  | 'Donor Clarification Required'
  | 'Other';

export interface WorkspaceTask {
  id: string;
  title: string;
  departmentId?: string;
  departmentName?: string;
  assignedTo: string; // Full Name
  assignedStaffId?: string;
  departmentHeadId?: string;
  departmentHeadName?: string;
  dueDate: string;
  status: TaskStatus;
  departmentReviewStatus?: DepartmentReviewStatus;
  reviewNote?: string; // Feedback from Department Head if approved or returned
  reviewedAt?: string;
  reviewedBy?: string;
  submissionDraftText?: string; // Text / summary submitted by Officer
  submissionDraftFile?: string;
  submittedAt?: string;
  submittedBy?: string;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  completedAt?: string;
  completedOnTime?: boolean;
  section?: string;
  notes?: string;
  blockerReason?: BlockerReason;
  blockerNotes?: string;
  dependency?: string;
  createdAt: string;
  lastUpdated?: string;
  isManuallyEdited?: boolean;
}

export interface WorkspaceMilestone {
  id: string;
  title: string;
  targetDate: string;
  completed: boolean;
  isManuallyEdited?: boolean;
}

export interface OutstandingQuestion {
  id: string;
  question: string;
  category: string;
  answer?: string;
  status: 'Open' | 'Resolved';
  assignedTo?: string;
}

export interface InternalNote {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  tag?: string;
}

export interface SubmissionRecord {
  submittedAt: string;
  submissionMethod: string;
  confirmationNumber: string;
  submittedDocuments: string[];
  expectedDecisionDate?: string;
  recordedBy: string;
  notes?: string;
}

export interface OutcomeRecord {
  decisionDate: string;
  outcome: 'Awarded' | 'Rejected';
  grantAmountAwarded?: string;
  feedbackNotes?: string;
}

export interface AgentReadinessAlert {
  level: 'CRITICAL' | 'WARNING' | 'READY' | 'INFO';
  headline: string;
  details: string;
  recommendedActions: string[];
  evaluatedAt: string;
  bottleneckDepartment?: string;
  responsibleStaff?: string;
  escalationLevel?: string;
}

export interface OpportunityActivityEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  role?: string;
  details: string;
  targetId?: string;
  category?:
    | 'assignment'
    | 'department_assignment'
    | 'officer_submission'
    | 'hod_review'
    | 'revision_requested'
    | 'resubmission'
    | 'department_approval'
    | 'proposal_lead_review'
    | 'final_review_request'
    | 'final_approval'
    | 'final_rejection'
    | 'reassignment'
    | 'escalation'
    | 'task'
    | 'blocker'
    | 'status'
    | 'submission'
    | 'document'
    | 'general'
    | 'outcome'
    | 'stage';
}

export type TemplateSourceType =
  | 'upload_template'
  | 'paste_questions'
  | 'extracted_call'
  | 'none_fallback';

export interface DonorApplicationTemplateSource {
  type: TemplateSourceType;
  fileName?: string;
  fileFormat?: 'DOCX' | 'PDF' | 'XLSX' | 'PORTAL_FORM' | 'CALL_SECTIONS' | 'NONE';
  rawContent?: string;
  uploadedAt?: string;
  sourceLabel?: string;
}

export interface SectionAiCritique {
  unansweredElements: string[];
  weakEvidence: string[];
  unsupportedClaims: string[];
  repetitionNotes: string[];
  wordCountStatus: 'Within Limit' | 'Exceeds Limit' | 'Too Short' | 'Optimal';
  wordCountDetails: string;
  logicalInconsistencies: string[];
  actionableSuggestions: string[];
  evaluatedAt: string;
}

export interface ApplicationSection {
  id: string;
  sectionNumber: string; // e.g. "Q1", "Q2.1", "Section 3"
  donorQuestion: string; // Verbatim donor question - preserved
  donorInstructions?: string; // Verbatim donor instructions/guidelines
  wordLimit?: number; // Specific word limit if stated
  charLimit?: number;
  pageLimit?: string;
  isGrantFlowGenerated?: boolean; // true if fallback generated structure
  mandatory?: boolean;
  assignedDepartment: string; // e.g. 'Programmes', 'Finance', 'Monitoring & Evaluation', 'Grants / Resource Mobilisation', 'Executive Management'
  assignedDepartmentId?: string;
  assignedStaff: string; // Full Name
  assignedStaffId?: string;
  departmentHead: string; // Line Manager name
  departmentHeadId?: string;
  dueDate: string; // Internal target date
  draftResponse: string; // Working draft content
  status: 'Not Started' | 'Drafting' | 'Under Review' | 'Complete';
  // reviewStatus tracks where this section sits in the org's configured approval chain.
  // Dynamic stages are supported: only stages in the active approvalChain are used.
  // 'Approved' is the terminal approved state regardless of which stage approved it.
  reviewStatus:
    | 'Drafting'
    | 'Submitted to Department Head'
    | 'Department Approved'
    | 'Submitted to Proposal Lead'
    | 'Proposal Lead Approved'
    | 'Submitted to Reviewer'
    | 'Reviewer Approved'
    | 'Submitted for Final Approval'
    | 'Approved'
    | 'Returned for Revision';
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  aiCritique?: SectionAiCritique;
  orderIndex?: number;
}

export type DonorSubmissionFormat =
  | 'docx'
  | 'xlsx'
  | 'fillable_pdf'
  | 'non_fillable_pdf'
  | 'portal'
  | 'none';

export interface TemplateMappingField {
  id: string;
  donorQuestionNumber: string;
  donorQuestionText: string;
  donorInstructions?: string;
  sectionId: string;
  assignedDepartment: string;
  assignedStaff: string;
  departmentHead: string;
  wordLimit?: number;
  approvedAnswer: string;
  reviewStatus: string;
  mappingConfidence: 'High' | 'Medium' | 'Requires Verification';
  isVerifiedByHuman?: boolean;
  targetLocationLabel?: string;
}

export interface GeneratedApplicationVersion {
  id: string;
  versionNumber: number;
  label: string; // e.g. "Application_v1 — Draft", "Application_v3 — FINAL"
  format: 'DOCX' | 'XLSX' | 'PDF' | 'PORTAL_DIGEST';
  fileName: string;
  fileSize?: string;
  status: 'Draft' | 'Final';
  generatedAt: string;
  generatedBy: string;
  isFinalSubmission: boolean;
  mappedSectionsCount: number;
  approvedSectionsCount: number;
  notes?: string;
}

export interface OpportunityWorkspace {
  id: string;
  organizationId?: string;
  isDemo?: boolean; // true if this is demo/sample seed data, false if user-created
  isTestOpportunity?: boolean; // true if loaded via Developer / Test Mode
  isDeveloperTestMode?: boolean;
  isEphemeralTest?: boolean; // true if running in-memory without database write
  donor: string;
  title: string;
  sourceUrl?: string;
  deadline: string;
  deadlineVerificationStatus?: DeadlineVerificationStatus;
  deadlineToSourceSnippet?: string;
  deadlineVerifiedAt?: string;
  deadlineVerifiedBy?: string;
  fundingAmount: string;
  currency: string;
  stage: PipelineStage;
  priority: 'High' | 'Medium' | 'Low';
  leadStaff: string; // Kept for backwards compatibility
  // Per-application approval chain override. When set, overrides the org-level chain
  // for this workspace only. The organisation can adjust this per application.
  approvalChain?: ApprovalChainStage[];
  proposalLead: string; // Staff member primarily responsible for coordinating the application
  reviewer?: string; // Intermediate reviewer / Head of Programmes
  finalApprover?: string; // Executive Director or designated final approver
  finalApprovalStatus?: FinalApprovalStatus;
  finalApprovalNote?: string;
  finalApprovedAt?: string;
  finalApprovedBy?: string;
  participatingDepartments?: string[];
  intermediateReviewer?: string;
  intermediateReviewStatus?: 'Pending' | 'Approved' | 'Returned';
  intermediateReviewNote?: string;
  thematicArea: string;
  countryScope: string;
  createdAt: string;
  updatedAt: string;
  extraction: FundingCallExtraction;
  assessment: EligibilityAssessment;
  criticalFacts?: CriticalDonorFacts;
  submissionFormat?: DonorSubmissionFormat;
  templateSource?: DonorApplicationTemplateSource;
  assignedOfficers?: OpportunityOfficerAssignment[];
  applicationSections?: ApplicationSection[];
  generatedVersions?: GeneratedApplicationVersion[];
  templateMapping?: TemplateMappingField[];
  requirementsChecklist: Array<{
    id: string;
    title: string;
    category: string;
    status: 'MET' | 'IN_PROGRESS' | 'PENDING' | 'BLOCKED';
    notes: string;
  }>;
  documentsChecklist: WorkspaceDocument[];
  tasks: WorkspaceTask[];
  milestones: WorkspaceMilestone[];
  outstandingQuestions: OutstandingQuestion[];
  internalNotes: InternalNote[];
  auditTrail?: OpportunityActivityEvent[];
  submissionRecord?: SubmissionRecord;
  outcomeRecord?: OutcomeRecord;
  readinessAlert?: AgentReadinessAlert;
}

export interface InstitutionalMemoryRecord {
  id: string;
  organizationId?: string;
  isDemo?: boolean;
  donor: string;
  opportunityTitle: string;
  year: number;
  amountRequested: string;
  outcome: 'Awarded' | 'Rejected' | 'Awaiting Decision';
  amountAwarded?: string;
  leadPerson: string; // Proposal Lead
  reviewer?: string;
  approver?: string;
  feedbackNotes: string;
  keyLearnings: string;
  attachments?: string[];
}

export type DonorHistoryItem = InstitutionalMemoryRecord;

export type NotificationCategory =
  | 'overdue_task'
  | 'task_due_today'
  | 'task_due_soon'
  | 'critical_deadline'
  | 'upcoming_deadline'
  | 'task_blocked'
  | 'escalation_alert'
  | 'hod_review_pending'
  | 'task_returned_revision'
  | 'department_approved'
  | 'final_review_pending'
  | 'final_approval_granted'
  | 'final_approval_returned'
  | 'document_expired'
  | 'document_expiring_soon'
  | 'document_review_due'
  | 'scout_strong_match';

export type NotificationSeverity = 'critical' | 'warning' | 'info';

export interface WorkspaceNotification {
  id: string;
  organizationId?: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  title: string;
  description: string;
  workspaceId?: string;
  workspaceTitle?: string;
  donor?: string;
  dueDateStr?: string;
  daysDiff: number; // negative = overdue, 0 = today, positive = days remaining
  targetType: 'task' | 'deadline' | 'milestone' | 'document' | 'org_document' | 'approval';
  targetId?: string;
  assignee?: string;
  departmentName?: string;
  departmentHeadName?: string;
  priority?: 'High' | 'Medium' | 'Low';
  createdAt?: string;
  blockerReason?: BlockerReason;
  escalationLevel?: 'Task Owner' | 'Department Head' | 'Proposal Lead' | 'Programme Manager' | 'Executive Director';
  escalationRecipient?: string;
  bottleneckDepartment?: string;
  isBottleneck?: boolean;
  targetRole?: UserRole;
  targetUserId?: string;
  libraryDocId?: string;
}

// ==========================================
// OPPORTUNITY SCOUT DOMAIN TYPES
// ==========================================

export type OpportunityStatus =
  | 'Open'
  | 'Deadline approaching'
  | 'Deadline unclear — verify'
  | 'Rolling / no fixed deadline'
  | 'Apparently closed';

export type OpportunityMatchVerdict =
  | 'STRONG MATCH'
  | 'POSSIBLE MATCH'
  | 'REVIEW REQUIRED'
  | 'LOW MATCH';

export interface OpportunityMatchCriterion {
  criterion: string;
  status: 'MET' | 'REVIEW_REQUIRED' | 'UNMET';
  evidence: string;
}

export type ScoutOpportunityLifecycleStatus =
  | 'Inbox'
  | 'Reviewed'
  | 'Saved'
  | 'Pursuing'
  | 'Dismissed';

export type DismissalReason =
  | 'Not eligible'
  | 'Poor thematic fit'
  | 'Grant too small'
  | 'Grant too large'
  | 'Deadline too close'
  | 'Geography mismatch'
  | 'Already applied'
  | 'Other';

export interface ScoutedOpportunity {
  id: string;
  orgId: string;
  donor: string;
  title: string;
  rawSummary: string;
  deadline: string;
  deadlineStatus: 'Confirmed from Source' | 'Human Verified' | 'Needs Verification' | 'Not Stated in Source';
  opportunityStatus: OpportunityStatus;
  fundingAmount: string;
  currency: string;
  eligibleGeography: string[];
  eligibleApplicantTypes: string[];
  thematicFocus: string[];
  sourceUrl: string;
  googleSearchCitationSnippet?: string;
  isVerifiedAgainstSource: boolean;
  verifiedAt?: string;
  matchVerdict: OpportunityMatchVerdict;
  matchReasons: string[];
  matchCriteriaBreakdown: OpportunityMatchCriterion[];
  status: ScoutOpportunityLifecycleStatus;
  discoveredAt: string;
  dismissalReason?: DismissalReason;
  dismissalNotes?: string;
  isAlreadyInPipeline?: boolean;
  existingWorkspaceId?: string;
  isDeadlineRisk?: boolean;
  deadlineRiskNotice?: string;
  fitScore?: number;
}

export interface ScoutActivityLog {
  id: string;
  orgId: string;
  timestamp: string;
  searchesRun: number;
  queriesExecuted: string[];
  candidatePagesReviewed: number;
  newOpportunitiesFound: number;
  strongMatchesCount: number;
  duplicatesIgnored: number;
  summary: string;
}

export interface ScoutJobConfig {
  orgId: string;
  scheduleCadence: 'Daily' | 'Weekly' | 'Manual Only';
  lastRunAt?: string;
  nextRunAt?: string;
  enabled: boolean;
}

export interface DismissalRecord {
  id: string;
  orgId: string;
  sourceUrl: string;
  donor: string;
  title: string;
  reason: DismissalReason;
  notes?: string;
  timestamp: string;
}
