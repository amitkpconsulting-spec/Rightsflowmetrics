import React, { useState } from 'react';
import {
  X,
  Upload,
  Download,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface DataExchangeModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const DataExchangeModal: React.FC<DataExchangeModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'import' | 'ipc'>('import');
  const [jsonInput, setJsonInput] = useState<string>(`{
  "subjects": [
    {
      "cif_number": "CIF-778901",
      "full_name": "Alexander von Weber",
      "email": "a.vonweber@bavaria-holding.de",
      "phone": "+49 89 998822",
      "residency_country": "DE",
      "customer_segment": "Private Wealth",
      "kyc_status": "Verified",
      "aml_flag": 0
    }
  ],
  "tickets": [
    {
      "subject_id": "SUB-001",
      "right_type": "Erasure (Art. 17)",
      "status": "Intake & Verification",
      "priority": "Standard",
      "remediation_summary": "Batch imported request via Core Banking ETL pipeline"
    }
  ]
}`);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulatedLog, setSimulatedLog] = useState<string[]>([]);

  const handleExecuteImport = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage(null);
      const parsed = JSON.parse(jsonInput);
      const res = await api.batchImport(parsed);
      setStatusMessage(`✅ Successfully imported ${res.subjectsAdded} subjects and ${res.ticketsAdded} tickets via REST endpoint.`);
      onSuccess();
    } catch (err: any) {
      setStatusMessage(`❌ Import Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateIpcSync = () => {
    setIsProcessing(true);
    setSimulatedLog([
      `[${new Date().toISOString()}] IPC_INIT | Connecting to Core Banking Mainframe Unix Domain Socket (/tmp/core_bank_dsr.sock)...`,
      `[${new Date().toISOString()}] IPC_AUTH | Mutual TLS Handshake OK (Air-gap HSM Key verified)`,
      `[${new Date().toISOString()}] IPC_FETCH | Querying unhandled DSR tickets from Online Banking queue...`,
      `[${new Date().toISOString()}] IPC_SYNC | Retrieved 2 new customer KYC updates and 1 Rectification request for CIF-819234`,
      `[${new Date().toISOString()}] IPC_APPLY | Enforcing Suppression Register sync across CRM Outbound Relays...`,
      `[${new Date().toISOString()}] IPC_DONE | Local embedded WAL persistence committed. 0 SLA breaches detected.`
    ]);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0C0C0C] border border-[#333333] rounded-none w-full max-w-2xl shadow-2xl overflow-hidden text-[#E0E0E0] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#050505] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-mono">
              Core Banking Integration & Batch Exchange
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C8C8C] hover:text-white rounded-xs hover:bg-[#161616] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="bg-[#050505]/90 border-b border-[#262626] px-6 flex space-x-6 text-xs font-mono">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Batch JSON / REST Import
          </button>
          <button
            onClick={() => setActiveTab('ipc')}
            className={`py-3 border-b-2 font-medium transition cursor-pointer ${
              activeTab === 'ipc'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-[#8C8C8C] hover:text-[#E0E0E0]'
            }`}
          >
            Core Banking Local IPC Runner
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs font-mono">
          {statusMessage && (
            <div className="p-3 bg-[#050505] border border-[#262626] rounded-xs text-[#E0E0E0]">
              {statusMessage}
            </div>
          )}

          {activeTab === 'import' ? (
            <div className="space-y-3">
              <p className="text-[#8C8C8C]">
                Paste batch records in JSON format to ingest Data Subject profiles or DSR requests via the headless REST integration endpoint:
              </p>
              <textarea
                rows={10}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="w-full p-3 bg-[#050505] border border-[#262626] rounded-xs text-[#E0E0E0] font-mono text-[11px] focus:outline-hidden focus:border-emerald-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 bg-[#161616] hover:bg-[#252525] text-[#D1D1D1] rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteImport}
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#000000] shadow-emerald-950/50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Execute Ingestion</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[#8C8C8C]">
                Simulate an air-gapped local IPC socket query across Core Banking Unix Sockets, AML registries, and CRM ETL pipelines:
              </p>

              <button
                onClick={handleSimulateIpcSync}
                disabled={isProcessing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-[2px_2px_0px_0px_#000000] shadow-emerald-950/50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Core Banking IPC Sync</span>
              </button>

              {simulatedLog.length > 0 && (
                <div className="bg-[#050505] p-3 rounded-xs border border-[#262626] space-y-1 text-[11px] text-emerald-400 max-h-56 overflow-y-auto">
                  {simulatedLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
