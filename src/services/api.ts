// API Service for GDPR Operations Control Center
import {
  DsrTicket,
  Subject,
  LawfulBasisInventoryItem,
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
  PiaIngestPayload
} from '../types';

export const api = {
  // Server Health & Telemetry
  async getHealth(): Promise<ServerHealth> {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Failed to fetch server health');
    return res.json();
  },

  async verifyAuditChain(): Promise<AuditVerificationResult> {
    const res = await fetch('/api/audit/verify');
    if (!res.ok) throw new Error('Failed to verify audit chain');
    return res.json();
  },

  async getSchemaDdl(): Promise<{ ddl: string; version: string; integrityCheck: string }> {
    const res = await fetch('/api/schema-ddl');
    if (!res.ok) throw new Error('Failed to fetch schema DDL');
    return res.json();
  },

  // Tickets
  async getTickets(params?: { status?: string; rightType?: string; priority?: string; search?: string }): Promise<DsrTicket[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.rightType) query.append('rightType', params.rightType);
    if (params?.priority) query.append('priority', params.priority);
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`/api/tickets?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return res.json();
  },

  async getTicket(id: string): Promise<DsrTicket & {
    dataItems: any[];
    downstream: DownstreamNotification[];
    art22Override: Art22Override | null;
    backupLogs: BackupBeyondUseLog[];
    auditTrail: AuditLog[];
  }> {
    const res = await fetch(`/api/tickets/${id}`);
    if (!res.ok) throw new Error('Failed to fetch ticket detail');
    return res.json();
  },

  async exportTickets(operator?: string): Promise<any> {
    const query = operator ? `?operator=${encodeURIComponent(operator)}` : '';
    const res = await fetch(`/api/tickets/export${query}`);
    if (!res.ok) throw new Error('Failed to export ticket database');
    return res.json();
  },

  async createTicket(payload: {
    subjectId: string;
    rightType: string;
    priority?: string;
    assignedOfficer?: string;
    notes?: string;
    isDirectMarketing?: boolean;
    sector?: string;
  }): Promise<{ id: string; ticketRef: string }> {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create ticket');
    }
    return res.json();
  },

  async updateTicket(id: string, payload: any): Promise<void> {
    const res = await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update ticket');
  },

  async remediateTicket(id: string, payload: {
    actionType: string;
    remediationNotes?: string;
    rejectionCode?: string;
    operatorName?: string;
    dispatchedRecipients?: any[];
  }): Promise<void> {
    const res = await fetch(`/api/tickets/${id}/remediate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to remediate ticket');
  },

  // Subjects & Lawful Basis
  async getSubjects(search?: string): Promise<Subject[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/subjects${query}`);
    if (!res.ok) throw new Error('Failed to fetch subjects');
    return res.json();
  },

  async getLawfulBases(): Promise<LawfulBasisInventoryItem[]> {
    const res = await fetch('/api/lawful-basis');
    if (!res.ok) throw new Error('Failed to fetch lawful bases');
    return res.json();
  },

  async evaluateEntitlement(payload: {
    rightType: string;
    lawfulBasis: string;
    isDirectMarketing?: boolean;
  }): Promise<EntitlementAssessment> {
    const res = await fetch('/api/evaluate-entitlement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to evaluate entitlement');
    return res.json();
  },

  // Downstream Art. 19
  async getDownstream(): Promise<DownstreamNotification[]> {
    const res = await fetch('/api/downstream');
    if (!res.ok) throw new Error('Failed to fetch downstream notifications');
    return res.json();
  },

  async dispatchDownstream(id: string): Promise<void> {
    const res = await fetch('/api/downstream/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!res.ok) throw new Error('Failed to dispatch notification');
  },

  // Suppression Register
  async getSuppressions(): Promise<SuppressionRecord[]> {
    const res = await fetch('/api/suppression');
    if (!res.ok) throw new Error('Failed to fetch suppressions');
    return res.json();
  },

  async addSuppression(payload: {
    subjectId: string;
    identifierType: string;
    identifierValue: string;
    suppressionType: string;
    lawfulGrounds: string;
    createdBy?: string;
  }): Promise<void> {
    const res = await fetch('/api/suppression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to add suppression');
  },

  async toggleSuppression(id: string): Promise<void> {
    const res = await fetch(`/api/suppression/${id}/toggle`, {
      method: 'PATCH'
    });
    if (!res.ok) throw new Error('Failed to toggle suppression');
  },

  // Art. 22 Overrides
  async getArt22Overrides(): Promise<Art22Override[]> {
    const res = await fetch('/api/art22/overrides');
    if (!res.ok) throw new Error('Failed to fetch overrides');
    return res.json();
  },

  async addArt22Override(payload: {
    ticketRef: string;
    subjectId: string;
    modelName: string;
    originalScore: string;
    automatedOutcome: string;
    humanReviewer: string;
    humanDecision: string;
    justification: string;
  }): Promise<void> {
    const res = await fetch('/api/art22/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to record human intervention');
  },

  // Backup Beyond Use
  async addBackupBeyondUse(payload: {
    ticketRef: string;
    subjectId: string;
    backupTapeId: string;
    storageLocation: string;
    dataCategoriesCovered: string;
    technicalMeasures: string;
    scheduledOverwriteDate: string;
    officerSignature: string;
  }): Promise<void> {
    const res = await fetch('/api/backup-beyond-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to record backup beyond-use certification');
  },

  // Audit Logs
  async getAuditLogs(limit = 150): Promise<AuditLog[]> {
    const res = await fetch(`/api/audit-logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async exportAuditLogs(operator?: string): Promise<any> {
    const query = operator ? `?operator=${encodeURIComponent(operator)}` : '';
    const res = await fetch(`/api/audit/export${query}`);
    if (!res.ok) throw new Error('Failed to export audit logs');
    return res.json();
  },

  // Batch Import
  async batchImport(data: { subjects?: any[]; tickets?: any[] }): Promise<{ subjectsAdded: number; ticketsAdded: number }> {
    const res = await fetch('/api/batch-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to execute batch import');
    return res.json();
  },

  // Privacy Impact Assessment (PIA / DPIA) & 5-Dimension Rights Alignment
  async getPias(): Promise<PiaRecord[]> {
    const res = await fetch('/api/pia');
    if (!res.ok) throw new Error('Failed to fetch PIA registry');
    return res.json();
  },

  async getPia(piaId: string): Promise<{ record: PiaRecord; alignment: PiaRightsAlignment; isDynamic: boolean }> {
    const res = await fetch(`/api/pia/${encodeURIComponent(piaId)}`);
    if (!res.ok) throw new Error(`Failed to fetch assessment for PIA ID: ${piaId}`);
    return res.json();
  },

  async ingestPia(payload: PiaIngestPayload): Promise<{ message: string; record: PiaRecord; alignment: PiaRightsAlignment }> {
    const res = await fetch('/api/pia/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to ingest PIA assessment');
    }
    return res.json();
  },

  async executePiaAlignment(payload: {
    piaId: string;
    dimension?: string;
    actions?: string[];
    operator?: string;
  }): Promise<{ success: boolean; message: string; timestamp: string; piaId: string; actionsEnforced: number }> {
    const res = await fetch('/api/pia/execute-alignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to execute PIA rights alignment');
    }
    return res.json();
  }
};

