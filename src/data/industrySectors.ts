// GLOCAL PIA — 7 Industry Sector Rule Profiles & Dynamic Governance Rules
// Tailored for domain-specific data protection regulations, threat vectors, risk multipliers, and Section S questions.

export interface SectorGovernanceQuestionOption {
  score: number;
  label: string;
  description?: string;
}

export interface SectorGovernanceQuestion {
  id: string;
  title: string;
  description: string;
  reference: string;
  options: SectorGovernanceQuestionOption[];
}

export interface SectorProfile {
  id: 'banking' | 'healthcare' | 'retail' | 'corporate' | 'logistics' | 'agtech' | 'pharma';
  name: string;
  shortName: string;
  iconName: 'Landmark' | 'Activity' | 'ShoppingBag' | 'Briefcase' | 'Truck' | 'Sprout' | 'FlaskConical';
  badgeStyle: string;
  operationalScope: string;
  regulatoryFrameworks: string[];
  baseRiskRule: string;
  riskMultiplierFormula: string;
  multiplierValue: number;
  mandatoryRules: string[];
  defaultDataCategories: string[];
  defaultSpecialFlags: string[];
  sectionSQuestions: SectorGovernanceQuestion[];
}

export const INDUSTRY_SECTOR_PROFILES: Record<string, SectorProfile> = {
  banking: {
    id: 'banking',
    name: 'Banking & Financial Services',
    shortName: 'Banking & Finance',
    iconName: 'Landmark',
    badgeStyle: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    operationalScope: 'High-frequency processing of financial assets, credit risk scoring, open banking APIs, cross-border wire transactions, algorithmic trading, and AML/fraud detection pipelines.',
    regulatoryFrameworks: [
      'PCI-DSS v4.0 (Payment Card Security)',
      'GLBA §501(b) (Gramm-Leach-Bliley Act)',
      'Basel III / BCBS 239 (Risk Aggregation)',
      'PSD2 / Open Banking Directive (Art. 66/67)',
      'SWIFT CSP & 5AMLD'
    ],
    baseRiskRule: 'Financial Identifiers elevate Base Impact. Automated AI credit scoring triggers a +30% risk multiplier (1.30x).',
    riskMultiplierFormula: 'Base Impact elevated. Automated credit scoring adds 1.30x multiplier.',
    multiplierValue: 1.30,
    mandatoryRules: [
      'Strict mandatory evaluation of all Financial Identifiers (IBAN, Credit Cards, Credit Scores)',
      'Mandatory explainability and human contestability review for algorithmic loan underwriting (EU AI Act & Art. 22)',
      'Verification of sovereign data residency for core transaction ledgers and payment switches'
    ],
    defaultDataCategories: [
      'IBAN & Account Numbers',
      'Transaction Histories',
      'Credit Bureau Scores',
      'Payment Gateway Tokens',
      'AML/KYC Verification Dossiers'
    ],
    defaultSpecialFlags: [
      'Financial Identifiers',
      'Automated Credit Profiling (Art. 22)',
      'Open Banking API Ingestion'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_FIN_1',
        title: 'Banking S1. Financial Identifiers & Credit Data Scope',
        description: 'Sensitivity level of processed financial records (IBAN, Credit Cards, Credit Scores, Account Balances).',
        reference: 'PCI-DSS v4.0 / GLBA §501(b)',
        options: [
          { score: 1, label: 'Score 1: Basic payment receipt / transaction metadata only' },
          { score: 2, label: 'Score 2: Tokenized credit card / payment data via PCI-DSS gateway' },
          { score: 4, label: 'Score 4: Bank account numbers, IBAN, and account balances' },
          { score: 5, label: 'Score 5: Full credit scores, financial asset histories, and credit risk profiles' }
        ]
      },
      {
        id: 'SEC_FIN_2',
        title: 'Banking S2. Open Banking & Third-Party API Sharing',
        description: 'Data sharing mechanisms under Open Banking / PSD2 regulations.',
        reference: 'PSD2 Art 66/67 / Open Banking API Standards',
        options: [
          { score: 1, label: 'Score 1: No third-party open banking API integrations' },
          { score: 2, label: 'Score 2: Read-only financial data API with explicit consent token' },
          { score: 3, label: 'Score 3: Payment initiation service (PISP) integration' },
          { score: 5, label: 'Score 5: Unverified third-party financial aggregator data sharing' }
        ]
      },
      {
        id: 'SEC_FIN_3',
        title: 'Banking S3. AI/Automated Credit Scoring & Fraud Profiling',
        description: 'Algorithmic decision-making for loan approvals, credit limits, or fraud flags.',
        reference: 'EU AI Act High-Risk AI / Basel III Risk Models / GDPR Art. 22',
        options: [
          { score: 1, label: 'Score 1: No automated scoring or profiling used' },
          { score: 2, label: 'Score 2: Human credit analyst makes final decision based on AI recommendation' },
          { score: 3, label: 'Score 3: Automated credit limit adjustments with right to human appeal' },
          { score: 5, label: 'Score 5: Fully automated credit denial / account blocking without human review' }
        ]
      }
    ]
  },
  healthcare: {
    id: 'healthcare',
    name: 'Hospitals & Healthcare',
    shortName: 'Healthcare & HealthTech',
    iconName: 'Activity',
    badgeStyle: 'bg-rose-950 text-rose-300 border-rose-800',
    operationalScope: 'Processing of Protected Health Information (PHI), Electronic Health Record (EHR/EMR) systems, telemedicine portals, medical IoT telemetry, and clinical diagnostic registries.',
    regulatoryFrameworks: [
      'HIPAA Privacy & Security Rules (45 CFR §160/164)',
      'HITECH Act & Breach Notification',
      'EU Medical Device Regulation (MDR Art. 62)',
      'NHS Caldicott Principles (UK Health)',
      'GDPR Special Category Data Art. 9(2)(h)'
    ],
    baseRiskRule: 'Processing PHI or biometric health data automatically forces Base Risk Score to maximum 5.0 (Critical Tier).',
    riskMultiplierFormula: 'Automatic Base Score 5.0 escalation upon PHI / Biometric detection.',
    multiplierValue: 1.0,
    mandatoryRules: [
      'Automatic Base Risk Score escalation to maximum 5.0 (Critical Tier) for patient health & genomic data',
      'Strict break-glass emergency access auditing with immediate mandatory DPO alerts',
      'Isolated VLAN micro-segmentation and TLS 1.3 encryption for connected medical IoT devices'
    ],
    defaultDataCategories: [
      'Electronic Health Records (EHR)',
      'Diagnostic Imaging & Scans',
      'Prescription Histories',
      'Genomic & Biometric Vitals',
      'Practitioner Break-Glass Audit Logs'
    ],
    defaultSpecialFlags: [
      'Protected Health Information (PHI)',
      'Special Category Health Data (Art. 9)',
      'Break-Glass Emergency Access'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_HEALTH_1',
        title: 'Healthcare S1. Protected Health Information (PHI) & EHR Scope',
        description: 'Depth and classification of patient health records processed.',
        reference: 'HIPAA §164.502 / EU MDR Art 62 / GDPR Art. 9',
        options: [
          { score: 1, label: 'Score 1: Basic appointment booking / contact details only' },
          { score: 2, label: 'Score 2: Anonymized or aggregated epidemiological statistics' },
          { score: 4, label: 'Score 4: Electronic Health Records (EHR), diagnostic images, prescriptions' },
          { score: 5, label: 'Score 5: Genomic data, mental health records, or biometric health tracking' }
        ]
      },
      {
        id: 'SEC_HEALTH_2',
        title: 'Healthcare S2. Emergency Break-Glass & Practitioner Audit Controls',
        description: 'Access auditing and emergency override capability for medical staff.',
        reference: 'HIPAA Security Rule §164.312(b) / NHS Caldicott Principles',
        options: [
          { score: 1, label: 'Score 1: Strict RBAC with mandatory 100% audit logging for every record view' },
          { score: 2, label: 'Score 2: Emergency break-glass access enabled with immediate mandatory DPO audit alert' },
          { score: 4, label: 'Score 4: Manual break-glass logging without real-time audit triggers' },
          { score: 5, label: 'Score 5: Shared practitioner accounts or un-audited EHR access' }
        ]
      },
      {
        id: 'SEC_HEALTH_3',
        title: 'Healthcare S3. Medical IoT & Telemedicine Endpoint Security',
        description: 'Security controls on connected medical diagnostic devices and remote care apps.',
        reference: 'EU MDR Annex I / FDA Medical Device Cybersecurity',
        options: [
          { score: 1, label: 'Score 1: No connected medical IoT or remote devices involved' },
          { score: 2, label: 'Score 2: Hospital-managed encrypted medical IoT devices on isolated VLAN' },
          { score: 3, label: 'Score 3: Patient-owned mobile telemedicine app with TLS and device verification' },
          { score: 5, label: 'Score 5: Unencrypted wireless medical telemetry or remote patient monitors' }
        ]
      }
    ]
  },
  retail: {
    id: 'retail',
    name: 'Retail & E-Commerce',
    shortName: 'Retail & E-Com',
    iconName: 'ShoppingBag',
    badgeStyle: 'bg-amber-950 text-amber-300 border-amber-800',
    operationalScope: 'Mass consumer data processing, loyalty reward programs, direct email/SMS marketing, behavioral web tracking, cross-site advertising pixels, and checkout funnels.',
    regulatoryFrameworks: [
      'CCPA / CPRA (California Consumer Privacy Act)',
      'GDPR ePrivacy Directive (Cookie & Communications)',
      'PCI-DSS v4.0 (Cardholder Data Environment)',
      'FTC Endorsement Guides & Opt-Out Rules'
    ],
    baseRiskRule: 'Mass public consumer tracking triggers additional ePrivacy and opt-out compliance checks.',
    riskMultiplierFormula: 'Cross-site pixel profiling adds 1.15x ePrivacy multiplier.',
    multiplierValue: 1.15,
    mandatoryRules: [
      'Strict affirmative opt-in consent for third-party advertising pixels and cross-site cookies',
      'One-click Do Not Sell/Share My Personal Information preference center compliance',
      'Point-of-Sale (POS) terminal isolation and tokenized checkout architectures'
    ],
    defaultDataCategories: [
      'Consumer Contact Profiles',
      'Purchase Histories & Basket Trends',
      'Loyalty Program Identifiers',
      'Web Session & Pixel Telemetry',
      'Payment Gateway Tokens'
    ],
    defaultSpecialFlags: [
      'Mass Consumer Profiling',
      'Third-Party Retargeting Pixels',
      'Direct Marketing (Art. 21)'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_RETAIL_1',
        title: 'Retail S1. Digital Footprinting & Behavioral Profiling',
        description: 'Tracking consumer shopping habits, cookies, location, and targeted advertising.',
        reference: 'GDPR ePrivacy Directive / CCPA §1798.120',
        options: [
          { score: 1, label: 'Score 1: Transactional processing only, no marketing profiling or tracking cookies' },
          { score: 2, label: 'Score 2: First-party loyalty program analytics with explicit opt-in' },
          { score: 4, label: 'Score 4: Cross-site third-party tracking pixels and targeted ad profiling' },
          { score: 5, label: 'Score 5: In-store facial recognition or real-time beacon location tracking' }
        ]
      },
      {
        id: 'SEC_RETAIL_2',
        title: 'Retail S2. Consumer Preference & Opt-Out Mechanism',
        description: 'Ease of withdrawing marketing consent or opting out of data sale/sharing.',
        reference: 'CCPA/CPRA Do Not Sell My Info / ICO Marketing Guidance',
        options: [
          { score: 1, label: 'Score 1: One-click preference center for instant opt-out/unsubscribe' },
          { score: 2, label: 'Score 2: Granular consent banner with default-off cookies' },
          { score: 4, label: 'Score 4: Pre-checked opt-in boxes during online checkout' },
          { score: 5, label: 'Score 5: No consumer opt-out interface available' }
        ]
      },
      {
        id: 'SEC_RETAIL_3',
        title: 'Retail S3. POS Terminal & Payment Isolation',
        description: 'Network segmentation and hardware security of Point-of-Sale terminals.',
        reference: 'PCI-DSS v4.0 Requirement 9 & 12',
        options: [
          { score: 1, label: 'Score 1: Full P2PE (Point-to-Point Encryption) hardware POS terminals' },
          { score: 2, label: 'Score 2: Outsourced tokenized checkout portal (e.g. Stripe, Adyen)' },
          { score: 4, label: 'Score 4: Legacy POS hardware connected to corporate internal network' },
          { score: 5, label: 'Score 5: Unsegmented store payment network' }
        ]
      }
    ]
  },
  corporate: {
    id: 'corporate',
    name: 'Corporate & Enterprise Operations',
    shortName: 'Corporate & HR',
    iconName: 'Briefcase',
    badgeStyle: 'bg-blue-950 text-blue-300 border-blue-800',
    operationalScope: 'Human resources & employee lifecycle management, corporate IT infrastructure, employee performance evaluations, workplace monitoring tools, and confidential whistleblower hotlines.',
    regulatoryFrameworks: [
      'Article 88 GDPR (Employment Context Processing)',
      'National Labor Codes & Worker Protections',
      'Works Council Privacy Agreements / Codetermination',
      'EU Whistleblower Protection Directive (2019/1937)'
    ],
    baseRiskRule: 'Workplace surveillance or keystroke logging triggers high governance scrutiny under Labor Law.',
    riskMultiplierFormula: 'Workplace monitoring agents add 1.20x labor scrutiny multiplier.',
    multiplierValue: 1.20,
    mandatoryRules: [
      'Segregation of employee personal records from general customer operational stores',
      'Mandatory Works Council consultation and prior notice for any workplace telemetry or DLP agents',
      'End-to-end encrypted anonymous whistleblower hotlines with non-retaliation guarantees'
    ],
    defaultDataCategories: [
      'Employee Master Profiles',
      'Payroll & Compensation Ledgers',
      'Performance Appraisals & Reviews',
      'Workplace Access & Badge Logs',
      'Whistleblower Intake Records'
    ],
    defaultSpecialFlags: [
      'Employee PII (Art. 88)',
      'Workplace Monitoring & DLP',
      'Whistleblower Confidentiality'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_CORP_1',
        title: 'Corporate S1. Employee PII vs Customer PII Governance',
        description: 'Handling of sensitive employee lifecycle records (payroll, appraisals, background checks).',
        reference: 'Article 88 GDPR / National Labor Code Privacy Rules',
        options: [
          { score: 1, label: 'Score 1: Basic business contact directory data only' },
          { score: 2, label: 'Score 2: Standard payroll & HR administration records with role-based access' },
          { score: 4, label: 'Score 4: Employee health assessments, sickness records, or background vetting logs' },
          { score: 5, label: 'Score 5: Whistleblower allegations or disciplinary investigation dossiers' }
        ]
      },
      {
        id: 'SEC_CORP_2',
        title: 'Corporate S2. Workplace Surveillance & Monitoring Tools',
        description: 'Use of endpoint surveillance agents, DLP, CCTV, or keystroke tracking.',
        reference: 'Works Council Privacy Frameworks / ECHR Art 8 Privacy at Work',
        options: [
          { score: 1, label: 'Score 1: No employee monitoring or surveillance agents deployed' },
          { score: 2, label: 'Score 2: Standard corporate email spam filters & network security logging with prior notice' },
          { score: 3, label: 'Score 3: Endpoint Data Loss Prevention (DLP) inspects file transfers & external USBs' },
          { score: 5, label: 'Score 5: Continuous keystroke logging, webcam monitoring, or covert employee tracking' }
        ]
      },
      {
        id: 'SEC_CORP_3',
        title: 'Corporate S3. Whistleblower Anonymity & Works Council Review',
        description: 'Safeguards for confidential reporting channels and employee representative sign-off.',
        reference: 'EU Whistleblower Protection Directive 2019/1937',
        options: [
          { score: 1, label: 'Score 1: Third-party encrypted whistleblower portal with guaranteed anonymity' },
          { score: 2, label: 'Score 2: Internal email hot-line managed by Legal/Compliance' },
          { score: 3, label: 'Score 3: Works Council / Trade Union consultation completed and documented' },
          { score: 5, label: 'Score 5: Unencrypted internal whistleblower reporting without identity protection' }
        ]
      }
    ]
  },
  logistics: {
    id: 'logistics',
    name: 'Trade, Logistics & Supply Chain',
    shortName: 'Trade & Logistics',
    iconName: 'Truck',
    badgeStyle: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    operationalScope: 'Cross-border transport of cargo and goods, customs declarations, shipping manifests, driver GPS and fatigue monitoring, 3PL sub-contractor data exchanges, and freight ERPs.',
    regulatoryFrameworks: [
      'WCO SAFE Framework (World Customs Organization)',
      'Cross-Border Transborder Data Flow (TDF) Protocols',
      'EU Tachograph & Driver Rest Regulations',
      'ISO 28000 (Supply Chain Security Management)'
    ],
    baseRiskRule: 'Multi-jurisdictional transborder flows add cross-border transfer penalties (1.25x).',
    riskMultiplierFormula: 'Multi-jurisdictional transborder flow adds 1.25x transfer penalty.',
    multiplierValue: 1.25,
    mandatoryRules: [
      'Multi-jurisdictional transfer impact evaluation across customs origin, transit, and destination points',
      'Strict separation of driver personal telemetry from commercial freight manifests with off-duty toggles',
      'Scoped OAuth 2.0 API integrations and audited DPAs for 3PL freight forwarders'
    ],
    defaultDataCategories: [
      'Shipping Manifests & Cargo Declarations',
      'Driver GPS & Route Telemetry',
      'Customs Clearance Records',
      '3PL Carrier Credentials',
      'Vehicle Telematics & Engine Logs'
    ],
    defaultSpecialFlags: [
      'Transborder Data Flow (TDF)',
      'Driver Geolocation Tracking',
      'Customs Data Sharing'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_LOG_1',
        title: 'Logistics S1. Cross-Border Supply Route Data Flow (TDF)',
        description: 'Transborder movement of logistics manifests, customs declarations, and vendor data.',
        reference: 'WCO SAFE Framework / International Customs Data Privacy',
        options: [
          { score: 1, label: 'Score 1: Domestic supply chain only, zero cross-border data transfers' },
          { score: 2, label: 'Score 2: Intra-regional transfers within adequacy-approved trade zones' },
          { score: 3, label: 'Score 3: Global supply route manifests transferred via Standard Contractual Clauses (SCCs)' },
          { score: 5, label: 'Score 5: Customs data transmitted to non-adequate third countries without transfer impact assessment' }
        ]
      },
      {
        id: 'SEC_LOG_2',
        title: 'Logistics S2. Fleet GPS Telemetry & Operator Tracking',
        description: 'Real-time location tracking of delivery drivers, operators, and transport fleets.',
        reference: 'ICO Employee Location Tracking Guidance / EU Tachograph Rules',
        options: [
          { score: 1, label: 'Score 1: Vehicle tracking only (no driver identity linked)' },
          { score: 2, label: 'Score 2: Shift-based driver GPS tracking with automatic off-duty privacy toggle' },
          { score: 4, label: 'Score 4: Continuous 24/7 driver location tracking without off-duty disablement' },
          { score: 5, label: 'Score 5: In-cab facial fatigue monitoring cameras without explicit privacy impact assessment' }
        ]
      },
      {
        id: 'SEC_LOG_3',
        title: 'Logistics S3. 3PL Sub-contractor & Vendor Portal Security',
        description: 'API access and data sharing with third-party logistics (3PL) partners.',
        reference: 'ISO 28000 Supply Chain Security',
        options: [
          { score: 1, label: 'Score 1: Direct operating fleet only, no 3PL vendor integrations' },
          { score: 2, label: 'Score 2: OAuth 2.0 scoped API access for audited 3PL logistics partners' },
          { score: 3, label: 'Score 3: Shared cloud portal with basic password authentication for sub-contractors' },
          { score: 5, label: 'Score 5: Unrestricted database view access granted to external freight brokers' }
        ]
      }
    ]
  },
  agtech: {
    id: 'agtech',
    name: 'Agriculture & AgTech',
    shortName: 'AgTech & Agriculture',
    iconName: 'Sprout',
    badgeStyle: 'bg-lime-950 text-lime-300 border-lime-800',
    operationalScope: 'Precision agriculture software, drone field mapping, soil IoT telemetry sensors, livestock health trackers, farm management SaaS platforms, and AI crop-yield predictive modeling.',
    regulatoryFrameworks: [
      'AgData Transparent (ADT) Core Principles',
      'USDA Agricultural Data Governance Guidelines',
      'National Rural Development Payment Rules',
      'Farm Bureau Data Privacy Model Clauses'
    ],
    baseRiskRule: 'Linking geospatial drone telemetry to identified farmers requires clear commercial AI consent.',
    riskMultiplierFormula: 'Commercial AI crop yield model co-mingling adds 1.15x multiplier.',
    multiplierValue: 1.15,
    mandatoryRules: [
      'Strict key-code pseudonymization isolating farm geospatial telemetry from landowner identity',
      'Explicit opt-in required before ingesting private farm yield metrics into commercial AI training sets',
      'Encrypted government subsidy verification APIs with zero transmission of unencrypted tax IDs'
    ],
    defaultDataCategories: [
      'Farm Soil & Yield Telemetry',
      'Drone & Satellite Orthomosaics',
      'Farmer Land Ownership Records',
      'Livestock Sensor Telemetry',
      'Agricultural Subsidy Registry Data'
    ],
    defaultSpecialFlags: [
      'Geospatial Farm Telemetry',
      'Commercial AI Yield Training',
      'Government Subsidy Integration'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_AG_1',
        title: 'AgTech S1. Geospatial Farm Telemetry vs Farmer Identity Isolation',
        description: 'Separation of farm spatial/sensor metrics from personal land owner identities.',
        reference: 'AgData Transparent Core Principles / USDA Data Governance',
        options: [
          { score: 1, label: 'Score 1: Anonymized soil/weather sensor data with zero farmer identification' },
          { score: 2, label: 'Score 2: Farm telemetry pseudonymized with strict key-code separation from owner name' },
          { score: 4, label: 'Score 4: Drone mapping & satellite imagery directly linked to farmer name & tax ID' },
          { score: 5, label: 'Score 5: Publicly available farm spatial database linking crop yield to individual farmer' }
        ]
      },
      {
        id: 'SEC_AG_2',
        title: 'AgTech S2. Commercial AI Crop Model Data Co-mingling',
        description: 'Secondary use of private farm telemetry for commercial machine learning models.',
        reference: 'AgData Transparent Certification Standard',
        options: [
          { score: 1, label: 'Score 1: No secondary reuse of farmer data for commercial AI models' },
          { score: 2, label: 'Score 2: Aggregated & de-identified farm metrics used for AI models with explicit opt-in' },
          { score: 4, label: 'Score 4: Commercial AI model trained on individual farm metrics without opt-out capability' },
          { score: 5, label: 'Score 5: Selling private farm operational metrics to third-party commodities traders' }
        ]
      },
      {
        id: 'SEC_AG_3',
        title: 'AgTech S3. Government Subsidy & Direct Payout Integrations',
        description: 'Interfacing with agricultural grant registries and direct-to-farmer disbursements.',
        reference: 'National Rural Development Payment Rules',
        options: [
          { score: 1, label: 'Score 1: No government subsidy or financial payout interfaces' },
          { score: 2, label: 'Score 2: Encrypted government subsidy verification API with tokenized authentication' },
          { score: 3, label: 'Score 3: Direct banking integration for subsidy payouts with DPA in place' },
          { score: 5, label: 'Score 5: Unencrypted transmission of farmer banking & tax ID details to external grant portals' }
        ]
      }
    ]
  },
  pharma: {
    id: 'pharma',
    name: 'Pharma & Life Sciences',
    shortName: 'Pharma & Clinical',
    iconName: 'FlaskConical',
    badgeStyle: 'bg-purple-950 text-purple-300 border-purple-800',
    operationalScope: 'Phase I–IV clinical trials, investigational medicinal product (IMP) studies, Pharmacovigilance adverse event reporting, genomic sequencing, and bio-bank sample storage.',
    regulatoryFrameworks: [
      'ICH Good Clinical Practice (GCP E6(R2))',
      'FDA 21 CFR Part 11 (Electronic Records & Signatures)',
      'FDA 21 CFR Part 50 (Human Subject Protection)',
      'EU Clinical Trials Regulation (CTR 536/2014)',
      'EMA Good Pharmacovigilance Practices (GVP)'
    ],
    baseRiskRule: 'Key-coded trial subject records require strict sponsor blinding, IRB ethics review, and bio-bank consent auditing.',
    riskMultiplierFormula: 'Genomic & bio-bank secondary research adds 1.25x ethics multiplier.',
    multiplierValue: 1.25,
    mandatoryRules: [
      'Master identity key retained strictly at clinical trial site with zero sponsor unblinding',
      'Granular Informed Consent Forms (ICF) separating primary trial from secondary bio-bank studies',
      'De-identified Pharmacovigilance adverse event reporting with audit-proof regulatory dispatch'
    ],
    defaultDataCategories: [
      'Key-Coded Trial Subject Dossiers',
      'Informed Consent Form (ICF) Opt-Ins',
      'Bio-Bank Sample Barcodes',
      'Pharmacovigilance Safety Reports',
      'Clinical Investigator Master Keys'
    ],
    defaultSpecialFlags: [
      'Clinical Trial Subject Data',
      'Genomic & Bio-Bank Samples',
      'Pharmacovigilance Adverse Events'
    ],
    sectionSQuestions: [
      {
        id: 'SEC_PHARMA_1',
        title: 'Pharma S1. Clinical Trial Key-Coding & Sponsor Blinding',
        description: 'Isolation of trial subject identities from pharmaceutical sponsors and R&D labs.',
        reference: 'ICH GCP E6(R2) / EU Clinical Trials Regulation (CTR) Art 81',
        options: [
          { score: 1, label: 'Score 1: Double-blinded trial with master identity key retained strictly at clinical site' },
          { score: 2, label: 'Score 2: Pseudonymized trial records with secure CRO key management' },
          { score: 3, label: 'Score 3: Single-coded patient records accessible to trial monitors' },
          { score: 5, label: 'Score 5: Unblinded trial subject PII visible to pharmaceutical sponsor R&D team' }
        ]
      },
      {
        id: 'SEC_PHARMA_2',
        title: 'Pharma S2. Informed Consent Forms (ICF) & Bio-bank Reuse',
        description: 'Scope of participant consent for future observational studies and genetic research.',
        reference: 'FDA 21 CFR Part 50 / Declaration of Helsinki',
        options: [
          { score: 1, label: 'Score 1: Granular ICF covering primary trial and optional tier-by-tier secondary research' },
          { score: 2, label: 'Score 2: Broad ICF covering defined therapeutic area research' },
          { score: 4, label: 'Score 4: Vague consent for unspecified future commercial research' },
          { score: 5, label: 'Score 5: Secondary genetic sequencing without participant consent or IRB approval' }
        ]
      },
      {
        id: 'SEC_PHARMA_3',
        title: 'Pharma S3. Pharmacovigilance & Adverse Event Reporting',
        description: 'Data protection safeguards during mandatory drug safety reporting to regulatory authorities.',
        reference: 'FDA 21 CFR Part 314.80 / EMA Good Pharmacovigilance Practices',
        options: [
          { score: 1, label: 'Score 1: Adverse event disclosures redacting all non-essential patient identifiers' },
          { score: 2, label: 'Score 2: De-identified safety report filed with medical authority with secure audit trail' },
          { score: 4, label: 'Score 4: Full patient contact details transmitted in safety report without pseudonymization' },
          { score: 5, label: 'Score 5: Non-compliant or delayed adverse event reporting due to privacy confusion' }
        ]
      }
    ]
  }
};

export const SECTOR_LIST = Object.values(INDUSTRY_SECTOR_PROFILES);
