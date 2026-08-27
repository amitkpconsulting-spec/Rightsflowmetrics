import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  FileJson,
  Download,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  Code,
  Key,
  Database
} from 'lucide-react';
import { AuditLog, AuditVerificationResult } from '../types';
import { api } from '../services/api';

export const AuditLedgerView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState<AuditVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAuditLogs(150);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunVerification = async () => {
    try {
      setIsVerifying(true);
      const result = await api.verifyAuditChain();
      setVerificationResult(result);
    } catch (err) {
      console.error('Failed to verify audit chain:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const data = await api.exportAuditLogs('Audit Ledger Inspector');
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `GDPR_Compliance_Audit_Logs_Regulatory_Export_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportNotice(`Exported ${data.auditLogs?.length || logs.length} audit records to JSON for regulatory inspection.`);
      setTimeout(() => setExportNotice(null), 5000);
      loadLogs();
    } catch (err: any) {
      console.error('Failed to export audit logs:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    loadLogs();
    handleRunVerification();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.action_detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.ticket_ref && l.ticket_ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.operator_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0C0C0C] border border-[#262626] p-5 rounded-xs shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white font-mono">
              Tamper-Evident Cryptographic Compliance Audit Ledger
            </h2>
          </div>
          <p className="text-xs text-[#8C8C8C] max-w-3xl leading-relaxed">
            Every regulatory evaluation, state transition, ID pause, and remediation action is sealed in an immutable SHA-256 hash-chained block. Mathematical proof ensures zero retroactive record tampering.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          <button
            onClick={loadLogs}
            className="p-2 bg-[#161616] hover:bg-[#252525] text-[#D1D1D1] rounded-xs border border-[#333333] transition"
            title="Refresh Audit Records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportJson}
            disabled={isExporting}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#252525] text-cyan-300 rounded-xs text-xs font-semibold border border-cyan-800/80 hover:border-cyan-600 shadow transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Export full audit ledger to machine-readable JSON format for regulatory inspection"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" /> : <FileJson className="w-4 h-4 text-cyan-400" />}
            <span>{isExporting ? 'Exporting...' : 'Export Regulatory JSON'}</span>
          </button>

          <button
            onClick={handleRunVerification}
            disabled={isVerifying}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xs text-xs font-semibold shadow transition flex items-center space-x-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isVerifying ? 'Verifying Chain...' : 'Verify Cryptographic Integrity'}</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-xs text-xs flex items-center justify-between font-mono animate-in fade-in">
          <span>{exportNotice}</span>
          <span className="bg-emerald-900 text-emerald-200 text-[10px] px-2 py-0.5 rounded font-bold">SEALED</span>
        </div>
      )}

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-4 rounded-xs border flex items-start space-x-3 text-xs font-mono ${
            verificationResult.isValid
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/50 border-rose-800 text-rose-300'
          }`}
        >
          {verificationResult.isValid ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>
                {verificationResult.isValid
                  ? 'CRYPTOGRAPHIC HASH CHAIN INTEGRITY: 100% VERIFIED'
                  : 'CRYPTOGRAPHIC TAMPERING DETECTED'}
              </span>
              <span className="text-[10px] bg-[#0C0C0C] px-2 py-0.5 rounded border border-[#333333] text-[#D1D1D1] font-normal">
                {verificationResult.totalChecked} Chained Blocks Validated
              </span>
            </div>
            <p className="text-[#D1D1D1] text-[11px] leading-relaxed">
              {verificationResult.details}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search audit trail by event type, ticket ref, operator, or text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        <div className="text-xs font-mono text-[#8C8C8C]">
          Showing <strong className="text-white">{filtered.length}</strong> sealed records
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050505] border-b border-[#262626] font-mono text-[11px] text-[#8C8C8C]">
              <tr>
                <th className="py-3 px-4">Block & Timestamp</th>
                <th className="py-3 px-4">Event & Ticket</th>
                <th className="py-3 px-4">Operator & Role</th>
                <th className="py-3 px-4">Action Detail & State Diff</th>
                <th className="py-3 px-4">Cryptographic Hash Chaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666666]">
                    Loading cryptographic ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666666]">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161616]/90 transition">
                    <td className="py-3 px-4 text-[#D1D1D1]">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                          #{log.id}
                        </span>
                        <span className="text-[10px] text-[#8C8C8C]">
                          {new Date(log.timestamp).toLocaleTimeString('en-GB')}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#666666] block mt-0.5">
                        {new Date(log.timestamp).toLocaleDateString('en-GB')}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-white block text-xs">
                        {log.event_type}
                      </span>
                      <span className="text-[10px] text-blue-400">
                        {log.ticket_ref ? `Ref: ${log.ticket_ref}` : 'System Scope'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[#E0E0E0] block font-semibold">{log.operator_id}</span>
                      <span className="text-[10px] text-[#8C8C8C]">{log.actor_role}</span>
                    </td>

                    <td className="py-3 px-4 text-[#D1D1D1] max-w-sm">
                      <p className="line-clamp-2 leading-relaxed">{log.action_detail}</p>
                      {log.state_diff_json && log.state_diff_json !== '{}' && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="mt-1 text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 underline"
                        >
                          <Code className="w-2.5 h-2.5" />
                          <span>View State Payload Diff</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4 text-[10px] text-[#8C8C8C] space-y-0.5 max-w-xs truncate">
                      <div className="truncate text-[#666666]">
                        Prev: <span className="font-mono">{log.prev_hash.substring(0, 18)}...</span>
                      </div>
                      <div className="truncate text-emerald-400 font-semibold">
                        Block: <span className="font-mono">{log.current_hash.substring(0, 20)}...</span>
                      </div>
                      <div className="truncate text-[9px] text-[#666666] font-mono">
                        Sig: {log.digital_signature.substring(0, 24)}...
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0C0C0C] border border-[#333333] rounded-none w-full max-w-lg shadow-2xl p-6 space-y-4 text-[#E0E0E0]">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="font-bold text-white font-mono text-xs flex items-center gap-2">
                <Code className="w-4 h-4 text-cyan-400" />
                <span>Audit Block #{selectedLog.id} State Diff Payload</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-[#8C8C8C] hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="text-[#8C8C8C]">Event: {selectedLog.event_type}</div>
              <div className="text-[#8C8C8C]">Operator: {selectedLog.operator_id} ({selectedLog.actor_role})</div>
              <div className="text-[#D1D1D1] mt-2 bg-[#050505] p-3 rounded-xs border border-[#262626] overflow-x-auto max-h-60">
                <pre>{JSON.stringify(JSON.parse(selectedLog.state_diff_json || '{}'), null, 2)}</pre>
              </div>
            </div>

            <div className="text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3 py-1.5 bg-[#161616] text-[#E0E0E0] rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
