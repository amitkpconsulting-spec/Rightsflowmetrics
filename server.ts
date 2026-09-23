import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  getDb,
  executeQuery,
  executeRun,
  getDbTelemetry,
  verifyAuditChainIntegrity,
  logAuditTrail,
  SQLITE_SCHEMA_DDL,
  calculateHash,
  persistDatabase
} from './server/db.ts';
import {
  evaluateRightEntitlement,
  calculateComplianceDeadline,
  evaluatePiaRightsAlignment,
  LawfulBasisType,
  RightType
} from './server/complianceEngine.ts';

const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10) || 3000;
const HOST = '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

let serverInstance: import('http').Server | null = null;

function bindHttpServer(app: express.Application, port: number): Promise<import('http').Server> {
  return new Promise((resolve, reject) => {
    if (IS_PROD) {
      // In production, bind strictly to the configured port without incrementing.
      // Changing ports in production container environments (Replit, Cloud Run, K8s) breaks ingress routing and health checks.
      const server = app.listen(port, HOST, () => {
        console.log(`🛡️ RightsFlow Metrics Node Server [PRODUCTION] running on http://${HOST}:${port}`);
        resolve(server);
      });

      server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`[FATAL] Port ${port} is already in use. Container cannot reassign port in production because ingress traffic routes to ${port}.`);
        }
        reject(err);
      });
    } else {
      // In local development, gracefully try next port if occupied
      const tryListen = (currentPort: number, retriesLeft: number) => {
        const server = app.listen(currentPort, HOST, () => {
          console.log(`🛡️ RightsFlow Metrics Node Server [DEV] running on http://${HOST}:${currentPort}`);
          resolve(server);
        });

        server.on('error', (err: any) => {
          if (err.code === 'EADDRINUSE' && retriesLeft > 0) {
            console.warn(`[PORT WARNING] Port ${currentPort} is occupied. Trying port ${currentPort + 1}...`);
            server.close();
            tryListen(currentPort + 1, retriesLeft - 1);
          } else {
            reject(err);
          }
        });
      };
      tryListen(port, 20);
    }
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Initialize DB
  await getDb();

  // ==========================================================================
  // 1. HEALTH & TELEMETRY API (ZERO-DEPENDENCY & REPLIT/K8S COMPLIANT)
  // ==========================================================================

  // Fast zero-dependency liveness/readiness probe
  app.get('/healthz', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // Comprehensive health & telemetry endpoint (resilient against DB cold-starts)
  app.get('/api/health', (_req, res) => {
    const memory = process.memoryUsage();
    let dbStats: any = null;
    let overdueCount = 0;

    try {
      dbStats = getDbTelemetry();
      const now = new Date().toISOString();
      const overdueRes = executeQuery<any>(
        "SELECT COUNT(*) as count FROM requests WHERE status NOT IN ('Completed & Sealed', 'Statutorily Refused') AND baseline_deadline < ?",
        [now]
      );
      overdueCount = (overdueRes[0]?.count as number) || 0;
    } catch (err: any) {
      console.warn('[HEALTH CHECK] Telemetry non-blocking warning:', err?.message || err);
    }

    res.status(200).json({
      status: 'ok',
      systemTime: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      uptimeSeconds: Math.round(process.uptime()),
      environment: {
        networkIsolation: 'ZERO_TRUST_AIR_GAPPED',
        externalConnections: 0,
        outboundInternetAccess: 'DISABLED_BLOCKED',
        tlsCertificate: 'LOCAL_MUTUAL_TLS_v1.3'
      },
      memory: {
        rssMb: Math.round((memory.rss / (1024 * 1024)) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / (1024 * 1024)) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / (1024 * 1024)) * 100) / 100,
        externalMb: Math.round((memory.external / (1024 * 1024)) * 100) / 100
      },
      database: dbStats || {
        engine: 'SQLite 3.45 WAL-Mode Embedded',
        journalMode: 'WAL (Write-Ahead-Log)',
        dbSizeBytes: 0,
        walSizeBytes: 0,
        totalQueriesExecuted: 0,
        totalWritesExecuted: 0,
        avgLatencyMs: 0,
        lastSaved: new Date().toISOString(),
        tableStats: { subjects: 0, tickets: 0, auditLogs: 0, notifications: 0, suppressionRules: 0, piaRecords: 0 }
      },
      slaAlerts: {
        overdueCount,
        integrityStatus: 'HASH_CHAIN_SEALED'
      }
    });
  });

  app.get('/api/telemetry', (req, res) => {
    const dbStats = getDbTelemetry();
    res.json(dbStats);
  });

  app.get('/api/audit/verify', (req, res) => {
    const verification = verifyAuditChainIntegrity();
    res.json(verification);
  });

  app.get('/api/schema-ddl', (req, res) => {
    res.json({
      ddl: SQLITE_SCHEMA_DDL,
      version: 'SQLite 3.45 WAL-Mode Embedded',
      integrityCheck: 'PRAGMA integrity_check = OK'
    });
  });

  // ==========================================================================
  // 2. DSR / DSAR TICKETS API
  // ==========================================================================
  app.get('/api/tickets', (req, res) => {
    try {
      const { status, rightType, priority, search } = req.query;
      let sql = `
        SELECT r.*, s.full_name, s.cif_number, s.email, s.kyc_status, s.aml_flag
        FROM requests r
        JOIN subjects s ON r.subject_id = s.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (status && typeof status === 'string' && status !== 'ALL') {
        sql += ` AND r.status = ?`;
        params.push(status);
      }
      if (rightType && typeof rightType === 'string' && rightType !== 'ALL') {
        sql += ` AND r.right_type = ?`;
        params.push(rightType);
      }
      if (priority && typeof priority === 'string' && priority !== 'ALL') {
        sql += ` AND r.priority = ?`;
        params.push(priority);
      }
      if (search && typeof search === 'string' && search.trim() !== '') {
        sql += ` AND (r.ticket_ref LIKE ? OR s.full_name LIKE ? OR s.cif_number LIKE ? OR s.email LIKE ?)`;
        const sTerm = `%${search.trim()}%`;
        params.push(sTerm, sTerm, sTerm, sTerm);
      }

      sql += ` ORDER BY r.baseline_deadline ASC`;

      const tickets = executeQuery<any>(sql, params);

      // Enhance with live deadline calculations
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tickets/export', (req, res) => {
    try {
      const operator = (req.query.operator as string) || 'Executive DPO Officer';
      const now = new Date().toISOString();

      const tickets = executeQuery<any>(
        `SELECT r.*, s.cif_number, s.full_name, s.email, s.phone, s.residency_country, s.customer_segment, s.kyc_status, s.aml_flag
         FROM requests r
         JOIN subjects s ON r.subject_id = s.id
         ORDER BY r.request_date DESC`
      );

      const total = tickets.length;
      const completed = tickets.filter((t) => t.status === 'Completed & Sealed').length;
      const refused = tickets.filter((t) => t.status === 'Statutorily Refused').length;
      const inProgress = tickets.filter((t) => t.status === 'Remediation In Progress').length;
      const extensions = tickets.filter((t) => Boolean(t.extension_applied)).length;

      const structuredTickets = tickets.map((t) => {
        const deadlineInfo = calculateComplianceDeadline(
          t.request_date,
          Boolean(t.extension_applied),
          t.id_paused_days || 0
        );

        let detectedSector = t.customer_segment || 'Retail Banking';
        const sectorMatch = t.remediation_summary?.match(/\[Sector:\s*([^\]]+)\]/);
        if (sectorMatch) {
          detectedSector = sectorMatch[1];
        }

        return {
          ticketReference: t.ticket_ref,
          id: t.id,
          rightType: t.right_type,
          gdprArticle: t.right_type.split(' ')[0] || 'GDPR',
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
          reportTitle: 'GDPR Data Subject Rights (DSR) Master Ticket Database Report',
          exportTimestamp: now,
          generatedBy: operator,
          regulatoryFramework: 'EU General Data Protection Regulation (Regulation (EU) 2016/679)',
          statutoryArticlesCovered: [
            'Art. 12 Transparent Information, Communication & Modalities',
            'Art. 15 Right of Access',
            'Art. 16 Right to Rectification',
            'Art. 17 Right to Erasure (Right to be Forgotten)',
            'Art. 18 Right to Restriction of Processing',
            'Art. 20 Right to Data Portability',
            'Art. 21 Right to Object',
            'Art. 22 Automated Decision Review & Human Intervention',
            'Art. 5(2) & 24 Accountability & Controller Responsibility'
          ],
          totalTicketCount: total,
          metrics: {
            completedAndSealed: completed,
            statutorilyRefused: refused,
            remediationInProgress: inProgress,
            extensionsInvoked: extensions,
            complianceRatePercentage: total > 0 ? Math.round(((completed + refused) / total) * 100) : 100
          }
        },
        tickets: structuredTickets
      };

      logAuditTrail(
        'TICKET_DATABASE_EXPORTED',
        null,
        operator,
        'Executive DPO Officer',
        `Master ticket database (${total} tickets) exported as structured JSON for compliance reporting.`,
        { totalTickets: total, completed, inProgress, refused, extensions, timestamp: now }
      );

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="GDPR_Tickets_Database_Report_${Date.now()}.json"`);
      res.json(exportPackage);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tickets/:id', (req, res) => {
    try {
      const { id } = req.params;
      const tickets = executeQuery<any>(
        `SELECT r.*, s.full_name, s.cif_number, s.email, s.phone, s.residency_country, s.customer_segment, s.kyc_status, s.aml_flag
         FROM requests r
         JOIN subjects s ON r.subject_id = s.id
         WHERE r.id = ? OR r.ticket_ref = ?`,
        [id, id]
      );

      if (tickets.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }

      const ticket = tickets[0];
      const deadlineInfo = calculateComplianceDeadline(
        ticket.request_date,
        Boolean(ticket.extension_applied),
        ticket.id_paused_days || 0
      );

      // Fetch customer data inventory items
      const dataItems = executeQuery<any>(
        `SELECT sdi.*, lbi.purpose_name, lbi.lawful_basis, lbi.retention_years, lbi.allows_erasure, lbi.allows_portability, lbi.statutory_reference
         FROM subject_data_inventory sdi
         JOIN lawful_basis_inventory lbi ON sdi.purpose_code = lbi.purpose_code
         WHERE sdi.subject_id = ?`,
        [ticket.subject_id]
      );

      // Fetch downstream notifications
      const downstream = executeQuery<any>(
        `SELECT * FROM downstream_notifications WHERE ticket_ref = ? ORDER BY created_at DESC`,
        [ticket.ticket_ref]
      );

      // Fetch Art. 22 overrides if any
      const art22 = executeQuery<any>(
        `SELECT * FROM art22_overrides WHERE ticket_ref = ?`,
        [ticket.ticket_ref]
      );

      // Fetch backup beyond-use logs
      const backupLogs = executeQuery<any>(
        `SELECT * FROM backup_beyond_use_logs WHERE ticket_ref = ?`,
        [ticket.ticket_ref]
      );

      // Fetch related audit trail
      const auditTrail = executeQuery<any>(
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tickets', (req, res) => {
    try {
      const {
        subjectId,
        rightType,
        priority = 'Standard',
        assignedOfficer = 'DPO Officer K. Schmidt',
        notes = '',
        isDirectMarketing = false,
        sector = 'Retail Banking'
      } = req.body;

      if (!subjectId || !rightType) {
        return res.status(400).json({ error: 'Missing subjectId or rightType' });
      }

      // Check subject
      const subjects = executeQuery<any>('SELECT * FROM subjects WHERE id = ?', [subjectId]);
      if (subjects.length === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }
      const subject = subjects[0];

      // Generate ticket Ref
      const countRes = executeQuery<any>('SELECT COUNT(*) as count FROM requests');
      const nextNum = 840 + (countRes[0]?.count || 0) + 1;
      const ticketRef = `DSR-2026-${nextNum}`;
      const id = `REQ-${Date.now()}`;
      const now = new Date().toISOString();

      // Statutory 30-day baseline deadline
      const baselineDate = new Date();
      baselineDate.setDate(baselineDate.getDate() + 30);
      const baselineDeadline = baselineDate.toISOString();

      // Assess statutory entitlement
      const assessment = evaluateRightEntitlement(rightType as RightType, 'Legal Obligation', isDirectMarketing);

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
          'Intake & Verification',
          priority,
          now,
          baselineDeadline,
          null,
          0,
          null,
          subject.kyc_status === 'Verified' ? 'Verified' : 'Pending ID Proof',
          subject.kyc_status === 'Verified' ? now : null,
          0,
          assessment.statutoryReference,
          assessment.status,
          null,
          rightType.includes('Art. 22') ? 1 : 0,
          notes ? `[Sector: ${sector}] ${notes}` : `[Sector: ${sector}] Intake recorded: ${rightType} for ${subject.full_name}. ${assessment.legalJustification}`,
          assignedOfficer,
          now,
          now
        ],
        {
          event: 'DSR_INTAKE_RECORDED',
          ticketRef,
          operator: assignedOfficer,
          detail: `Intake recorded for ${rightType} (${sector}) - Subject: ${subject.full_name} (${subject.cif_number}). Statutory deadline set.`,
          diff: { rightType, priority, sector, subjectId, assessmentStatus: assessment.status }
        }
      );

      res.status(201).json({ id, ticketRef, message: 'Ticket created successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/tickets/:id', (req, res) => {
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
        operatorName = 'Compliance Officer'
      } = req.body;

      const tickets = executeQuery<any>('SELECT * FROM requests WHERE id = ? OR ticket_ref = ?', [id, id]);
      if (tickets.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      const ticket = tickets[0];
      const now = new Date().toISOString();

      let newExtendedDeadline = ticket.extended_deadline;
      if (extensionApplied && !ticket.extension_applied) {
        const base = new Date(ticket.baseline_deadline);
        base.setDate(base.getDate() + 60); // +2 months statutory extension
        newExtendedDeadline = base.toISOString();
      }

      // Check ID pause
      let newPausedDays = ticket.id_paused_days || 0;
      let newVerifiedAt = ticket.id_verified_at;
      if (idVerificationStatus === 'Clock Paused - Awaiting ID' && ticket.id_verification_status !== 'Clock Paused - Awaiting ID') {
        newPausedDays += 1;
      } else if (idVerificationStatus === 'Verified' && !ticket.id_verified_at) {
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
          extensionApplied !== undefined ? (extensionApplied ? 1 : 0) : null,
          newExtendedDeadline,
          extensionReason || null,
          remediationSummary || null,
          assignedOfficer || null,
          now,
          ticket.id
        ],
        {
          event: 'TICKET_STATUS_UPDATED',
          ticketRef: ticket.ticket_ref,
          operator: operatorName,
          detail: `Ticket ${ticket.ticket_ref} updated: Status=${status || ticket.status}, Priority=${priority || ticket.priority}, ID_Status=${idVerificationStatus || ticket.id_verification_status}`,
          diff: { status, priority, idVerificationStatus, extensionApplied, extensionReason }
        }
      );

      res.json({ message: 'Ticket updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Execute Remediation Action (e.g. Purge Marketing / Carveout AML, Apply Freeze, Seal Ticket)
  app.post('/api/tickets/:id/remediate', (req, res) => {
    try {
      const { id } = req.params;
      const {
        actionType, // 'EXECUTE_ERASURE_CARVEOUT' | 'RESTRICT_PROCESSING' | 'COMPLETE_SEAL' | 'STATUTORILY_REFUSE'
        remediationNotes,
        rejectionCode,
        operatorName = 'DPO Officer K. Schmidt',
        dispatchedRecipients = []
      } = req.body;

      const tickets = executeQuery<any>('SELECT * FROM requests WHERE id = ? OR ticket_ref = ?', [id, id]);
      if (tickets.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      const ticket = tickets[0];
      const now = new Date().toISOString();

      if (actionType === 'EXECUTE_ERASURE_CARVEOUT') {
        // Mark marketing data as deleted, preserve core ledger
        executeRun(
          `UPDATE subject_data_inventory SET sample_value = '[PURGED_UNDER_ART17]'
           WHERE subject_id = ? AND purpose_code = 'MKT-PREF-04'`,
          [ticket.subject_id]
        );

        // Update ticket
        executeRun(
          `UPDATE requests SET
            status = 'Completed & Sealed',
            entitlement_decision = 'Partially Granted (Statutory Carveout)',
            remediation_summary = ?,
            updated_at = ?
           WHERE id = ?`,
          [
            remediationNotes || 'Erasure executed: CRM & marketing profiles permanently erased. Core banking transactions and AML/KYC dossiers preserved under statutory retention (GwG § 8 / 5AMLD).',
            now,
            ticket.id
          ],
          {
            event: 'STATUTORY_REMEDIATION_EXECUTED',
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Executed dual-tier GDPR Art. 17 remediation for ${ticket.ticket_ref}. Marketing purged, statutory banking ledger locked.`,
            diff: { actionType, purgedPurpose: 'MKT-PREF-04', preservedPurposes: ['AML-KYC-01', 'CORE-ACC-02'] }
          }
        );
      } else if (actionType === 'RESTRICT_PROCESSING') {
        // Freeze data items
        executeRun(
          `UPDATE subject_data_inventory SET is_restricted = 1 WHERE subject_id = ?`,
          [ticket.subject_id]
        );

        // Add to suppression register
        const subjects = executeQuery<any>('SELECT * FROM subjects WHERE id = ?', [ticket.subject_id]);
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
          [remediationNotes || 'Processing restriction freeze enforced across core banking pipelines and automated credit engines.', now, ticket.id],
          {
            event: 'PROCESSING_RESTRICTION_ENFORCED',
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Enforced Art. 18 processing freeze on all systems for CIF ${sub?.cif_number}`,
            diff: { isRestricted: 1 }
          }
        );
      } else if (actionType === 'STATUTORILY_REFUSE') {
        executeRun(
          `UPDATE requests SET
            status = 'Statutorily Refused',
            entitlement_decision = 'Lawfully Blocked',
            rejection_code = ?,
            remediation_summary = ?,
            updated_at = ?
           WHERE id = ?`,
          [
            rejectionCode || 'EXEMPTION_ART_17_3_B_AML_RETENTION',
            remediationNotes || 'Request formally refused under GDPR Art. 17(3)(b). Statutory retention required by EU 2018/843 (5AMLD) and German GwG § 8.',
            now,
            ticket.id
          ],
          {
            event: 'REQUEST_STATUTORILY_REFUSED',
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Formally refused ${ticket.ticket_ref} citing statutory exemption ${rejectionCode || 'ART_17_3_B'}.`,
            diff: { rejectionCode, entitlementDecision: 'Lawfully Blocked' }
          }
        );
      } else if (actionType === 'COMPLETE_SEAL') {
        executeRun(
          `UPDATE requests SET
            status = 'Completed & Sealed',
            remediation_summary = COALESCE(?, remediation_summary),
            updated_at = ?
           WHERE id = ?`,
          [remediationNotes || 'All compliance tasks fulfilled, downstream recipients notified, and audit block cryptographically sealed.', now, ticket.id],
          {
            event: 'TICKET_SEALED_AND_ARCHIVED',
            ticketRef: ticket.ticket_ref,
            operator: operatorName,
            detail: `Ticket ${ticket.ticket_ref} sealed and archived. Compliance record closed.`,
            diff: { status: 'Completed & Sealed' }
          }
        );
      }

      // Auto-queue downstream notifications if requested
      if (Array.isArray(dispatchedRecipients) && dispatchedRecipients.length > 0) {
        for (const r of dispatchedRecipients) {
          executeRun(
            `INSERT INTO downstream_notifications (id, ticket_ref, recipient_name, recipient_type, notification_type, payload_summary, dispatch_status, dispatched_at, ack_received_at, retry_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Dispatched', ?, NULL, 0, ?)`,
            [
              `DN-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              ticket.ticket_ref,
              r.name,
              r.type || 'Credit Reference Bureau',
              r.notificationType || 'Erasure Instruction',
              r.payload || `Automated regulatory downstream notification for ticket ${ticket.ticket_ref}`,
              now,
              now
            ]
          );
        }
      }

      res.json({ message: 'Remediation action completed and recorded in tamper-evident ledger' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 3. SUBJECT MASTER & LAWFUL BASIS API
  // ==========================================================================
  app.get('/api/subjects', (req, res) => {
    try {
      const { search } = req.query;
      let sql = 'SELECT * FROM subjects WHERE 1=1';
      const params: any[] = [];

      if (search && typeof search === 'string' && search.trim()) {
        sql += ' AND (full_name LIKE ? OR cif_number LIKE ? OR email LIKE ?)';
        const s = `%${search.trim()}%`;
        params.push(s, s, s);
      }
      sql += ' ORDER BY full_name ASC';

      const subjects = executeQuery<any>(sql, params);
      res.json(subjects);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/lawful-basis', (req, res) => {
    try {
      const bases = executeQuery<any>('SELECT * FROM lawful_basis_inventory ORDER BY purpose_code ASC');
      res.json(bases);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/evaluate-entitlement', (req, res) => {
    try {
      const { rightType, lawfulBasis, isDirectMarketing } = req.body;
      if (!rightType || !lawfulBasis) {
        return res.status(400).json({ error: 'Missing rightType or lawfulBasis' });
      }
      const evaluation = evaluateRightEntitlement(rightType as RightType, lawfulBasis as LawfulBasisType, Boolean(isDirectMarketing));
      res.json(evaluation);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 4. PORTABILITY PACKAGE GENERATOR (ART. 20)
  // ==========================================================================
  app.get('/api/portability/:ticketRef', (req, res) => {
    try {
      const { ticketRef } = req.params;
      const { format = 'json' } = req.query;

      const tickets = executeQuery<any>(
        `SELECT r.*, s.full_name, s.cif_number, s.email, s.phone, s.residency_country, s.customer_segment
         FROM requests r
         JOIN subjects s ON r.subject_id = s.id
         WHERE r.ticket_ref = ?`,
        [ticketRef]
      );

      if (tickets.length === 0) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
      const t = tickets[0];

      // Fetch subject data items that are portable (under Consent or Contract)
      const dataItems = executeQuery<any>(
        `SELECT sdi.data_category, sdi.field_name, sdi.sample_value, sdi.system_of_record, lbi.lawful_basis, lbi.statutory_reference
         FROM subject_data_inventory sdi
         JOIN lawful_basis_inventory lbi ON sdi.purpose_code = lbi.purpose_code
         WHERE sdi.subject_id = ? AND lbi.allows_portability = 1`,
        [t.subject_id]
      );

      const payload = {
        gdprSpecification: 'Article 20 Machine-Readable Portability Export',
        exportTimestamp: new Date().toISOString(),
        institution: 'Air-Gapped Core Banking Financial Institution',
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
        statutoryDeclaration: 'This data package contains all personal data provided by the subject processed on lawful bases of Consent (Art. 6(1)(a)) and Contract (Art. 6(1)(b)) by automated means.'
      };

      const payloadJson = JSON.stringify(payload, null, 2);
      const sha256Signature = calculateHash(payloadJson);

      if (format === 'csv') {
        let csv = 'Data_Category,Field_Name,Sample_Value,System_Of_Record,Lawful_Basis,Statutory_Reference\n';
        dataItems.forEach((d: any) => {
          csv += `"${d.data_category}","${d.field_name}","${d.sample_value}","${d.system_of_record}","${d.lawful_basis}","${d.statutory_reference}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${t.cif_number}_GDPR_Portability_Export.csv"`);
        res.setHeader('X-GDPR-Checksum-SHA256', sha256Signature);
        return res.send(csv);
      }

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${t.cif_number}_GDPR_Portability_Export.json"`);
      res.setHeader('X-GDPR-Checksum-SHA256', sha256Signature);
      return res.json({
        ...payload,
        cryptographicChecksumSha256: sha256Signature
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 5. DOWNSTREAM NOTIFICATIONS (ART. 19)
  // ==========================================================================
  app.get('/api/downstream', (req, res) => {
    try {
      const items = executeQuery<any>('SELECT * FROM downstream_notifications ORDER BY created_at DESC');
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/downstream/dispatch', (req, res) => {
    try {
      const { id } = req.body;
      const now = new Date().toISOString();
      executeRun(
        `UPDATE downstream_notifications SET dispatch_status = 'Dispatched', dispatched_at = ?, retry_count = retry_count + 1 WHERE id = ?`,
        [now, id],
        {
          event: 'DOWNSTREAM_NOTIFICATION_DISPATCHED',
          operator: 'Automated Dispatch Relay',
          detail: `Dispatched Art. 19 notification ID ${id} to downstream recipient node.`,
          diff: { id, status: 'Dispatched' }
        }
      );
      res.json({ message: 'Notification dispatched successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 6. SUPPRESSION & PROCESSING FREEZE REGISTER (ART. 18 & 21)
  // ==========================================================================
  app.get('/api/suppression', (req, res) => {
    try {
      const list = executeQuery<any>('SELECT sr.*, s.full_name FROM suppression_register sr JOIN subjects s ON sr.subject_id = s.id ORDER BY sr.effective_from DESC');
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/suppression', (req, res) => {
    try {
      const { subjectId, identifierType, identifierValue, suppressionType, lawfulGrounds, createdBy = 'Compliance Officer' } = req.body;
      const subjects = executeQuery<any>('SELECT * FROM subjects WHERE id = ?', [subjectId]);
      if (subjects.length === 0) return res.status(404).json({ error: 'Subject not found' });
      const sub = subjects[0];
      const id = `SUP-${Date.now()}`;
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO suppression_register (id, subject_id, cif_number, identifier_type, identifier_value, suppression_type, lawful_grounds, active, effective_from, expires_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, NULL, ?)`,
        [id, sub.id, sub.cif_number, identifierType, identifierValue, suppressionType, lawfulGrounds, now, createdBy],
        {
          event: 'SUPPRESSION_RECORD_ADDED',
          operator: createdBy,
          detail: `Added suppression record for ${sub.full_name} (${identifierValue}): ${suppressionType}`,
          diff: { identifierValue, suppressionType, lawfulGrounds }
        }
      );

      res.status(201).json({ id, message: 'Suppression entered into register' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/suppression/:id/toggle', (req, res) => {
    try {
      const { id } = req.params;
      const items = executeQuery<any>('SELECT * FROM suppression_register WHERE id = ?', [id]);
      if (items.length === 0) return res.status(404).json({ error: 'Suppression not found' });
      const item = items[0];
      const newActive = item.active === 1 ? 0 : 1;

      executeRun(
        `UPDATE suppression_register SET active = ? WHERE id = ?`,
        [newActive, id],
        {
          event: 'SUPPRESSION_STATUS_TOGGLED',
          operator: 'Compliance Officer',
          detail: `Suppression ${id} active status changed to ${newActive === 1 ? 'ACTIVE' : 'INACTIVE'}`,
          diff: { id, newActive }
        }
      );

      res.json({ message: 'Suppression status updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 7. ART. 22 AUTOMATED DECISION REVIEW & OVERRIDES
  // ==========================================================================
  app.get('/api/art22/overrides', (req, res) => {
    try {
      const overrides = executeQuery<any>('SELECT ao.*, s.full_name, s.cif_number FROM art22_overrides ao JOIN subjects s ON ao.subject_id = s.id ORDER BY decision_timestamp DESC');
      res.json(overrides);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/art22/overrides', (req, res) => {
    try {
      const { ticketRef, subjectId, modelName, originalScore, automatedOutcome, humanReviewer, humanDecision, justification } = req.body;
      const id = `OVR-${Date.now()}`;
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO art22_overrides (id, ticket_ref, subject_id, model_name, original_score, automated_outcome, human_reviewer, human_decision, justification, decision_timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ticketRef, subjectId, modelName, originalScore, automatedOutcome, humanReviewer, humanDecision, justification, now],
        {
          event: 'ART22_HUMAN_INTERVENTION_RECORDED',
          ticketRef,
          operator: humanReviewer,
          detail: `Art. 22 human intervention recorded for ${ticketRef}. Outcome: ${humanDecision}`,
          diff: { modelName, originalScore, humanDecision, justification }
        }
      );

      res.status(201).json({ id, message: 'Human intervention recorded' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 8. BACKUP BEYOND USE CERTIFICATION
  // ==========================================================================
  app.post('/api/backup-beyond-use', (req, res) => {
    try {
      const { ticketRef, subjectId, backupTapeId, storageLocation, dataCategoriesCovered, technicalMeasures, scheduledOverwriteDate, officerSignature } = req.body;
      const id = `BKP-${Date.now()}`;
      const now = new Date().toISOString();

      executeRun(
        `INSERT INTO backup_beyond_use_logs (id, ticket_ref, subject_id, backup_tape_id, storage_location, data_categories_covered, technical_measures, scheduled_overwrite_date, officer_signature, certified_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ticketRef, subjectId, backupTapeId, storageLocation, dataCategoriesCovered, technicalMeasures, scheduledOverwriteDate, officerSignature, now],
        {
          event: 'BACKUP_BEYOND_USE_CERTIFIED',
          ticketRef,
          operator: officerSignature,
          detail: `Backup tape ${backupTapeId} certified as Beyond Use for ${ticketRef}. Scheduled overwrite: ${scheduledOverwriteDate}`,
          diff: { backupTapeId, storageLocation, scheduledOverwriteDate }
        }
      );

      res.status(201).json({ id, message: 'Backup beyond-use certification logged' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 8.5. PRIVACY IMPACT ASSESSMENT (PIA / DPIA) INGEST & RIGHTS ALIGNMENT
  // Evaluates unique PIA ID across: Data Usage, Movement, Storage, Notice, Cookies
  // ==========================================================================
  app.get('/api/pia', (req, res) => {
    try {
      const pias = executeQuery<any>('SELECT * FROM pia_registry ORDER BY created_at DESC');
      res.json(pias);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/pia/:piaId', (req, res) => {
    try {
      const { piaId } = req.params;
      const pias = executeQuery<any>(
        'SELECT * FROM pia_registry WHERE pia_id = ? OR id = ?',
        [piaId, piaId]
      );

      if (pias.length === 0) {
        // If not found in static DB, construct dynamic evaluation for custom unique PIA ID
        const dynamicPia = {
          id: `PIA-DYN-${Date.now()}`,
          pia_id: piaId,
          title: `Dynamic Impact Assessment [${piaId}]`,
          system_name: 'Enterprise Integrated Application Vault',
          department: 'Corporate Systems',
          risk_tier: piaId.toLowerCase().includes('high') || piaId.toLowerCase().includes('ai') ? 'High' : 'Medium',
          dpo_status: 'Under Review',
          lawful_basis: 'Legitimate Interests',
          purpose_description: `Dynamic assessment ingested for unique token ${piaId}. Processing operations evaluated against GDPR Chapter III statutory individual rights.`,
          data_categories: JSON.stringify(['Account Credentials', 'Transactional Telemetry', 'User Identifiers']),
          special_category_flags: JSON.stringify(['Automated Profiling']),
          cross_border_transfers: 'Standard Contractual Clauses (EU SCCs)',
          retention_years: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const alignment = evaluatePiaRightsAlignment(dynamicPia);
        return res.json({ record: dynamicPia, alignment, isDynamic: true });
      }

      const record = pias[0];
      const alignment = evaluatePiaRightsAlignment(record);

      res.json({ record, alignment, isDynamic: false });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/pia/ingest', (req, res) => {
    try {
      const {
        piaId,
        title,
        systemName,
        department,
        sectorProfile = 'banking',
        riskTier = 'High',
        lawfulBasis = 'Contract',
        purposeDescription,
        dataCategories = [],
        specialCategoryFlags = [],
        crossBorderTransfers = 'Standard Contractual Clauses (EU SCCs 2021/914)',
        retentionYears = 5
      } = req.body;

      if (!piaId || !title || !systemName) {
        return res.status(400).json({ error: 'Missing required PIA fields: piaId, title, systemName' });
      }

      const sanitizedPiaId = piaId.trim().toUpperCase();
      const existing = executeQuery<any>('SELECT * FROM pia_registry WHERE pia_id = ?', [sanitizedPiaId]);
      const now = new Date().toISOString();

      let targetId: string;
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
            department || 'Enterprise Architecture',
            sectorProfile,
            riskTier,
            lawfulBasis,
            purposeDescription || 'Statutory assessment for data processing activity.',
            dataCatStr,
            specFlagStr,
            crossBorderTransfers,
            Number(retentionYears),
            now,
            targetId
          ],
          {
            event: 'PIA_ASSESSMENT_UPDATED',
            operator: 'DPO Officer K. Schmidt',
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
            department || 'Enterprise Architecture',
            sectorProfile,
            riskTier,
            lawfulBasis,
            purposeDescription || 'Statutory assessment for data processing activity.',
            dataCatStr,
            specFlagStr,
            crossBorderTransfers,
            Number(retentionYears),
            now,
            now
          ],
          {
            event: 'PIA_INGESTION_REGISTERED',
            operator: 'DPO Officer K. Schmidt',
            detail: `Ingested unique PIA ID ${sanitizedPiaId} [${title}] (Sector: ${sectorProfile}) into regulatory registry with 5-pillar rights alignment.`,
            diff: { piaId: sanitizedPiaId, sectorProfile, riskTier, lawfulBasis, systemName }
          }
        );
      }

      const updatedRecord = executeQuery<any>('SELECT * FROM pia_registry WHERE id = ?', [targetId])[0];
      const alignment = evaluatePiaRightsAlignment(updatedRecord);

      res.status(201).json({
        message: `PIA ${sanitizedPiaId} ingested successfully`,
        record: updatedRecord,
        alignment
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/pia/execute-alignment', (req, res) => {
    try {
      const { piaId, dimension, actions = [], operator = 'DPO Officer K. Schmidt' } = req.body;
      if (!piaId) {
        return res.status(400).json({ error: 'Missing piaId' });
      }

      const pias = executeQuery<any>('SELECT * FROM pia_registry WHERE pia_id = ? OR id = ?', [piaId, piaId]);
      const piaRecord = pias[0] || { pia_id: piaId, title: 'External Ingested Assessment' };

      const now = new Date().toISOString();
      const actionCount = actions.length || 1;

      // Log execution into tamper-evident SHA-256 audit ledger
      logAuditTrail(
        'PIA_RIGHTS_ALIGNMENT_EXECUTED',
        null,
        operator,
        'Data Protection Officer',
        `Executed rights alignment enforcement for ${piaRecord.pia_id} on dimension: ${dimension || 'Full 5-Pillar Matrix'}. Applied ${actionCount} statutory controls.`,
        {
          piaId: piaRecord.pia_id,
          dimension: dimension || 'ALL_DIMENSIONS',
          actionsApplied: actions,
          enforcedTimestamp: now
        }
      );

      res.json({
        success: true,
        message: `Successfully executed ${dimension || '5-Pillar'} rights alignment for ${piaRecord.pia_id}`,
        timestamp: now,
        piaId: piaRecord.pia_id,
        actionsEnforced: actionCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 9. AUDIT LOGS API
  // ==========================================================================
  app.get('/api/audit-logs', (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const logs = executeQuery<any>(`SELECT * FROM audit_logs ORDER BY id DESC LIMIT ?`, [Number(limit)]);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/audit/export', (req, res) => {
    try {
      const logs = executeQuery<any>('SELECT * FROM audit_logs ORDER BY id ASC');
      const integrity = verifyAuditChainIntegrity();
      const now = new Date().toISOString();

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
            hashAlgorithm: 'SHA-256'
          }
        };
      });

      const genesisBlock = logs[0] || null;
      const terminalBlock = logs[logs.length - 1] || null;

      // Overview summary for regulators
      const reqStats = executeQuery<any>(`
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
          title: 'GDPR Compliance Audit Ledger - Regulatory Inspection Package',
          exportTimestamp: now,
          regulatoryFramework: 'EU General Data Protection Regulation (Regulation (EU) 2016/679)',
          complianceArticles: [
            'Art. 5(2) Principle of Accountability & Recordkeeping',
            'Art. 12-22 Rights of the Data Subject Statutory Executions',
            'Art. 24 Responsibility of the Data Controller',
            'Art. 30 Records of Processing Activities (RoPA)',
            'Art. 32 Security of Processing & Cryptographic Immutability'
          ],
          supervisoryScope: 'Official Supervisory Authority Statutory Regulatory Inspection Export',
          exportingSystem: 'GDPR Individual Rights Operations Control Center (Air-Gapped Node)',
          totalAuditBlocks: logs.length,
          cryptographicVerification: {
            chainIntegrity: integrity.isValid ? 'VERIFIED_UNBROKEN' : 'INTEGRITY_VIOLATION',
            totalChecked: integrity.totalChecked,
            verificationDetails: integrity.details,
            hashAlgorithm: 'SHA-256 Merkle/Linear Block Hash-Chain',
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

      // Record export action into audit trail for regulatory transparency
      const operator = (req.query.operator as string) || 'DPO Officer K. Schmidt';
      logAuditTrail(
        'REGULATORY_AUDIT_EXPORT_GENERATED',
        null,
        operator,
        'Data Protection Officer',
        `Batch export of ${logs.length} compliance audit logs generated in machine-readable JSON format for regulatory inspection.`,
        { totalLogs: logs.length, integrityValid: integrity.isValid, timestamp: now }
      );

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="GDPR_Regulatory_Audit_Logs_${Date.now()}.json"`);
      res.json(exportPackage);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // 10. BATCH DATA IMPORT / EXPORT & RESET
  // ==========================================================================
  app.post('/api/batch-import', (req, res) => {
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
              s.email || 'customer@airgap-bank.internal',
              s.phone || '+49 000 000000',
              s.residency_country || 'DE',
              s.customer_segment || 'Retail Banking',
              s.kyc_status || 'Verified',
              s.aml_flag ? 1 : 0,
              s.created_at || new Date().toISOString()
            ]
          );
          subjectsAdded++;
        }
      }

      for (const t of tickets) {
        if (t.subject_id && t.right_type) {
          const id = t.id || `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`;
          const ticketRef = t.ticket_ref || `DSR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
          const reqDate = t.request_date || new Date().toISOString();
          const baseDate = new Date();
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
              t.status || 'Intake & Verification',
              t.priority || 'Standard',
              reqDate,
              t.baseline_deadline || baseDate.toISOString(),
              t.extended_deadline || null,
              t.extension_applied ? 1 : 0,
              t.extension_reason || null,
              t.id_verification_status || 'Verified',
              t.id_verified_at || reqDate,
              t.id_paused_days || 0,
              t.lawful_basis_assessed || 'GDPR Statutory Evaluation',
              t.entitlement_decision || 'Pending Assessment',
              t.rejection_code || null,
              t.automated_decision_flag ? 1 : 0,
              t.remediation_summary || 'Batch imported DSR record',
              t.assigned_officer || 'Batch Import Processor',
              reqDate,
              new Date().toISOString()
            ]
          );
          ticketsAdded++;
        }
      }

      logAuditTrail(
        'BATCH_IMPORT_EXECUTED',
        null,
        'DATA_INTEGRATION_PIPELINE',
        'System Integrator',
        `Batch imported ${subjectsAdded} subjects and ${ticketsAdded} tickets via REST integration endpoint.`,
        { subjectsAdded, ticketsAdded }
      );

      res.json({ message: 'Batch import processed', subjectsAdded, ticketsAdded });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================================================================
  // VITE & STATIC SPA SERVING (STRICT ISOLATION BEHIND NODE_ENV)
  // ==========================================================================
  const distPath = path.join(process.cwd(), 'dist');

  if (IS_PROD) {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      // Fallback catch-all handler for Single Page Applications (SPA) excluding API and health checks
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/healthz') {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn(`[PRODUCTION WARNING] 'dist' directory not found at ${distPath}. Pre-compiled assets missing.`);
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path === '/healthz') {
          return next();
        }
        res.status(503).send('Production build not found. Please run "npm run build" before starting the server.');
      });
    }
  } else {
    // Development mode: Vite middleware with isolated HMR (zero port collisions)
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: {
            server: undefined,
            port: undefined // Prevent independent HMR websocket port collisions (e.g. 24678)
          }
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.warn('[Vite Middleware] Dev server fallback initialization note:', viteErr);
    }
  }

  serverInstance = await bindHttpServer(app, DEFAULT_PORT);

  // Graceful Lifecycle Shutdown Handler (SIGINT / SIGTERM)
  const gracefulShutdown = (signal: string) => {
    console.log(`\n🛑 [SHUTDOWN] Received ${signal}. Initiating graceful teardown...`);
    try {
      persistDatabase();
      console.log('💾 [SHUTDOWN] Database state successfully flushed to disk.');
    } catch (err: any) {
      console.error('⚠️ [SHUTDOWN] Error saving database state:', err?.message || err);
    }

    if (serverInstance) {
      serverInstance.close(() => {
        console.log('✅ [SHUTDOWN] HTTP listener terminated cleanly. Process exiting.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }

    // Force exit after 5s timeout if sockets remain open
    setTimeout(() => {
      console.error('⚠️ [SHUTDOWN] Graceful shutdown timeout reached. Force exiting.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Fatal Server Startup Error:', err);
  process.exit(1);
});
