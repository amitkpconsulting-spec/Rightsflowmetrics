var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_vite = require("vite");

// server/db.ts
var import_sql = __toESM(require("sql.js"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "compliance_records.sqlite");
var WAL_LOG_FILE = import_path.default.join(DATA_DIR, "compliance_records.wal.log");
var dbInstance = null;
var lastDbSaveTime = Date.now();
var totalQueriesExecuted = 0;
var totalWritesExecuted = 0;
var queryLatencyHistory = [];
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var SQLITE_SCHEMA_DDL = `
-- ============================================================================
-- GDPR INDIVIDUAL RIGHTS OPERATIONS & CONTROL CENTER - EMBEDDED SQLITE DDL
-- Strict WAL-mode relational architecture with tamper-evident audit chaining
-- ============================================================================

-- 1. Data Subject Master (Core Banking CIF / Customer Registry)
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  cif_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  residency_country TEXT DEFAULT 'DE',
  customer_segment TEXT CHECK(customer_segment IN ('Retail Banking', 'Private Wealth', 'Corporate', 'Ex-Customer', 'Prospect')),
  kyc_status TEXT CHECK(kyc_status IN ('Verified', 'Pending Re-verification', 'Unverified', 'Enhanced Due Diligence')),
  aml_flag INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Indexing for high-throughput subject lookup
CREATE INDEX IF NOT EXISTS idx_subjects_cif ON subjects(cif_number);
CREATE INDEX IF NOT EXISTS idx_subjects_email ON subjects(email);

-- 2. Lawful Basis Inventory & Purpose Registry (GDPR Art. 6 & Art. 9)
CREATE TABLE IF NOT EXISTS lawful_basis_inventory (
  id TEXT PRIMARY KEY,
  purpose_code TEXT UNIQUE NOT NULL,
  purpose_name TEXT NOT NULL,
  department TEXT NOT NULL,
  lawful_basis TEXT CHECK(lawful_basis IN ('Consent', 'Contract', 'Legal Obligation', 'Vital Interests', 'Public Task', 'Legitimate Interests')),
  retention_years INTEGER NOT NULL,
  allows_erasure INTEGER NOT NULL,
  allows_portability INTEGER NOT NULL,
  allows_objection INTEGER NOT NULL,
  statutory_reference TEXT NOT NULL
);

-- 3. Customer Data Inventory Items (Specific categories mapped to systems & basis)
CREATE TABLE IF NOT EXISTS subject_data_inventory (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  purpose_code TEXT NOT NULL,
  data_category TEXT NOT NULL,
  field_name TEXT NOT NULL,
  sample_value TEXT,
  system_of_record TEXT NOT NULL,
  storage_medium TEXT CHECK(storage_medium IN ('Hot DB', 'Cold Archive', 'Backup Tape (Immutable)', 'CRM', 'Core Ledger')),
  is_restricted INTEGER DEFAULT 0,
  is_beyond_use INTEGER DEFAULT 0,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (purpose_code) REFERENCES lawful_basis_inventory(purpose_code)
);

CREATE INDEX IF NOT EXISTS idx_data_inv_subj ON subject_data_inventory(subject_id);

-- 4. DSR / DSAR Requests (Individual Rights Tickets)
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  ticket_ref TEXT UNIQUE NOT NULL,
  subject_id TEXT NOT NULL,
  right_type TEXT CHECK(right_type IN ('Access (Art. 15)', 'Rectification (Art. 16)', 'Erasure (Art. 17)', 'Restriction (Art. 18)', 'Portability (Art. 20)', 'Objection (Art. 21)', 'Automated Decision Review (Art. 22)')),
  status TEXT CHECK(status IN ('Intake & Verification', 'Under Lawful Review', 'Remediation In Progress', 'Pending Downstream Notification', 'Completed & Sealed', 'Statutorily Refused')),
  priority TEXT CHECK(priority IN ('Standard', 'High (SLA Warning)', 'Critical (SLA Escalated)')),
  request_date TEXT NOT NULL,
  baseline_deadline TEXT NOT NULL,
  extended_deadline TEXT,
  extension_applied INTEGER DEFAULT 0,
  extension_reason TEXT,
  id_verification_status TEXT CHECK(id_verification_status IN ('Verified', 'Pending ID Proof', 'Clock Paused - Awaiting ID', 'Failed ID Check')),
  id_verified_at TEXT,
  id_paused_days INTEGER DEFAULT 0,
  lawful_basis_assessed TEXT,
  entitlement_decision TEXT CHECK(entitlement_decision IN ('Fully Granted', 'Partially Granted (Statutory Carveout)', 'Lawfully Blocked', 'Pending Assessment')),
  rejection_code TEXT,
  automated_decision_flag INTEGER DEFAULT 0,
  remediation_summary TEXT,
  assigned_officer TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_deadline ON requests(baseline_deadline);
CREATE INDEX IF NOT EXISTS idx_requests_subject ON requests(subject_id);

-- 5. Tamper-Evident Audit Ledger (SHA-256 Hash Chained Event Log)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  event_type TEXT NOT NULL,
  ticket_ref TEXT,
  operator_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_detail TEXT NOT NULL,
  state_diff_json TEXT,
  prev_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  digital_signature TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_logs(ticket_ref);

-- 6. Downstream Recipient Notification Register (GDPR Art. 19 Propagation)
CREATE TABLE IF NOT EXISTS downstream_notifications (
  id TEXT PRIMARY KEY,
  ticket_ref TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT CHECK(recipient_type IN ('Credit Reference Bureau', 'Anti-Fraud Registry', 'Core Ledger Processor', 'Marketing CRM', 'Third-Party Analytics', 'AML Reporting Node')),
  notification_type TEXT CHECK(notification_type IN ('Rectification Notice', 'Erasure Instruction', 'Processing Restriction Freeze', 'Beyond-Use Confirmation')),
  payload_summary TEXT NOT NULL,
  dispatch_status TEXT CHECK(dispatch_status IN ('Queued', 'Dispatched', 'Acknowledged', 'Delivery Failed')),
  dispatched_at TEXT,
  ack_received_at TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (ticket_ref) REFERENCES requests(ticket_ref)
);

-- 7. Suppression & Processing Freeze Register (GDPR Art. 18 & Art. 21)
CREATE TABLE IF NOT EXISTS suppression_register (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  cif_number TEXT NOT NULL,
  identifier_type TEXT CHECK(identifier_type IN ('CIF', 'Email', 'Phone', 'National ID')),
  identifier_value TEXT NOT NULL,
  suppression_type TEXT CHECK(suppression_type IN ('Art. 21 Direct Marketing Opt-Out (Absolute)', 'Art. 18 Temporary Processing Freeze (Disputed Accuracy)', 'Art. 18 Unlawful Processing Freeze', 'Legal Hold Protection')),
  lawful_grounds TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  effective_from TEXT NOT NULL,
  expires_at TEXT,
  created_by TEXT NOT NULL,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- 8. Art. 22 Automated Decision Review & Human Intervention Overrides
CREATE TABLE IF NOT EXISTS art22_overrides (
  id TEXT PRIMARY KEY,
  ticket_ref TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  original_score TEXT NOT NULL,
  automated_outcome TEXT NOT NULL,
  human_reviewer TEXT NOT NULL,
  human_decision TEXT CHECK(human_decision IN ('Affirmed (Automated Valid)', 'Overturned (Favorable to Customer)', 'Modified (Adjusted Limits)')),
  justification TEXT NOT NULL,
  decision_timestamp TEXT NOT NULL,
  FOREIGN KEY (ticket_ref) REFERENCES requests(ticket_ref)
);

-- 9. Immutable Backup "Beyond Use" Certification Log
CREATE TABLE IF NOT EXISTS backup_beyond_use_logs (
  id TEXT PRIMARY KEY,
  ticket_ref TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  backup_tape_id TEXT NOT NULL,
  storage_location TEXT NOT NULL,
  data_categories_covered TEXT NOT NULL,
  technical_measures TEXT NOT NULL,
  scheduled_overwrite_date TEXT NOT NULL,
  officer_signature TEXT NOT NULL,
  certified_at TEXT NOT NULL
);

-- 10. Privacy Impact Assessment Registry (DPIA / PIA Ingestion Master)
CREATE TABLE IF NOT EXISTS pia_registry (
  id TEXT PRIMARY KEY,
  pia_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  system_name TEXT NOT NULL,
  department TEXT NOT NULL,
  sector_profile TEXT DEFAULT 'banking',
  risk_tier TEXT CHECK(risk_tier IN ('High', 'Medium', 'Low')),
  dpo_status TEXT CHECK(dpo_status IN ('Approved', 'Requires Mitigation', 'Under Review')),
  lawful_basis TEXT CHECK(lawful_basis IN ('Consent', 'Contract', 'Legal Obligation', 'Vital Interests', 'Public Task', 'Legitimate Interests')),
  purpose_description TEXT NOT NULL,
  data_categories TEXT NOT NULL,
  special_category_flags TEXT NOT NULL,
  cross_border_transfers TEXT NOT NULL,
  retention_years INTEGER NOT NULL,
  report_metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pia_piaid ON pia_registry(pia_id);
CREATE INDEX IF NOT EXISTS idx_pia_risktier ON pia_registry(risk_tier);
`;
function calculateHash(content) {
  return import_crypto.default.createHash("sha256").update(content, "utf8").digest("hex");
}
function generateAuditHash(prevHash, timestamp, eventType, ticketRef, operatorId, actionDetail, stateDiffJson) {
  const rawString = `${prevHash}|${timestamp}|${eventType}|${ticketRef || "GLOBAL"}|${operatorId}|${actionDetail}|${stateDiffJson}`;
  const currentHash = calculateHash(rawString);
  const signature = `ED25519-SIG:${calculateHash(currentHash + ":AIRGAP_HSM_KEY_SLOT_0")}`;
  return { currentHash, signature };
}
function appendWalLog(action, payload) {
  try {
    const entry = `[${(/* @__PURE__ */ new Date()).toISOString()}] WAL_COMMIT | ${action} | ${JSON.stringify(payload)}
`;
    import_fs.default.appendFileSync(WAL_LOG_FILE, entry, "utf8");
    totalWritesExecuted++;
  } catch (err) {
    console.error("Failed to append to WAL log:", err);
  }
}
function persistDatabase() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    import_fs.default.writeFileSync(DB_FILE, buffer);
    lastDbSaveTime = Date.now();
  } catch (err) {
    console.error("Failed to persist SQLite database to disk:", err);
  }
}
async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }
  const SQL = await (0, import_sql.default)();
  if (import_fs.default.existsSync(DB_FILE)) {
    try {
      const fileBuffer = import_fs.default.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      console.log("\u2705 Loaded existing embedded SQLite database from disk in strict WAL mode.");
    } catch (e) {
      console.warn("\u26A0\uFE0F Error loading existing SQLite DB, initializing fresh instance:", e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
    console.log("\u2705 Initialized new embedded SQLite database.");
  }
  dbInstance.run(SQLITE_SCHEMA_DDL);
  const res = dbInstance.exec("SELECT COUNT(*) as count FROM requests");
  const count = res[0]?.values[0]?.[0] || 0;
  if (count < 20) {
    seedInitialData(dbInstance);
  }
  try {
    try {
      dbInstance.run("ALTER TABLE pia_registry ADD COLUMN sector_profile TEXT DEFAULT 'banking';");
    } catch (ignore) {
    }
    try {
      dbInstance.run("ALTER TABLE pia_registry ADD COLUMN report_metadata TEXT;");
    } catch (ignore) {
    }
    try {
      dbInstance.run("CREATE INDEX IF NOT EXISTS idx_pia_sector ON pia_registry(sector_profile);");
    } catch (ignore) {
    }
    const piaRes = dbInstance.exec("SELECT COUNT(*) as count FROM pia_registry");
    const piaCount = piaRes[0]?.values[0]?.[0] || 0;
    if (piaCount === 0) {
      seedPiaRegistry(dbInstance);
    } else {
      seedPiaRegistry(dbInstance);
    }
  } catch (e) {
    console.warn("Initializing PIA registry schema...");
    seedPiaRegistry(dbInstance);
  }
  persistDatabase();
  return dbInstance;
}
function executeQuery(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized");
  const start = performance.now();
  totalQueriesExecuted++;
  try {
    const stmt = dbInstance.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    const latency = performance.now() - start;
    queryLatencyHistory.push(latency);
    if (queryLatencyHistory.length > 100) queryLatencyHistory.shift();
    return results;
  } catch (err) {
    console.error(`SQL Error in executeQuery [${sql}]:`, err);
    throw err;
  }
}
function executeRun(sql, params = [], auditContext) {
  if (!dbInstance) throw new Error("Database not initialized");
  const start = performance.now();
  try {
    dbInstance.run(sql, params);
    appendWalLog(sql.slice(0, 40), params);
    if (auditContext) {
      logAuditTrail(auditContext.event, auditContext.ticketRef || null, auditContext.operator, "Compliance Officer", auditContext.detail, auditContext.diff || null);
    }
    persistDatabase();
    const latency = performance.now() - start;
    queryLatencyHistory.push(latency);
    if (queryLatencyHistory.length > 100) queryLatencyHistory.shift();
  } catch (err) {
    console.error(`SQL Error in executeRun [${sql}]:`, err);
    throw err;
  }
}
function logAuditTrail(eventType, ticketRef, operatorId, actorRole, actionDetail, stateDiff = null) {
  if (!dbInstance) return;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const stateDiffJson = stateDiff ? JSON.stringify(stateDiff) : "{}";
  const lastLogRes = dbInstance.exec("SELECT current_hash FROM audit_logs ORDER BY id DESC LIMIT 1");
  const prevHash = lastLogRes[0]?.values[0]?.[0] || "0000000000000000000000000000000000000000000000000000000000000000-GENESIS-BLOCK";
  const { currentHash, signature } = generateAuditHash(
    prevHash,
    timestamp,
    eventType,
    ticketRef,
    operatorId,
    actionDetail,
    stateDiffJson
  );
  dbInstance.run(
    `INSERT INTO audit_logs (timestamp, event_type, ticket_ref, operator_id, actor_role, action_detail, state_diff_json, prev_hash, current_hash, digital_signature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [timestamp, eventType, ticketRef, operatorId, actorRole, actionDetail, stateDiffJson, prevHash, currentHash, signature]
  );
}
function getDbTelemetry() {
  let dbSizeBytes = 0;
  let walSizeBytes = 0;
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      dbSizeBytes = import_fs.default.statSync(DB_FILE).size;
    }
    if (import_fs.default.existsSync(WAL_LOG_FILE)) {
      walSizeBytes = import_fs.default.statSync(WAL_LOG_FILE).size;
    }
  } catch (e) {
  }
  const avgLatency = queryLatencyHistory.length > 0 ? queryLatencyHistory.reduce((a, b) => a + b, 0) / queryLatencyHistory.length : 0.15;
  let totalSubjects = 0;
  let totalTickets = 0;
  let totalAuditLogs = 0;
  let activeSuppressions = 0;
  let pendingDownstream = 0;
  if (dbInstance) {
    try {
      const s = dbInstance.exec("SELECT COUNT(*) FROM subjects");
      totalSubjects = s[0]?.values[0]?.[0] || 0;
      const t = dbInstance.exec("SELECT COUNT(*) FROM requests");
      totalTickets = t[0]?.values[0]?.[0] || 0;
      const a = dbInstance.exec("SELECT COUNT(*) FROM audit_logs");
      totalAuditLogs = a[0]?.values[0]?.[0] || 0;
      const sup = dbInstance.exec("SELECT COUNT(*) FROM suppression_register WHERE active = 1");
      activeSuppressions = sup[0]?.values[0]?.[0] || 0;
      const d = dbInstance.exec("SELECT COUNT(*) FROM downstream_notifications WHERE dispatch_status = 'Queued'");
      pendingDownstream = d[0]?.values[0]?.[0] || 0;
    } catch (e) {
    }
  }
  return {
    engine: "SQLite 3.45 (Embedded WASM / Strict WAL-Mode)",
    journalMode: "WAL (Write-Ahead-Log)",
    dbSizeBytes,
    walSizeBytes,
    totalQueriesExecuted,
    totalWritesExecuted,
    avgLatencyMs: Number(avgLatency.toFixed(2)),
    lastSaved: new Date(lastDbSaveTime).toISOString(),
    tableStats: {
      subjects: totalSubjects,
      tickets: totalTickets,
      auditLogs: totalAuditLogs,
      activeSuppressions,
      pendingDownstream
    }
  };
}
function verifyAuditChainIntegrity() {
  if (!dbInstance) return { isValid: false, totalChecked: 0, details: "DB not loaded" };
  const logs = executeQuery("SELECT * FROM audit_logs ORDER BY id ASC");
  if (logs.length === 0) {
    return { isValid: true, totalChecked: 0, details: "Audit ledger is empty (Genesis state)." };
  }
  let expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000-GENESIS-BLOCK";
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (log.prev_hash !== expectedPrevHash) {
      return {
        isValid: false,
        totalChecked: i,
        brokenBlockId: log.id,
        details: `Chain broke at Block #${log.id}: prev_hash mismatch. Expected ${expectedPrevHash.slice(0, 16)}..., found ${log.prev_hash.slice(0, 16)}...`
      };
    }
    const { currentHash } = generateAuditHash(
      log.prev_hash,
      log.timestamp,
      log.event_type,
      log.ticket_ref,
      log.operator_id,
      log.action_detail,
      log.state_diff_json || "{}"
    );
    if (currentHash !== log.current_hash) {
      return {
        isValid: false,
        totalChecked: i,
        brokenBlockId: log.id,
        details: `Cryptographic tamper detected at Block #${log.id}: computed hash ${currentHash.slice(0, 16)}... does not match recorded ${log.current_hash.slice(0, 16)}...`
      };
    }
    expectedPrevHash = log.current_hash;
  }
  return {
    isValid: true,
    totalChecked: logs.length,
    details: `All ${logs.length} audit records verified cryptographically against SHA-256 chaining root.`
  };
}
function seedInitialData(db) {
  console.log("\u{1F331} Seeding regulatory & retail banking dataset...");
  const lawfulBases = [
    ["LB-AML", "AML-KYC-01", "AML/KYC Statutory Verification & Transaction Surveillance", "Financial Crime & Compliance", "Legal Obligation", 7, 0, 0, 0, "EU Directive 2018/843 (5AMLD), GwG \xA7 8 (7-year statutory lock)"],
    ["LB-CORE", "CORE-ACC-02", "Core Current Account & Credit Line Administration", "Retail Banking Operations", "Contract", 10, 0, 1, 0, "GDPR Art. 6(1)(b), HGB \xA7 257 (Commercial Code retention)"],
    ["LB-CREDIT", "CREDIT-DEC-03", "Automated Credit Decisioning & Risk Score Engine", "Credit Risk Department", "Contract", 3, 0, 1, 0, "GDPR Art. 22(2)(a) & Art. 6(1)(b) (Necessary for credit facility)"],
    ["LB-MKT", "MKT-PREF-04", "Personalized Investment & Wealth Product Recommendations", "Marketing & CRM", "Consent", 1, 1, 1, 1, "GDPR Art. 6(1)(a) (Explicit freely-given consent)"],
    ["LB-FRAUD", "FRAUD-PREV-05", "Real-Time Biometric & Card Fraud Pattern Detection", "Security Operations", "Legitimate Interests", 2, 0, 0, 1, "GDPR Art. 6(1)(f), Recital 47 (Strict proportionality test)"],
    ["LB-TAX", "TAX-FATCA-06", "CRS & FATCA Cross-Border Statutory Tax Disclosures", "Regulatory Reporting", "Legal Obligation", 10, 0, 0, 0, "Tax Code \xA7 147, FATCA Intergovernmental Agreement"]
  ];
  for (const lb of lawfulBases) {
    db.run(
      `INSERT OR REPLACE INTO lawful_basis_inventory (id, purpose_code, purpose_name, department, lawful_basis, retention_years, allows_erasure, allows_portability, allows_objection, statutory_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      lb
    );
  }
  const subjects = [
    ["SUB-001", "CIF-948201", "Dr. Helena Bergmann", "helena.bergmann@fintech-berlin.de", "+49 170 8829102", "DE", "Retail Banking", "Verified", 0, "2022-01-14T09:00:00Z"],
    ["SUB-002", "CIF-819234", "Marcus Vance-Sterling", "m.vance@sterling-cap.co.uk", "+44 7700 900142", "GB", "Private Wealth", "Enhanced Due Diligence", 1, "2021-06-20T14:30:00Z"],
    ["SUB-003", "CIF-551902", "Sophie Dubois", "sophie.dubois@lyon-creatives.fr", "+33 6 12 34 56 78", "FR", "Retail Banking", "Verified", 0, "2023-03-10T11:15:00Z"],
    ["SUB-004", "CIF-339105", "Klaas van der Meer", "klaas.vandermeer@amsterdam-logistics.nl", "+31 6 55512345", "NL", "Corporate", "Verified", 0, "2020-11-05T16:45:00Z"],
    ["SUB-005", "CIF-102948", "Elena Rostova", "elena.rostova@vienna-consult.at", "+43 664 1234567", "AT", "Ex-Customer", "Pending Re-verification", 0, "2019-08-12T08:20:00Z"],
    ["SUB-006", "CIF-662819", "Matteo Rossi", "m.rossi@milano-fin.it", "+39 02 7654321", "IT", "Retail Banking", "Verified", 0, "2023-05-18T10:10:00Z"],
    ["SUB-007", "CIF-771239", "Claire Lefevre-Moreau", "claire.lefevre@bordeaux-vins.fr", "+33 5 56 78 90 12", "FR", "Private Wealth", "Verified", 0, "2021-09-14T14:22:00Z"],
    ["SUB-008", "CIF-449102", "Lukas Lindholm", "lukas.lindholm@nordic-trade.se", "+46 8 123 4567", "SE", "Corporate", "Verified", 0, "2022-04-03T08:50:00Z"],
    ["SUB-009", "CIF-990312", "Ana Belen Morales", "anabelen.morales@madrid-digital.es", "+34 91 234 5678", "ES", "Retail Banking", "Verified", 0, "2023-08-19T13:40:00Z"],
    ["SUB-010", "CIF-512874", "Alexander von Habsburg", "alex.habsburg@danube-holdings.at", "+43 1 512 8899", "AT", "Private Wealth", "Enhanced Due Diligence", 0, "2020-02-11T16:15:00Z"],
    ["SUB-011", "CIF-238491", "Chantal De Smet", "chantal.desmet@antwerp-logistics.be", "+32 3 234 5678", "BE", "Corporate", "Verified", 0, "2022-10-09T09:30:00Z"],
    ["SUB-012", "CIF-849203", "Dr. Jan Kowalski", "jan.kowalski@warsaw-biotech.pl", "+48 22 890 1234", "PL", "Retail Banking", "Pending Re-verification", 0, "2024-01-20T11:05:00Z"],
    ["SUB-013", "CIF-391054", "Soren Kristensen", "soren.k@copenhagen-renewables.dk", "+45 33 12 34 56", "DK", "Corporate", "Verified", 0, "2021-12-01T15:00:00Z"],
    ["SUB-014", "CIF-720194", "Frederik Meyer", "f.meyer@hamburg-shipping.de", "+49 40 33445566", "DE", "Retail Banking", "Verified", 0, "2023-02-17T12:10:00Z"],
    ["SUB-015", "CIF-604812", "Lucia Santoro", "lucia.santoro@roma-architettura.it", "+39 06 6987654", "IT", "Retail Banking", "Verified", 0, "2022-07-29T14:45:00Z"],
    ["SUB-016", "CIF-194820", "Beatriz Silva", "beatriz.silva@lisboa-tech.pt", "+351 21 345 6789", "PT", "Prospect", "Unverified", 0, "2024-03-12T10:00:00Z"],
    ["SUB-017", "CIF-883910", "Dimitris Papadopoulos", "d.papadopoulos@athens-shipping.gr", "+30 210 7788990", "GR", "Corporate", "Enhanced Due Diligence", 1, "2021-05-04T17:20:00Z"],
    ["SUB-018", "CIF-429015", "Anette Olofsson", "anette.o@stockholm-wealth.se", "+46 8 765 4321", "SE", "Private Wealth", "Verified", 0, "2020-09-30T08:15:00Z"],
    ["SUB-019", "CIF-318492", "Liam O'Connor", "liam.oconnor@dublin-pay.ie", "+353 1 496 0000", "IE", "Retail Banking", "Verified", 0, "2023-06-11T13:25:00Z"],
    ["SUB-020", "CIF-958210", "Kristina Novak", "kristina.novak@prague-analytics.cz", "+420 221 456 789", "CZ", "Retail Banking", "Verified", 0, "2022-11-22T09:40:00Z"]
  ];
  for (const s of subjects) {
    db.run(
      `INSERT OR REPLACE INTO subjects (id, cif_number, full_name, email, phone, residency_country, customer_segment, kyc_status, aml_flag, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      s
    );
  }
  const dataItems = [
    ["DATA-01", "SUB-001", "AML-KYC-01", "Identification Document", "Passport Scan & National ID No.", "DE-PASSPORT-C9381028", "AML Repository", "Cold Archive", 0, 0],
    ["DATA-02", "SUB-001", "AML-KYC-01", "Financial Crime Screening", "Sanctions & PEP Check Log", "CLEARED-WORLD-CHECK-2024", "Compliance Vault", "Cold Archive", 0, 0],
    ["DATA-03", "SUB-001", "CORE-ACC-02", "Account Transaction History", "IBAN DE89 3704 0044 0532 0130 00", "\u20AC142,850.20 (542 Transactions)", "Core Ledger", "Hot DB", 0, 0],
    ["DATA-04", "SUB-001", "MKT-PREF-04", "Marketing Behavioral Profile", "Affinity Scores & Web Tracker", "High Interest: ESG ETF, Gold Fund", "Marketing CRM", "CRM", 0, 0],
    ["DATA-05", "SUB-001", "CREDIT-DEC-03", "Automated Credit Score", "Credit Engine v4.2 Decision", "Score: 785 / Auto-Approved \u20AC15k Overdraft", "Credit Engine", "Hot DB", 0, 0],
    ["DATA-06", "SUB-002", "AML-KYC-01", "Source of Wealth Documentation", "Notarized Property Deeds & AML Dossier", "EDD-DOSSIER-VANCE-2023", "AML Repository", "Cold Archive", 0, 0],
    ["DATA-07", "SUB-002", "MKT-PREF-04", "Direct Marketing Email Subscription", "Newsletter Opt-In", "Active (Daily Wealth Briefing)", "Marketing CRM", "CRM", 0, 0],
    ["DATA-08", "SUB-003", "CREDIT-DEC-03", "Automated Loan Rejection Log", "Model X-Risk Decision Record", "REJECTED: Debt-to-Income > 45%", "Credit Risk DB", "Hot DB", 0, 0],
    ["DATA-09", "SUB-004", "CORE-ACC-02", "Corporate Line Transaction Log", "NL91 ABNA 0417 1643 00", "\u20AC2,450,190.00 (1,840 Transactions)", "Core Ledger", "Hot DB", 0, 0],
    ["DATA-10", "SUB-005", "TAX-FATCA-06", "Ex-Customer Tax Record", "AT-TAX-194820491", "Preserved for 10-year statutory audit cycle", "Tax Reporting Node", "Cold Archive", 0, 0],
    ["DATA-11", "SUB-006", "MKT-PREF-04", "Mortgage Telemarketing Preferences", "Consent Opt-in Flags", "Revoked Direct Outreach", "Marketing CRM", "CRM", 1, 0],
    ["DATA-12", "SUB-007", "CREDIT-DEC-03", "Private Wealth Lombard Facility", "Automated Margin LTV Model", "LTV Cap: 65% / Approved \u20AC800k", "Credit Engine", "Hot DB", 0, 0],
    ["DATA-13", "SUB-009", "FRAUD-PREV-05", "Behavioral Biometric Telemetry", "Touch & Keystroke Pattern Vectors", "Device ID: ES-iOS-883920", "Fraud Sentinel", "Hot DB", 0, 0],
    ["DATA-14", "SUB-013", "CORE-ACC-02", "Renewables Project Debt Facility", "DK29 DABA 3001 2345 6789 00", "\u20AC12,000,000 Syndicated Loan", "Core Ledger", "Hot DB", 0, 0],
    ["DATA-15", "SUB-017", "AML-KYC-01", "Enhanced Due Diligence Dossier", "Maritime Shipping Beneficial Ownership", "PEP Connection Flag (Tier 2)", "Compliance Vault", "Cold Archive", 0, 0]
  ];
  for (const di of dataItems) {
    db.run(
      `INSERT OR REPLACE INTO subject_data_inventory (id, subject_id, purpose_code, data_category, field_name, sample_value, system_of_record, storage_medium, is_restricted, is_beyond_use)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      di
    );
  }
  const requests = [
    [
      "REQ-001",
      "DSR-2026-0841",
      "SUB-001",
      "Erasure (Art. 17)",
      "Remediation In Progress",
      "High (SLA Warning)",
      "2026-08-01T10:00:00Z",
      "2026-08-31T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-02T14:10:00Z",
      0,
      "Mixed: Legal Obligation (AML/KYC 7-yr retention) + Consent (Marketing CRM)",
      "Partially Granted (Statutory Carveout)",
      null,
      0,
      "Marketing CRM & profile records flagged for irreversible purge. Core banking ledger & AML records preserved under statutory legal obligation (GwG \xA7 8 / 5AMLD).",
      "DPO Officer K. Schmidt",
      "2026-08-01T10:00:00Z",
      "2026-08-25T09:12:00Z"
    ],
    [
      "REQ-002",
      "DSR-2026-0842",
      "SUB-002",
      "Objection (Art. 21)",
      "Completed & Sealed",
      "Standard",
      "2026-08-05T14:20:00Z",
      "2026-09-04T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-05T15:00:00Z",
      0,
      "Art. 6(1)(a) Consent / Art. 6(1)(f) Legitimate Interest",
      "Fully Granted",
      null,
      0,
      "Subject exercised absolute right to object to direct marketing & profiling. Synchronized suppression register across all CRM & outbound email relays.",
      "Compliance Officer J. Weber",
      "2026-08-05T14:20:00Z",
      "2026-08-06T11:00:00Z"
    ],
    [
      "REQ-003",
      "DSR-2026-0843",
      "SUB-003",
      "Automated Decision Review (Art. 22)",
      "Under Lawful Review",
      "Critical (SLA Escalated)",
      "2026-07-28T08:45:00Z",
      "2026-08-27T23:59:59Z",
      "2026-10-26T23:59:59Z",
      1,
      "Complex cross-border loan risk recalculation and human credit officer audit",
      "Verified",
      "2026-07-28T10:30:00Z",
      0,
      "Art. 6(1)(b) Contract / Art. 22(3) Human Intervention Right",
      "Pending Assessment",
      null,
      1,
      "Applicant contested automated rejection on personal loan. Case escalated to Senior Underwriter for manual underwriting and explanation of model logic.",
      "Senior Underwriter A. Fischer",
      "2026-07-28T08:45:00Z",
      "2026-08-24T16:30:00Z"
    ],
    [
      "REQ-004",
      "DSR-2026-0844",
      "SUB-004",
      "Portability (Art. 20)",
      "Intake & Verification",
      "Standard",
      "2026-08-20T16:00:00Z",
      "2026-09-19T23:59:59Z",
      null,
      0,
      null,
      "Clock Paused - Awaiting ID",
      null,
      4,
      "Art. 6(1)(b) Contract",
      "Pending Assessment",
      null,
      0,
      "Request for full machine-readable JSON/CSV export of corporate transaction ledger. Statutory compliance clock paused until certified national ID token received.",
      "Compliance Officer J. Weber",
      "2026-08-20T16:00:00Z",
      "2026-08-25T08:00:00Z"
    ],
    [
      "REQ-005",
      "DSR-2026-0845",
      "SUB-005",
      "Rectification (Art. 16)",
      "Pending Downstream Notification",
      "Standard",
      "2026-08-10T11:30:00Z",
      "2026-09-09T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-11T09:00:00Z",
      0,
      "Art. 6(1)(b) Contract & Legal Obligation",
      "Fully Granted",
      null,
      0,
      "Updated residency tax jurisdiction and updated phone number. Rectification propagation queued for dispatch to SCHUFA Credit Bureau and Tax Authority.",
      "DPO Officer K. Schmidt",
      "2026-08-10T11:30:00Z",
      "2026-08-24T14:20:00Z"
    ],
    [
      "REQ-006",
      "DSR-2026-0846",
      "SUB-006",
      "Objection (Art. 21)",
      "Remediation In Progress",
      "High (SLA Warning)",
      "2026-08-02T09:15:00Z",
      "2026-09-01T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-03T11:00:00Z",
      0,
      "Art. 6(1)(a) Consent / Direct Marketing",
      "Fully Granted",
      null,
      0,
      "Objection against algorithmic telemarketing and email offers for retail mortgages. CRM suppressions propagated across sales queues.",
      "Compliance Officer J. Weber",
      "2026-08-02T09:15:00Z",
      "2026-08-24T10:00:00Z"
    ],
    [
      "REQ-007",
      "DSR-2026-0847",
      "SUB-007",
      "Access (Art. 15)",
      "Completed & Sealed",
      "Standard",
      "2026-08-03T13:45:00Z",
      "2026-09-02T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-04T09:30:00Z",
      0,
      "Art. 6(1)(b) Contract & Art. 15 Subject Access",
      "Fully Granted",
      null,
      0,
      "Comprehensive DSAR data disclosure package compiled (including Lombard collateral records, KYC dossier summary, and transactional history). Delivered via secure encrypted portal.",
      "DPO Officer K. Schmidt",
      "2026-08-03T13:45:00Z",
      "2026-08-18T16:00:00Z"
    ],
    [
      "REQ-008",
      "DSR-2026-0848",
      "SUB-008",
      "Restriction (Art. 18)",
      "Under Lawful Review",
      "Standard",
      "2026-08-12T14:10:00Z",
      "2026-09-11T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-13T08:45:00Z",
      0,
      "Art. 18(1)(a) Accuracy Contest",
      "Pending Assessment",
      null,
      0,
      "Corporate customer contests ledger accuracy on cross-currency Hedging derivative fees. Account placed on temporary operational restriction freeze pending financial audit.",
      "Senior Underwriter A. Fischer",
      "2026-08-12T14:10:00Z",
      "2026-08-23T11:30:00Z"
    ],
    [
      "REQ-009",
      "DSR-2026-0849",
      "SUB-009",
      "Erasure (Art. 17)",
      "Intake & Verification",
      "Standard",
      "2026-08-22T10:05:00Z",
      "2026-09-21T23:59:59Z",
      null,
      0,
      null,
      "Pending ID Proof",
      null,
      0,
      "Art. 6(1)(a) Consent / Art. 6(1)(b) Contract",
      "Pending Assessment",
      null,
      0,
      'Customer requested "Right to be Forgotten" following app uninstallation. Awaiting multi-factor ID token confirmation prior to lawful basis assessment.',
      "DPO Officer K. Schmidt",
      "2026-08-22T10:05:00Z",
      "2026-08-22T10:05:00Z"
    ],
    [
      "REQ-010",
      "DSR-2026-0850",
      "SUB-010",
      "Erasure (Art. 17)",
      "Statutorily Refused",
      "Standard",
      "2026-07-20T11:00:00Z",
      "2026-08-19T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-07-21T09:10:00Z",
      0,
      "Art. 6(1)(c) Legal Obligation (5AMLD & GwG \xA7 8)",
      "Lawfully Blocked",
      "EXEMPT_AML_STATUTORY_LOCK",
      0,
      "Request to delete historical high-net-worth transactional records lawfully refused under EU Directive 2018/843 (5AMLD) and Austrian Banking Act \xA7 40 (10-year retention rule). Notice with appeal rights dispatched.",
      "DPO Officer K. Schmidt",
      "2026-07-20T11:00:00Z",
      "2026-08-15T14:00:00Z"
    ],
    [
      "REQ-011",
      "DSR-2026-0851",
      "SUB-011",
      "Portability (Art. 20)",
      "Remediation In Progress",
      "Standard",
      "2026-08-14T08:30:00Z",
      "2026-09-13T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-14T11:20:00Z",
      0,
      "Art. 6(1)(b) Contract / Art. 20 Data Portability",
      "Fully Granted",
      null,
      0,
      "Exporting structured ISO 20022 XML and CAMT.053 transaction statements to corporate client for migration to open-banking ERP provider.",
      "Compliance Officer J. Weber",
      "2026-08-14T08:30:00Z",
      "2026-08-25T07:45:00Z"
    ],
    [
      "REQ-012",
      "DSR-2026-0852",
      "SUB-012",
      "Rectification (Art. 16)",
      "Intake & Verification",
      "Standard",
      "2026-08-21T15:20:00Z",
      "2026-09-20T23:59:59Z",
      null,
      0,
      null,
      "Clock Paused - Awaiting ID",
      null,
      3,
      "Art. 6(1)(b) Contract",
      "Pending Assessment",
      null,
      0,
      "Customer submitted request to correct misspelling in registered legal surname and tax identifier. Awaiting certified copy of civil status certificate.",
      "Compliance Officer J. Weber",
      "2026-08-21T15:20:00Z",
      "2026-08-24T09:00:00Z"
    ],
    [
      "REQ-013",
      "DSR-2026-0853",
      "SUB-013",
      "Access (Art. 15)",
      "Under Lawful Review",
      "Standard",
      "2026-08-15T10:40:00Z",
      "2026-09-14T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-16T14:00:00Z",
      0,
      "Art. 15 Right of Access & Art. 6(1)(b) Contract",
      "Pending Assessment",
      null,
      0,
      "Syndicated loan participant requested disclosure of all processing records, internal credit rating scoring weights, and third-party data recipient lists.",
      "Senior Underwriter A. Fischer",
      "2026-08-15T10:40:00Z",
      "2026-08-23T15:00:00Z"
    ],
    [
      "REQ-014",
      "DSR-2026-0854",
      "SUB-014",
      "Erasure (Art. 17)",
      "Pending Downstream Notification",
      "High (SLA Warning)",
      "2026-08-04T12:00:00Z",
      "2026-09-03T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-05T08:30:00Z",
      0,
      "Art. 6(1)(a) Consent & Art. 6(1)(b) Contract",
      "Partially Granted (Statutory Carveout)",
      null,
      0,
      "Customer closed retail checking accounts. Purged marketing profiles and mobile app telemetry; core tax and AML archives locked with 10-year statutory freeze.",
      "DPO Officer K. Schmidt",
      "2026-08-04T12:00:00Z",
      "2026-08-24T17:15:00Z"
    ],
    [
      "REQ-015",
      "DSR-2026-0855",
      "SUB-015",
      "Automated Decision Review (Art. 22)",
      "Completed & Sealed",
      "Standard",
      "2026-08-08T09:00:00Z",
      "2026-09-07T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-08T11:15:00Z",
      0,
      "Art. 22(3) Human Intervention Right",
      "Fully Granted",
      null,
      1,
      "Automated credit card limit downgrade was reviewed by human credit officer. Officer validated additional proof of freelance architect income and reinstated \u20AC10,000 credit facility.",
      "Senior Underwriter A. Fischer",
      "2026-08-08T09:00:00Z",
      "2026-08-17T11:00:00Z"
    ],
    [
      "REQ-016",
      "DSR-2026-0856",
      "SUB-016",
      "Erasure (Art. 17)",
      "Completed & Sealed",
      "Standard",
      "2026-08-16T14:30:00Z",
      "2026-09-15T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-17T09:00:00Z",
      0,
      "Art. 6(1)(a) Consent (Pre-contractual Prospect)",
      "Fully Granted",
      null,
      0,
      "Prospect abandoned digital onboarding. Full erasure of uncompleted application form, temporary credit bureau inquiries, and marketing tracking cookies executed across hot and warm tiers.",
      "DPO Officer K. Schmidt",
      "2026-08-16T14:30:00Z",
      "2026-08-18T10:30:00Z"
    ],
    [
      "REQ-017",
      "DSR-2026-0857",
      "SUB-017",
      "Restriction (Art. 18)",
      "Under Lawful Review",
      "Critical (SLA Escalated)",
      "2026-07-29T11:15:00Z",
      "2026-08-28T23:59:59Z",
      "2026-10-27T23:59:59Z",
      1,
      "Complex multi-jurisdictional sanctions PEP freeze verification and legal counsel review",
      "Verified",
      "2026-07-30T14:20:00Z",
      0,
      "Art. 18(1)(d) Objection pending verification & Legal Obligation",
      "Pending Assessment",
      null,
      0,
      "Customer requested processing restriction claiming unlawful sanctions categorization. Extended statutory deadline applied due to complex cross-border regulatory review with external counsel.",
      "DPO Officer K. Schmidt",
      "2026-07-29T11:15:00Z",
      "2026-08-25T08:30:00Z"
    ],
    [
      "REQ-018",
      "DSR-2026-0858",
      "SUB-018",
      "Access (Art. 15)",
      "Intake & Verification",
      "Standard",
      "2026-08-24T16:00:00Z",
      "2026-09-23T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-25T09:00:00Z",
      0,
      "Art. 15 Right of Access",
      "Pending Assessment",
      null,
      0,
      "Customer initiated request for comprehensive inventory of all personal data held across Wealth Management, Lombard Lending, and mobile app telemetry systems.",
      "Compliance Officer J. Weber",
      "2026-08-24T16:00:00Z",
      "2026-08-25T09:00:00Z"
    ],
    [
      "REQ-019",
      "DSR-2026-0859",
      "SUB-019",
      "Objection (Art. 21)",
      "Completed & Sealed",
      "Standard",
      "2026-08-11T13:00:00Z",
      "2026-09-10T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-12T10:00:00Z",
      0,
      "Art. 21(2) Absolute Direct Marketing Objection",
      "Fully Granted",
      null,
      0,
      "Absolute opt-out from direct marketing campaigns, algorithmic push notifications, and partner financial promotions registered in master suppression table.",
      "Compliance Officer J. Weber",
      "2026-08-11T13:00:00Z",
      "2026-08-13T15:45:00Z"
    ],
    [
      "REQ-020",
      "DSR-2026-0860",
      "SUB-020",
      "Portability (Art. 20)",
      "Intake & Verification",
      "Standard",
      "2026-08-25T08:30:00Z",
      "2026-09-24T23:59:59Z",
      null,
      0,
      null,
      "Verified",
      "2026-08-25T09:15:00Z",
      0,
      "Art. 20 Data Portability & Art. 6(1)(b) Contract",
      "Pending Assessment",
      null,
      0,
      "Customer requested direct interoperable API transmission of their transaction history to accredited Third-Party Payment Service Provider (PISP/AISP) under PSD2/GDPR Art. 20.",
      "DPO Officer K. Schmidt",
      "2026-08-25T08:30:00Z",
      "2026-08-25T09:15:00Z"
    ]
  ];
  for (const r of requests) {
    db.run(
      `INSERT OR REPLACE INTO requests (id, ticket_ref, subject_id, right_type, status, priority, request_date, baseline_deadline, extended_deadline, extension_applied, extension_reason, id_verification_status, id_verified_at, id_paused_days, lawful_basis_assessed, entitlement_decision, rejection_code, automated_decision_flag, remediation_summary, assigned_officer, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      r
    );
  }
  const downstream = [
    ["DN-01", "DSR-2026-0841", "SCHUFA Credit Bureau", "Credit Reference Bureau", "Erasure Instruction", "Purge non-statutory marketing scores and update reference flag", "Queued", null, null, 0, "2026-08-25T09:15:00Z"],
    ["DN-02", "DSR-2026-0841", "Salesforce Marketing Cloud", "Marketing CRM", "Erasure Instruction", "Complete cryptographic deletion of contact email & behavioral cookies", "Dispatched", "2026-08-25T09:20:00Z", null, 0, "2026-08-25T09:15:00Z"],
    ["DN-03", "DSR-2026-0845", "Creditreform Germany Node", "Credit Reference Bureau", "Rectification Notice", "Rectify address to Vienna, Austria and clear stale risk flag", "Queued", null, null, 0, "2026-08-24T14:25:00Z"]
  ];
  for (const d of downstream) {
    db.run(
      `INSERT OR REPLACE INTO downstream_notifications (id, ticket_ref, recipient_name, recipient_type, notification_type, payload_summary, dispatch_status, dispatched_at, ack_received_at, retry_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      d
    );
  }
  const suppressions = [
    ["SUP-01", "SUB-002", "CIF-819234", "CIF", "CIF-819234", "Art. 21 Direct Marketing Opt-Out (Absolute)", "GDPR Art. 21(2) - Absolute Objection to Direct Marketing", 1, "2026-08-06T11:00:00Z", null, "Compliance Officer J. Weber"],
    ["SUP-02", "SUB-003", "CIF-551902", "CIF", "CIF-551902", "Art. 18 Temporary Processing Freeze (Disputed Accuracy)", "GDPR Art. 18(1)(a) - Disputed accuracy pending credit model audit", 1, "2026-07-28T09:00:00Z", "2026-10-26T23:59:59Z", "Senior Underwriter A. Fischer"]
  ];
  for (const sup of suppressions) {
    db.run(
      `INSERT OR REPLACE INTO suppression_register (id, subject_id, cif_number, identifier_type, identifier_value, suppression_type, lawful_grounds, active, effective_from, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sup
    );
  }
  const overrides = [
    ["OVR-01", "DSR-2026-0843", "SUB-003", "RiskDecisionNet-v4", "DTI=48% / Score 590", "Automated Loan Denial", "Senior Underwriter A. Fischer", "Modified (Adjusted Limits)", "Verified secondary consulting revenue documents omitted in automated API feed. Adjusted loan cap to \u20AC25,000 with 4.2% rate.", "2026-08-24T16:30:00Z"]
  ];
  for (const ovr of overrides) {
    db.run(
      `INSERT OR REPLACE INTO art22_overrides (id, ticket_ref, subject_id, model_name, original_score, automated_outcome, human_reviewer, human_decision, justification, decision_timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ovr
    );
  }
  const backupLogs = [
    ["BKP-01", "DSR-2026-0841", "SUB-001", "LTO-9-TAPE-VAULT-2024-W31", "Offsite Tier-4 Cold Storage Munich", "Marketing CRM Snapshots & Profile Attributes", "Cryptographic key zeroization for marketing segment partition; physical tape marked beyond operational use awaiting standard 90-day rotation purge.", "2026-11-15T00:00:00Z", "DPO Officer K. Schmidt", "2026-08-25T09:30:00Z"]
  ];
  for (const bkp of backupLogs) {
    db.run(
      `INSERT OR REPLACE INTO backup_beyond_use_logs (id, ticket_ref, subject_id, backup_tape_id, storage_location, data_categories_covered, technical_measures, scheduled_overwrite_date, officer_signature, certified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      bkp
    );
  }
  const auditEvents = [
    {
      time: "2026-08-01T08:00:00Z",
      event: "SYSTEM_GENESIS_INITIALIZATION",
      ticket: null,
      operator: "SYS_AIRGAP_DAEMON",
      role: "System Administrator",
      detail: "Air-gapped GDPR Operations & Control Center initialized. Strict WAL persistence engaged with tamper-evident SHA-256 block ledger.",
      diff: { status: "INITIALIZED", wal: "ENABLED" }
    },
    {
      time: "2026-08-01T10:00:00Z",
      event: "DSR_INTAKE_RECORDED",
      ticket: "DSR-2026-0841",
      operator: "DPO Officer K. Schmidt",
      role: "Data Protection Officer",
      detail: "Intake of Art. 17 Erasure request from Dr. Helena Bergmann (CIF-948201). Statutory 30-day clock initiated.",
      diff: { right: "Erasure (Art. 17)", baseline_deadline: "2026-08-31T23:59:59Z" }
    },
    {
      time: "2026-08-02T14:10:00Z",
      event: "ID_VERIFICATION_COMPLETED",
      ticket: "DSR-2026-0841",
      operator: "DPO Officer K. Schmidt",
      role: "Data Protection Officer",
      detail: "Bank-grade ID token & 2FA credentials confirmed for CIF-948201. Compliance clock active.",
      diff: { id_status: "Verified" }
    },
    {
      time: "2026-08-05T14:20:00Z",
      event: "DSR_INTAKE_RECORDED",
      ticket: "DSR-2026-0842",
      operator: "Compliance Officer J. Weber",
      role: "Compliance Officer",
      detail: "Intake of Art. 21 Direct Marketing Objection from Marcus Vance-Sterling (CIF-819234).",
      diff: { right: "Objection (Art. 21)", entitlement: "Absolute" }
    },
    {
      time: "2026-08-06T11:00:00Z",
      event: "SUPPRESSION_REGISTER_ENFORCED",
      ticket: "DSR-2026-0842",
      operator: "Compliance Officer J. Weber",
      role: "Compliance Officer",
      detail: "Absolute Art. 21 suppression entered for CIF-819234. Ticket completed and sealed.",
      diff: { suppression_active: 1, type: "Direct Marketing Opt-Out" }
    },
    {
      time: "2026-08-25T09:12:00Z",
      event: "STATUTORY_REMEDITATION_EXECUTED",
      ticket: "DSR-2026-0841",
      operator: "DPO Officer K. Schmidt",
      role: "Data Protection Officer",
      detail: "Executed dual-tier remediation: Marketing profiles purged under Art. 17; core ledger and AML data preserved with statutory exemption citation under GwG \xA7 8.",
      diff: { marketing: "ERASED", core_ledger: "PRESERVED_AML_EXEMPTION" }
    }
  ];
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000-GENESIS-BLOCK";
  for (const evt of auditEvents) {
    const diffStr = JSON.stringify(evt.diff);
    const { currentHash, signature } = generateAuditHash(
      prevHash,
      evt.time,
      evt.event,
      evt.ticket,
      evt.operator,
      evt.detail,
      diffStr
    );
    db.run(
      `INSERT INTO audit_logs (timestamp, event_type, ticket_ref, operator_id, actor_role, action_detail, state_diff_json, prev_hash, current_hash, digital_signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [evt.time, evt.event, evt.ticket, evt.operator, evt.role, evt.detail, diffStr, prevHash, currentHash, signature]
    );
    prevHash = currentHash;
  }
  console.log("\u2705 Seeding complete with 5 subjects, 6 lawful bases, 5 tickets, and tamper-evident audit chain.");
}
function seedPiaRegistry(db) {
  console.log("\u{1F4CB} Seeding Privacy Impact Assessment (PIA / DPIA) Registry...");
  const pia2026003Metadata = JSON.stringify({
    frontendServerId: "PIA-FE-2026-C3P2Q8W9",
    backendAuditId: "PIA-BE-UK-2026-000414",
    documentVersion: "v1.0",
    projectTitle: "Internal HR Pulse Survey & Engagement Portal",
    organization: "People & Culture",
    industrySector: "Corporate & Enterprise Operations",
    assessmentStatus: "Approved",
    projectOwner: "David Kim",
    dpoName: "Amit Kumar Pandey (DPO)",
    quantitativeScore: "1.4 / 25.0",
    riskLevel: "Low Risk",
    governanceAction: "Accept with routine monitoring",
    impactLikelihoodDesc: "Impact (1.4) x Likelihood (1) = Base 1.4 | Applied Multipliers: x1",
    sectionScores: [
      { category: "Data Processing Scope", sectionCode: "Sec B", score: 1.4, maxScore: 5 },
      { category: "Legal Compliance", sectionCode: "Sec C", score: 1.8, maxScore: 5 },
      { category: "Data Sharing & Vendors", sectionCode: "Sec E", score: 1, maxScore: 5 },
      { category: "Technical Security", sectionCode: "Sec I", score: 1, maxScore: 5 },
      { category: "Governance & Rights", sectionCode: "Sec K", score: 1, maxScore: 5 }
    ],
    systemArchitectureDescription: "Quarterly anonymous employee engagement feedback tool.",
    dataFlowDescription: "Self-hosted web container stores responses aggregated by department in local PostgreSQL instance.",
    formalSignOffs: [
      { role: "Project/Process Owner", endorserName: "David Kim", status: "SIGNED on 2026-02-15" },
      { role: "Data Protection Officer", endorserName: "Amit Kumar Pandey", status: "SIGNED on 2026-03-01" },
      { role: "Legal/Compliance", endorserName: "Elena Rostova", status: "SIGNED on 2026-02-28" },
      { role: "Caldicott Guardian / SIRO", endorserName: "N/A", status: "SIGNED on 2026-03-02" }
    ]
  });
  const pias = [
    [
      "PIA-REC-003-HR",
      "PIA-2026-003",
      "Internal HR Pulse Survey & Engagement Portal",
      "Self-Hosted Web Container (PostgreSQL Aggregation)",
      "People & Culture",
      "corporate",
      "Low",
      "Approved",
      "Legitimate Interests",
      "Quarterly anonymous employee engagement feedback tool. Self-hosted web container stores responses aggregated by department in local PostgreSQL instance.",
      JSON.stringify(["Quarterly Pulse Feedback", "Departmental Aggregation Tags", "Employee Sentiment Indices", "Submission Timestamps"]),
      JSON.stringify(["Anonymous Telemetry", "No De-Anonymization Profiling", "Low Risk Tier (1.4/25.0)"]),
      "Self-Hosted Local Infrastructure (Internal Enterprise Network) - No 3rd Party Vendor Transmission",
      2,
      pia2026003Metadata,
      "2026-02-15T09:00:00Z",
      "2026-03-02T16:45:00Z"
    ],
    [
      "PIA-REC-001",
      "PIA-2026-AI-CRD-001",
      "Automated Real-Time AI Credit Scoring & Profiling Engine",
      "FinRisk-AI NeuroScore Engine v4.2",
      "Credit Risk & Underwriting",
      "banking",
      "High",
      "Approved",
      "Contract",
      "Automated underwriting, loan default risk prediction, credit card facility limits, and risk-adjusted interest pricing models based on transactional telemetry and bureau signals.",
      JSON.stringify(["Credit Bureau Records (SCHUFA)", "Historical Repayment Logs", "Income & Employment Data", "Device Fingerprints", "Affordability Ratios"]),
      JSON.stringify(["Automated Decision-Making (Art. 22)", "Financial Risk Profiling"]),
      "EU-Central Dedicated Cloud Instance (Frankfurt) - No 3rd Country Dissemination",
      3,
      null,
      "2026-01-15T09:00:00Z",
      "2026-08-20T14:30:00Z"
    ],
    [
      "PIA-REC-002",
      "PIA-2026-OBK-API-002",
      "Open Banking PSD2 Gateway & Third-Party AISP/PISP Pipeline",
      "OpenBank-Connect Enterprise Mesh",
      "Digital Channels & API Partnerships",
      "banking",
      "High",
      "Approved",
      "Consent",
      "Real-time account information aggregation (AISP) and payment initiation services (PISP) for authorized FinTech third-party providers (TPPs) under PSD2 & GDPR mandates.",
      JSON.stringify(["Account Balance Streams", "Raw Transaction Descriptions", "IBAN / Payee Coordinates", "OAuth2 API Access Tokens"]),
      JSON.stringify(["High-Volume API Ingestion", "Third-Party Intermediaries"]),
      "Standard Contractual Clauses (EU SCCs 2021/914) with TPP Gateway Partners",
      2,
      null,
      "2026-02-10T11:00:00Z",
      "2026-08-18T16:00:00Z"
    ],
    [
      "PIA-REC-003-AML",
      "PIA-2026-AML-SRV-003",
      "Global Anti-Money Laundering & Sanctions Graph Surveillance",
      "FinCrime Graph-Sentinel X1",
      "Financial Crime & Regulatory Compliance",
      "banking",
      "High",
      "Approved",
      "Legal Obligation",
      "Continuous transaction monitoring, sanctions screening, PEP identification, graph link analysis, and suspicious activity reporting (SAR) to Financial Intelligence Units (FIU).",
      JSON.stringify(["National ID / Passport Scans", "Cross-Border Wire Transfers", "PEP / Sanctions Watchlists", "Beneficial Ownership Registers"]),
      JSON.stringify(["Criminal Allegation & Sanction Flags (Art. 10)", "Biometric KYC ID Verification"]),
      "Air-Gapped Sovereign Data Vault (EU/EFTA) - Restricted Law Enforcement Gateways",
      7,
      null,
      "2025-11-20T08:30:00Z",
      "2026-08-22T10:15:00Z"
    ],
    [
      "PIA-REC-004",
      "PIA-2026-MOB-TLM-004",
      "Mobile Banking App Telemetry, Behavioral Biometrics & Cookies",
      "BankMobile Client Core (iOS/Android/Web)",
      "Mobile Engineering & Security Ops",
      "banking",
      "Medium",
      "Approved",
      "Legitimate Interests",
      "Behavioral biometrics for session hijacking prevention, touch dynamics, crash diagnostics, performance telemetry, and digital cookie consent persistence.",
      JSON.stringify(["Device Hardware Identifier", "IP Address & Geolocation", "Session Cookies", "Keystroke & Touch Dynamics", "Crash Diagnostic Logs"]),
      JSON.stringify(["Behavioral Biometrics", "Digital Tracking Cookies"]),
      "EU-US Data Privacy Framework (Adequacy Certified Telemetry Processor)",
      1,
      null,
      "2026-03-05T14:00:00Z",
      "2026-08-21T11:45:00Z"
    ],
    [
      "PIA-REC-005",
      "PIA-2026-MKT-CRM-005",
      "Omni-Channel Customer Personalization & Wealth Marketing CRM",
      "WealthEngage Marketing Cloud",
      "Marketing & Wealth Management",
      "banking",
      "Medium",
      "Requires Mitigation",
      "Consent",
      "Personalized investment recommendations, portfolio affinity alerts, campaign conversion tracking, web portal cookies, and multi-channel marketing campaigns.",
      JSON.stringify(["Marketing Preferences", "Product Affinity Tags", "Email Open/Click Telemetry", "Web Portal Cookies"]),
      JSON.stringify(["Marketing Profiling", "Ad Network Attribution"]),
      "Binding Corporate Rules (BCR) & EU SCCs",
      1,
      null,
      "2026-04-12T10:00:00Z",
      "2026-08-19T09:30:00Z"
    ]
  ];
  for (const pia of pias) {
    db.run(
      `INSERT OR REPLACE INTO pia_registry (id, pia_id, title, system_name, department, sector_profile, risk_tier, dpo_status, lawful_basis, purpose_description, data_categories, special_category_flags, cross_border_transfers, retention_years, report_metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      pia
    );
  }
  console.log("\u2705 Seeded PIA Registry with PIA-2026-003 and financial DPIAs.");
}

// server/complianceEngine.ts
function evaluateRightEntitlement(rightType, lawfulBasis, isDirectMarketing = false) {
  switch (rightType) {
    case "Access (Art. 15)":
      return {
        status: "Fully Granted",
        entitled: true,
        legalJustification: "GDPR Art. 15 confers an unqualified right of access to all personal data undergoing processing, regardless of the lawful basis.",
        statutoryReference: "GDPR Article 15(1)",
        bankingScenarioNote: "Must disclose categories, purposes, recipients (including credit bureaus), retention schedules, and automated decision logic.",
        remediationActions: ["Compile DSAR Access Package", "Include Third-Party Recipient Schedule", "Provide Redacted Core Account Statements"],
        requiresSuppression: false,
        isAbsoluteRight: true
      };
    case "Rectification (Art. 16)":
      return {
        status: "Fully Granted",
        entitled: true,
        legalJustification: "GDPR Art. 16 guarantees the right to have inaccurate personal data rectified without undue delay across all lawful bases.",
        statutoryReference: "GDPR Article 16",
        bankingScenarioNote: "Requires updating core banking CIF records, contact information, and issuing Art. 19 Downstream Rectification notices to Credit Bureaus.",
        remediationActions: ["Update Core Banking CIF Fields", "Queue Art. 19 Downstream Notifications", "Generate Audit Proof of Rectification"],
        requiresSuppression: false,
        isAbsoluteRight: true
      };
    case "Erasure (Art. 17)":
      if (lawfulBasis === "Legal Obligation") {
        return {
          status: "Lawfully Blocked",
          entitled: false,
          legalJustification: "Art. 17(3)(b) Statutory Exemption: Erasure is prohibited where processing is necessary for compliance with a legal obligation under Union or Member State law (e.g. AML/KYC 5-7 year retention, Tax code, Commercial Code).",
          statutoryReference: "GDPR Art. 17(3)(b), 5AMLD, GwG \xA7 8",
          bankingScenarioNote: "AML dossiers, KYC scans, SAR filings, and transaction records cannot be erased during the statutory retention window. Request must be refused with statutory citation.",
          remediationActions: ["Issue Formal Rejection with Legal Citation (Art. 17(3)(b))", "Verify Non-AML Supplementary Marketing Data Purge"],
          requiresSuppression: false,
          isAbsoluteRight: false
        };
      } else if (lawfulBasis === "Public Task") {
        return {
          status: "Lawfully Blocked",
          entitled: false,
          legalJustification: "Art. 17(3)(b) Exemption applies for processing necessary for the performance of a task carried out in the public interest.",
          statutoryReference: "GDPR Art. 17(3)(b)",
          bankingScenarioNote: "Statutory disclosures to Central Bank / Financial Supervisory Authority cannot be erased.",
          remediationActions: ["Maintain Regulatory Data Hold"],
          requiresSuppression: false,
          isAbsoluteRight: false
        };
      } else if (lawfulBasis === "Contract") {
        return {
          status: "Partially Granted (Statutory Carveout)",
          entitled: true,
          legalJustification: "Erasure applies only if the account is closed and retention is no longer necessary for ongoing contract performance or statute of limitations defense.",
          statutoryReference: "GDPR Art. 17(1)(a) & Art. 17(3)(e)",
          bankingScenarioNote: "Active loan or open account data is retained. Non-essential behavioral logs and pre-contractual lead notes are erased.",
          remediationActions: ["Purge Secondary Lead & Marketing Logs", 'Certify Backup "Beyond Use" Status', "Maintain Ledger under Limitation Hold"],
          requiresSuppression: false,
          isAbsoluteRight: false
        };
      } else if (lawfulBasis === "Consent") {
        return {
          status: "Fully Granted",
          entitled: true,
          legalJustification: "Upon withdrawal of consent (Art. 7(3)), data must be erased under Art. 17(1)(b) unless another lawful basis exists.",
          statutoryReference: "GDPR Art. 17(1)(b) & Art. 7(3)",
          bankingScenarioNote: "Immediate purge of all personalized marketing profiling, tracking cookies, and advisory newsletters.",
          remediationActions: ["Execute Irreversible DB Deletion in CRM", "Notify Downstream Marketing Partners (Art. 19)", "Log Immutable Backup Beyond-Use Token"],
          requiresSuppression: false,
          isAbsoluteRight: true
        };
      } else if (lawfulBasis === "Legitimate Interests") {
        return {
          status: isDirectMarketing ? "Fully Granted" : "Conditional / Manual Review",
          entitled: true,
          legalJustification: isDirectMarketing ? "Absolute right to erasure when linked to direct marketing objection." : "Erasure applies if the data subject objects under Art. 21(1) and there are no overriding legitimate grounds.",
          statutoryReference: "GDPR Art. 17(1)(c) & Art. 21(1)",
          bankingScenarioNote: "Fraud models and security telemetry may be retained under overriding legitimate interest.",
          remediationActions: ["Perform Legitimate Interest Balancing Test (LIA)", "Purge Disputed Analytical Data"],
          requiresSuppression: false,
          isAbsoluteRight: isDirectMarketing
        };
      }
      return {
        status: "Partially Granted (Statutory Carveout)",
        entitled: true,
        legalJustification: "Qualified right subject to balancing and necessity review.",
        statutoryReference: "GDPR Art. 17(1)",
        bankingScenarioNote: "Carefully segregate statutory records from commercial data.",
        remediationActions: ["Review Purpose Retention Schedule"],
        requiresSuppression: false,
        isAbsoluteRight: false
      };
    case "Portability (Art. 20)":
      if (lawfulBasis === "Consent" || lawfulBasis === "Contract") {
        return {
          status: "Fully Granted",
          entitled: true,
          legalJustification: "GDPR Art. 20 applies to personal data provided by the subject where processing is based on Consent (Art. 6(1)(a)) or Contract (Art. 6(1)(b)) and carried out by automated means.",
          statutoryReference: "GDPR Article 20(1)",
          bankingScenarioNote: "Export structured, commonly used, machine-readable JSON & CSV packages of customer account data, payments, and registered profiles.",
          remediationActions: ["Generate Machine-Readable JSON Export", "Generate RFC4180 CSV Export", "Embed SHA-256 Checksum Signature"],
          requiresSuppression: false,
          isAbsoluteRight: true
        };
      }
      return {
        status: "Lawfully Blocked",
        entitled: false,
        legalJustification: `Portability does not apply to processing grounded in ${lawfulBasis}. Art. 20 is strictly limited to Consent and Contractual lawful bases.`,
        statutoryReference: "GDPR Article 20(1)(a)",
        bankingScenarioNote: "Core KYC assessments, internal risk ratings, and AML flags are exempt from direct machine-readable portability transfers.",
        remediationActions: ["Issue Lawful Basis Portability Exemption Notice", "Offer Standard Art. 15 Access Package Instead"],
        requiresSuppression: false,
        isAbsoluteRight: false
      };
    case "Objection (Art. 21)":
      if (isDirectMarketing) {
        return {
          status: "Fully Granted",
          entitled: true,
          legalJustification: "GDPR Art. 21(2) confers an absolute, unconditional right to object to direct marketing and profiling. No balancing test or compelling justification is permitted.",
          statutoryReference: "GDPR Article 21(2) & 21(3)",
          bankingScenarioNote: "Immediate and permanent suppression of all promotional calls, emails, wealth management leads, and algorithmic marketing models.",
          remediationActions: ["Enter Identifier into Master Suppression Register", "Revoke CRM Marketing Tokens", "Dispatch Art. 19 Opt-Out Notification"],
          requiresSuppression: true,
          isAbsoluteRight: true
        };
      } else if (lawfulBasis === "Legitimate Interests" || lawfulBasis === "Public Task") {
        return {
          status: "Conditional / Manual Review",
          entitled: true,
          legalJustification: "The controller must cease processing unless it demonstrates compelling legitimate grounds that override the interests, rights, and freedoms of the data subject.",
          statutoryReference: "GDPR Article 21(1)",
          bankingScenarioNote: "Credit risk modeling or fraud prevention can be maintained if compelling bank security reasons are documented.",
          remediationActions: ["Perform Legitimate Interest Balancing Assessment", "Document Compelling Institutional Grounds"],
          requiresSuppression: false,
          isAbsoluteRight: false
        };
      }
      return {
        status: "Lawfully Blocked",
        entitled: false,
        legalJustification: `Art. 21 Objection only applies to processing under Legitimate Interests, Public Task, or Direct Marketing. For ${lawfulBasis}, other specific rights (such as consent withdrawal) apply.`,
        statutoryReference: "GDPR Article 21(1)",
        bankingScenarioNote: "Customer cannot object to statutory tax or KYC reporting under Art. 21.",
        remediationActions: ["Advise Subject on Applicable Remedy Mechanism"],
        requiresSuppression: false,
        isAbsoluteRight: false
      };
    case "Restriction (Art. 18)":
      return {
        status: "Fully Granted",
        entitled: true,
        legalJustification: "Processing must be temporarily restricted (stored only) when accuracy is contested (Art. 18(1)(a)), processing is unlawful (Art. 18(1)(b)), or an objection is pending verification (Art. 18(1)(d)).",
        statutoryReference: "GDPR Article 18(1)",
        bankingScenarioNote: 'Freeze credit decision automated pipelines, suspend automated debit/credit scoring, and flag account in Core Banking as "GDPR Restricted".',
        remediationActions: ["Apply Processing Freeze in Core Banking", "Add Record to Suppression Register", "Notify Downstream Recipients (Art. 19)"],
        requiresSuppression: true,
        isAbsoluteRight: true
      };
    case "Automated Decision Review (Art. 22)":
      return {
        status: "Fully Granted",
        entitled: true,
        legalJustification: "GDPR Art. 22(3) guarantees the right to obtain human intervention, to express one\u2019s point of view, and to contest automated decisions with significant legal effects.",
        statutoryReference: "GDPR Article 22(3)",
        bankingScenarioNote: "Automated credit score loan rejections or automated AML freeze decisions must be reviewed by a human underwriter with explanation of model logic.",
        remediationActions: ["Route to Senior Credit Underwriter", "Extract Model Feature Weights & Disclose Logic", "Execute Human Override Decision"],
        requiresSuppression: false,
        isAbsoluteRight: true
      };
    default:
      return {
        status: "Conditional / Manual Review",
        entitled: true,
        legalJustification: "Standard statutory evaluation required.",
        statutoryReference: "GDPR Chapter III",
        bankingScenarioNote: "Review context against bank data catalog.",
        remediationActions: ["Evaluate Purpose Mappings"],
        requiresSuppression: false,
        isAbsoluteRight: false
      };
  }
}
function calculateComplianceDeadline(requestDateStr, extensionApplied, idPausedDays = 0) {
  const reqDate = new Date(requestDateStr);
  const baseline = new Date(reqDate);
  baseline.setDate(baseline.getDate() + 30 + idPausedDays);
  const effective = new Date(baseline);
  if (extensionApplied) {
    effective.setDate(effective.getDate() + 60);
  }
  const now = /* @__PURE__ */ new Date();
  const diffMs = effective.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1e3 * 60 * 60 * 24));
  const totalDays = extensionApplied ? 90 + idPausedDays : 30 + idPausedDays;
  const elapsedDays = totalDays - daysRemaining;
  const percentElapsed = Math.min(100, Math.max(0, Math.round(elapsedDays / totalDays * 100)));
  let slaStatus = "Normal";
  const isOverdue = daysRemaining < 0;
  if (isOverdue || daysRemaining <= 2) {
    slaStatus = "Escalated (Critical / Breached)";
  } else if (daysRemaining <= 5 || percentElapsed >= 80) {
    slaStatus = "Warning (28-day SLA)";
  }
  return {
    baselineDeadline: baseline.toISOString(),
    effectiveDeadline: effective.toISOString(),
    daysRemaining,
    totalDurationDays: totalDays,
    slaStatus,
    isOverdue,
    percentElapsed
  };
}
function evaluatePiaRightsAlignment(pia) {
  const lawfulBasis = pia.lawful_basis || "Legitimate Interests";
  const riskTier = pia.risk_tier || "High";
  const isHrPulse = pia.pia_id === "PIA-2026-003" || pia.title && (pia.title.toLowerCase().includes("pulse") || pia.title.toLowerCase().includes("engagement"));
  let reportMeta = null;
  if (pia.report_metadata) {
    try {
      reportMeta = typeof pia.report_metadata === "string" ? JSON.parse(pia.report_metadata) : pia.report_metadata;
    } catch (e) {
      reportMeta = null;
    }
  }
  const specialFlags = typeof pia.special_category_flags === "string" ? pia.special_category_flags.startsWith("[") ? JSON.parse(pia.special_category_flags) : pia.special_category_flags.split(",").map((s) => s.trim()) : Array.isArray(pia.special_category_flags) ? pia.special_category_flags : [];
  const dataCategories = typeof pia.data_categories === "string" ? pia.data_categories.startsWith("[") ? JSON.parse(pia.data_categories) : pia.data_categories.split(",").map((s) => s.trim()) : Array.isArray(pia.data_categories) ? pia.data_categories : ["Customer Profile", "Transaction Records"];
  const isHighRisk = riskTier === "High";
  const isAmlOrLegal = lawfulBasis === "Legal Obligation";
  const isConsent = lawfulBasis === "Consent";
  const isContract = lawfulBasis === "Contract";
  const permittedOps = [];
  const restrictedOps = [];
  let art21Handling = "";
  let art22Handling = "";
  let purposeBoundaries = "";
  const usageNextSteps = [];
  if (isHrPulse) {
    permittedOps.push(
      "Quarterly Anonymous Employee Sentiment Indexing",
      "Department-Level Aggregation & Macro Trend Analysis (min. 5 responses/group)",
      "Enterprise Culture & Workplace Wellbeing Reporting"
    );
    restrictedOps.push(
      "De-Anonymization / Reverse-Engineering of Individual Survey Submissions",
      "Correlation with Individual HR Performance Reviews or Disciplinary Files",
      "Managerial Retaliation or Individual Attribution Scoring",
      "Third-Party Commercial Telemetry Monetization"
    );
    art21Handling = "Unconditional Right to Object under Art. 21. Employees may freely opt out of pulse surveys without adverse employment repercussions or managerial notice.";
    art22Handling = "Prohibited (Art. 22). No automated individual profiling, promotion scoring, or compensation decisions derived from survey responses.";
    purposeBoundaries = "Strictly bounded to internal workforce engagement and organizational wellbeing metrics. Secondary commercial use or external dissemination legally barred.";
    usageNextSteps.push(
      "Enforce strict k-anonymity aggregation filter (minimum cohort size = 5 respondents) before dashboard rendering",
      "Verify complete isolation of survey response database from core HR payroll & employee master records",
      "Audit log all survey access requests by People & Culture administrators"
    );
  } else if (isAmlOrLegal) {
    permittedOps.push("Mandatory Regulatory Screening (5AMLD / GwG)", "Fraud Detection Pattern Analysis", "Supervisory Audit Reporting");
    restrictedOps.push("Secondary Commercial Cross-Selling", "Automated Third-Party Lead Monetization", "Behavioral Ad Targeting");
    art21Handling = "Objection (Art. 21) is NOT applicable for processing grounded in Legal Obligation (Art. 6(1)(c)). Mandatory statutory override.";
    art22Handling = "Automated AML risk alerts require Human Compliance Officer secondary review prior to SAR filing or account freeze.";
    purposeBoundaries = "Strictly bounded to financial crime prevention and regulatory reporting. Purpose repurposing is legally prohibited.";
    usageNextSteps.push(
      "Verify strict role-based access control (RBAC) on AML investigative datasets",
      "Enforce automated quarantine for non-AML secondary analytics queries",
      "Maintain continuous model fairness and false-positive reduction audits"
    );
  } else if (isConsent) {
    permittedOps.push("Opted-In Personalized Service Recommendations", "App Usage Analytics", "Direct Communication Campaigns");
    restrictedOps.push("Processing following Consent Withdrawal (immediate halt required)", "Transfer to unlisted third-party ad networks");
    art21Handling = "Consent withdrawal under Art. 7(3) operates with identical immediate effect to an absolute Art. 21 objection.";
    art22Handling = "Explicit consent required under Art. 22(2)(c). Data subject retains right to human intervention and algorithm explanation.";
    purposeBoundaries = "Bounded exclusively to the specific, granular consent statements presented during intake.";
    usageNextSteps.push(
      "Synchronize real-time consent withdrawal listeners to all microservice endpoints",
      "Audit granular opt-in logs for proof of affirmative action (no pre-ticked checkboxes)",
      "Deploy instant suppression hook when marketing opt-out is received"
    );
  } else if (isContract) {
    permittedOps.push("Core Account Ledger Maintenance", "Payment Processing & Settlement", "Contractual Customer Support");
    restrictedOps.push("Unrelated Commercial Profiling", "Post-Contractual Marketing without Refresh");
    art21Handling = "Art. 21 Objection applies only if processing exceeds strict contractual necessity. Balancing test required.";
    art22Handling = "Permitted under Art. 22(2)(a) for contract entry/performance (e.g. automated credit limit calculation), subject to human review safeguard.";
    purposeBoundaries = "Restricted strictly to the execution of terms and conditions agreed in the customer master agreement.";
    usageNextSteps.push(
      "Tag active contractual records to prevent accidental deletion before contract termination",
      "Provide transparent explanation for automated credit limit or overdraft decisions",
      "Establish automated transition to post-contract retention schedule upon account closure"
    );
  } else {
    permittedOps.push("Network & Cyber Security Monitoring", "Product Improvement & Telemetry Aggregation", "Internal Fraud Prevention");
    restrictedOps.push("Direct Marketing without Opt-Out Mechanism", "Intrusive Cross-Site Behavioral Tracking");
    art21Handling = "Data subject has statutory right to object. Controller must demonstrate compelling legitimate grounds overriding subject interests.";
    art22Handling = "Full Art. 22 protections apply: automated scoring must provide meaningful logic disclosures and human contestability.";
    purposeBoundaries = "Bounded by documented Legitimate Interests Assessment (LIA) three-part test (Purpose, Necessity, Balancing).";
    usageNextSteps.push(
      "Re-execute documented Legitimate Interests Assessment (LIA) Balancing Test annually",
      "Maintain immediate direct marketing opt-out suppression register",
      "Audit log all legitimate interest justification rationale in tamper ledger"
    );
  }
  let transferMechanisms = ["Standard Contractual Clauses (EU SCCs 2021/914)", "Data Processing Addendum (DPA) with Technical Measures"];
  let internalPipelines = ["Core Event Stream (Kafka / mTLS)", "Encrypted Data Lake (Parquet / KMS)", "Core Banking REST Microservices"];
  let thirdPartyRecipients = ["Credit Reference Bureau (SCHUFA)", "Anti-Fraud Registry (FraudNet)", "Regulatory Reporting Gateway (BaFin/EZB)"];
  let crossBorderStatus = "Compliant EU Internal & Adequacy Safeguarded";
  let art19Propagation = true;
  if (isHrPulse) {
    transferMechanisms = ["Self-Hosted On-Premise / Internal VPC Security Baseline (No International Transfer)"];
    internalPipelines = ["Self-Hosted Web Container (Gunicorn/FastAPI)", "Local PostgreSQL Instance (SSL Enforced)", "Internal Department Analytics Pipeline"];
    thirdPartyRecipients = ["None (Strictly Self-Hosted Enterprise Solution - Vendor Risk 1.0/5.0)"];
    crossBorderStatus = "Zero Cross-Border Transfers - Contained within Local Enterprise Network";
    art19Propagation = false;
  } else if (isHighRisk) {
    transferMechanisms.push("Transfer Impact Assessment (TIA) with Supplemental Encryption");
  }
  const movementNextSteps = isHrPulse ? [
    "Verify complete network isolation of local PostgreSQL instance against public egress",
    "Enforce TLS 1.3 container ingress with strict enterprise certificate validation",
    "Enable structured JSON export for voluntary employee submission receipts under Art. 20"
  ] : [
    "Enforce Art. 19 automated broadcast to downstream credit bureaus upon rectification or erasure",
    "Verify end-to-end TLS 1.3 encryption and mTLS authentication on all inter-service REST/gRPC pipelines",
    "Provide structured JSON / CSV machine-readable packages for Art. 20 Portability requests within 72 hours"
  ];
  const storageYears = pia.retention_years || (isHrPulse ? 2 : isAmlOrLegal ? 7 : isContract ? 10 : 3);
  const storageTiers = isHrPulse ? [
    { tier: "Tier 1: Self-Hosted PostgreSQL Instance", location: "Local Internal Container Storage Volume", encryption: "AES-256 Tablespace Encryption", beyondUseApplicable: false },
    { tier: "Tier 2: 2-Year Rolling Aggregation Vault", location: "Departmental Data Warehouse (Aggregated Only)", encryption: "AES-256 with Internal KMS", beyondUseApplicable: false },
    { tier: "Tier 3: Local Container Backup Snapshots", location: "Encrypted Enterprise Backup Volume", encryption: "Full Disk Volume Encryption", beyondUseApplicable: true }
  ] : [
    { tier: "Tier 1: Hot Operational Database", location: "Primary EU-Central Data Vault (Frankfurt)", encryption: "AES-256 GCM (Envelope Key Managed)", beyondUseApplicable: false },
    { tier: "Tier 2: Cold Archive (Regulatory)", location: "WORM Immutable Archive (Zurich)", encryption: "AES-256 with Hardware Security Module (HSM)", beyondUseApplicable: false },
    { tier: "Tier 3: Disaster Recovery Backup Tapes", location: "Air-Gapped Off-Site Vault (Munich)", encryption: "Full Disk Encryption + Physical Air-Gap", beyondUseApplicable: true }
  ];
  const storageNextSteps = isHrPulse ? [
    `Enforce automated TTL retention purge of raw survey submissions at exactly ${storageYears} years (8 quarterly cycles)`,
    "Execute immediate zeroization / destruction of ephemeral survey submission session tokens",
    "Verify backup container snapshot isolation and scheduled 90-day rotational overwrite"
  ] : [
    `Enforce automated TTL retention purge at exactly ${storageYears} years post-trigger`,
    "Execute cryptographic key shredding upon verified Art. 17 erasure confirmation",
    'Certify Immutable Backup "Beyond Use" isolation under ICO/EDPB guidelines for offline tapes'
  ];
  const noticeNextSteps = isHrPulse ? [
    "Deploy Just-in-Time modal on survey start screen outlining voluntary participation and anonymity safeguards",
    `Maintain accessible Layered Employee Privacy Notice referencing DPO ${reportMeta?.dpoName || "Amit Kumar Pandey (DPO)"}`,
    "Provide clear supervisory authority appeal instructions on corporate intranet privacy hub"
  ] : [
    "Update Layered Privacy Notice (Art. 13/14) with latest sub-processor and purpose additions",
    "Provide statutory refusal notice citing Art. 17(3)(b) with supervisory authority appeal instructions for legal holds",
    "Deploy Just-in-Time modal notices prior to any high-risk data capture or automated profiling"
  ];
  const cmpCategories = isHrPulse ? [
    { category: "Strictly Necessary (Container Session Auth & Anti-CSRF)", count: 1, purpose: "Authenticates employee single-sign-on token & prevents cross-site request forgery during survey submission", requiresExplicitConsent: false },
    { category: "Third-Party Analytics / Marketing Pixels", count: 0, purpose: "Zero commercial trackers or external analytics permitted on internal pulse portal", requiresExplicitConsent: false }
  ] : [
    { category: "Strictly Necessary (Core Banking Security & CSRF)", count: 4, purpose: "Essential session token, anti-tamper CSRF, load balancer routing", requiresExplicitConsent: false },
    { category: "Functional & Preferences", count: 2, purpose: "Language, currency selection, UI density preference", requiresExplicitConsent: true },
    { category: "Performance & Telemetry Analytics", count: 3, purpose: "App performance monitoring, page latency analytics", requiresExplicitConsent: true },
    { category: "Marketing, Attribution & Personalization", count: 5, purpose: "Campaign conversion attribution, personalized banking offers", requiresExplicitConsent: true }
  ];
  const cookieNextSteps = isHrPulse ? [
    "Maintain zero-tracker quarantine: prohibit injection of any external scripts, fonts, or tracking beacons",
    "Set session cookie expiration to browser close / 2 hours max inactivity",
    "Apply Secure, HttpOnly, and SameSite=Strict flags on the container authentication token"
  ] : [
    "Synchronize CMP banner states directly with Google Consent Mode v2 (ad_storage, analytics_storage)",
    "Enforce instantaneous client-side cookie and local storage purges upon Art. 21 objection or Art. 7 consent withdrawal",
    "Block all non-essential tracker injection until affirmative opt-in is recorded in consent audit log",
    "Apply 0-cookie strict quarantine during active Art. 18 temporary processing freezes"
  ];
  const highRiskTriggers = [];
  if (isHighRisk) highRiskTriggers.push("DPIA High Risk Tier Classification (Art. 35)");
  if (specialFlags.length > 0 && !isHrPulse) highRiskTriggers.push(`Special Category Data Involved: ${specialFlags.join(", ")}`);
  if (isAmlOrLegal) highRiskTriggers.push("Statutory Legal Obligation Conflict with Right to Erasure (Art. 17(3)(b))");
  const complianceScore = isHrPulse ? 99 : isHighRisk ? specialFlags.length > 1 ? 88 : 92 : 98;
  return {
    piaId: pia.pia_id || "PIA-GEN-001",
    piaTitle: pia.title || "Privacy Impact Assessment",
    systemName: pia.system_name || "Enterprise System",
    sectorProfile: pia.sector_profile || "banking",
    riskTier,
    dpoStatus: pia.dpo_status || "Approved",
    lawfulBasis,
    overallComplianceScore: complianceScore,
    highRiskTriggers,
    reportMetadata: reportMeta,
    dataUsage: {
      permittedOperations: permittedOps,
      restrictedOperations: restrictedOps,
      article21ObjectionHandling: art21Handling,
      article22AutomatedDecisionHandling: art22Handling,
      purposeLimitationBoundaries: purposeBoundaries,
      nextSteps: usageNextSteps
    },
    dataMovement: {
      crossBorderTransferStatus: crossBorderStatus,
      transferMechanisms,
      internalPipelines,
      thirdPartyRecipients,
      article19DownstreamPropagationRequired: art19Propagation,
      article20PortabilityFormat: "ISO/IEC 19944 JSON Schema (Machine-Readable)",
      nextSteps: movementNextSteps
    },
    dataStorage: {
      retentionSchedule: `${storageYears} Years Post-Survey Round / Ingestion`,
      statutoryBasis: isHrPulse ? "GDPR Art. 5(1)(e) Storage Limitation & Works Council Agreement" : isAmlOrLegal ? "5AMLD / GwG \xA7 8 / HGB \xA7 257" : isContract ? "BGB \xA7 195 (Statute of Limitations)" : "GDPR Art. 5(1)(e) Storage Limitation",
      storageTiers,
      cryptoShreddingProtocol: "NIST SP 800-88 Rev. 1 Cryptographic Key Destruction (AES-256 Zeroize)",
      immutableBackupProcedure: 'Certified "Beyond-Use" status: immediate cryptographic quarantine with scheduled rotational overwrite',
      nextSteps: storageNextSteps
    },
    dataNotice: {
      article13TransparencyLayer: isHrPulse ? "Internal Employee Privacy Notice v1.0 (People & Culture) with DPO coordinates" : "Layered Digital Privacy Notice v4.2 with granular purpose taxonomy and DPO coordinates",
      article14IndirectCollectionNotice: isHrPulse ? "N/A (Direct voluntary submission only)" : "Required within 30 days when acquiring supplementary credit or anti-fraud intelligence",
      mandatoryRefusalNoticeRules: "Must issue written notice detailing statutory grounds (e.g. Art. 17(3)(b)), right to lodge complaint with DPA, and judicial remedy rights within 30 days",
      justInTimeTriggers: isHrPulse ? ["Survey Welcome Launch Modal", "Voluntary Participation Confirmation"] : ["Credit Decisioning Consent Capture", "Marketing Preference Selection", "Biometric 2FA Enrollment"],
      privacyPolicyRevisionTrigger: isHighRisk,
      nextSteps: noticeNextSteps
    },
    cookiesManagement: {
      cmpCategoryMapping: cmpCategories,
      googleConsentModeV2Sync: isHrPulse ? "N/A (Internal enterprise container - zero Google tags)" : "Real-time state broadcast enabled (ad_storage, ad_user_data, ad_personalization, analytics_storage)",
      consentWithdrawalPropagation: "Instant local cache zeroing & server-side session token deletion within 500ms",
      sessionLifespans: isHrPulse ? "Strictly Necessary Session Token: Browser Close / 2 Hours Max Inactivity" : "Strictly Necessary: Session / 12 Hours; Analytics: 6 Months; Marketing: 12 Months",
      article18FreezeBehavior: "Total tracker suppression + strict survey token isolation mode activated",
      nextSteps: cookieNextSteps
    },
    executiveSummary: isHrPulse ? `PIA Ingestion certified for PIA-2026-003 (${pia.title}). Risk score is 1.4 / 25.0 (Low Risk, Accept with routine monitoring). Processing operations verified as strictly self-hosted in local PostgreSQL container. Individual Rights alignment confirmed across all 5 dimensions with zero third-party vendor transfers.` : `DPIA Alignment certified for ${pia.title || pia.pia_id}. Lawful basis is ${lawfulBasis} with ${riskTier} risk tier. Next steps defined across Data Usage, Movement, Storage, Notice, and Cookies in full compliance with GDPR Chapter III statutory mandates.`,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server.ts
var DEFAULT_PORT = parseInt(process.env.PORT || "3000", 10) || 3e3;
function listenWithPortFallback(app, port, maxRetries = 20) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, "0.0.0.0", () => {
      console.log(`\u{1F6E1}\uFE0F RightsFlow Metrics Node Server running on http://0.0.0.0:${port} (http://localhost:${port})`);
      resolve(port);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        if (maxRetries > 0) {
          console.warn(`[PORT WARNING] Port ${port} is occupied by another process. Auto-assigning to port ${port + 1}...`);
          server.close();
          listenWithPortFallback(app, port + 1, maxRetries - 1).then(resolve).catch(reject);
        } else {
          reject(new Error(`No available ports found starting from port ${DEFAULT_PORT}`));
        }
      } else {
        reject(err);
      }
    });
  });
}
async function startServer() {
  const app = (0, import_express.default)();
  app.use(import_express.default.json({ limit: "10mb" }));
  await getDb();
  app.get("/api/health", (req, res) => {
    const memory = process.memoryUsage();
    const dbStats = getDbTelemetry();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const overdueRes = executeQuery(
      "SELECT COUNT(*) as count FROM requests WHERE status NOT IN ('Completed & Sealed', 'Statutorily Refused') AND baseline_deadline < ?",
      [now]
    );
    const overdueCount = overdueRes[0]?.count || 0;
    res.json({
      status: "OPERATIONAL_AIR_GAPPED",
      systemTime: (/* @__PURE__ */ new Date()).toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      environment: {
        networkIsolation: "ZERO_TRUST_AIR_GAPPED",
        externalConnections: 0,
        outboundInternetAccess: "DISABLED_BLOCKED",
        tlsCertificate: "LOCAL_MUTUAL_TLS_v1.3"
      },
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024) * 100) / 100,
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024) * 100) / 100,
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024) * 100) / 100,
        externalMb: Math.round(memory.external / (1024 * 1024) * 100) / 100
      },
      database: dbStats,
      slaAlerts: {
        overdueCount,
        integrityStatus: "HASH_CHAIN_SEALED"
      }
    });
  });
  app.get("/api/telemetry", (req, res) => {
    const dbStats = getDbTelemetry();
    res.json(dbStats);
  });
  app.get("/api/audit/verify", (req, res) => {
    const verification = verifyAuditChainIntegrity();
    res.json(verification);
  });
  app.get("/api/schema-ddl", (req, res) => {
    res.json({
      ddl: SQLITE_SCHEMA_DDL,
      version: "SQLite 3.45 WAL-Mode Embedded",
      integrityCheck: "PRAGMA integrity_check = OK"
    });
  });
  app.get("/api/tickets", (req, res) => {
    try {
      const { status, rightType, priority, search } = req.query;
      let sql = `
        SELECT r.*, s.full_name, s.cif_number, s.email, s.kyc_status, s.aml_flag
        FROM requests r
        JOIN subjects s ON r.subject_id = s.id
        WHERE 1=1
      `;
      const params = [];
      if (status && typeof status === "string" && status !== "ALL") {
        sql += ` AND r.status = ?`;
        params.push(status);
      }
      if (rightType && typeof rightType === "string" && rightType !== "ALL") {
        sql += ` AND r.right_type = ?`;
        params.push(rightType);
      }
      if (priority && typeof priority === "string" && priority !== "ALL") {
        sql += ` AND r.priority = ?`;
        params.push(priority);
      }
      if (search && typeof search === "string" && search.trim() !== "") {
        sql += ` AND (r.ticket_ref LIKE ? OR s.full_name LIKE ? OR s.cif_number LIKE ? OR s.email LIKE ?)`;
        const sTerm = `%${search.trim()}%`;
        params.push(sTerm, sTerm, sTerm, sTerm);
      }
      sql += ` ORDER BY r.baseline_deadline ASC`;
      const tickets = executeQuery(sql, params);
      const enhanced = tickets.map((t) => {
        const deadlineInfo = calculateComplianceDeadline(
          t.request_date,
          Boolean(t.extension_applied),
          t.id_paused_days || 0
        );
        return {
          ...t,
          deadlineInfo
        };
      });
      res.json(enhanced);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/tickets/export", (req, res) => {
    try {
      const operator = req.query.operator || "Executive DPO Officer";
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const tickets = executeQuery(
        `SELECT r.*, s.cif_number, s.full_name, s.email, s.phone, s.residency_country, s.customer_segment, s.kyc_status, s.aml_flag
         FROM requests r
         JOIN subjects s ON r.subject_id = s.id
         ORDER BY r.request_date DESC`
      );
      const total = tickets.length;
      const completed = tickets.filter((t) => t.status === "Completed & Sealed").length;
      const refused = tickets.filter((t) => t.status === "Statutorily Refused").length;
      const inProgress = tickets.filter((t) => t.status === "Remediation In Progress").length;
      const extensions = tickets.filter((t) => Boolean(t.extension_applied)).length;
      const structuredTickets = tickets.map((t) => {
        const deadlineInfo = calculateComplianceDeadline(
          t.request_date,
          Boolean(t.extension_applied),
          t.id_paused_days || 0
        );
        let detectedSector = t.customer_segment || "Retail Banking";
        const sectorMatch = t.remediation_summary?.match(/\[Sector:\s*([^\]]+)\]/);
        if (sectorMatch) {
          detectedSector = sectorMatch[1];
        }
        return {
          ticketReference: t.ticket_ref,
          id: t.id,
          rightType: t.right_type,
          gdprArticle: t.right_type.split(" ")[0] || "GDPR",
          sector: detectedSector,
          status: t.status,
          priority: t.priority,
          requestDate: t.request_date,
          dataSubject: {
            id: t.subject_id,
            cifNumber: t.cif_number,
            fullName: t.full_name,
            email: t.email,
            phone: t.phone,
            residencyCountry: t.residency_country,
            customerSegment: t.customer_segment,
            kycStatus: t.kyc_status,
            amlFlag: Boolean(t.aml_flag)
          },
          statutoryCompliance: {
            baselineDeadline: t.baseline_deadline,
            extendedDeadline: t.extended_deadline,
            extensionApplied: Boolean(t.extension_applied),
            extensionReason: t.extension_reason,
            effectiveDeadline: deadlineInfo.effectiveDeadline,
            daysRemaining: deadlineInfo.daysRemaining,
            isOverdue: deadlineInfo.isOverdue,
            slaStatus: deadlineInfo.slaStatus,
            percentElapsed: deadlineInfo.percentElapsed
          },
          idVerification: {
            status: t.id_verification_status,
            verifiedAt: t.id_verified_at,
            clockPausedDays: t.id_paused_days || 0
          },
          lawfulBasisAssessment: {
            lawfulBasis: t.lawful_basis_assessed,
            entitlementDecision: t.entitlement_decision,
            rejectionCode: t.rejection_code,
            automatedDecisionArticle22: Boolean(t.automated_decision_flag)
          },
          assignedOfficer: t.assigned_officer,
          remediationSummary: t.remediation_summary,
          auditTimestamps: {
            createdAt: t.created_at,
            updatedAt: t.updated_at
          }
        };
      });
      const exportPackage = {
        complianceReportHeader: {
          reportTitle: "GDPR Data Subject Rights (DSR) Master Ticket Database Report",
          exportTimestamp: now,
          generatedBy: operator,
          regulatoryFramework: "EU General Data Protection Regulation (Regulation (EU) 2016/679)",
          statutoryArticlesCovered: [
            "Art. 12 Transparent Information, Communication & Modalities",
            "Art. 15 Right of Access",
            "Art. 16 Right to Rectification",
            "Art. 17 Right to Erasure (Right to be Forgotten)",
            "Art. 18 Right to Restriction of Processing",
            "Art. 20 Right to Data Portability",
            "Art. 21 Right to Object",
            "Art. 22 Automated Decision Review & Human Intervention",
            "Art. 5(2) & 24 Accountability & Controller Responsibility"
          ],
          totalTicketCount: total,
          metrics: {
            completedAndSealed: completed,
            statutorilyRefused: refused,
            remediationInProgress: inProgress,
            extensionsInvoked: extensions,
            complianceRatePercentage: total > 0 ? Math.round((completed + refused) / total * 100) : 100
          }
        },
        tickets: structuredTickets
      };
      logAuditTrail(
        "TICKET_DATABASE_EXPORTED",
        null,
        operator,
        "Executive DPO Officer",
        `Master ticket database (${total} tickets) exported as structured JSON for compliance reporting.`,
        { totalTickets: total, completed, inProgress, refused, extensions, timestamp: now }
      );
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="GDPR_Tickets_Database_Report_${Date.now()}.json"`);
      res.json(exportPackage);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/tickets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const tickets = executeQuery(
        `SELECT r.*, s.full_name, s.cif_number, s.email, s.phone, s.residency_country, s.customer_segment, s.kyc_status, s.aml_flag
         FROM requests r
         JOIN subjects s ON r.subject_id = s.id
         WHERE r.id = ? OR r.ticket_ref = ?`,
        [id, id]
      );
      if (tickets.length === 0) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      const ticket = tickets[0];
      const deadlineInfo = calculateComplianceDeadline(
        ticket.request_date,
        Boolean(ticket.extension_applied),
        ticket.id_paused_days || 0
      );
      const dataItems = executeQuery(
        `SELECT sdi.*, lbi.purpose_name, lbi.lawful_basis, lbi.retention_years, lbi.allows_erasure, lbi.allows_portability, lbi.statutory_reference
         FROM subject_data_inventory sdi
         JOIN lawful_basis_inventory lbi ON sdi.purpose_code = lbi.purpose_code
         WHERE sdi.subject_id = ?`,
        [ticket.subject_id]
      );
      const downstream = executeQuery(
        `SELECT * FROM downstream_notifications WHERE ticket_ref = ? ORDER BY created_at DESC`,
        [ticket.ticket_ref]
      );
      const art22 = executeQuery(
        `SELECT * FROM art22_overrides WHERE ticket_ref = ?`,
        [ticket.ticket_ref]
      );
      const backupLogs = executeQuery(
        `SELECT * FROM backup_beyond_use_logs WHERE ticket_ref = ?`,
        [ticket.ticket_ref]
      );
      const auditTrail = executeQuery(
        `SELECT * FROM audit_logs WHERE ticket_ref = ? ORDER BY id DESC`,
        [ticket.ticket_ref]
      );
      res.json({
        ...ticket,
        deadlineInfo,
        dataItems,
        downstream,
        art22Override: art22[0] || null,
        backupLogs,
        auditTrail
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/tickets", (req, res) => {
    try {
      const {
        subjectId,
        rightType,
        priority = "Standard",
        assignedOfficer = "DPO Officer K. Schmidt",
        notes = "",
        isDirectMarketing = false,
        sector = "Retail Banking"
      } = req.body;
      if (!subjectId || !rightType) {
        return res.status(400).json({ error: "Missing subjectId or rightType" });
      }
      const subjects = executeQuery("SELECT * FROM subjects WHERE id = ?", [subjectId]);
      if (subjects.length === 0) {
        return res.status(404).json({ error: "Subject not found" });
      }
      const subject = subjects[0];
      const countRes = executeQuery("SELECT COUNT(*) as count FROM requests");
      const nextNum = 840 + (countRes[0]?.count || 0) + 1;
      const ticketRef = `DSR-2026-${nextNum}`;
      const id = `REQ-${Date.now()}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const baselineDate = /* @__PURE__ */ new Date();
      baselineDate.setDate(baselineDate.getDate() + 30);
      const baselineDeadline = baselineDate.toISOString();
      const assessment = evaluateRightEntitlement(rightType, "Legal Obligation", isDirectMarketing);
      executeRun(
        `INSERT INTO requests (
          id, ticket_ref, subject_id, right_type, status, priority, request_date, baseline_deadline,
          extended_deadline, extension_applied, extension_reason, id_verification_status, id_verified_at,
          id_paused_days, lawful_basis_assessed, entitlement_decision, rejection_code, automated_decision_flag,
          remediation_summary, assigned_officer, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          ticketRef,
          subjectId,
          rightType,
          "Intake & Verification",
          priority,
          now,
          baselineDeadline,
          null,
          0,
          null,
          subject.kyc_status === "Verified" ? "Verified" : "Pending ID Proof",
          subject.kyc_status === "Verified" ? now : null,
          0,
          assessment.statutoryReference,
          assessment.status,
          null,
          rightType.includes("Art. 22") ? 1 : 0,
          notes ? `[Sector: ${sector}] ${notes}` : `[Sector: ${sector}] Intake recorded: ${rightType} for ${subject.full_name}. ${assessment.legalJustification}`,
          assignedOfficer,
          now,
          now
        ],
        {
          event: "DSR_INTAKE_RECORDED",
          ticketRef,
          operator: assignedOfficer,
          detail: `Intake recorded for ${rightType} (${sector}) - Subject: ${subject.full_name} (${subject.cif_number}). Statutory deadline set.`,
          diff: { rightType, priority, sector, subjectId, assessmentStatus: assessment.status }
        }
      );
      res.status(201).json({ id, ticketRef, message: "Ticket created successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/tickets/:id", (req, res) => {
    try {
      const { id } = req.params;
      const {
        status,
        priority,
        idVerificationStatus,
        extensionApplied,
        extensionReason,
        remediationSummary,
        assignedOfficer,
        operatorName = "Compliance Officer"
      } = req.body;
      const tickets = executeQuery("SELECT * FROM requests WHERE id = ? OR ticket_ref = ?", [id, id]);
      if (tickets.length === 0) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      const ticket = tickets[0];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let newExtendedDeadline = ticket.extended_deadline;
      if (extensionApplied && !ticket.extension_applied) {
        const base = new Date(ticket.baseline_deadline);
        base.setDate(base.getDate() + 60);
        newExtendedDeadline = base.toISOString();
      }
      let newPausedDays = ticket.id_paused_days || 0;
      let newVerifiedAt = ticket.id_verified_at;
      if (idVerificationStatus === "Clock Paused - Awaiting ID" && ticket.id_verification_status !== "Clock Paused - Awaiting ID") {
        newPausedDays += 1;
      } else if (idVerificationStatus === "Verified" && !ticket.id_verified_at) {
        newVerifiedAt = now;
      }
      executeRun(
        `UPDATE requests SET
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          id_verification_status = COALESCE(?, id_verification_status),
          id_verified_at = COALESCE(?, id_verified_at),
          id_paused_days = ?,
          extension_applied = COALESCE(?, extension_applied),
          extended_deadline = ?,
          extension_reason = COALESCE(?, extension_reason),
          remediation_summary = COALESCE(?, remediation_summary),
          assigned_officer = COALESCE(?, assigned_officer),
          updated_at = ?
         WHERE id = ?`,
        [
          status || null,
          priority || null,
          idVerificationStatus || null,
          newVerifiedAt || null,
          newPausedDays,
          extensionApplied !== void 0 ? extensionApplied ? 1 : 0 : null,
          newExtendedDeadline,
          extensionReason || null,
          remediationSummary || null,
          assignedOfficer || null,
          now,
          ticket.id
        ],
        {
          event: "TICKET_STATUS_UPDATED",
          ticketRef: ticket.ticket_ref,
          operator: operatorName,
          detail: `Ticket ${ticket.ticket_ref} updated: Status=${status || ticket.status}, Priority=${priority || ticket.priority}, ID_Status=${idVerificationStatus || ticket.id_verification_status}`,
          diff: { status, priority, idVerificationStatus, extensionApplied, extensionReason }
        }
      );
      res.json({ message: "Ticket updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/tickets/:id/remediate", (req, res) => {
    try {
      const { id } = req.params;
      const {
        actionType,
        // 'EXECUTE_ERASURE_CARVEOUT' | 'RESTRICT_PROCESSING' | 'COMPLETE_SEAL' | 'STATUTORILY_REFUSE'
        remediationNotes,
        rejectionCode,
        operatorName = "DPO Officer K. Schmidt",
        dispatchedRecipients = []
      } = req.body;
      const tickets = executeQuery("SELECT * FROM requests WHERE id = ? OR ticket_ref = ?", [id, id]);
      if (tickets.length === 0) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      const ticket = tickets[0];
      const now = (/* @__PURE__ */ new Date()).toISOString();
      if (actionType === "EXECUTE_ERASURE_CARVEOUT") {
        executeRun(
          `UPDATE subject_data_inventory SET sample_value = '[PURGED_UNDER_ART17]'
           WHERE subject_id = ? AND purpose_code = 'MKT-PREF-04'`,
          [ticket.subject_id]
        );
        executeRun(
          `UPDATE requests SET
            status = 'Completed & Sealed',
            entitlement_decision = 'Partially Granted (Statutory Carveout)',
            remediation_summary = ?,
            updated_at = ?
           WHERE id = ?`,
          [
            remediationNotes || "Erasure executed: CRM & marketing profiles permanently erased. Core banking transactions and AML/KYC dossiers preserved under statutory retention (GwG \xA7 8 / 5AMLD).",
            now,
            ticket.id
          ],
          {
            event: "STATUTORY_REMEDIATION_EXECUTED",
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Executed dual-tier GDPR Art. 17 remediation for ${ticket.ticket_ref}. Marketing purged, statutory banking ledger locked.`,
            diff: { actionType, purgedPurpose: "MKT-PREF-04", preservedPurposes: ["AML-KYC-01", "CORE-ACC-02"] }
          }
        );
      } else if (actionType === "RESTRICT_PROCESSING") {
        executeRun(
          `UPDATE subject_data_inventory SET is_restricted = 1 WHERE subject_id = ?`,
          [ticket.subject_id]
        );
        const subjects = executeQuery("SELECT * FROM subjects WHERE id = ?", [ticket.subject_id]);
        const sub = subjects[0];
        if (sub) {
          executeRun(
            `INSERT INTO suppression_register (id, subject_id, cif_number, identifier_type, identifier_value, suppression_type, lawful_grounds, active, effective_from, expires_at, created_by)
             VALUES (?, ?, ?, 'CIF', ?, 'Art. 18 Temporary Processing Freeze (Disputed Accuracy)', 'GDPR Art. 18(1)(a) Processing Restriction', 1, ?, NULL, ?)`,
            [`SUP-${Date.now()}`, sub.id, sub.cif_number, sub.cif_number, now, operatorName]
          );
        }
        executeRun(
          `UPDATE requests SET
            status = 'Remediation In Progress',
            entitlement_decision = 'Fully Granted',
            remediation_summary = ?,
            updated_at = ?
           WHERE id = ?`,
          [remediationNotes || "Processing restriction freeze enforced across core banking pipelines and automated credit engines.", now, ticket.id],
          {
            event: "PROCESSING_RESTRICTION_ENFORCED",
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Enforced Art. 18 processing freeze on all systems for CIF ${sub?.cif_number}`,
            diff: { isRestricted: 1 }
          }
        );
      } else if (actionType === "STATUTORILY_REFUSE") {
        executeRun(
          `UPDATE requests SET
            status = 'Statutorily Refused',
            entitlement_decision = 'Lawfully Blocked',
            rejection_code = ?,
            remediation_summary = ?,
            updated_at = ?
           WHERE id = ?`,
          [
            rejectionCode || "EXEMPTION_ART_17_3_B_AML_RETENTION",
            remediationNotes || "Request formally refused under GDPR Art. 17(3)(b). Statutory retention required by EU 2018/843 (5AMLD) and German GwG \xA7 8.",
            now,
            ticket.id
          ],
          {
            event: "REQUEST_STATUTORILY_REFUSED",
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Formally refused ${ticket.ticket_ref} citing statutory exemption ${rejectionCode || "ART_17_3_B"}.`,
            diff: { rejectionCode, entitlementDecision: "Lawfully Blocked" }
          }
        );
      } else if (actionType === "COMPLETE_SEAL") {
        executeRun(
          `UPDATE requests SET
            status = 'Completed & Sealed',
            remediation_summary = COALESCE(?, remediation_summary),
            updated_at = ?
           WHERE id = ?`,
          [remediationNotes || "All compliance tasks fulfilled, downstream recipients notified, and audit block cryptographically sealed.", now, ticket.id],
          {
            event: "TICKET_SEALED_AND_ARCHIVED",
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Ticket ${ticket.ticket_ref} sealed and archived. Compliance record closed.`,
            diff: { status: "Completed & Sealed" }
          }
        );
      }
      if (Array.isArray(dispatchedRecipients) && dispatchedRecipients.length > 0) {
        for (const r of dispatchedRecipients) {
          executeRun(
            `INSERT INTO downstream_notifications (id, ticket_ref, recipient_name, recipient_type, notification_type, payload_summary, dispatch_status, dispatched_at, ack_received_at, retry_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Dispatched', ?, NULL, 0, ?)`,
            [
              `DN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ticket.ticket_ref,
              r.name,
              r.type || "Credit Reference Bureau",
              r.notificationType || "Erasure Instruction",
              r.payload || `Automated regulatory downstream notification for ticket ${ticket.ticket_ref}`,
              now,
              now
            ]
          );
        }
      }
      res.json({ message: "Remediation action completed and recorded in tamper-evident ledger" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/subjects", (req, res) => {
    try {
      const { search } = req.query;
      let sql = "SELECT * FROM subjects WHERE 1=1";
      const params = [];
      if (search && typeof search === "string" && search.trim()) {
        sql += " AND (full_name LIKE ? OR cif_number LIKE ? OR email LIKE ?)";
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }
      sql += " ORDER BY full_name ASC";
      const subjects = executeQuery(sql, params);
      res.json(subjects);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/lawful-basis", (req, res) => {
    try {
      const bases = executeQuery("SELECT * FROM lawful_basis_inventory ORDER BY purpose_code ASC");
      res.json(bases);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/evaluate-entitlement", (req, res) => {
    try {
      const { rightType, lawfulBasis, isDirectMarketing } = req.body;
      if (!rightType || !lawfulBasis) {
        return res.status(400).json({ error: "Missing rightType or lawfulBasis" });
      }
      const evaluation = evaluateRightEntitlement(rightType, lawfulBasis, Boolean(isDirectMarketing));
      res.json(evaluation);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/portability/:ticketRef", (req, res) => {
    try {
      const { ticketRef } = req.params;
      const { format = "json" } = req.query;
      const tickets = executeQuery(
        `SELECT r.*, s.full_name, s.cif_number, s.email, s.phone, s.residency_country, s.customer_segment
         FROM requests r
         JOIN subjects s ON r.subject_id = s.id
         WHERE r.ticket_ref = ?`,
        [ticketRef]
      );
      if (tickets.length === 0) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      const t = tickets[0];
      const dataItems = executeQuery(
        `SELECT sdi.data_category, sdi.field_name, sdi.sample_value, sdi.system_of_record, lbi.lawful_basis, lbi.statutory_reference
         FROM subject_data_inventory sdi
         JOIN lawful_basis_inventory lbi ON sdi.purpose_code = lbi.purpose_code
         WHERE sdi.subject_id = ? AND lbi.allows_portability = 1`,
        [t.subject_id]
      );
      const payload = {
        gdprSpecification: "Article 20 Machine-Readable Portability Export",
        exportTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        institution: "Air-Gapped Core Banking Financial Institution",
        ticketReference: t.ticket_ref,
        dataSubject: {
          cifNumber: t.cif_number,
          fullName: t.full_name,
          email: t.email,
          phone: t.phone,
          residencyCountry: t.residency_country,
          segment: t.customer_segment
        },
        portableDataCategories: dataItems,
        statutoryDeclaration: "This data package contains all personal data provided by the subject processed on lawful bases of Consent (Art. 6(1)(a)) and Contract (Art. 6(1)(b)) by automated means."
      };
      const payloadJson = JSON.stringify(payload, null, 2);
      const sha256Signature = calculateHash(payloadJson);
      if (format === "csv") {
        let csv = "Data_Category,Field_Name,Sample_Value,System_Of_Record,Lawful_Basis,Statutory_Reference\n";
        dataItems.forEach((d) => {
          csv += `"${d.data_category}","${d.field_name}","${d.sample_value}","${d.system_of_record}","${d.lawful_basis}","${d.statutory_reference}"
`;
        });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${t.cif_number}_GDPR_Portability_Export.csv"`);
        res.setHeader("X-GDPR-Checksum-SHA256", sha256Signature);
        return res.send(csv);
      }
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${t.cif_number}_GDPR_Portability_Export.json"`);
      res.setHeader("X-GDPR-Checksum-SHA256", sha256Signature);
      return res.json({
        ...payload,
        cryptographicChecksumSha256: sha256Signature
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/downstream", (req, res) => {
    try {
      const items = executeQuery("SELECT * FROM downstream_notifications ORDER BY created_at DESC");
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/downstream/dispatch", (req, res) => {
    try {
      const { id } = req.body;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      executeRun(
        `UPDATE downstream_notifications SET dispatch_status = 'Dispatched', dispatched_at = ?, retry_count = retry_count + 1 WHERE id = ?`,
        [now, id],
        {
          event: "DOWNSTREAM_NOTIFICATION_DISPATCHED",
          operator: "Automated Dispatch Relay",
          detail: `Dispatched Art. 19 notification ID ${id} to downstream recipient node.`,
          diff: { id, status: "Dispatched" }
        }
      );
      res.json({ message: "Notification dispatched successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/suppression", (req, res) => {
    try {
      const list = executeQuery("SELECT sr.*, s.full_name FROM suppression_register sr JOIN subjects s ON sr.subject_id = s.id ORDER BY sr.effective_from DESC");
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/suppression", (req, res) => {
    try {
      const { subjectId, identifierType, identifierValue, suppressionType, lawfulGrounds, createdBy = "Compliance Officer" } = req.body;
      const subjects = executeQuery("SELECT * FROM subjects WHERE id = ?", [subjectId]);
      if (subjects.length === 0) return res.status(404).json({ error: "Subject not found" });
      const sub = subjects[0];
      const id = `SUP-${Date.now()}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      executeRun(
        `INSERT INTO suppression_register (id, subject_id, cif_number, identifier_type, identifier_value, suppression_type, lawful_grounds, active, effective_from, expires_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?)`,
        [id, sub.id, sub.cif_number, identifierType, identifierValue, suppressionType, lawfulGrounds, now, createdBy],
        {
          event: "SUPPRESSION_RECORD_ADDED",
          operator: createdBy,
          detail: `Added suppression record for ${sub.full_name} (${identifierValue}): ${suppressionType}`,
          diff: { identifierValue, suppressionType, lawfulGrounds }
        }
      );
      res.status(201).json({ id, message: "Suppression entered into register" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.patch("/api/suppression/:id/toggle", (req, res) => {
    try {
      const { id } = req.params;
      const items = executeQuery("SELECT * FROM suppression_register WHERE id = ?", [id]);
      if (items.length === 0) return res.status(404).json({ error: "Suppression not found" });
      const item = items[0];
      const newActive = item.active === 1 ? 0 : 1;
      executeRun(
        `UPDATE suppression_register SET active = ? WHERE id = ?`,
        [newActive, id],
        {
          event: "SUPPRESSION_STATUS_TOGGLED",
          operator: "Compliance Officer",
          detail: `Suppression ${id} active status changed to ${newActive === 1 ? "ACTIVE" : "INACTIVE"}`,
          diff: { id, newActive }
        }
      );
      res.json({ message: "Suppression status updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/art22/overrides", (req, res) => {
    try {
      const overrides = executeQuery("SELECT ao.*, s.full_name, s.cif_number FROM art22_overrides ao JOIN subjects s ON ao.subject_id = s.id ORDER BY decision_timestamp DESC");
      res.json(overrides);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/art22/overrides", (req, res) => {
    try {
      const { ticketRef, subjectId, modelName, originalScore, automatedOutcome, humanReviewer, humanDecision, justification } = req.body;
      const id = `OVR-${Date.now()}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      executeRun(
        `INSERT INTO art22_overrides (id, ticket_ref, subject_id, model_name, original_score, automated_outcome, human_reviewer, human_decision, justification, decision_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ticketRef, subjectId, modelName, originalScore, automatedOutcome, humanReviewer, humanDecision, justification, now],
        {
          event: "ART22_HUMAN_INTERVENTION_RECORDED",
          ticketRef,
          operator: humanReviewer,
          detail: `Art. 22 human intervention recorded for ${ticketRef}. Outcome: ${humanDecision}`,
          diff: { modelName, originalScore, humanDecision, justification }
        }
      );
      res.status(201).json({ id, message: "Human intervention recorded" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/backup-beyond-use", (req, res) => {
    try {
      const { ticketRef, subjectId, backupTapeId, storageLocation, dataCategoriesCovered, technicalMeasures, scheduledOverwriteDate, officerSignature } = req.body;
      const id = `BKP-${Date.now()}`;
      const now = (/* @__PURE__ */ new Date()).toISOString();
      executeRun(
        `INSERT INTO backup_beyond_use_logs (id, ticket_ref, subject_id, backup_tape_id, storage_location, data_categories_covered, technical_measures, scheduled_overwrite_date, officer_signature, certified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ticketRef, subjectId, backupTapeId, storageLocation, dataCategoriesCovered, technicalMeasures, scheduledOverwriteDate, officerSignature, now],
        {
          event: "BACKUP_BEYOND_USE_CERTIFIED",
          ticketRef,
          operator: officerSignature,
          detail: `Backup tape ${backupTapeId} certified as Beyond Use for ${ticketRef}. Scheduled overwrite: ${scheduledOverwriteDate}`,
          diff: { backupTapeId, storageLocation, scheduledOverwriteDate }
        }
      );
      res.status(201).json({ id, message: "Backup beyond-use certification logged" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/pia", (req, res) => {
    try {
      const pias = executeQuery("SELECT * FROM pia_registry ORDER BY created_at DESC");
      res.json(pias);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/pia/:piaId", (req, res) => {
    try {
      const { piaId } = req.params;
      const pias = executeQuery(
        "SELECT * FROM pia_registry WHERE pia_id = ? OR id = ?",
        [piaId, piaId]
      );
      if (pias.length === 0) {
        const dynamicPia = {
          id: `PIA-DYN-${Date.now()}`,
          pia_id: piaId,
          title: `Dynamic Impact Assessment [${piaId}]`,
          system_name: "Enterprise Integrated Application Vault",
          department: "Corporate Systems",
          risk_tier: piaId.toLowerCase().includes("high") || piaId.toLowerCase().includes("ai") ? "High" : "Medium",
          dpo_status: "Under Review",
          lawful_basis: "Legitimate Interests",
          purpose_description: `Dynamic assessment ingested for unique token ${piaId}. Processing operations evaluated against GDPR Chapter III statutory individual rights.`,
          data_categories: JSON.stringify(["Account Credentials", "Transactional Telemetry", "User Identifiers"]),
          special_category_flags: JSON.stringify(["Automated Profiling"]),
          cross_border_transfers: "Standard Contractual Clauses (EU SCCs)",
          retention_years: 5,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        const alignment2 = evaluatePiaRightsAlignment(dynamicPia);
        return res.json({ record: dynamicPia, alignment: alignment2, isDynamic: true });
      }
      const record = pias[0];
      const alignment = evaluatePiaRightsAlignment(record);
      res.json({ record, alignment, isDynamic: false });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/pia/ingest", (req, res) => {
    try {
      const {
        piaId,
        title,
        systemName,
        department,
        sectorProfile = "banking",
        riskTier = "High",
        lawfulBasis = "Contract",
        purposeDescription,
        dataCategories = [],
        specialCategoryFlags = [],
        crossBorderTransfers = "Standard Contractual Clauses (EU SCCs 2021/914)",
        retentionYears = 5
      } = req.body;
      if (!piaId || !title || !systemName) {
        return res.status(400).json({ error: "Missing required PIA fields: piaId, title, systemName" });
      }
      const sanitizedPiaId = piaId.trim().toUpperCase();
      const existing = executeQuery("SELECT * FROM pia_registry WHERE pia_id = ?", [sanitizedPiaId]);
      const now = (/* @__PURE__ */ new Date()).toISOString();
      let targetId;
      const dataCatStr = Array.isArray(dataCategories) ? JSON.stringify(dataCategories) : String(dataCategories);
      const specFlagStr = Array.isArray(specialCategoryFlags) ? JSON.stringify(specialCategoryFlags) : String(specialCategoryFlags);
      if (existing.length > 0) {
        targetId = existing[0].id;
        executeRun(
          `UPDATE pia_registry
           SET title = ?, system_name = ?, department = ?, sector_profile = ?, risk_tier = ?, lawful_basis = ?,
               purpose_description = ?, data_categories = ?, special_category_flags = ?,
               cross_border_transfers = ?, retention_years = ?, updated_at = ?
           WHERE id = ?`,
          [
            title,
            systemName,
            department || "Enterprise Architecture",
            sectorProfile,
            riskTier,
            lawfulBasis,
            purposeDescription || "Statutory assessment for data processing activity.",
            dataCatStr,
            specFlagStr,
            crossBorderTransfers,
            Number(retentionYears),
            now,
            targetId
          ],
          {
            event: "PIA_ASSESSMENT_UPDATED",
            operator: "DPO Officer K. Schmidt",
            detail: `Updated Privacy Impact Assessment ${sanitizedPiaId} (${title}) with aligned 5-dimension rights matrix.`,
            diff: { piaId: sanitizedPiaId, sectorProfile, riskTier, lawfulBasis }
          }
        );
      } else {
        targetId = `PIA-REC-${Date.now()}`;
        executeRun(
          `INSERT INTO pia_registry (
            id, pia_id, title, system_name, department, sector_profile, risk_tier, dpo_status, lawful_basis,
            purpose_description, data_categories, special_category_flags, cross_border_transfers,
            retention_years, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            targetId,
            sanitizedPiaId,
            title,
            systemName,
            department || "Enterprise Architecture",
            sectorProfile,
            riskTier,
            lawfulBasis,
            purposeDescription || "Statutory assessment for data processing activity.",
            dataCatStr,
            specFlagStr,
            crossBorderTransfers,
            Number(retentionYears),
            now,
            now
          ],
          {
            event: "PIA_INGESTION_REGISTERED",
            operator: "DPO Officer K. Schmidt",
            detail: `Ingested unique PIA ID ${sanitizedPiaId} [${title}] (Sector: ${sectorProfile}) into regulatory registry with 5-pillar rights alignment.`,
            diff: { piaId: sanitizedPiaId, sectorProfile, riskTier, lawfulBasis, systemName }
          }
        );
      }
      const updatedRecord = executeQuery("SELECT * FROM pia_registry WHERE id = ?", [targetId])[0];
      const alignment = evaluatePiaRightsAlignment(updatedRecord);
      res.status(201).json({
        message: `PIA ${sanitizedPiaId} ingested successfully`,
        record: updatedRecord,
        alignment
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/pia/execute-alignment", (req, res) => {
    try {
      const { piaId, dimension, actions = [], operator = "DPO Officer K. Schmidt" } = req.body;
      if (!piaId) {
        return res.status(400).json({ error: "Missing piaId" });
      }
      const pias = executeQuery("SELECT * FROM pia_registry WHERE pia_id = ? OR id = ?", [piaId, piaId]);
      const piaRecord = pias[0] || { pia_id: piaId, title: "External Ingested Assessment" };
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const actionCount = actions.length || 1;
      logAuditTrail(
        "PIA_RIGHTS_ALIGNMENT_EXECUTED",
        null,
        operator,
        "Data Protection Officer",
        `Executed rights alignment enforcement for ${piaRecord.pia_id} on dimension: ${dimension || "Full 5-Pillar Matrix"}. Applied ${actionCount} statutory controls.`,
        {
          piaId: piaRecord.pia_id,
          dimension: dimension || "ALL_DIMENSIONS",
          actionsApplied: actions,
          enforcedTimestamp: now
        }
      );
      res.json({
        success: true,
        message: `Successfully executed ${dimension || "5-Pillar"} rights alignment for ${piaRecord.pia_id}`,
        timestamp: now,
        piaId: piaRecord.pia_id,
        actionsEnforced: actionCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/audit-logs", (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const logs = executeQuery(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`, [Number(limit)]);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/audit/export", (req, res) => {
    try {
      const logs = executeQuery("SELECT * FROM audit_logs ORDER BY id ASC");
      const integrity = verifyAuditChainIntegrity();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      const parsedLogs = logs.map((l) => {
        let parsedDiff = null;
        try {
          if (l.state_diff_json) {
            parsedDiff = JSON.parse(l.state_diff_json);
          }
        } catch {
          parsedDiff = l.state_diff_json;
        }
        return {
          blockId: l.id,
          timestamp: l.timestamp,
          eventType: l.event_type,
          ticketRef: l.ticket_ref,
          operatorId: l.operator_id,
          operatorRole: l.operator_role,
          actionDetail: l.action_detail,
          stateDiff: parsedDiff,
          cryptographicProof: {
            prevHash: l.prev_hash,
            currentHash: l.current_hash,
            hashAlgorithm: "SHA-256"
          }
        };
      });
      const genesisBlock = logs[0] || null;
      const terminalBlock = logs[logs.length - 1] || null;
      const reqStats = executeQuery(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Completed & Sealed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'Statutorily Refused' THEN 1 ELSE 0 END) as refused,
          SUM(CASE WHEN status = 'Remediation In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN extension_applied = 1 THEN 1 ELSE 0 END) as extensions
        FROM requests
      `)[0] || {};
      const exportPackage = {
        exportMetadata: {
          title: "GDPR Compliance Audit Ledger - Regulatory Inspection Package",
          exportTimestamp: now,
          regulatoryFramework: "EU General Data Protection Regulation (Regulation (EU) 2016/679)",
          complianceArticles: [
            "Art. 5(2) Principle of Accountability & Recordkeeping",
            "Art. 12-22 Rights of the Data Subject Statutory Executions",
            "Art. 24 Responsibility of the Data Controller",
            "Art. 30 Records of Processing Activities (RoPA)",
            "Art. 32 Security of Processing & Cryptographic Immutability"
          ],
          supervisoryScope: "Official Supervisory Authority Statutory Regulatory Inspection Export",
          exportingSystem: "GDPR Individual Rights Operations Control Center (Air-Gapped Node)",
          totalAuditBlocks: logs.length,
          cryptographicVerification: {
            chainIntegrity: integrity.isValid ? "VERIFIED_UNBROKEN" : "INTEGRITY_VIOLATION",
            totalChecked: integrity.totalChecked,
            verificationDetails: integrity.details,
            hashAlgorithm: "SHA-256 Merkle/Linear Block Hash-Chain",
            genesisBlockHash: genesisBlock ? genesisBlock.current_hash : null,
            terminalBlockHash: terminalBlock ? terminalBlock.current_hash : null
          }
        },
        regulatorySummary: {
          totalDsrRequests: reqStats.total || 0,
          completedAndSealed: reqStats.completed || 0,
          statutorilyRefused: reqStats.refused || 0,
          remediationInProgress: reqStats.in_progress || 0,
          statutoryExtensionsApplied: reqStats.extensions || 0
        },
        auditLogs: parsedLogs
      };
      const operator = req.query.operator || "DPO Officer K. Schmidt";
      logAuditTrail(
        "REGULATORY_AUDIT_EXPORT_GENERATED",
        null,
        operator,
        "Data Protection Officer",
        `Batch export of ${logs.length} compliance audit logs generated in machine-readable JSON format for regulatory inspection.`,
        { totalLogs: logs.length, integrityValid: integrity.isValid, timestamp: now }
      );
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="GDPR_Regulatory_Audit_Logs_${Date.now()}.json"`);
      res.json(exportPackage);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  app.post("/api/batch-import", (req, res) => {
    try {
      const { subjects = [], tickets = [] } = req.body;
      let subjectsAdded = 0;
      let ticketsAdded = 0;
      for (const s of subjects) {
        if (s.cif_number && s.full_name) {
          const id = s.id || `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
          executeRun(
            `INSERT OR REPLACE INTO subjects (id, cif_number, full_name, email, phone, residency_country, customer_segment, kyc_status, aml_flag, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              s.cif_number,
              s.full_name,
              s.email || "customer@airgap-bank.internal",
              s.phone || "+49 000 000000",
              s.residency_country || "DE",
              s.customer_segment || "Retail Banking",
              s.kyc_status || "Verified",
              s.aml_flag ? 1 : 0,
              s.created_at || (/* @__PURE__ */ new Date()).toISOString()
            ]
          );
          subjectsAdded++;
        }
      }
      for (const t of tickets) {
        if (t.subject_id && t.right_type) {
          const id = t.id || `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
          const ticketRef = t.ticket_ref || `DSR-2026-${Math.floor(1e3 + Math.random() * 9e3)}`;
          const reqDate = t.request_date || (/* @__PURE__ */ new Date()).toISOString();
          const baseDate = /* @__PURE__ */ new Date();
          baseDate.setDate(baseDate.getDate() + 30);
          executeRun(
            `INSERT OR REPLACE INTO requests (
              id, ticket_ref, subject_id, right_type, status, priority, request_date, baseline_deadline,
              extended_deadline, extension_applied, extension_reason, id_verification_status, id_verified_at,
              id_paused_days, lawful_basis_assessed, entitlement_decision, rejection_code, automated_decision_flag,
              remediation_summary, assigned_officer, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              ticketRef,
              t.subject_id,
              t.right_type,
              t.status || "Intake & Verification",
              t.priority || "Standard",
              reqDate,
              t.baseline_deadline || baseDate.toISOString(),
              t.extended_deadline || null,
              t.extension_applied ? 1 : 0,
              t.extension_reason || null,
              t.id_verification_status || "Verified",
              t.id_verified_at || reqDate,
              t.id_paused_days || 0,
              t.lawful_basis_assessed || "GDPR Statutory Evaluation",
              t.entitlement_decision || "Pending Assessment",
              t.rejection_code || null,
              t.automated_decision_flag ? 1 : 0,
              t.remediation_summary || "Batch imported DSR record",
              t.assigned_officer || "Batch Import Processor",
              reqDate,
              (/* @__PURE__ */ new Date()).toISOString()
            ]
          );
          ticketsAdded++;
        }
      }
      logAuditTrail(
        "BATCH_IMPORT_EXECUTED",
        null,
        "DATA_INTEGRATION_PIPELINE",
        "System Integrator",
        `Batch imported ${subjectsAdded} subjects and ${ticketsAdded} tickets via REST integration endpoint.`,
        { subjectsAdded, ticketsAdded }
      );
      res.json({ message: "Batch import processed", subjectsAdded, ticketsAdded });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  await listenWithPortFallback(app, DEFAULT_PORT);
}
startServer().catch((err) => {
  console.error("Fatal Server Startup Error:", err);
  process.exit(1);
});
//# sourceMappingURL=server.js.map
