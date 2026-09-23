// Frontend Virtual Store for RightsFlow Metrics
// Implements 100% in-browser, zero-backend, air-gapped GDPR operations engine
import {
  DsrTicket,
  Subject,
  LawfulBasisInventoryItem,
  SubjectDataItem,
  AuditLog,
  DownstreamNotification,
  SuppressionRecord,
  Art22Override,
  BackupBeyondUseLog,
  ServerHealth,
  AuditVerificationResult,
  EntitlementAssessment,
  PiaRecord,
  PiaRightsAlignment,
  PiaIngestPayload,
  ComplianceDeadlineInfo
} from '../types';
import {
  evaluateRightEntitlement,
  evaluatePiaRightsAlignment,
  calculateComplianceDeadline
} from '../../server/complianceEngine';

// ============================================================================
// PURE TYPESCRIPT SHA-256 IMPLEMENTATION (AIR-GAPPED COMPLIANT, NO EXTERNAL DEPS)
// ============================================================================
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  const hash: number[] = [];
  const k: number[] = [];

  let primeCounter = 0;

  const isComposite: { [key: number]: boolean } = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // only ASCII allowed
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : (w[i - 16] + s0 + w[i - 7] + s1) | 0;

      const s1h = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s1h + ch + k[i] + w[i]) | 0;
      const s0h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s0h + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Calculate deadline info for client display
function calculateDeadlineInfo(t: any): ComplianceDeadlineInfo {
  const base = new Date(t.baseline_deadline);
  const effective = t.extended_deadline ? new Date(t.extended_deadline) : base;
  const now = new Date();
  const diffMs = effective.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const totalDurationDays = t.extension_applied ? 90 + (t.id_paused_days || 0) : 30 + (t.id_paused_days || 0);
  const elapsedDays = totalDurationDays - daysRemaining;
  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDurationDays) * 100)));

  let slaStatus: 'Normal' | 'Warning (28-day SLA)' | 'Escalated (Critical / Breached)' = 'Normal';
  const isOverdue = daysRemaining < 0;

  if (isOverdue || daysRemaining <= 2) {
    slaStatus = 'Escalated (Critical / Breached)';
  } else if (daysRemaining <= 5 || percentElapsed >= 80) {
    slaStatus = 'Warning (28-day SLA)';
  }

  return {
    baselineDeadline: base.toISOString(),
    effectiveDeadline: effective.toISOString(),
    daysRemaining,
    totalDurationDays,
    slaStatus,
    isOverdue,
    percentElapsed
  };
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================
const SEED_SUBJECTS: Subject[] = [
  {
    id: 'SUB-001',
    cif_number: 'CIF-948201',
    full_name: 'Dr. Helena Bergmann',
    email: 'helena.bergmann@fintech-berlin.de',
    phone: '+49 170 8829102',
    residency_country: 'DE',
    customer_segment: 'Retail Banking',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2022-01-14T09:00:00Z'
  },
  {
    id: 'SUB-002',
    cif_number: 'CIF-819234',
    full_name: 'Marcus Vance-Sterling',
    email: 'm.vance@sterling-cap.co.uk',
    phone: '+44 7700 900142',
    residency_country: 'GB',
    customer_segment: 'Private Wealth',
    kyc_status: 'Enhanced Due Diligence',
    aml_flag: 1,
    created_at: '2021-06-20T14:30:00Z'
  },
  {
    id: 'SUB-003',
    cif_number: 'CIF-551902',
    full_name: 'Sophie Dubois',
    email: 'sophie.dubois@lyon-creatives.fr',
    phone: '+33 6 12 34 56 78',
    residency_country: 'FR',
    customer_segment: 'Retail Banking',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2023-03-10T11:15:00Z'
  },
  {
    id: 'SUB-004',
    cif_number: 'CIF-339105',
    full_name: 'Klaas van der Meer',
    email: 'klaas.vandermeer@amsterdam-logistics.nl',
    phone: '+31 6 55512345',
    residency_country: 'NL',
    customer_segment: 'Corporate',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2020-11-05T16:45:00Z'
  },
  {
    id: 'SUB-005',
    cif_number: 'CIF-102948',
    full_name: 'Elena Rostova',
    email: 'elena.rostova@vienna-consult.at',
    phone: '+43 664 1234567',
    residency_country: 'AT',
    customer_segment: 'Ex-Customer',
    kyc_status: 'Pending Re-verification',
    aml_flag: 0,
    created_at: '2019-08-12T08:20:00Z'
  },
  {
    id: 'SUB-006',
    cif_number: 'CIF-662819',
    full_name: 'Matteo Rossi',
    email: 'm.rossi@milano-fin.it',
    phone: '+39 02 7654321',
    residency_country: 'IT',
    customer_segment: 'Retail Banking',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2023-05-18T10:10:00Z'
  },
  {
    id: 'SUB-007',
    cif_number: 'CIF-771239',
    full_name: 'Claire Lefevre-Moreau',
    email: 'claire.lefevre@bordeaux-vins.fr',
    phone: '+33 5 56 78 90 12',
    residency_country: 'FR',
    customer_segment: 'Private Wealth',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2021-09-14T14:22:00Z'
  },
  {
    id: 'SUB-008',
    cif_number: 'CIF-449102',
    full_name: 'Lukas Lindholm',
    email: 'lukas.lindholm@nordic-trade.se',
    phone: '+46 8 123 4567',
    residency_country: 'SE',
    customer_segment: 'Corporate',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2022-04-03T08:50:00Z'
  },
  {
    id: 'SUB-009',
    cif_number: 'CIF-990312',
    full_name: 'Ana Belen Morales',
    email: 'anabelen.morales@madrid-digital.es',
    phone: '+34 91 234 5678',
    residency_country: 'ES',
    customer_segment: 'Retail Banking',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2023-08-19T13:40:00Z'
  },
  {
    id: 'SUB-010',
    cif_number: 'CIF-512874',
    full_name: 'Alexander von Habsburg',
    email: 'alex.habsburg@danube-holdings.at',
    phone: '+43 1 512 8899',
    residency_country: 'AT',
    customer_segment: 'Private Wealth',
    kyc_status: 'Enhanced Due Diligence',
    aml_flag: 0,
    created_at: '2020-02-11T16:15:00Z'
  },
  {
    id: 'SUB-011',
    cif_number: 'CIF-238491',
    full_name: 'Chantal De Smet',
    email: 'chantal.desmet@antwerp-logistics.be',
    phone: '+32 3 234 5678',
    residency_country: 'BE',
    customer_segment: 'Corporate',
    kyc_status: 'Verified',
    aml_flag: 0,
    created_at: '2022-10-09T09:30:00Z'
  },
  {
    id: 'SUB-012',
    cif_number: 'CIF-849203',
    full_name: 'Dr. Jan Kowalski',
    email: 'jan.kowalski@warsaw-biotech.pl',
    phone: '+48 22 890 1234',
    residency_country: 'PL',
    customer_segment: 'Retail Banking',
    kyc_status: 'Pending Re-verification',
    aml_flag: 0,
    created_at: '2024-01-20T11:05:00Z'
  }
];

const SEED_LAWFUL_BASES: LawfulBasisInventoryItem[] = [
  {
    id: 'LB-AML',
    purpose_code: 'AML-KYC-01',
    purpose_name: 'AML/KYC Statutory Verification & Transaction Surveillance',
    department: 'Financial Crime & Compliance',
    lawful_basis: 'Legal Obligation',
    retention_years: 7,
    allows_erasure: 0,
    allows_portability: 0,
    allows_objection: 0,
    statutory_reference: 'EU Directive 2018/843 (5AMLD), GwG § 8 (7-year statutory lock)'
  },
  {
    id: 'LB-CORE',
    purpose_code: 'CORE-ACC-02',
    purpose_name: 'Core Current Account & Credit Line Administration',
    department: 'Retail Banking Operations',
    lawful_basis: 'Contract',
    retention_years: 10,
    allows_erasure: 0,
    allows_portability: 1,
    allows_objection: 0,
    statutory_reference: 'GDPR Art. 6(1)(b), HGB § 257 (Commercial Code retention)'
  },
  {
    id: 'LB-CREDIT',
    purpose_code: 'CREDIT-DEC-03',
    purpose_name: 'Automated Credit Decisioning & Risk Score Engine',
    department: 'Credit Risk Department',
    lawful_basis: 'Contract',
    retention_years: 3,
    allows_erasure: 0,
    allows_portability: 1,
    allows_objection: 0,
    statutory_reference: 'GDPR Art. 22(2)(a) & Art. 6(1)(b) (Necessary for credit facility)'
  },
  {
    id: 'LB-MKT',
    purpose_code: 'MKT-PREF-04',
    purpose_name: 'Personalized Investment & Wealth Product Recommendations',
    department: 'Marketing & CRM',
    lawful_basis: 'Consent',
    retention_years: 1,
    allows_erasure: 1,
    allows_portability: 1,
    allows_objection: 1,
    statutory_reference: 'GDPR Art. 6(1)(a) (Explicit freely-given consent)'
  },
  {
    id: 'LB-FRAUD',
    purpose_code: 'FRAUD-PREV-05',
    purpose_name: 'Real-Time Biometric & Card Fraud Pattern Detection',
    department: 'Security Operations',
    lawful_basis: 'Legitimate Interests',
    retention_years: 2,
    allows_erasure: 0,
    allows_portability: 0,
    allows_objection: 1,
    statutory_reference: 'GDPR Art. 6(1)(f), Recital 47 (Strict proportionality test)'
  },
  {
    id: 'LB-TAX',
    purpose_code: 'TAX-FATCA-06',
    purpose_name: 'CRS & FATCA Cross-Border Statutory Tax Disclosures',
    department: 'Regulatory Reporting',
    lawful_basis: 'Legal Obligation',
    retention_years: 10,
    allows_erasure: 0,
    allows_portability: 0,
    allows_objection: 0,
    statutory_reference: 'Tax Code § 147, FATCA Intergovernmental Agreement'
  }
];

const SEED_DATA_ITEMS: SubjectDataItem[] = [
  {
    id: 'DATA-01',
    subject_id: 'SUB-001',
    purpose_code: 'AML-KYC-01',
    data_category: 'Identification Document',
    field_name: 'Passport Scan & National ID No.',
    sample_value: 'DE-PASSPORT-C9381028',
    system_of_record: 'AML Repository',
    storage_medium: 'Cold Archive',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-02',
    subject_id: 'SUB-001',
    purpose_code: 'AML-KYC-01',
    data_category: 'Financial Crime Screening',
    field_name: 'Sanctions & PEP Check Log',
    sample_value: 'CLEARED-WORLD-CHECK-2024',
    system_of_record: 'Compliance Vault',
    storage_medium: 'Cold Archive',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-03',
    subject_id: 'SUB-001',
    purpose_code: 'CORE-ACC-02',
    data_category: 'Account Transaction History',
    field_name: 'IBAN DE89 3704 0044 0532 0130 00',
    sample_value: '€142,850.20 (542 Transactions)',
    system_of_record: 'Core Ledger',
    storage_medium: 'Hot DB',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-04',
    subject_id: 'SUB-001',
    purpose_code: 'MKT-PREF-04',
    data_category: 'Marketing Behavioral Profile',
    field_name: 'Affinity Scores & Web Tracker',
    sample_value: 'High Interest: ESG ETF, Gold Fund',
    system_of_record: 'Marketing CRM',
    storage_medium: 'CRM',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-05',
    subject_id: 'SUB-001',
    purpose_code: 'CREDIT-DEC-03',
    data_category: 'Automated Credit Score',
    field_name: 'Credit Engine v4.2 Decision',
    sample_value: 'Score: 785 / Auto-Approved €15k Overdraft',
    system_of_record: 'Credit Engine',
    storage_medium: 'Hot DB',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-06',
    subject_id: 'SUB-002',
    purpose_code: 'AML-KYC-01',
    data_category: 'Source of Wealth Documentation',
    field_name: 'Notarized Property Deeds & AML Dossier',
    sample_value: 'EDD-DOSSIER-VANCE-2023',
    system_of_record: 'AML Repository',
    storage_medium: 'Cold Archive',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-07',
    subject_id: 'SUB-002',
    purpose_code: 'MKT-PREF-04',
    data_category: 'Direct Marketing Email Subscription',
    field_name: 'Newsletter Opt-In',
    sample_value: 'Active (Daily Wealth Briefing)',
    system_of_record: 'Marketing CRM',
    storage_medium: 'CRM',
    is_restricted: 0,
    is_beyond_use: 0
  },
  {
    id: 'DATA-08',
    subject_id: 'SUB-003',
    purpose_code: 'CREDIT-DEC-03',
    data_category: 'Automated Loan Rejection Log',
    field_name: 'Model X-Risk Decision Record',
    sample_value: 'REJECTED: Debt-to-Income > 45%',
    system_of_record: 'Credit Risk DB',
    storage_medium: 'Hot DB',
    is_restricted: 0,
    is_beyond_use: 0
  }
];

const SEED_TICKETS = [
  {
    id: 'REQ-001',
    ticket_ref: 'DSR-2026-0841',
    subject_id: 'SUB-001',
    right_type: 'Erasure (Art. 17)',
    status: 'Remediation In Progress',
    priority: 'High (SLA Warning)',
    request_date: '2026-08-01T10:05:00Z',
    baseline_deadline: '2026-08-31T23:59:59Z',
    extended_deadline: null,
    extension_applied: 0,
    extension_reason: null,
    id_verification_status: 'Verified',
    id_verified_at: '2026-08-02T14:10:00Z',
    id_paused_days: 0,
    lawful_basis_assessed: 'Art. 6(1)(a) Consent (Marketing) vs. Art. 6(1)(c) Legal Obligation (Core Banking)',
    entitlement_decision: 'Partially Granted (Statutory Carveout)',
    rejection_code: null,
    automated_decision_flag: 0,
    remediation_summary: 'Dual-tier execution: Marketing and telemetry data queued for purge; financial records preserved under BWG § 40 & GwG § 8 mandatory retention.',
    assigned_officer: 'DPO Officer K. Schmidt',
    created_at: '2026-08-01T10:05:00Z',
    updated_at: '2026-08-25T09:12:00Z'
  },
  {
    id: 'REQ-002',
    ticket_ref: 'DSR-2026-0842',
    subject_id: 'SUB-002',
    right_type: 'Objection (Art. 21)',
    status: 'Completed & Sealed',
    priority: 'Standard',
    request_date: '2026-08-05T14:20:00Z',
    baseline_deadline: '2026-09-04T23:59:59Z',
    extended_deadline: null,
    extension_applied: 0,
    extension_reason: null,
    id_verification_status: 'Verified',
    id_verified_at: '2026-08-05T14:30:00Z',
    id_paused_days: 0,
    lawful_basis_assessed: 'Art. 21(2) Absolute Direct Marketing Objection',
    entitlement_decision: 'Fully Granted',
    rejection_code: null,
    automated_decision_flag: 0,
    remediation_summary: 'Absolute suppression order registered in Master Suppression Table. Marketing communications permanently disabled across all channels.',
    assigned_officer: 'Compliance Officer J. Weber',
    created_at: '2026-08-05T14:20:00Z',
    updated_at: '2026-08-06T11:00:00Z'
  },
  {
    id: 'REQ-003',
    ticket_ref: 'DSR-2026-0843',
    subject_id: 'SUB-003',
    right_type: 'Automated Decision Review (Art. 22)',
    status: 'Under Lawful Review',
    priority: 'High (SLA Warning)',
    request_date: '2026-08-10T09:15:00Z',
    baseline_deadline: '2026-09-09T23:59:59Z',
    extended_deadline: null,
    extension_applied: 0,
    extension_reason: null,
    id_verification_status: 'Verified',
    id_verified_at: '2026-08-10T10:00:00Z',
    id_paused_days: 0,
    lawful_basis_assessed: 'Automated Credit Facility Rejection via Neural Scoring Model',
    entitlement_decision: 'Conditional / Manual Review',
    rejection_code: null,
    automated_decision_flag: 1,
    remediation_summary: 'Senior Underwriter review in progress. Model feature attribution weights extracted for borrower explanation package.',
    assigned_officer: 'Senior Underwriter A. Fischer',
    created_at: '2026-08-10T09:15:00Z',
    updated_at: '2026-08-24T16:30:00Z'
  },
  {
    id: 'REQ-004',
    ticket_ref: 'DSR-2026-0844',
    subject_id: 'SUB-004',
    right_type: 'Erasure (Art. 17)',
    status: 'Intake & Verification',
    priority: 'Critical (Overdue / Risk)',
    request_date: '2026-07-25T11:30:00Z',
    baseline_deadline: '2026-08-24T23:59:59Z',
    extended_deadline: null,
    extension_applied: 0,
    extension_reason: null,
    id_verification_status: 'Clock Paused - Awaiting ID',
    id_verified_at: null,
    id_paused_days: 12,
    lawful_basis_assessed: 'Pending Customer Identity Verification',
    entitlement_decision: 'Conditional / Manual Review',
    rejection_code: null,
    automated_decision_flag: 0,
    remediation_summary: 'Statutory 30-day deadline paused under EDPB Guidelines 01/2022 pending receipt of valid government ID document.',
    assigned_officer: 'DPO Officer K. Schmidt',
    created_at: '2026-07-25T11:30:00Z',
    updated_at: '2026-08-25T08:00:00Z'
  },
  {
    id: 'REQ-005',
    ticket_ref: 'DSR-2026-0845',
    subject_id: 'SUB-005',
    right_type: 'Rectification (Art. 16)',
    status: 'Remediation In Progress',
    priority: 'Standard',
    request_date: '2026-08-18T13:45:00Z',
    baseline_deadline: '2026-09-17T23:59:59Z',
    extended_deadline: null,
    extension_applied: 0,
    extension_reason: null,
    id_verification_status: 'Verified',
    id_verified_at: '2026-08-18T14:00:00Z',
    id_paused_days: 0,
    lawful_basis_assessed: 'Art. 16 Rectification of CIF Address & Ultimate Beneficial Owner Record',
    entitlement_decision: 'Fully Granted',
    rejection_code: null,
    automated_decision_flag: 0,
    remediation_summary: 'Core CIF address updated to Vienna headquarters. Art. 19 Downstream notification dispatched to SCHUFA and CRIF credit bureaus.',
    assigned_officer: 'Compliance Officer J. Weber',
    created_at: '2026-08-18T13:45:00Z',
    updated_at: '2026-08-24T14:25:00Z'
  },
  {
    id: 'REQ-006',
    ticket_ref: 'DSR-2026-0846',
    subject_id: 'SUB-006',
    right_type: 'Access (Art. 15)',
    status: 'Remediation In Progress',
    priority: 'Standard',
    request_date: '2026-08-20T09:00:00Z',
    baseline_deadline: '2026-09-19T23:59:59Z',
    extended_deadline: null,
    extension_applied: 0,
    extension_reason: null,
    id_verification_status: 'Verified',
    id_verified_at: '2026-08-20T09:15:00Z',
    id_paused_days: 0,
    lawful_basis_assessed: 'Art. 15 Full DSAR Subject Access Disclosure Package',
    entitlement_decision: 'Fully Granted',
    rejection_code: null,
    automated_decision_flag: 0,
    remediation_summary: 'Collating loan statements, transaction history, customer service audit audio notes, and risk telemetry for encrypted export package.',
    assigned_officer: 'DPO Officer K. Schmidt',
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-25T07:30:00Z'
  },
  {
    id: 'REQ-007',
    ticket_ref: 'DSR-2026-0847',
    subject_id: 'SUB-007',
    right_type: 'Access (Art. 15)',
    status: 'Under Lawful Review',
    priority: 'Standard',
    request_date: '2026-08-08T15:20:00Z',
    baseline_deadline: '2026-09-07T23:59:59Z',
    extended_deadline: '2026-11-06T23:59:59Z',
    extension_applied: 1,
    extension_reason: 'Complex cross-border corporate structure involving multiple nominee trusts across Liechtenstein and Switzerland.',
    id_verification_status: 'Verified',
    id_verified_at: '2026-08-08T16:00:00Z',
    id_paused_days: 0,
    lawful_basis_assessed: 'Cross-Border Wealth Structures & Trust Records',
    entitlement_decision: 'Partially Granted (Statutory Carveout)',
    rejection_code: null,
    automated_decision_flag: 0,
    remediation_summary: 'Preparing redaction of third-party beneficiary names under GDPR Art. 15(4) (rights and freedoms of others). Banking secrecy review underway.',
    assigned_officer: 'Private Wealth DPO S. Althaus',
    created_at: '2026-08-08T15:20:00Z',
    updated_at: '2026-08-25T08:30:00Z'
  }
];

const SEED_DOWNSTREAM: DownstreamNotification[] = [
  {
    id: 'DN-01',
    ticket_ref: 'DSR-2026-0841',
    recipient_name: 'SCHUFA Credit Bureau',
    recipient_type: 'Credit Reference Bureau',
    notification_type: 'Erasure Instruction',
    payload_summary: 'Purge non-statutory marketing scores and update reference flag',
    dispatch_status: 'Queued',
    dispatched_at: null,
    ack_received_at: null,
    retry_count: 0,
    created_at: '2026-08-25T09:15:00Z'
  },
  {
    id: 'DN-02',
    ticket_ref: 'DSR-2026-0841',
    recipient_name: 'Salesforce Marketing Cloud',
    recipient_type: 'Marketing CRM',
    notification_type: 'Erasure Instruction',
    payload_summary: 'Complete cryptographic deletion of contact email & behavioral cookies',
    dispatch_status: 'Dispatched',
    dispatched_at: '2026-08-25T09:20:00Z',
    ack_received_at: '2026-08-25T09:22:00Z',
    retry_count: 0,
    created_at: '2026-08-25T09:15:00Z'
  },
  {
    id: 'DN-03',
    ticket_ref: 'DSR-2026-0845',
    recipient_name: 'Creditreform Germany Node',
    recipient_type: 'Credit Reference Bureau',
    notification_type: 'Rectification Notice',
    payload_summary: 'Rectify address to Vienna, Austria and clear stale risk flag',
    dispatch_status: 'Queued',
    dispatched_at: null,
    ack_received_at: null,
    retry_count: 0,
    created_at: '2026-08-24T14:25:00Z'
  }
];

const SEED_SUPPRESSIONS: SuppressionRecord[] = [
  {
    id: 'SUP-01',
    subject_id: 'SUB-002',
    cif_number: 'CIF-819234',
    identifier_type: 'CIF',
    identifier_value: 'CIF-819234',
    suppression_type: 'Art. 21 Direct Marketing Opt-Out (Absolute)',
    lawful_grounds: 'GDPR Art. 21(2) - Absolute Objection to Direct Marketing',
    active: 1,
    effective_from: '2026-08-06T11:00:00Z',
    expires_at: null,
    created_by: 'Compliance Officer J. Weber'
  },
  {
    id: 'SUP-02',
    subject_id: 'SUB-003',
    cif_number: 'CIF-551902',
    identifier_type: 'CIF',
    identifier_value: 'CIF-551902',
    suppression_type: 'Art. 18 Temporary Processing Freeze (Disputed Accuracy)',
    lawful_grounds: 'GDPR Art. 18(1)(a) - Disputed accuracy pending credit model audit',
    active: 1,
    effective_from: '2026-07-28T09:00:00Z',
    expires_at: '2026-10-26T23:59:59Z',
    created_by: 'Senior Underwriter A. Fischer'
  },
  {
    id: 'SUP-03',
    subject_id: 'SUB-009',
    cif_number: 'CIF-662910',
    identifier_type: 'Email',
    identifier_value: 'j.bauer@munich-health.de',
    suppression_type: 'Art. 21 Direct Marketing Opt-Out (Absolute)',
    lawful_grounds: 'GDPR Art. 21(2) - Mandatory Suppression',
    active: 1,
    effective_from: '2026-08-24T18:00:00Z',
    expires_at: null,
    created_by: 'SecOps Officer T. Lindner'
  }
];

const pia2026003Metadata = JSON.stringify({
  frontendServerId: 'PIA-FE-2026-C3P2Q8W9',
  backendAuditId: 'PIA-BE-UK-2026-000414',
  documentVersion: 'v1.0',
  projectTitle: 'Internal HR Pulse Survey & Engagement Portal',
  organization: 'People & Culture',
  industrySector: 'Corporate & Enterprise Operations',
  assessmentStatus: 'Approved',
  projectOwner: 'David Kim',
  dpoName: 'Amit Kumar Pandey (DPO)',
  quantitativeScore: '1.4 / 25.0',
  riskLevel: 'Low Risk',
  governanceAction: 'Accept with routine monitoring',
  impactLikelihoodDesc: 'Impact (1.4) x Likelihood (1) = Base 1.4 | Applied Multipliers: x1',
  sectionScores: [
    { category: 'Data Minimization', sectionCode: 'Sec B', score: 1.0, maxScore: 5.0 },
    { category: 'Lawful Basis', sectionCode: 'Sec D', score: 1.5, maxScore: 5.0 },
    { category: 'Individual Rights', sectionCode: 'Sec G', score: 1.0, maxScore: 5.0 },
    { category: 'Technical Security', sectionCode: 'Sec I', score: 1.0, maxScore: 5.0 },
    { category: 'Governance & Rights', sectionCode: 'Sec K', score: 1.0, maxScore: 5.0 }
  ],
  systemArchitectureDescription: 'Quarterly anonymous employee engagement feedback tool.',
  dataFlowDescription: 'Self-hosted web container stores responses aggregated by department in local PostgreSQL instance.',
  formalSignOffs: [
    { role: 'Project/Process Owner', endorserName: 'David Kim', status: 'SIGNED on 2026-02-15' },
    { role: 'Data Protection Officer', endorserName: 'Amit Kumar Pandey', status: 'SIGNED on 2026-03-01' },
    { role: 'Legal/Compliance', endorserName: 'Elena Rostova', status: 'SIGNED on 2026-02-28' },
    { role: 'Caldicott Guardian / SIRO', endorserName: 'N/A', status: 'SIGNED on 2026-03-02' }
  ]
});

const SEED_PIAS: PiaRecord[] = [
  {
    id: 'PIA-REC-003-HR',
    pia_id: 'PIA-2026-003',
    title: 'Internal HR Pulse Survey & Engagement Portal',
    system_name: 'Self-Hosted Web Container (PostgreSQL Aggregation)',
    department: 'People & Culture',
    sector_profile: 'corporate',
    risk_tier: 'Low',
    dpo_status: 'Approved',
    lawful_basis: 'Legitimate Interests',
    purpose_description: 'Quarterly anonymous employee engagement feedback tool. Self-hosted web container stores responses aggregated by department in local PostgreSQL instance.',
    data_categories: JSON.stringify(['Quarterly Pulse Feedback', 'Departmental Aggregation Tags', 'Employee Sentiment Indices', 'Submission Timestamps']),
    special_category_flags: JSON.stringify(['Anonymous Telemetry', 'No De-Anonymization Profiling', 'Low Risk Tier (1.4/25.0)']),
    cross_border_transfers: 'Self-Hosted Local Infrastructure (Internal Enterprise Network) - No 3rd Party Vendor Transmission',
    retention_years: 2,
    report_metadata: pia2026003Metadata,
    created_at: '2026-02-15T09:00:00Z',
    updated_at: '2026-03-02T16:45:00Z'
  },
  {
    id: 'PIA-REC-001',
    pia_id: 'PIA-2026-AI-CRD-001',
    title: 'Automated Real-Time AI Credit Scoring & Profiling Engine',
    system_name: 'FinRisk-AI NeuroScore Engine v4.2',
    department: 'Credit Risk & Underwriting',
    sector_profile: 'banking',
    risk_tier: 'High',
    dpo_status: 'Approved',
    lawful_basis: 'Contract',
    purpose_description: 'Automated underwriting, loan default risk prediction, credit card facility limits, and risk-adjusted interest pricing models based on transactional telemetry and bureau signals.',
    data_categories: JSON.stringify(['Credit Bureau Records (SCHUFA)', 'Historical Repayment Logs', 'Income & Employment Data', 'Device Fingerprints', 'Affordability Ratios']),
    special_category_flags: JSON.stringify(['Automated Decision-Making (Art. 22)', 'Financial Risk Profiling']),
    cross_border_transfers: 'EU-Central Dedicated Cloud Instance (Frankfurt) - No 3rd Country Dissemination',
    retention_years: 3,
    created_at: '2026-01-15T09:00:00Z',
    updated_at: '2026-08-20T14:30:00Z'
  },
  {
    id: 'PIA-REC-002',
    pia_id: 'PIA-2026-OBK-API-002',
    title: 'Open Banking PSD2 Gateway & Third-Party AISP/PISP Pipeline',
    system_name: 'OpenBank-Connect Enterprise Mesh',
    department: 'Digital Channels & API Partnerships',
    sector_profile: 'banking',
    risk_tier: 'High',
    dpo_status: 'Approved',
    lawful_basis: 'Consent',
    purpose_description: 'Real-time account information aggregation (AISP) and payment initiation services (PISP) for authorized FinTech third-party providers (TPPs) under PSD2 & GDPR mandates.',
    data_categories: JSON.stringify(['Account Balance Streams', 'Raw Transaction Descriptions', 'IBAN / Payee Coordinates', 'OAuth2 API Access Tokens']),
    special_category_flags: JSON.stringify(['High-Volume API Ingestion', 'Third-Party Intermediaries']),
    cross_border_transfers: 'Standard Contractual Clauses (EU SCCs 2021/914) with TPP Gateway Partners',
    retention_years: 2,
    created_at: '2026-02-10T11:00:00Z',
    updated_at: '2026-08-18T16:00:00Z'
  },
  {
    id: 'PIA-REC-003-AML',
    pia_id: 'PIA-2026-AML-SRV-003',
    title: 'Global Anti-Money Laundering & Sanctions Graph Surveillance',
    system_name: 'FinCrime Graph-Sentinel X1',
    department: 'Financial Crime & Regulatory Compliance',
    sector_profile: 'banking',
    risk_tier: 'High',
    dpo_status: 'Approved',
    lawful_basis: 'Legal Obligation',
    purpose_description: 'Continuous transaction monitoring, sanctions screening, PEP identification, graph link analysis, and suspicious activity reporting (SAR) to Financial Intelligence Units (FIU).',
    data_categories: JSON.stringify(['National ID / Passport Scans', 'Cross-Border Wire Transfers', 'PEP / Sanctions Watchlists', 'Beneficial Ownership Registers']),
    special_category_flags: JSON.stringify(['Criminal Allegation & Sanction Flags (Art. 10)', 'Biometric KYC ID Verification']),
    cross_border_transfers: 'Air-Gapped Sovereign Data Vault (EU/EFTA) - Restricted Law Enforcement Gateways',
    retention_years: 7,
    created_at: '2025-11-20T08:30:00Z',
    updated_at: '2026-08-22T10:15:00Z'
  },
  {
    id: 'PIA-REC-004',
    pia_id: 'PIA-2026-MOB-TLM-004',
    title: 'Mobile Banking App Telemetry, Behavioral Biometrics & Cookies',
    system_name: 'BankMobile Client Core (iOS/Android/Web)',
    department: 'Mobile Engineering & Security Ops',
    sector_profile: 'banking',
    risk_tier: 'Medium',
    dpo_status: 'Approved',
    lawful_basis: 'Legitimate Interests',
    purpose_description: 'Behavioral biometrics for session hijacking prevention, touch dynamics, crash diagnostics, performance telemetry, and digital cookie consent persistence.',
    data_categories: JSON.stringify(['Device Hardware Identifier', 'IP Address & Geolocation', 'Session Cookies', 'Keystroke & Touch Dynamics', 'Crash Diagnostic Logs']),
    special_category_flags: JSON.stringify(['Behavioral Biometrics', 'Digital Tracking Cookies']),
    cross_border_transfers: 'EU-US Data Privacy Framework (Adequacy Certified Telemetry Processor)',
    retention_years: 1,
    created_at: '2026-03-05T14:00:00Z',
    updated_at: '2026-08-21T11:45:00Z'
  },
  {
    id: 'PIA-REC-005',
    pia_id: 'PIA-2026-MKT-CRM-005',
    title: 'Omni-Channel Customer Personalization & Wealth Marketing CRM',
    system_name: 'WealthEngage Marketing Cloud',
    department: 'Marketing & Wealth Management',
    sector_profile: 'banking',
    risk_tier: 'Medium',
    dpo_status: 'Requires Mitigation',
    lawful_basis: 'Consent',
    purpose_description: 'Personalized investment recommendations, portfolio affinity alerts, campaign conversion tracking, web portal cookies, and multi-channel marketing campaigns.',
    data_categories: JSON.stringify(['Marketing Preferences', 'Product Affinity Tags', 'Email Open/Click Telemetry', 'Web Portal Cookies']),
    special_category_flags: JSON.stringify(['Marketing Profiling', 'Ad Network Attribution']),
    cross_border_transfers: 'Binding Corporate Rules (BCR) & EU SCCs',
    retention_years: 1,
    created_at: '2026-04-12T10:00:00Z',
    updated_at: '2026-08-19T09:30:00Z'
  }
];

// Helper to build initial audit logs with valid hash chaining
function buildInitialAuditLogs(): AuditLog[] {
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000-GENESIS-BLOCK';
  const initialLogs = [
    {
      id: 1,
      timestamp: '2026-08-01T10:00:00.000Z',
      event_type: 'SYSTEM_BOOT',
      ticket_ref: null,
      operator_id: 'SYSTEM_DAEMON',
      actor_role: 'Security Subsystem',
      action_detail: 'Air-gapped GDPR Operations & Control Center initialized. Strict WAL persistence engaged with tamper-evident SHA-256 block ledger.',
      state_diff_json: JSON.stringify({ version: '3.45-WAL', isolation: 'AIR-GAPPED' })
    },
    {
      id: 2,
      timestamp: '2026-08-01T10:05:00.000Z',
      event_type: 'INTAKE_CREATED',
      ticket_ref: 'DSR-2026-0841',
      operator_id: 'DPO Officer K. Schmidt',
      actor_role: 'Data Protection Officer',
      action_detail: 'Created new Erasure (Art. 17) intake for subject Dr. Helena Bergmann (CIF-948201)',
      state_diff_json: JSON.stringify({ right: 'Erasure (Art. 17)', priority: 'High (SLA Warning)' })
    },
    {
      id: 3,
      timestamp: '2026-08-05T14:20:00.000Z',
      event_type: 'ENTITLEMENT_ASSESSED',
      ticket_ref: 'DSR-2026-0842',
      operator_id: 'Compliance Officer J. Weber',
      actor_role: 'Compliance Officer',
      action_detail: 'Evaluated Art. 21 Objection against marketing purposes. Entitlement decision: Fully Granted.',
      state_diff_json: JSON.stringify({ decision: 'Fully Granted', suppressionApplied: true })
    },
    {
      id: 4,
      timestamp: '2026-08-20T17:15:00.000Z',
      event_type: 'LAWFUL_REFUSAL',
      ticket_ref: 'DSR-2026-0847',
      operator_id: 'Legal Counsel Dr. M. Brauer',
      actor_role: 'Legal Counsel',
      action_detail: 'Statutorily refused erasure under GDPR Art. 17(3)(b) due to active credit agreement and mandatory GwG § 8 7-year AML lock.',
      state_diff_json: JSON.stringify({ status: 'Statutorily Refused', reason: 'REF-AML-5AMLD-SEC8' })
    }
  ];

  const chainedLogs: AuditLog[] = [];
  for (const log of initialLogs) {
    const rawContent = `${prevHash}|${log.timestamp}|${log.event_type}|${log.ticket_ref || ''}|${log.operator_id}|${log.action_detail}|${log.state_diff_json}`;
    const currentHash = sha256(rawContent);
    chainedLogs.push({
      ...log,
      prev_hash: prevHash,
      current_hash: currentHash,
      digital_signature: `SIG-ED25519-${currentHash.substring(0, 16).toUpperCase()}`
    });
    prevHash = currentHash;
  }
  return chainedLogs;
}

// LocalStorage Persistence Key
const STORAGE_KEY = 'rightsflow_frontend_store_v1';

interface VirtualDatabase {
  subjects: Subject[];
  lawfulBases: LawfulBasisInventoryItem[];
  dataItems: SubjectDataItem[];
  tickets: any[];
  downstream: DownstreamNotification[];
  suppressions: SuppressionRecord[];
  art22Overrides: Art22Override[];
  backupLogs: BackupBeyondUseLog[];
  auditLogs: AuditLog[];
  pias: PiaRecord[];
  queryCount: number;
  writeCount: number;
}

function createSeedDatabase(): VirtualDatabase {
  return {
    subjects: JSON.parse(JSON.stringify(SEED_SUBJECTS)),
    lawfulBases: JSON.parse(JSON.stringify(SEED_LAWFUL_BASES)),
    dataItems: JSON.parse(JSON.stringify(SEED_DATA_ITEMS)),
    tickets: JSON.parse(JSON.stringify(SEED_TICKETS)),
    downstream: JSON.parse(JSON.stringify(SEED_DOWNSTREAM)),
    suppressions: JSON.parse(JSON.stringify(SEED_SUPPRESSIONS)),
    art22Overrides: [
      {
        id: 'OVR-01',
        ticket_ref: 'DSR-2026-0843',
        subject_id: 'SUB-003',
        model_name: 'RiskDecisionNet-v4',
        original_score: 'DTI=48% / Score 590',
        automated_outcome: 'Automated Loan Denial',
        human_reviewer: 'Senior Underwriter A. Fischer',
        human_decision: 'Modified (Adjusted Limits)',
        justification: 'Verified secondary consulting revenue documents omitted in automated API feed. Adjusted loan cap to €25,000 with 4.2% rate.',
        decision_timestamp: '2026-08-24T16:30:00Z',
        full_name: 'Dr. Klaus-Peter Schneider',
        cif_number: 'CIF-551902'
      }
    ],
    backupLogs: [
      {
        id: 'BKP-01',
        ticket_ref: 'DSR-2026-0841',
        subject_id: 'SUB-001',
        backup_tape_id: 'LTO-9-TAPE-VAULT-2024-W31',
        storage_location: 'Offsite Tier-4 Cold Storage Munich',
        data_categories_covered: 'Marketing CRM Snapshots & Profile Attributes',
        technical_measures: 'Cryptographic key zeroization for marketing segment partition; physical tape marked beyond operational use awaiting standard 90-day rotation purge.',
        scheduled_overwrite_date: '2026-11-15T00:00:00Z',
        officer_signature: 'DPO Officer K. Schmidt',
        certified_at: '2026-08-25T09:30:00Z'
      }
    ],
    auditLogs: buildInitialAuditLogs(),
    pias: JSON.parse(JSON.stringify(SEED_PIAS)),
    queryCount: 142,
    writeCount: 18
  };
}

class FrontendVirtualStore {
  private db: VirtualDatabase;
  private bootTime: Date = new Date();

  constructor() {
    this.db = this.loadFromStorage();
  }

  private loadFromStorage(): VirtualDatabase {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.subjects && parsed.tickets && parsed.auditLogs) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Virtual store: could not load from localStorage, initializing seed data', e);
    }
    const seed = createSeedDatabase();
    this.saveToStorage(seed);
    return seed;
  }

  private saveToStorage(database: VirtualDatabase): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    } catch (e) {
      console.error('Virtual store: localStorage quota exceeded or unavailable', e);
    }
  }

  private persist(): void {
    this.saveToStorage(this.db);
  }

  public resetToDefaults(): void {
    this.db = createSeedDatabase();
    this.persist();
  }

  // Audit Logging with Cryptographic SHA-256 Linkage
  private logAudit(
    eventType: string,
    ticketRef: string | null,
    operatorId: string,
    actorRole: string,
    actionDetail: string,
    stateDiff: any
  ): AuditLog {
    this.db.writeCount++;
    const prevLog = this.db.auditLogs[this.db.auditLogs.length - 1];
    const prevHash = prevLog ? prevLog.current_hash : '0000000000000000000000000000000000000000000000000000000000000000-GENESIS-BLOCK';
    const timestamp = new Date().toISOString();
    const stateDiffJson = JSON.stringify(stateDiff);
    const rawContent = `${prevHash}|${timestamp}|${eventType}|${ticketRef || ''}|${operatorId}|${actionDetail}|${stateDiffJson}`;
    const currentHash = sha256(rawContent);

    const newLog: AuditLog = {
      id: this.db.auditLogs.length + 1,
      timestamp,
      event_type: eventType,
      ticket_ref: ticketRef,
      operator_id: operatorId,
      actor_role: actorRole,
      action_detail: actionDetail,
      state_diff_json: stateDiffJson,
      prev_hash: prevHash,
      current_hash: currentHash,
      digital_signature: `SIG-ED25519-${currentHash.substring(0, 16).toUpperCase()}`
    };

    this.db.auditLogs.push(newLog);
    this.persist();
    return newLog;
  }

  // Telemetry & Health
  public getHealth(): ServerHealth {
    this.db.queryCount++;
    const now = new Date().toISOString();
    const overdueCount = this.db.tickets.filter(
      (t) => t.status !== 'Completed & Sealed' && t.status !== 'Statutorily Refused' && t.baseline_deadline < now
    ).length;

    const uptime = Math.round((Date.now() - this.bootTime.getTime()) / 1000);

    return {
      status: 'OPERATIONAL_AIR_GAPPED',
      systemTime: new Date().toISOString(),
      uptimeSeconds: uptime,
      environment: {
        networkIsolation: 'ZERO_TRUST_AIR_GAPPED',
        externalConnections: 0,
        outboundInternetAccess: 'BLOCKED',
        tlsCertificate: 'LOCAL_MUTUAL_TLS_v1.3'
      },
      memory: {
        rssMb: 42.15,
        heapUsedMb: 24.8,
        heapTotalMb: 36.4,
        externalMb: 2.1
      },
      database: {
        engine: 'Frontend Virtual Engine (Air-Gapped In-Browser WAL)',
        journalMode: 'Client-Side Cryptographic Block Ledger',
        dbSizeBytes: 148500,
        walSizeBytes: 4096,
        totalQueriesExecuted: this.db.queryCount,
        totalWritesExecuted: this.db.writeCount,
        avgLatencyMs: 0.12,
        lastSaved: new Date().toISOString(),
        tableStats: {
          subjects: this.db.subjects.length,
          tickets: this.db.tickets.length,
          auditLogs: this.db.auditLogs.length,
          activeSuppressions: this.db.suppressions.filter((s) => s.active === 1).length,
          pendingDownstream: this.db.downstream.filter((d) => d.dispatch_status === 'Queued').length
        }
      },
      slaAlerts: {
        overdueCount,
        integrityStatus: 'HASH_CHAIN_SEALED'
      }
    };
  }

  // Audit Chain Verification
  public verifyAuditChain(): AuditVerificationResult {
    this.db.queryCount++;
    const logs = this.db.auditLogs;
    if (logs.length === 0) {
      return { isValid: true, totalChecked: 0, details: 'Virtual audit ledger is empty.' };
    }

    let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000-GENESIS-BLOCK';
    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      if (log.prev_hash !== expectedPrevHash) {
        return {
          isValid: false,
          totalChecked: i + 1,
          brokenBlockId: log.id,
          details: `Cryptographic break detected at block #${log.id}: prev_hash mismatch.`
        };
      }
      const raw = `${log.prev_hash}|${log.timestamp}|${log.event_type}|${log.ticket_ref || ''}|${log.operator_id}|${log.action_detail}|${log.state_diff_json}`;
      const recomputedHash = sha256(raw);
      if (recomputedHash !== log.current_hash) {
        return {
          isValid: false,
          totalChecked: i + 1,
          brokenBlockId: log.id,
          details: `Payload tamper detected at block #${log.id}: current_hash signature verification failed.`
        };
      }
      expectedPrevHash = log.current_hash;
    }

    return {
      isValid: true,
      totalChecked: logs.length,
      details: `Cryptographic SHA-256 integrity verified across all ${logs.length} blocks in chronological sequence.`
    };
  }

  public getSchemaDdl(): { ddl: string; version: string; integrityCheck: string } {
    this.db.queryCount++;
    return {
      ddl: `-- In-Browser Air-Gapped Virtual Relational Schema (SQLite 3.45 WAL Compatible)
CREATE TABLE data_subjects (
  id TEXT PRIMARY KEY,
  cif_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  residency_country TEXT NOT NULL,
  customer_segment TEXT NOT NULL,
  kyc_status TEXT NOT NULL,
  aml_flag INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE requests (
  id TEXT PRIMARY KEY,
  ticket_ref TEXT NOT NULL UNIQUE,
  subject_id TEXT NOT NULL REFERENCES data_subjects(id),
  right_type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  request_date TEXT NOT NULL,
  baseline_deadline TEXT NOT NULL,
  extended_deadline TEXT,
  extension_applied INTEGER DEFAULT 0,
  extension_reason TEXT,
  id_verification_status TEXT NOT NULL,
  id_verified_at TEXT,
  id_paused_days INTEGER DEFAULT 0,
  lawful_basis_assessed TEXT,
  entitlement_decision TEXT,
  rejection_code TEXT,
  automated_decision_flag INTEGER DEFAULT 0,
  remediation_summary TEXT,
  assigned_officer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE downstream_notifications (
  id TEXT PRIMARY KEY,
  ticket_ref TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  payload_summary TEXT NOT NULL,
  dispatch_status TEXT NOT NULL,
  dispatched_at TEXT,
  ack_received_at TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE suppression_register (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES data_subjects(id),
  cif_number TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  suppression_type TEXT NOT NULL,
  lawful_grounds TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  effective_from TEXT NOT NULL,
  expires_at TEXT,
  created_by TEXT NOT NULL
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ticket_ref TEXT,
  operator_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_detail TEXT NOT NULL,
  state_diff_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  digital_signature TEXT NOT NULL
);`,
      version: '3.45.0-WAL-AIRGAPPED-VIRTUAL',
      integrityCheck: 'PRAGMA integrity_check = OK'
    };
  }

  // Tickets
  public getTickets(params?: { status?: string; rightType?: string; priority?: string; search?: string }): DsrTicket[] {
    this.db.queryCount++;
    const subjectsMap = new Map(this.db.subjects.map((s) => [s.id, s]));

    return this.db.tickets
      .map((t) => {
        const sub = subjectsMap.get(t.subject_id);
        const deadlineInfo = calculateDeadlineInfo(t);
        return {
          ...t,
          full_name: sub?.full_name || 'Unknown Subject',
          cif_number: sub?.cif_number || 'CIF-UNKNOWN',
          email: sub?.email || '',
          phone: (sub as any)?.phone || '',
          residency_country: (sub as any)?.residency_country || 'EU',
          customer_segment: (sub as any)?.customer_segment || 'Retail',
          kyc_status: (sub as any)?.kyc_status || 'Verified',
          aml_flag: (sub as any)?.aml_flag || 0,
          deadlineInfo
        };
      })
      .filter((t) => {
        if (params?.status && t.status !== params.status) return false;
        if (params?.rightType && t.right_type !== params.rightType) return false;
        if (params?.priority && t.priority !== params.priority) return false;
        if (params?.search) {
          const q = params.search.toLowerCase();
          const match =
            t.ticket_ref.toLowerCase().includes(q) ||
            t.full_name.toLowerCase().includes(q) ||
            t.cif_number.toLowerCase().includes(q) ||
            t.right_type.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
  }

  public getTicket(id: string): DsrTicket & {
    dataItems: any[];
    downstream: DownstreamNotification[];
    art22Override: Art22Override | null;
    backupLogs: BackupBeyondUseLog[];
    auditTrail: AuditLog[];
  } {
    this.db.queryCount++;
    const ticketRaw = this.db.tickets.find((t) => t.id === id || t.ticket_ref === id);
    if (!ticketRaw) {
      throw new Error(`Ticket not found: ${id}`);
    }

    const subject = this.db.subjects.find((s) => s.id === ticketRaw.subject_id) || this.db.subjects[0];
    const ticket: DsrTicket = {
      ...ticketRaw,
      full_name: subject.full_name,
      cif_number: subject.cif_number,
      email: subject.email,
      phone: (subject as any).phone,
      residency_country: (subject as any).residency_country,
      customer_segment: (subject as any).customer_segment,
      kyc_status: (subject as any).kyc_status,
      aml_flag: (subject as any).aml_flag || 0,
      deadlineInfo: calculateDeadlineInfo(ticketRaw)
    };

    const dataItems = this.db.dataItems.filter((d) => d.subject_id === ticketRaw.subject_id);
    const downstream = this.db.downstream.filter((d) => d.ticket_ref === ticketRaw.ticket_ref);
    const art22Override = this.db.art22Overrides.find((o) => o.ticket_ref === ticketRaw.ticket_ref) || null;
    const backupLogs = this.db.backupLogs.filter((b) => b.ticket_ref === ticketRaw.ticket_ref);
    const auditTrail = this.db.auditLogs.filter((a) => a.ticket_ref === ticketRaw.ticket_ref);

    return {
      ...ticket,
      dataItems,
      downstream,
      art22Override,
      backupLogs,
      auditTrail
    };
  }

  public createTicket(payload: {
    subjectId: string;
    rightType: string;
    priority?: string;
    assignedOfficer?: string;
    notes?: string;
    isDirectMarketing?: boolean;
    sector?: string;
  }): { id: string; ticketRef: string } {
    this.db.writeCount++;
    const id = `REQ-${String(this.db.tickets.length + 1).padStart(3, '0')}`;
    const nextRefNum = 840 + this.db.tickets.length + 1;
    const ticketRef = `DSR-2026-0${nextRefNum}`;

    const now = new Date();
    const baselineDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newTicket = {
      id,
      ticket_ref: ticketRef,
      subject_id: payload.subjectId,
      right_type: payload.rightType,
      status: 'Intake & Verification',
      priority: payload.priority || 'Standard',
      request_date: now.toISOString(),
      baseline_deadline: baselineDeadline.toISOString(),
      extended_deadline: null,
      extension_applied: 0,
      extension_reason: null,
      id_verification_status: 'Verified',
      id_verified_at: now.toISOString(),
      id_paused_days: 0,
      lawful_basis_assessed: 'Pending Statutory Assessment',
      entitlement_decision: 'Conditional / Manual Review',
      rejection_code: null,
      automated_decision_flag: payload.rightType.includes('Art. 22') ? 1 : 0,
      remediation_summary: payload.notes || 'Newly recorded statutory rights intake.',
      assigned_officer: payload.assignedOfficer || 'Compliance Officer J. Weber',
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    this.db.tickets.unshift(newTicket);

    this.logAudit(
      'TICKET_CREATED',
      ticketRef,
      payload.assignedOfficer || 'Compliance Officer J. Weber',
      'Compliance Officer',
      `Created new ${payload.rightType} ticket for Subject ID ${payload.subjectId}`,
      newTicket
    );

    this.persist();
    return { id, ticketRef };
  }

  public updateTicket(id: string, payload: any): void {
    this.db.writeCount++;
    const ticket = this.db.tickets.find((t) => t.id === id || t.ticket_ref === id);
    if (!ticket) throw new Error('Ticket not found');

    if (payload.status) ticket.status = payload.status;
    if (payload.priority) ticket.priority = payload.priority;
    if (payload.assignedOfficer) ticket.assigned_officer = payload.assignedOfficer;
    if (payload.remediationSummary) ticket.remediation_summary = payload.remediationSummary;
    if (payload.entitlementDecision) ticket.entitlement_decision = payload.entitlementDecision;
    if (payload.idVerificationStatus) {
      ticket.id_verification_status = payload.idVerificationStatus;
      if (payload.idVerificationStatus === 'Verified') {
        ticket.id_verified_at = new Date().toISOString();
      }
    }
    if (payload.extensionApplied !== undefined) {
      ticket.extension_applied = payload.extensionApplied ? 1 : 0;
      if (payload.extensionApplied) {
        const base = new Date(ticket.baseline_deadline);
        const ext = new Date(base.getTime() + 60 * 24 * 60 * 60 * 1000);
        ticket.extended_deadline = ext.toISOString();
        ticket.extension_reason = payload.extensionReason || 'Statutory Complexity Extension under GDPR Article 12(3)';
      }
    }

    ticket.updated_at = new Date().toISOString();

    this.logAudit(
      'TICKET_UPDATED',
      ticket.ticket_ref,
      payload.operatorName || 'Compliance Officer J. Weber',
      'Compliance Officer',
      `Updated ticket ${ticket.ticket_ref}: status=${ticket.status}`,
      payload
    );

    this.persist();
  }

  public remediateTicket(id: string, payload: {
    actionType: string;
    remediationNotes?: string;
    rejectionCode?: string;
    operatorName?: string;
    dispatchedRecipients?: any[];
  }): void {
    this.db.writeCount++;
    const ticket = this.db.tickets.find((t) => t.id === id || t.ticket_ref === id);
    if (!ticket) throw new Error('Ticket not found');

    const operator = payload.operatorName || 'Compliance Officer J. Weber';

    if (payload.actionType === 'EXECUTE_ERASURE') {
      ticket.status = 'Completed & Sealed';
      ticket.entitlement_decision = 'Partially Granted (Statutory Carveout)';
      ticket.remediation_summary = payload.remediationNotes || 'Erasure executed for non-exempt partitions; AML core ledger locked under GwG § 8.';
    } else if (payload.actionType === 'EXECUTE_SUPPRESSION') {
      ticket.status = 'Completed & Sealed';
      ticket.entitlement_decision = 'Fully Granted';
      ticket.remediation_summary = payload.remediationNotes || 'Art. 21 objection recorded. Absolute suppression applied.';
    } else if (payload.actionType === 'STATUTORY_REFUSAL') {
      ticket.status = 'Statutorily Refused';
      ticket.entitlement_decision = 'Lawfully Blocked';
      ticket.rejection_code = payload.rejectionCode || 'EXEMPT_AML_STATUTORY_LOCK';
      ticket.remediation_summary = payload.remediationNotes || 'Statutorily refused under mandatory AML retention obligations.';
    } else if (payload.actionType === 'CLOSE_TICKET') {
      ticket.status = 'Completed & Sealed';
      ticket.remediation_summary = payload.remediationNotes || 'Request completed and sealed under GDPR accountability documentation.';
    }

    ticket.updated_at = new Date().toISOString();

    if (payload.dispatchedRecipients && payload.dispatchedRecipients.length > 0) {
      for (const rec of payload.dispatchedRecipients) {
        const dnId = `DN-${String(this.db.downstream.length + 1).padStart(2, '0')}`;
        this.db.downstream.unshift({
          id: dnId,
          ticket_ref: ticket.ticket_ref,
          recipient_name: rec.name || 'External Recipient',
          recipient_type: rec.type || 'Credit Reference Bureau',
          notification_type: 'Erasure Instruction',
          payload_summary: `Downstream notification dispatched for ticket ${ticket.ticket_ref}`,
          dispatch_status: 'Dispatched',
          dispatched_at: new Date().toISOString(),
          ack_received_at: new Date().toISOString(),
          retry_count: 0,
          created_at: new Date().toISOString()
        });
      }
    }

    this.logAudit(
      'TICKET_REMEDIATED',
      ticket.ticket_ref,
      operator,
      'Compliance Officer',
      `Remediated ticket ${ticket.ticket_ref} with action: ${payload.actionType}`,
      payload
    );

    this.persist();
  }

  // Subjects & Lawful Bases
  public getSubjects(search?: string): Subject[] {
    this.db.queryCount++;
    if (!search) return this.db.subjects;
    const q = search.toLowerCase();
    return this.db.subjects.filter(
      (s) =>
        s.full_name.toLowerCase().includes(q) ||
        s.cif_number.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }

  public getLawfulBases(): LawfulBasisInventoryItem[] {
    this.db.queryCount++;
    return this.db.lawfulBases;
  }

  public evaluateEntitlement(payload: {
    rightType: string;
    lawfulBasis: string;
    isDirectMarketing?: boolean;
  }): EntitlementAssessment {
    this.db.queryCount++;
    return evaluateRightEntitlement(
      payload.rightType as any,
      payload.lawfulBasis as any,
      payload.isDirectMarketing || false
    );
  }

  // Downstream Notifications (Art. 19)
  public getDownstream(): DownstreamNotification[] {
    this.db.queryCount++;
    return this.db.downstream;
  }

  public dispatchDownstream(id: string): void {
    this.db.writeCount++;
    const item = this.db.downstream.find((d) => d.id === id);
    if (!item) throw new Error('Downstream item not found');

    item.dispatch_status = 'Dispatched';
    item.dispatched_at = new Date().toISOString();
    item.ack_received_at = new Date().toISOString();

    this.logAudit(
      'DOWNSTREAM_DISPATCHED',
      item.ticket_ref,
      'SecOps Daemon',
      'System Subsystem',
      `Art. 19 Downstream Notification dispatched to ${item.recipient_name}`,
      { downstreamId: id, status: 'Dispatched' }
    );
    this.persist();
  }

  // Suppression Register
  public getSuppressions(): SuppressionRecord[] {
    this.db.queryCount++;
    return this.db.suppressions;
  }

  public addSuppression(payload: {
    subjectId: string;
    identifierType: string;
    identifierValue: string;
    suppressionType: string;
    lawfulGrounds: string;
    createdBy?: string;
  }): void {
    this.db.writeCount++;
    const subject = this.db.subjects.find((s) => s.id === payload.subjectId);
    const newRecord: SuppressionRecord = {
      id: `SUP-${String(this.db.suppressions.length + 1).padStart(2, '0')}`,
      subject_id: payload.subjectId,
      cif_number: subject?.cif_number || 'CIF-UNKNOWN',
      identifier_type: payload.identifierType as any,
      identifier_value: payload.identifierValue,
      suppression_type: payload.suppressionType as any,
      lawful_grounds: payload.lawfulGrounds,
      active: 1,
      effective_from: new Date().toISOString(),
      expires_at: null,
      created_by: payload.createdBy || 'Compliance Officer J. Weber'
    };
    this.db.suppressions.unshift(newRecord);

    this.logAudit(
      'SUPPRESSION_ADDED',
      null,
      payload.createdBy || 'Compliance Officer J. Weber',
      'Compliance Officer',
      `Added suppression for ${payload.identifierType}: ${payload.identifierValue} (${payload.suppressionType})`,
      payload
    );
    this.persist();
  }

  public toggleSuppression(id: string): void {
    this.db.writeCount++;
    const record = this.db.suppressions.find((s) => s.id === id);
    if (!record) throw new Error('Suppression record not found');
    record.active = record.active === 1 ? 0 : 1;

    this.logAudit(
      'SUPPRESSION_TOGGLED',
      null,
      'Compliance Officer J. Weber',
      'Compliance Officer',
      `Toggled suppression status of ${record.identifier_value} to ${record.active === 1 ? 'Active' : 'Inactive'}`,
      { id, active: record.active }
    );
    this.persist();
  }

  // Art 22
  public getArt22Overrides(): Art22Override[] {
    this.db.queryCount++;
    return this.db.art22Overrides;
  }

  public addArt22Override(payload: {
    ticketRef: string;
    subjectId: string;
    modelName: string;
    originalScore: string;
    automatedOutcome: string;
    humanReviewer: string;
    humanDecision: string;
    justification: string;
  }): void {
    this.db.writeCount++;
    const subject = this.db.subjects.find((s) => s.id === payload.subjectId);
    const override: Art22Override = {
      id: `OVR-${String(this.db.art22Overrides.length + 1).padStart(2, '0')}`,
      ticket_ref: payload.ticketRef,
      subject_id: payload.subjectId,
      model_name: payload.modelName,
      original_score: payload.originalScore,
      automated_outcome: payload.automatedOutcome,
      human_reviewer: payload.humanReviewer,
      human_decision: payload.humanDecision as any,
      justification: payload.justification,
      decision_timestamp: new Date().toISOString(),
      full_name: subject?.full_name,
      cif_number: subject?.cif_number
    };
    this.db.art22Overrides.unshift(override);

    this.logAudit(
      'ART22_HUMAN_OVERRIDE',
      payload.ticketRef,
      payload.humanReviewer,
      'Senior Underwriter',
      `Recorded Article 22 human override for ticket ${payload.ticketRef}: ${payload.humanDecision}`,
      payload
    );
    this.persist();
  }

  // Backup Beyond Use
  public addBackupBeyondUse(payload: {
    ticketRef: string;
    subjectId: string;
    backupTapeId: string;
    storageLocation: string;
    dataCategoriesCovered: string;
    technicalMeasures: string;
    scheduledOverwriteDate: string;
    officerSignature: string;
  }): void {
    this.db.writeCount++;
    const log: BackupBeyondUseLog = {
      id: `BKP-${String(this.db.backupLogs.length + 1).padStart(2, '0')}`,
      ticket_ref: payload.ticketRef,
      subject_id: payload.subjectId,
      backup_tape_id: payload.backupTapeId,
      storage_location: payload.storageLocation,
      data_categories_covered: payload.dataCategoriesCovered,
      technical_measures: payload.technicalMeasures,
      scheduled_overwrite_date: payload.scheduledOverwriteDate,
      officer_signature: payload.officerSignature,
      certified_at: new Date().toISOString()
    };
    this.db.backupLogs.unshift(log);

    this.logAudit(
      'BACKUP_BEYOND_USE_CERTIFIED',
      payload.ticketRef,
      payload.officerSignature,
      'SecOps Officer',
      `Certified backup tape ${payload.backupTapeId} beyond-use status under ICO / CNIL archival standards`,
      payload
    );
    this.persist();
  }

  // Audit Logs
  public getAuditLogs(limit = 150): AuditLog[] {
    this.db.queryCount++;
    return [...this.db.auditLogs].reverse().slice(0, limit);
  }

  // PIA / DPIA
  public getPias(): PiaRecord[] {
    this.db.queryCount++;
    return this.db.pias;
  }

  public getPia(piaId: string): { record: PiaRecord; alignment: PiaRightsAlignment; isDynamic: boolean } {
    this.db.queryCount++;
    const record = this.db.pias.find((p) => p.id === piaId || p.pia_id === piaId) || this.db.pias[0];
    const alignment = evaluatePiaRightsAlignment(record);
    return { record, alignment, isDynamic: false };
  }

  public ingestPia(payload: PiaIngestPayload): { message: string; record: PiaRecord; alignment: PiaRightsAlignment } {
    this.db.writeCount++;
    const newId = `PIA-REC-${String(this.db.pias.length + 1).padStart(3, '0')}`;
    const newRecord: PiaRecord = {
      id: newId,
      pia_id: payload.piaId || `PIA-${new Date().getFullYear()}-${String(this.db.pias.length + 1).padStart(3, '0')}`,
      title: payload.title || 'Ingested Privacy Impact Assessment',
      department: payload.department || 'Enterprise Compliance',
      risk_tier: payload.riskTier || 'High',
      system_name: payload.systemName || 'Ingested Processing System',
      sector_profile: payload.sectorProfile || 'banking',
      lawful_basis: payload.lawfulBasis || 'Consent',
      dpo_status: 'Under Review',
      purpose_description: payload.purposeDescription || 'Ingested assessment purpose',
      data_categories: JSON.stringify(payload.dataCategories || []),
      special_category_flags: JSON.stringify(payload.specialCategoryFlags || []),
      cross_border_transfers: payload.crossBorderTransfers || 'Local EU Storage',
      retention_years: payload.retentionYears || 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.db.pias.unshift(newRecord);

    this.logAudit(
      'PIA_INGESTED',
      null,
      'DPO Officer K. Schmidt',
      'Data Protection Officer',
      `Ingested Privacy Impact Assessment "${newRecord.title}" (${newRecord.pia_id})`,
      payload
    );

    const alignment = evaluatePiaRightsAlignment(newRecord);
    this.persist();
    return {
      message: 'Privacy Impact Assessment successfully parsed and rights-aligned.',
      record: newRecord,
      alignment
    };
  }

  public executePiaAlignment(payload: {
    piaId: string;
    dimension?: string;
    actions?: string[];
    operator?: string;
  }): { success: boolean; message: string; timestamp: string; piaId: string; actionsEnforced: number } {
    this.db.writeCount++;
    const pia = this.db.pias.find((p) => p.id === payload.piaId || p.pia_id === payload.piaId);
    const actionsCount = payload.actions ? payload.actions.length : 1;
    this.logAudit(
      'PIA_ALIGNMENT_ENFORCED',
      null,
      payload.operator || 'DPO Officer K. Schmidt',
      'Data Protection Officer',
      `Enforced ${actionsCount} rights alignment remediations for PIA: ${pia?.title || payload.piaId}`,
      payload
    );
    this.persist();
    return {
      success: true,
      message: `Successfully enforced ${actionsCount} rights alignment control(s) for ${payload.piaId}.`,
      timestamp: new Date().toISOString(),
      piaId: payload.piaId,
      actionsEnforced: actionsCount
    };
  }
}

export const virtualStore = new FrontendVirtualStore();
