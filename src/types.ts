// GDPR Control Center Shared TypeScript Types

export type LawfulBasisType =
  | 'Consent'
  | 'Contract'
  | 'Legal Obligation'
  | 'Vital Interests'
  | 'Public Task'
  | 'Legitimate Interests';

export type RightType =
  | 'Access (Art. 15)'
  | 'Rectification (Art. 16)'
  | 'Erasure (Art. 17)'
  | 'Restriction (Art. 18)'
  | 'Portability (Art. 20)'
  | 'Objection (Art. 21)'
  | 'Automated Decision Review (Art. 22)';

export type TicketStatus =
  | 'Intake & Verification'
  | 'Under Lawful Review'
  | 'Remediation In Progress'
  | 'Pending Downstream Notification'
  | 'Completed & Sealed'
  | 'Statutorily Refused';

export type PriorityLevel = 'Standard' | 'High (SLA Warning)' | 'Critical (SLA Escalated)';

export type IdVerificationStatus =
  | 'Verified'
  | 'Pending ID Proof'
  | 'Clock Paused - Awaiting ID'
  | 'Failed ID Check';

export type EntitlementDecision =
  | 'Fully Granted'
  | 'Partially Granted (Statutory Carveout)'
  | 'Lawfully Blocked'
  | 'Pending Assessment';

export interface ComplianceDeadlineInfo {
  baselineDeadline: string;
  effectiveDeadline: string;
  daysRemaining: number;
  totalDurationDays: number;
  slaStatus: 'Normal' | 'Warning (28-day SLA)' | 'Escalated (Critical / Breached)';
  isOverdue: boolean;
  percentElapsed: number;
}

export interface Subject {
  id: string;
  cif_number: string;
  full_name: string;
  email: string;
  phone: string;
  residency_country: string;
  customer_segment: 'Retail Banking' | 'Private Wealth' | 'Corporate' | 'Ex-Customer' | 'Prospect';
  kyc_status: 'Verified' | 'Pending Re-verification' | 'Unverified' | 'Enhanced Due Diligence';
  aml_flag: number;
  created_at: string;
}

export interface LawfulBasisInventoryItem {
  id: string;
  purpose_code: string;
  purpose_name: string;
  department: string;
  lawful_basis: LawfulBasisType;
  retention_years: number;
  allows_erasure: number;
  allows_portability: number;
  allows_objection: number;
  statutory_reference: string;
}

export interface SubjectDataItem {
  id: string;
  subject_id: string;
  purpose_code: string;
  data_category: string;
  field_name: string;
  sample_value: string;
  system_of_record: string;
  storage_medium: 'Hot DB' | 'Cold Archive' | 'Backup Tape (Immutable)' | 'CRM' | 'Core Ledger';
  is_restricted: number;
  is_beyond_use: number;
  purpose_name?: string;
  lawful_basis?: LawfulBasisType;
  retention_years?: number;
  allows_erasure?: number;
  allows_portability?: number;
  statutory_reference?: string;
}

export interface DsrTicket {
  id: string;
  ticket_ref: string;
  subject_id: string;
  right_type: RightType;
  status: TicketStatus;
  priority: PriorityLevel;
  request_date: string;
  baseline_deadline: string;
  extended_deadline: string | null;
  extension_applied: number;
  extension_reason: string | null;
  id_verification_status: IdVerificationStatus;
  id_verified_at: string | null;
  id_paused_days: number;
  lawful_basis_assessed: string | null;
  entitlement_decision: EntitlementDecision;
  rejection_code: string | null;
  automated_decision_flag: number;
  remediation_summary: string | null;
  assigned_officer: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  full_name: string;
  cif_number: string;
  email: string;
  phone?: string;
  residency_country?: string;
  customer_segment?: string;
  kyc_status?: string;
  aml_flag?: number;
  deadlineInfo?: ComplianceDeadlineInfo;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  event_type: string;
  ticket_ref: string | null;
  operator_id: string;
  actor_role: string;
  action_detail: string;
  state_diff_json: string;
  prev_hash: string;
  current_hash: string;
  digital_signature: string;
}

export interface DownstreamNotification {
  id: string;
  ticket_ref: string;
  recipient_name: string;
  recipient_type: 'Credit Reference Bureau' | 'Anti-Fraud Registry' | 'Core Ledger Processor' | 'Marketing CRM' | 'Third-Party Analytics' | 'AML Reporting Node';
  notification_type: 'Rectification Notice' | 'Erasure Instruction' | 'Processing Restriction Freeze' | 'Beyond-Use Confirmation';
  payload_summary: string;
  dispatch_status: 'Queued' | 'Dispatched' | 'Acknowledged' | 'Delivery Failed';
  dispatched_at: string | null;
  ack_received_at: string | null;
  retry_count: number;
  created_at: string;
}

export interface SuppressionRecord {
  id: string;
  subject_id: string;
  cif_number: string;
  identifier_type: 'CIF' | 'Email' | 'Phone' | 'National ID';
  identifier_value: string;
  suppression_type: 'Art. 21 Direct Marketing Opt-Out (Absolute)' | 'Art. 18 Temporary Processing Freeze (Disputed Accuracy)' | 'Art. 18 Unlawful Processing Freeze' | 'Legal Hold Protection';
  lawful_grounds: string;
  active: number;
  effective_from: string;
  expires_at: string | null;
  created_by: string;
  full_name?: string;
}

export interface Art22Override {
  id: string;
  ticket_ref: string;
  subject_id: string;
  model_name: string;
  original_score: string;
  automated_outcome: string;
  human_reviewer: string;
  human_decision: 'Affirmed (Automated Valid)' | 'Overturned (Favorable to Customer)' | 'Modified (Adjusted Limits)';
  justification: string;
  decision_timestamp: string;
  full_name?: string;
  cif_number?: string;
}

export interface BackupBeyondUseLog {
  id: string;
  ticket_ref: string;
  subject_id: string;
  backup_tape_id: string;
  storage_location: string;
  data_categories_covered: string;
  technical_measures: string;
  scheduled_overwrite_date: string;
  officer_signature: string;
  certified_at: string;
}

export interface ServerHealth {
  status: string;
  systemTime: string;
  uptimeSeconds: number;
  environment: {
    networkIsolation: string;
    externalConnections: number;
    outboundInternetAccess: string;
    tlsCertificate: string;
  };
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  database: {
    engine: string;
    journalMode: string;
    dbSizeBytes: number;
    walSizeBytes: number;
    totalQueriesExecuted: number;
    totalWritesExecuted: number;
    avgLatencyMs: number;
    lastSaved: string;
    tableStats: {
      subjects: number;
      tickets: number;
      auditLogs: number;
      activeSuppressions: number;
      pendingDownstream: number;
    };
  };
  slaAlerts: {
    overdueCount: number;
    integrityStatus: string;
  };
}

export interface AuditVerificationResult {
  isValid: boolean;
  totalChecked: number;
  brokenBlockId?: number;
  details: string;
}

export interface EntitlementAssessment {
  status: 'Fully Granted' | 'Partially Granted (Statutory Carveout)' | 'Lawfully Blocked' | 'Conditional / Manual Review';
  entitled: boolean;
  legalJustification: string;
  statutoryReference: string;
  bankingScenarioNote: string;
  remediationActions: string[];
  requiresSuppression: boolean;
  isAbsoluteRight: boolean;
}

// ============================================================================
// PIA (Privacy Impact Assessment / DPIA) & 5-DIMENSION RIGHTS ALIGNMENT TYPES
// ============================================================================

export interface PiaSectionRiskScore {
  category: string;
  sectionCode: string;
  score: number;
  maxScore: number;
}

export interface PiaReportSignOff {
  role: string;
  endorserName: string;
  status: string;
  signedDate?: string;
}

export interface PiaReportMetadata {
  frontendServerId?: string; // e.g. "PIA-FE-2026-C3P2Q8W9"
  backendAuditId?: string; // e.g. "PIA-BE-UK-2026-000414"
  documentVersion?: string; // e.g. "v1.0"
  projectTitle?: string;
  organization?: string; // e.g. "People & Culture"
  industrySector?: string; // e.g. "Corporate & Enterprise Operations"
  assessmentStatus?: string; // e.g. "Approved"
  projectOwner?: string; // e.g. "David Kim"
  dpoName?: string; // e.g. "Amit Kumar Pandey (DPO)"
  quantitativeScore?: string; // e.g. "1.4 / 25.0"
  riskLevel?: string; // e.g. "Low Risk"
  governanceAction?: string; // e.g. "Accept with routine monitoring"
  impactLikelihoodDesc?: string; // e.g. "Impact (1.4) x Likelihood (1) = Base 1.4 | Applied Multipliers: x1"
  sectionScores?: PiaSectionRiskScore[];
  systemArchitectureDescription?: string;
  dataFlowDescription?: string;
  formalSignOffs?: PiaReportSignOff[];
}

export type SectorProfileKey = 'banking' | 'healthcare' | 'retail' | 'corporate' | 'logistics' | 'agtech' | 'pharma';

export interface PiaRecord {
  id: string;
  pia_id: string; // e.g. "PIA-2026-003"
  title: string;
  system_name: string;
  department: string;
  sector_profile?: SectorProfileKey | string;
  risk_tier: 'High' | 'Medium' | 'Low';
  dpo_status: 'Approved' | 'Requires Mitigation' | 'Under Review';
  lawful_basis: LawfulBasisType;
  purpose_description: string;
  data_categories: string; // JSON or comma-separated
  special_category_flags: string; // JSON or comma-separated
  cross_border_transfers: string;
  retention_years: number;
  report_metadata?: string | PiaReportMetadata;
  created_at: string;
  updated_at: string;
}

export interface PiaDataUsageAlignment {
  permittedOperations: string[];
  restrictedOperations: string[];
  article21ObjectionHandling: string;
  article22AutomatedDecisionHandling: string;
  purposeLimitationBoundaries: string;
  nextSteps: string[];
}

export interface PiaDataMovementAlignment {
  crossBorderTransferStatus: string;
  transferMechanisms: string[];
  internalPipelines: string[];
  thirdPartyRecipients: string[];
  article19DownstreamPropagationRequired: boolean;
  article20PortabilityFormat: string;
  nextSteps: string[];
}

export interface PiaDataStorageAlignment {
  retentionSchedule: string;
  statutoryBasis: string;
  storageTiers: Array<{
    tier: string;
    location: string;
    encryption: string;
    beyondUseApplicable: boolean;
  }>;
  cryptoShreddingProtocol: string;
  immutableBackupProcedure: string;
  nextSteps: string[];
}

export interface PiaDataNoticeAlignment {
  article13TransparencyLayer: string;
  article14IndirectCollectionNotice: string;
  mandatoryRefusalNoticeRules: string;
  justInTimeTriggers: string[];
  privacyPolicyRevisionTrigger: boolean;
  nextSteps: string[];
}

export interface PiaCookiesManagementAlignment {
  cmpCategoryMapping: Array<{
    category: string;
    count: number;
    purpose: string;
    requiresExplicitConsent: boolean;
  }>;
  googleConsentModeV2Sync: string;
  consentWithdrawalPropagation: string;
  sessionLifespans: string;
  article18FreezeBehavior: string;
  nextSteps: string[];
}

export interface PiaRightsAlignment {
  piaId: string;
  piaTitle: string;
  systemName: string;
  sectorProfile?: string;
  riskTier: 'High' | 'Medium' | 'Low';
  dpoStatus: string;
  lawfulBasis: LawfulBasisType;
  overallComplianceScore: number;
  highRiskTriggers: string[];
  dataUsage: PiaDataUsageAlignment;
  dataMovement: PiaDataMovementAlignment;
  dataStorage: PiaDataStorageAlignment;
  dataNotice: PiaDataNoticeAlignment;
  cookiesManagement: PiaCookiesManagementAlignment;
  executiveSummary: string;
  generatedAt: string;
}

export interface PiaIngestPayload {
  piaId: string;
  title: string;
  systemName: string;
  department: string;
  sectorProfile?: string;
  riskTier: 'High' | 'Medium' | 'Low';
  lawfulBasis: LawfulBasisType;
  purposeDescription: string;
  dataCategories: string[];
  specialCategoryFlags: string[];
  crossBorderTransfers?: string;
  retentionYears?: number;
}

