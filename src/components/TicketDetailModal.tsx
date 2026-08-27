import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Clock,
  UserCheck,
  AlertTriangle,
  FileText,
  Send,
  Download,
  CheckCircle2,
  Trash2,
  Lock,
  PauseCircle,
  PlayCircle,
  FileCode,
  HardDrive,
  Cpu,
  RefreshCw,
  ExternalLink,
  Ban
} from 'lucide-react';
import { DsrTicket, SubjectDataItem, DownstreamNotification, Art22Override, BackupBeyondUseLog, AuditLog } from '../types';
import { api } from '../services/api';
import { StatutoryCountdownTimer } from './StatutoryCountdownTimer';

interface TicketDetailModalProps {
  ticket: DsrTicket;
  onClose: () => void;
  onRefresh: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  onClose,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'remediation' | 'inventory' | 'portability' | 'downstream' | 'art22' | 'backup' | 'audit'>('remediation');
  const [ticketDetail, setTicketDetail] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form states
  const [remediationNotes, setRemediationNotes] = useState('');
  const [rejectionCode, setRejectionCode] = useState('EXEMPTION_ART_17_3_B_AML_RETENTION');
  const [extensionReason, setExtensionReason] = useState('');
  const [showExtensionInput, setShowExtensionInput] = useState(false);

  // Downstream form
  const [recipientName, setRecipientName] = useState('SCHUFA Credit Bureau Germany');
  const [recipientType, setRecipientType] = useState<'Credit Reference Bureau' | 'Anti-Fraud Registry' | 'Marketing CRM'>('Credit Reference Bureau');
  const [notificationType, setNotificationType] = useState<'Rectification Notice' | 'Erasure Instruction' | 'Processing Restriction Freeze'>('Erasure Instruction');
  const [downstreamPayload, setDownstreamPayload] = useState('');

  // Art. 22 form
  const [modelName, setModelName] = useState('RiskDecisionNet-v4.2');
  const [originalScore, setOriginalScore] = useState('Debt-To-Income 48% / Score 590');
  const [automatedOutcome, setAutomatedOutcome] = useState('Automated Loan Facility Denial');
  const [humanReviewer, setHumanReviewer] = useState('Senior Underwriter A. Fischer');
  const [humanDecision, setHumanDecision] = useState<'Affirmed (Automated Valid)' | 'Overturned (Favorable to Customer)' | 'Modified (Adjusted Limits)'>('Modified (Adjusted Limits)');
  const [art22Justification, setArt22Justification] = useState('Secondary consulting income verified via certified tax returns. Adjusted borrowing limit to €25,000 at standard risk rate.');

  // Backup beyond use form
  const [tapeId, setTapeId] = useState('LTO-9-COLD-TAPE-VAULT-2026-W34');
  const [storageLocation, setStorageLocation] = useState('Frankfurt Tier-4 Secure Vault Facility');
  const [technicalMeasures, setTechnicalMeasures] = useState('Cryptographic partition key zeroized; physical archive marked beyond operational access pending scheduled 90-day cyclic tape overwrite.');
  const [scheduledOverwrite, setScheduledOverwrite] = useState('2026-11-25');
  const [officerSignature, setOfficerSignature] = useState('DPO Officer K. Schmidt');

  // Load full details
  const fetchDetail = async () => {
    try {
      setIsLoading(true);
      const detail = await api.getTicket(ticket.id);
      setTicketDetail(detail);
      setRemediationNotes(detail.remediation_summary || '');
    } catch (err: any) {
      console.error('Error fetching ticket detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [ticket.id]);

  const handleRemediate = async (actionType: string) => {
    try {
      setActionLoading(true);
      setActionMessage(null);
      await api.remediateTicket(ticket.id, {
        actionType,
        remediationNotes,
        rejectionCode,
        operatorName: 'Compliance Officer J. Weber'
      });
      setActionMessage('Action successfully executed and sealed into cryptographic audit ledger.');
      await fetchDetail();
      onRefresh();
    } catch (err: any) {
      setActionMessage(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyExtension = async () => {
    if (!extensionReason.trim()) return;
    try {
      setActionLoading(true);
      await api.updateTicket(ticket.id, {
        extensionApplied: true,
        extensionReason,
        priority: 'High (SLA Warning)',
        operatorName: 'Data Protection Officer'
      });
      setShowExtensionInput(false);
      await fetchDetail();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleIdPause = async () => {
    try {
      setActionLoading(true);
      const current = ticketDetail?.id_verification_status || ticket.id_verification_status;
      const nextStatus = current === 'Clock Paused - Awaiting ID' ? 'Verified' : 'Clock Paused - Awaiting ID';
      await api.updateTicket(ticket.id, {
        idVerificationStatus: nextStatus,
        operatorName: 'Compliance Verification Relay'
      });
      await fetchDetail();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDownstream = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      // Remediate with downstream recipient
      await api.remediateTicket(ticket.id, {
        actionType: 'QUEUE_DOWNSTREAM',
        operatorName: 'Downstream Dispatcher',
        dispatchedRecipients: [
          {
            name: recipientName,
            type: recipientType,
            notificationType,
            payload: downstreamPayload || `Propagated ${notificationType} for CIF ${ticket.cif_number}`
          }
        ]
      });
      setDownstreamPayload('');
      await fetchDetail();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddArt22 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.addArt22Override({
        ticketRef: ticket.ticket_ref,
        subjectId: ticket.subject_id,
        modelName,
        originalScore,
        automatedOutcome,
        humanReviewer,
        humanDecision,
        justification: art22Justification
      });
      await fetchDetail();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddBackupLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.addBackupBeyondUse({
        ticketRef: ticket.ticket_ref,
        subjectId: ticket.subject_id,
        backupTapeId: tapeId,
        storageLocation,
        dataCategoriesCovered: 'Historical Database Backup Snapshots & Marketing Attributes',
        technicalMeasures,
        scheduledOverwriteDate: scheduledOverwrite,
        officerSignature
      });
      await fetchDetail();
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const isErasure = ticket.right_type === 'Erasure (Art. 17)';
  const isPortability = ticket.right_type === 'Portability (Art. 20)';
  const isArt22 = ticket.right_type.includes('Art. 22');

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0C0C0C] border border-[#303030] rounded-none w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#E0E0E0] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Ribbon */}
        <div className="bg-[#050505] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xs bg-blue-900/60 border border-blue-700/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base font-bold text-white font-mono">{ticket.ticket_ref}</h2>
                <span className="bg-[#161616] text-[#D1D1D1] font-mono text-xs px-2 py-0.5 rounded border border-[#333333]">
                  {ticket.right_type}
                </span>
                <span className="bg-emerald-950/80 text-emerald-300 text-xs px-2 py-0.5 rounded border border-emerald-800/80 font-mono">
                  {ticket.id_verification_status}
                </span>
              </div>
              <p className="text-xs text-[#8C8C8C] mt-0.5">
                Data Subject: <strong className="text-[#E0E0E0]">{ticket.full_name}</strong> (CIF: {ticket.cif_number}) • Country: {ticketDetail?.residency_country || 'DE'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-1.5 text-[#8C8C8C] hover:text-white rounded-xs hover:bg-[#161616] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SLA & Statutory Clocks Strip */}
        <div className="bg-[#0C0C0C]/90 border-b border-[#262626] px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex-1 max-w-xl">
            <StatutoryCountdownTimer ticket={ticket} showProgressBar={true} />
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto font-mono">
            {ticket.extension_applied === 1 && (
              <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-1 rounded text-[11px]">
                +2M Ext Applied (Art. 12(3))
              </span>
            )}

            <button
              onClick={handleToggleIdPause}
              disabled={actionLoading}
              className="px-2.5 py-1 bg-[#161616] hover:bg-[#252525] text-[#E0E0E0] text-xs rounded border border-[#333333] transition flex items-center space-x-1 cursor-pointer"
            >
              {ticket.id_verification_status === 'Clock Paused - Awaiting ID' ? (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Resume Clock</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pause Clock for ID</span>
                </>
              )}
            </button>

            {ticket.extension_applied === 0 && (
              <button
                onClick={() => setShowExtensionInput(!showExtensionInput)}
                className="px-2.5 py-1 bg-purple-900/60 hover:bg-purple-900 text-purple-200 text-xs rounded border border-purple-700 transition cursor-pointer"
              >
                + Apply Art. 12(3) Extension (+2 Mo)
              </button>
            )}
          </div>
        </div>

        {/* Extension Form Popover */}
        {showExtensionInput && (
          <div className="bg-purple-950/40 border-b border-purple-800/80 px-6 py-3 text-xs space-y-2">
            <div className="font-semibold text-purple-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              <span>Record Statutory +2 Month Extension (GDPR Article 12(3))</span>
            </div>
            <p className="text-[#8C8C8C]">
              The compliance period may be extended by two further months where necessary, taking into account the complexity and number of requests. The controller shall inform the data subject of any such extension within one month of receipt.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter formal justification (e.g., Complex multi-jurisdiction risk audit)..."
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-[#050505] border border-[#262626] rounded text-[#E0E0E0] text-xs font-mono"
              />
              <button
                onClick={handleApplyExtension}
                disabled={actionLoading || !extensionReason.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold"
              >
                Confirm Extension
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-[#050505]/90 border-b border-[#262626] px-6 flex space-x-6 text-xs font-mono overflow-x-auto">
          <button
            onClick={() => setActiveTab('remediation')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'remediation'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Remediation & Execution
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'inventory'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Data Inventory & Lawful Basis ({ticketDetail?.dataItems?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('portability')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'portability'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Art. 20 Portability Package
          </button>
          <button
            onClick={() => setActiveTab('downstream')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'downstream'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Art. 19 Downstream Propagation ({ticketDetail?.downstream?.length || 0})
          </button>
          {isArt22 && (
            <button
              onClick={() => setActiveTab('art22')}
              className={`py-3 border-b-2 font-medium transition cursor-pointer ${
                activeTab === 'art22'
                  ? 'border-emerald-500 text-emerald-400 font-semibold'
                  : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
              }`}
            >
              Art. 22 Automated Decision Review
            </button>
          )}
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Backup 'Beyond Use' Log ({ticketDetail?.backupLogs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'audit'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Tamper Audit Trail ({ticketDetail?.auditTrail?.length || 0})
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {actionMessage && (
            <div className="p-3 bg-blue-950/70 border border-blue-800 rounded-xs text-xs text-blue-200 flex items-center justify-between">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage(null)} className="text-blue-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* TAB 1: REMEDIATION WORKSPACE */}
          {activeTab === 'remediation' && (
            <div className="space-y-6">
              {/* Statutory Entitlement Box */}
              <div className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-[#8C8C8C] uppercase tracking-wider">
                    Statutory Rights Evaluation
                  </span>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {ticket.entitlement_decision}
                  </span>
                </div>
                <p className="text-xs text-[#D1D1D1]">
                  {ticket.remediation_summary || 'Evaluation active across retail banking lawful basis inventory.'}
                </p>
                {isErasure && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xs text-xs text-amber-300 space-y-1 mt-2">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Retail Banking Art. 17(3)(b) Carveout Mandate</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      AML/KYC transaction logs and account ledgers are subject to mandatory 5-7 year statutory retention under EU 2018/843 (5AMLD) and German GwG § 8. Erasure executes on non-statutory marketing profiles & CRM behavioral tags only.
                    </p>
                  </div>
                )}
              </div>

              {/* Remediation Notes Editor */}
              <div className="space-y-2">
                <label className="block text-xs font-mono font-semibold text-[#8C8C8C]">
                  Operational Remediation Summary & Legal Justification:
                </label>
                <textarea
                  rows={3}
                  value={remediationNotes}
                  onChange={(e) => setRemediationNotes(e.target.value)}
                  placeholder="Document the exact technical actions, lawful basis exemptions, and downstream propagation steps taken..."
                  className="w-full p-3 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
                />
              </div>

              {/* Execution Action Buttons */}
              <div className="border-t border-[#262626] pt-5">
                <h3 className="text-xs font-mono font-semibold text-[#8C8C8C] uppercase tracking-wider mb-3">
                  Regulatory Actions & State Transitions
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {isErasure ? (
                    <button
                      onClick={() => handleRemediate('EXECUTE_ERASURE_CARVEOUT')}
                      disabled={actionLoading}
                      className="p-3 bg-rose-900/60 hover:bg-rose-900 border border-rose-700/80 rounded-xs text-left transition flex flex-col justify-between space-y-2 group"
                    >
                      <div className="flex items-center justify-between text-rose-300">
                        <span className="font-semibold text-xs">Execute Dual-Tier Erasure</span>
                        <Trash2 className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] text-rose-200/70">
                        Purges marketing CRM data; preserves AML core ledger under Art. 17(3)(b) exemption.
                      </p>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRemediate('COMPLETE_SEAL')}
                      disabled={actionLoading}
                      className="p-3 bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-700/80 rounded-xs text-left transition flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-center justify-between text-emerald-300">
                        <span className="font-semibold text-xs">Complete & Seal Ticket</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] text-emerald-200/70">
                        Confirms all statutory duties fulfilled and seals record into audit block.
                      </p>
                    </button>
                  )}

                  <button
                    onClick={() => handleRemediate('RESTRICT_PROCESSING')}
                    disabled={actionLoading}
                    className="p-3 bg-amber-900/60 hover:bg-amber-900 border border-amber-700/80 rounded-xs text-left transition flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between text-amber-300">
                      <span className="font-semibold text-xs">Art. 18 Processing Freeze</span>
                      <Lock className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-amber-200/70">
                      Freezes automated pipelines and registers account in Suppression Register.
                    </p>
                  </button>

                  <button
                    onClick={() => handleRemediate('STATUTORILY_REFUSE')}
                    disabled={actionLoading}
                    className="p-3 bg-[#161616] hover:bg-[#252525] border border-[#333333] rounded-xs text-left transition flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between text-[#D1D1D1]">
                      <span className="font-semibold text-xs">Statutorily Refuse</span>
                      <Ban className="w-4 h-4 text-[#8C8C8C]" />
                    </div>
                    <p className="text-[11px] text-[#8C8C8C]">
                      Issue formal refusal citing statutory retention (Art. 17(3)(b) / GwG § 8).
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('portability')}
                    className="p-3 bg-blue-900/60 hover:bg-blue-900 border border-blue-700/80 rounded-xs text-left transition flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between text-blue-300">
                      <span className="font-semibold text-xs">Portability Package</span>
                      <Download className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-blue-200/70">
                      Generate and download machine-readable JSON/CSV data export.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA INVENTORY & LAWFUL BASIS */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#8C8C8C]">
                  Data inventory for <strong className="text-[#E0E0E0]">{ticket.full_name}</strong> mapped to GDPR Art. 6 processing purposes and retention rules:
                </p>
              </div>

              <div className="bg-[#050505] border border-[#262626] rounded-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0C0C0C] border-b border-[#262626] font-mono text-[11px] text-[#8C8C8C]">
                    <tr>
                      <th className="py-2.5 px-3">Data Category & Field</th>
                      <th className="py-2.5 px-3">Purpose & Lawful Basis</th>
                      <th className="py-2.5 px-3">System / Storage</th>
                      <th className="py-2.5 px-3">Erasure Entitlement</th>
                      <th className="py-2.5 px-3">Current Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {ticketDetail?.dataItems?.map((item: SubjectDataItem) => (
                      <tr key={item.id} className="hover:bg-[#0C0C0C]/90">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#E0E0E0] block">{item.data_category}</span>
                          <span className="text-[10px] text-[#666666]">{item.field_name}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[#D1D1D1] block">{item.purpose_name}</span>
                          <span className="text-[10px] text-blue-400">{item.lawful_basis} (Retain: {item.retention_years}y)</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[#D1D1D1] block">{item.system_of_record}</span>
                          <span className="text-[10px] text-[#666666]">{item.storage_medium}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.allows_erasure === 1 ? (
                            <span className="text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                              Erasure Allowed
                            </span>
                          ) : (
                            <span className="text-rose-400 font-semibold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800" title={item.statutory_reference}>
                              Blocked (AML Lock)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#8C8C8C] max-w-xs truncate">
                          {item.sample_value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ART. 20 PORTABILITY PACKAGE */}
          {activeTab === 'portability' && (
            <div className="space-y-5">
              <div className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-white font-mono">
                        GDPR Article 20 Machine-Readable Export Package
                      </h4>
                      <p className="text-xs text-[#8C8C8C]">
                        Structured, commonly used, and machine-readable data package with embedded SHA-256 integrity seal.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={`/api/portability/${ticket.ticket_ref}?format=json`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download JSON</span>
                    </a>

                    <a
                      href={`/api/portability/${ticket.ticket_ref}?format=csv`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#161616] hover:bg-[#252525] text-[#E0E0E0] rounded text-xs font-semibold flex items-center space-x-1.5 border border-[#333333]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download CSV</span>
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-[#0C0C0C] border border-[#262626] rounded-xs text-xs font-mono text-[#D1D1D1] space-y-1">
                  <div className="text-[#8C8C8C]">Export Scope: Personal Data provided on Consent (Art. 6(1)(a)) & Contract (Art. 6(1)(b))</div>
                  <div className="text-emerald-400">Target Subject: {ticket.full_name} (CIF: {ticket.cif_number})</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ART. 19 DOWNSTREAM PROPAGATION */}
          {activeTab === 'downstream' && (
            <div className="space-y-6">
              {/* Existing Notifications */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-semibold text-[#8C8C8C] uppercase tracking-wider">
                  Active Recipient Notifications (Art. 19 Propagation)
                </h4>
                {ticketDetail?.downstream?.length === 0 ? (
                  <div className="p-4 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#666666] text-center font-mono">
                    No downstream recipient notifications recorded for this ticket yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ticketDetail?.downstream?.map((dn: DownstreamNotification) => (
                      <div
                        key={dn.id}
                        className="p-3 bg-[#050505] border border-[#262626] rounded-xs flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-white">{dn.recipient_name}</span>
                            <span className="text-[10px] font-mono bg-[#161616] text-[#D1D1D1] px-1.5 py-0.5 rounded">
                              {dn.recipient_type}
                            </span>
                            <span className="text-[10px] font-mono text-purple-400">
                              {dn.notification_type}
                            </span>
                          </div>
                          <p className="text-[#8C8C8C] font-mono text-[11px]">{dn.payload_summary}</p>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                              dn.dispatch_status === 'Dispatched'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                            }`}
                          >
                            {dn.dispatch_status}
                          </span>
                          {dn.dispatch_status === 'Queued' && (
                            <button
                              onClick={() => api.dispatchDownstream(dn.id).then(() => fetchDetail())}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-mono"
                            >
                              Dispatch Now
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form to Queue New Notification */}
              <form onSubmit={handleAddDownstream} className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-3">
                <h4 className="text-xs font-mono font-semibold text-[#D1D1D1]">
                  + Queue New Downstream Recipient Notification (Art. 19)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#8C8C8C] mb-1">Recipient Name</label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0C0C0C] border border-[#262626] rounded text-xs text-[#E0E0E0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#8C8C8C] mb-1">Recipient Type</label>
                    <select
                      value={recipientType}
                      onChange={(e: any) => setRecipientType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0C0C0C] border border-[#262626] rounded text-xs text-[#E0E0E0]"
                    >
                      <option value="Credit Reference Bureau">Credit Reference Bureau (SCHUFA/Experian)</option>
                      <option value="Anti-Fraud Registry">Anti-Fraud Registry</option>
                      <option value="Marketing CRM">Marketing CRM</option>
                      <option value="Core Ledger Processor">Core Ledger Processor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#8C8C8C] mb-1">Notification Type</label>
                    <select
                      value={notificationType}
                      onChange={(e: any) => setNotificationType(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0C0C0C] border border-[#262626] rounded text-xs text-[#E0E0E0]"
                    >
                      <option value="Erasure Instruction">Erasure Instruction (Art. 17)</option>
                      <option value="Rectification Notice">Rectification Notice (Art. 16)</option>
                      <option value="Processing Restriction Freeze">Processing Freeze (Art. 18)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#8C8C8C] mb-1">Payload / Instruction Summary</label>
                  <input
                    type="text"
                    value={downstreamPayload}
                    onChange={(e) => setDownstreamPayload(e.target.value)}
                    placeholder="e.g. Disclose erasure of credit application lead records for CIF-948201"
                    className="w-full px-3 py-1.5 bg-[#0C0C0C] border border-[#262626] rounded text-xs text-[#E0E0E0] font-mono"
                  />
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                  >
                    Queue & Dispatch Recipient Notice
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: ART. 22 AUTOMATED DECISION REVIEW */}
          {activeTab === 'art22' && (
            <div className="space-y-6">
              <div className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-2">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white font-mono">
                    Article 22 Human-in-the-Loop Decision Override
                  </h4>
                </div>
                <p className="text-xs text-[#D1D1D1]">
                  Data subjects have the right not to be subject to a decision based solely on automated processing. This console allows certified senior underwriters to review machine model logic and execute authoritative human overrides.
                </p>
              </div>

              {ticketDetail?.art22Override ? (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xs space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-emerald-300 font-semibold">
                    <span>Active Human Review Decision Recorded:</span>
                    <span>{ticketDetail.art22Override.human_decision}</span>
                  </div>
                  <div className="text-[#D1D1D1]">Model: {ticketDetail.art22Override.model_name} | Original Score: {ticketDetail.art22Override.original_score}</div>
                  <div className="text-[#8C8C8C]">Reviewer: {ticketDetail.art22Override.human_reviewer}</div>
                  <div className="text-[#E0E0E0] mt-2 p-2 bg-[#0C0C0C]/90 rounded border border-[#262626]">
                    Justification: {ticketDetail.art22Override.justification}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddArt22} className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#8C8C8C] mb-1">Model Name</label>
                      <input
                        type="text"
                        value={modelName}
                        onChange={(e) => setModelName(e.target.value)}
                        className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[#8C8C8C] mb-1">Automated Outcome</label>
                      <input
                        type="text"
                        value={automatedOutcome}
                        onChange={(e) => setAutomatedOutcome(e.target.value)}
                        className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[#8C8C8C] mb-1">Human Decision Override</label>
                      <select
                        value={humanDecision}
                        onChange={(e: any) => setHumanDecision(e.target.value)}
                        className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                      >
                        <option value="Modified (Adjusted Limits)">Modified (Adjusted Limits)</option>
                        <option value="Overturned (Favorable to Customer)">Overturned (Favorable to Customer)</option>
                        <option value="Affirmed (Automated Valid)">Affirmed (Automated Valid)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8C8C8C] mb-1">Human Reviewer</label>
                      <input
                        type="text"
                        value={humanReviewer}
                        onChange={(e) => setHumanReviewer(e.target.value)}
                        className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#8C8C8C] mb-1">Comprehensive Model Logic Review & Rationale:</label>
                    <textarea
                      rows={3}
                      value={art22Justification}
                      onChange={(e) => setArt22Justification(e.target.value)}
                      className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                      required
                    />
                  </div>

                  <div className="text-right">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold"
                    >
                      Record Human Intervention & Seal Decision
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 6: BACKUP BEYOND USE */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              <div className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-2">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white font-mono">
                    Immutable Backup & Snapshot 'Beyond Use' Certification
                  </h4>
                </div>
                <p className="text-xs text-[#D1D1D1]">
                  Data stored on immutable backups (write-once cold tapes, WORM storage) cannot be surgically deleted without destroying entire media sets. French CNIL and UK ICO guidelines permit putting backup data 'beyond operational use' until cyclic rotation overwrite occurs.
                </p>
              </div>

              {ticketDetail?.backupLogs?.map((bkp: BackupBeyondUseLog) => (
                <div key={bkp.id} className="p-4 bg-[#050505] border border-[#262626] rounded-xs space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-amber-300 font-semibold">
                    <span>Tape Vault: {bkp.backup_tape_id}</span>
                    <span>Scheduled Overwrite: {bkp.scheduled_overwrite_date}</span>
                  </div>
                  <div className="text-[#8C8C8C]">Storage Location: {bkp.storage_location}</div>
                  <div className="text-[#D1D1D1]">Technical Measures: {bkp.technical_measures}</div>
                  <div className="text-[11px] text-[#666666]">Certified by: {bkp.officer_signature} on {new Date(bkp.certified_at).toLocaleDateString()}</div>
                </div>
              ))}

              <form onSubmit={handleAddBackupLog} className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-3 text-xs font-mono">
                <h4 className="font-semibold text-[#D1D1D1]">+ Log Immutable Backup Beyond-Use Token</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8C8C8C] mb-1">Backup Tape ID / Partition</label>
                    <input
                      type="text"
                      value={tapeId}
                      onChange={(e) => setTapeId(e.target.value)}
                      className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#8C8C8C] mb-1">Storage Facility Location</label>
                    <input
                      type="text"
                      value={storageLocation}
                      onChange={(e) => setStorageLocation(e.target.value)}
                      className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#8C8C8C] mb-1">Technical Isolation Measures</label>
                    <input
                      type="text"
                      value={technicalMeasures}
                      onChange={(e) => setTechnicalMeasures(e.target.value)}
                      className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[#8C8C8C] mb-1">Scheduled Cyclic Overwrite Date</label>
                    <input
                      type="date"
                      value={scheduledOverwrite}
                      onChange={(e) => setScheduledOverwrite(e.target.value)}
                      className="w-full p-2 bg-[#0C0C0C] border border-[#262626] rounded text-[#E0E0E0]"
                      required
                    />
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-semibold"
                  >
                    Issue Beyond-Use Certificate
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 7: TAMPER AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-semibold text-[#8C8C8C] uppercase tracking-wider">
                Ticket Cryptographic Event History (SHA-256 Hash Chained)
              </h4>
              <div className="space-y-2">
                {ticketDetail?.auditTrail?.map((log: AuditLog) => (
                  <div key={log.id} className="p-3 bg-[#050505] border border-[#262626] rounded-xs space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-[#8C8C8C]">
                      <span className="font-bold text-blue-400">#{log.id} • {log.event_type}</span>
                      <span>{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                    </div>
                    <p className="text-[#E0E0E0]">{log.action_detail}</p>
                    <div className="text-[10px] text-[#666666] break-all space-y-0.5">
                      <div>Prev Hash: {log.prev_hash}</div>
                      <div>Block Hash: <span className="text-emerald-400">{log.current_hash}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
