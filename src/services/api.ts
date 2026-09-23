// API Service for GDPR Operations Control Center
// Supports both Full-Stack Node REST API and In-Browser Air-Gapped Frontend Virtual Store
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
import { virtualStore } from './frontendVirtualStore';

export type OperatingMode = 'frontend' | 'server';

const MODE_STORAGE_KEY = 'rightsflow_operating_mode';
const AIRGAP_STORAGE_KEY = 'rightsflow_air_gapped_mode';

// Mode state & event dispatcher
let currentMode: OperatingMode = (localStorage.getItem(MODE_STORAGE_KEY) as OperatingMode) || 'frontend';
let isAirGappedActive: boolean = localStorage.getItem(AIRGAP_STORAGE_KEY) !== 'false'; // Default to true

type ModeChangeListener = (mode: OperatingMode, airGapped: boolean) => void;
const listeners: ModeChangeListener[] = [];

export function getOperatingMode(): OperatingMode {
  return currentMode;
}

export function setOperatingMode(mode: OperatingMode): void {
  currentMode = mode;
  localStorage.setItem(MODE_STORAGE_KEY, mode);
  notifyListeners();
}

export function isAirGapped(): boolean {
  return isAirGappedActive;
}

export function setAirGapped(enabled: boolean): void {
  isAirGappedActive = enabled;
  localStorage.setItem(AIRGAP_STORAGE_KEY, String(enabled));
  notifyListeners();
}

export function onOperatingModeChange(listener: ModeChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function notifyListeners(): void {
  listeners.forEach((fn) => {
    try {
      fn(currentMode, isAirGappedActive);
    } catch (e) {
      console.error('[MODE LISTENER ERROR]', e);
    }
  });
}

// Wrapper that attempts server fetch if in 'server' mode, but safely falls back to virtualStore
async function executeWithFallback<T>(
  serverCall: () => Promise<T>,
  frontendCall: () => T | Promise<T>
): Promise<T> {
  if (currentMode === 'frontend' || isAirGappedActive) {
    return Promise.resolve(frontendCall());
  }

  try {
    return await serverCall();
  } catch (err: any) {
    console.warn(
      '⚠️ [NETWORK FALLBACK] Server endpoint unreachable or failed. Engaging Frontend Air-Gapped Engine:',
      err?.message || err
    );
    // Auto-switch to frontend mode to prevent repeated network failure loops
    setOperatingMode('frontend');
    return Promise.resolve(frontendCall());
  }
}

export const api = {
  // Mode controls
  getOperatingMode,
  setOperatingMode,
  isAirGapped,
  setAirGapped,
  onOperatingModeChange,
  resetFrontendStore: () => virtualStore.resetToDefaults(),

  // Server Health & Telemetry
  async getHealth(): Promise<ServerHealth> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/health');
        if (!res.ok) throw new Error('Failed to fetch server health');
        return res.json();
      },
      () => virtualStore.getHealth()
    );
  },

  async verifyAuditChain(): Promise<AuditVerificationResult> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/audit/verify');
        if (!res.ok) throw new Error('Failed to verify audit chain');
        return res.json();
      },
      () => virtualStore.verifyAuditChain()
    );
  },

  async getSchemaDdl(): Promise<{ ddl: string; version: string; integrityCheck: string }> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/schema-ddl');
        if (!res.ok) throw new Error('Failed to fetch schema DDL');
        return res.json();
      },
      () => virtualStore.getSchemaDdl()
    );
  },

  // Tickets
  async getTickets(params?: { status?: string; rightType?: string; priority?: string; search?: string }): Promise<DsrTicket[]> {
    return executeWithFallback(
      async () => {
        const query = new URLSearchParams();
        if (params?.status) query.append('status', params.status);
        if (params?.rightType) query.append('rightType', params.rightType);
        if (params?.priority) query.append('priority', params.priority);
        if (params?.search) query.append('search', params.search);

        const res = await fetch(`/api/tickets?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch tickets');
        return res.json();
      },
      () => virtualStore.getTickets(params)
    );
  },

  async getTicket(id: string): Promise<DsrTicket & {
    dataItems: any[];
    downstream: DownstreamNotification[];
    art22Override: Art22Override | null;
    backupLogs: BackupBeyondUseLog[];
    auditTrail: AuditLog[];
  }> {
    return executeWithFallback(
      async () => {
        const res = await fetch(`/api/tickets/${id}`);
        if (!res.ok) throw new Error('Failed to fetch ticket detail');
        return res.json();
      },
      () => virtualStore.getTicket(id)
    );
  },

  async exportTickets(operator?: string): Promise<any> {
    return executeWithFallback(
      async () => {
        const query = operator ? `?operator=${encodeURIComponent(operator)}` : '';
        const res = await fetch(`/api/tickets/export${query}`);
        if (!res.ok) throw new Error('Failed to export ticket database');
        return res.json();
      },
      () => ({
        timestamp: new Date().toISOString(),
        exportedBy: operator || 'Compliance Officer J. Weber',
        mode: 'FRONTEND_AIR_GAPPED',
        totalTickets: virtualStore.getTickets().length,
        tickets: virtualStore.getTickets()
      })
    );
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
    return executeWithFallback(
      async () => {
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
      () => virtualStore.createTicket(payload)
    );
  },

  async updateTicket(id: string, payload: any): Promise<void> {
    return executeWithFallback(
      async () => {
        const res = await fetch(`/api/tickets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update ticket');
      },
      () => virtualStore.updateTicket(id, payload)
    );
  },

  async remediateTicket(id: string, payload: {
    actionType: string;
    remediationNotes?: string;
    rejectionCode?: string;
    operatorName?: string;
    dispatchedRecipients?: any[];
  }): Promise<void> {
    return executeWithFallback(
      async () => {
        const res = await fetch(`/api/tickets/${id}/remediate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to remediate ticket');
      },
      () => virtualStore.remediateTicket(id, payload)
    );
  },

  // Subjects & Lawful Basis
  async getSubjects(search?: string): Promise<Subject[]> {
    return executeWithFallback(
      async () => {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/api/subjects${query}`);
        if (!res.ok) throw new Error('Failed to fetch subjects');
        return res.json();
      },
      () => virtualStore.getSubjects(search)
    );
  },

  async getLawfulBases(): Promise<LawfulBasisInventoryItem[]> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/lawful-basis');
        if (!res.ok) throw new Error('Failed to fetch lawful bases');
        return res.json();
      },
      () => virtualStore.getLawfulBases()
    );
  },

  async evaluateEntitlement(payload: {
    rightType: string;
    lawfulBasis: string;
    isDirectMarketing?: boolean;
  }): Promise<EntitlementAssessment> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/evaluate-entitlement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to evaluate entitlement');
        return res.json();
      },
      () => virtualStore.evaluateEntitlement(payload)
    );
  },

  // Downstream Art. 19
  async getDownstream(): Promise<DownstreamNotification[]> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/downstream');
        if (!res.ok) throw new Error('Failed to fetch downstream notifications');
        return res.json();
      },
      () => virtualStore.getDownstream()
    );
  },

  async dispatchDownstream(id: string): Promise<void> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/downstream/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
        if (!res.ok) throw new Error('Failed to dispatch notification');
      },
      () => virtualStore.dispatchDownstream(id)
    );
  },

  // Suppression Register
  async getSuppressions(): Promise<SuppressionRecord[]> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/suppression');
        if (!res.ok) throw new Error('Failed to fetch suppressions');
        return res.json();
      },
      () => virtualStore.getSuppressions()
    );
  },

  async addSuppression(payload: {
    subjectId: string;
    identifierType: string;
    identifierValue: string;
    suppressionType: string;
    lawfulGrounds: string;
    createdBy?: string;
  }): Promise<void> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/suppression', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to add suppression');
      },
      () => virtualStore.addSuppression(payload)
    );
  },

  async toggleSuppression(id: string): Promise<void> {
    return executeWithFallback(
      async () => {
        const res = await fetch(`/api/suppression/${id}/toggle`, {
          method: 'PATCH'
        });
        if (!res.ok) throw new Error('Failed to toggle suppression');
      },
      () => virtualStore.toggleSuppression(id)
    );
  },

  // Art. 22 Overrides
  async getArt22Overrides(): Promise<Art22Override[]> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/art22/overrides');
        if (!res.ok) throw new Error('Failed to fetch overrides');
        return res.json();
      },
      () => virtualStore.getArt22Overrides()
    );
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
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/art22/overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to record human intervention');
      },
      () => virtualStore.addArt22Override(payload)
    );
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
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/backup-beyond-use', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to record backup beyond-use certification');
      },
      () => virtualStore.addBackupBeyondUse(payload)
    );
  },

  // Audit Logs
  async getAuditLogs(limit = 150): Promise<AuditLog[]> {
    return executeWithFallback(
      async () => {
        const res = await fetch(`/api/audit-logs?limit=${limit}`);
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        return res.json();
      },
      () => virtualStore.getAuditLogs(limit)
    );
  },

  async exportAuditLogs(operator?: string): Promise<any> {
    return executeWithFallback(
      async () => {
        const query = operator ? `?operator=${encodeURIComponent(operator)}` : '';
        const res = await fetch(`/api/audit/export${query}`);
        if (!res.ok) throw new Error('Failed to export audit logs');
        return res.json();
      },
      () => ({
        timestamp: new Date().toISOString(),
        exportedBy: operator || 'DPO Officer K. Schmidt',
        mode: 'FRONTEND_AIR_GAPPED',
        totalAuditLogs: virtualStore.getAuditLogs().length,
        logs: virtualStore.getAuditLogs()
      })
    );
  },

  // Batch Import
  async batchImport(data: { subjects?: any[]; tickets?: any[] }): Promise<{ subjectsAdded: number; ticketsAdded: number }> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/batch-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to execute batch import');
        return res.json();
      },
      () => {
        let subCount = 0;
        let tickCount = 0;
        if (data.subjects && Array.isArray(data.subjects)) {
          data.subjects.forEach((s) => {
            virtualStore.getSubjects().push(s);
            subCount++;
          });
        }
        if (data.tickets && Array.isArray(data.tickets)) {
          data.tickets.forEach((t) => {
            virtualStore.createTicket(t);
            tickCount++;
          });
        }
        return { subjectsAdded: subCount, ticketsAdded: tickCount };
      }
    );
  },

  // Privacy Impact Assessment (PIA / DPIA)
  async getPias(): Promise<PiaRecord[]> {
    return executeWithFallback(
      async () => {
        const res = await fetch('/api/pia');
        if (!res.ok) throw new Error('Failed to fetch PIA registry');
        return res.json();
      },
      () => virtualStore.getPias()
    );
  },

  async getPia(piaId: string): Promise<{ record: PiaRecord; alignment: PiaRightsAlignment; isDynamic: boolean }> {
    return executeWithFallback(
      async () => {
        const res = await fetch(`/api/pia/${encodeURIComponent(piaId)}`);
        if (!res.ok) throw new Error(`Failed to fetch assessment for PIA ID: ${piaId}`);
        return res.json();
      },
      () => virtualStore.getPia(piaId)
    );
  },

  async ingestPia(payload: PiaIngestPayload): Promise<{ message: string; record: PiaRecord; alignment: PiaRightsAlignment }> {
    return executeWithFallback(
      async () => {
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
      () => virtualStore.ingestPia(payload)
    );
  },

  async executePiaAlignment(payload: {
    piaId: string;
    dimension?: string;
    actions?: string[];
    operator?: string;
  }): Promise<{ success: boolean; message: string; timestamp: string; piaId: string; actionsEnforced: number }> {
    return executeWithFallback(
      async () => {
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
      },
      () => virtualStore.executePiaAlignment(payload)
    );
  }
};
