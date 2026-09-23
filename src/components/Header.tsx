import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Radio,
  Lock,
  Clock,
  Database,
  AlertTriangle,
  Server,
  FileCheck,
  RefreshCw,
  Menu,
  Key,
  UserCheck,
  Cpu,
  Zap,
  CheckCircle2,
  X,
  RotateCcw
} from 'lucide-react';
import { ServerHealth } from '../types';
import {
  getOperatingMode,
  setOperatingMode,
  isAirGapped,
  setAirGapped,
  onOperatingModeChange,
  OperatingMode,
  api
} from '../services/api';

interface HeaderProps {
  health: ServerHealth | null;
  onRefresh: () => void;
  onOpenNewTicket: () => void;
  onOpenDataExchange: () => void;
  isRefreshing: boolean;
  onToggleMobileMenu?: () => void;
  onNavigateToDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  onRefresh,
  onOpenNewTicket,
  onOpenDataExchange,
  isRefreshing,
  onToggleMobileMenu,
  onNavigateToDashboard
}) => {
  const [localTime, setLocalTime] = useState<string>('');
  const [mode, setMode] = useState<OperatingMode>(getOperatingMode());
  const [airGappedActive, setAirGappedActive] = useState<boolean>(isAirGapped());
  const [showEnclaveModal, setShowEnclaveModal] = useState<boolean>(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLocalTime(
        now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onOperatingModeChange((newMode, isAirGappedVal) => {
      setMode(newMode);
      setAirGappedActive(isAirGappedVal);
    });
    return unsubscribe;
  }, []);

  const handleToggleMode = (newMode: OperatingMode) => {
    setOperatingMode(newMode);
    setMode(newMode);
    setNotificationMsg(
      newMode === 'frontend'
        ? '⚡ Frontend Mode Enabled: In-Browser Air-Gapped Engine active with virtual SQLite storage.'
        : '🖥️ Server Mode Enabled: Connecting to Node.js REST API service.'
    );
    setTimeout(() => setNotificationMsg(null), 4000);
    onRefresh();
  };

  const handleToggleAirGap = (enabled: boolean) => {
    setAirGapped(enabled);
    setAirGappedActive(enabled);
    setNotificationMsg(
      enabled
        ? '🛡️ Air-Gapped Isolation Active: All external egress strictly blocked. Local SHA-256 ledger enforced.'
        : '🌐 Network Gateway Mode Active: Standard egress permitted.'
    );
    setTimeout(() => setNotificationMsg(null), 4000);
    onRefresh();
  };

  const handleResetVirtualStore = () => {
    if (confirm('Reset in-browser virtual store back to pristine factory compliance dataset?')) {
      api.resetFrontendStore();
      setNotificationMsg('🔄 Virtual Store reset to initial baseline dataset.');
      setTimeout(() => setNotificationMsg(null), 4000);
      onRefresh();
      setShowEnclaveModal(false);
    }
  };

  return (
    <>
      <header className="bg-[#0A0A0A] border-b border-[#222222] text-[#EBEBEB] sticky top-0 z-30 shrink-0 font-mono">
        {/* Top Telemetry / Status Bar */}
        <div className="bg-[#050505] px-4 py-1.5 border-b border-[#1F1F1F] flex flex-wrap items-center justify-between text-xs text-[#888888] gap-y-1">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
            {/* Air-Gapped Status Pill (Clickable) */}
            <button
              onClick={() => setShowEnclaveModal(true)}
              className={`flex items-center space-x-1.5 font-mono font-bold px-2 py-0.5 border text-[10px] tracking-wider transition cursor-pointer ${
                airGappedActive
                  ? 'bg-[#260505] text-[#FF4D4D] border-[#821717] hover:bg-[#380808]'
                  : 'bg-[#141414] text-[#888888] border-[#333333] hover:text-white'
              }`}
              title="Click to inspect Air-Gapped Zero-Trust Enclave settings"
            >
              <Radio className={`w-3 h-3 ${airGappedActive ? 'animate-pulse text-[#FF4D4D]' : 'text-[#666666]'}`} />
              <span>{airGappedActive ? 'AIR-GAPPED ISOLATION' : 'NETWORK CONNECTED'}</span>
            </button>

            {/* Operating Mode Pill (Clickable) */}
            <button
              onClick={() => setShowEnclaveModal(true)}
              className={`flex items-center space-x-1.5 font-mono text-[10px] px-2 py-0.5 border font-semibold transition cursor-pointer ${
                mode === 'frontend'
                  ? 'bg-[#061C14] text-emerald-400 border-emerald-800 hover:bg-[#092B1F]'
                  : 'bg-[#0E1A2E] text-cyan-400 border-cyan-800 hover:bg-[#162744]'
              }`}
              title="Click to toggle between Frontend In-Browser Engine and Server REST API"
            >
              {mode === 'frontend' ? <Zap className="w-3 h-3 text-emerald-400" /> : <Server className="w-3 h-3 text-cyan-400" />}
              <span>{mode === 'frontend' ? 'FRONTEND MODE (ACTIVE)' : 'SERVER MODE (ACTIVE)'}</span>
            </button>

            <span className="hidden sm:inline-flex items-center space-x-1 font-mono text-[#999999] text-[11px]">
              <Key className="w-3 h-3 text-[#FF4D4D]" />
              <span>Vault Hash: <strong className="text-[#FF4D4D] font-mono font-normal">8f32..9ae1</strong></span>
            </span>
            <span className="hidden md:inline-flex items-center space-x-1 font-mono text-[#888888] text-[11px]">
              <FileCheck className="w-3 h-3 text-[#A0A0A0]" />
              <span>SHA-256 Chained</span>
            </span>
          </div>

          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <div className="flex items-center space-x-1.5 text-[#F59E0B]">
              <Clock className="w-3 h-3 text-[#F59E0B]" />
              <span>Clock: {localTime || '2026-08-25 10:15:55 UTC'}</span>
            </div>
            <div className="hidden lg:flex items-center space-x-1.5 text-[#888888] border-l border-[#222222] pl-3">
              <Server className="w-3 h-3 text-[#666666]" />
              <span>LAT: <strong className="text-[#EBEBEB] font-semibold">{health?.database ? `${health.database.avgLatencyMs}ms` : '0.12ms'}</strong></span>
            </div>
          </div>
        </div>

        {/* Global Toast Notification */}
        {notificationMsg && (
          <div className="bg-[#121212] border-b border-[#333333] px-4 py-1.5 text-xs font-mono text-emerald-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{notificationMsg}</span>
            </div>
            <button onClick={() => setNotificationMsg(null)} className="text-[#888888] hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Header Content */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0C0C0C]">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile hamburger & Title */}
            <div className="flex items-center space-x-3">
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden p-1.5 text-[#888888] hover:text-white bg-[#141414] border border-[#2B2B2B]"
                aria-label="Toggle navigation"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center space-x-2.5">
                  <h1
                    onClick={onNavigateToDashboard}
                    className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2 cursor-pointer hover:text-[#FF4D4D] transition-colors group uppercase"
                    title="Redirect to Executive Dashboard"
                  >
                    <span className="text-[#FF4D4D] group-hover:underline">RightsFlow Metrics</span>
                    <span className="text-[#444444] font-normal text-sm hidden sm:inline">•</span>
                    <span className="text-xs sm:text-sm font-semibold text-[#D1D1D1] group-hover:text-white hidden sm:inline">GDPR Control Center</span>
                  </h1>
                  <span className="hidden sm:inline-block bg-[#1A1A1A] text-[#FF4D4D] text-[10px] font-mono font-bold px-2 py-0.5 border border-[#333333]">
                    REGULATORY SEC-OPS
                  </span>
                </div>
                <p className="text-[11px] text-[#808080]">
                  Air-gapped regulatory remediation engine & statutory lawful basis analyzer
                </p>
              </div>
            </div>

            {/* Quick Actions & User Role */}
            <div className="flex items-center space-x-2 sm:space-x-2.5">
              {health?.slaAlerts?.overdueCount ? (
                <div className="hidden sm:flex items-center space-x-1.5 bg-[#3B0A0A] text-[#FF6B6B] border border-[#991B1B] px-2.5 py-1 text-xs font-semibold animate-pulse shadow-[2px_2px_0px_0px_#000000]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B6B]" />
                  <span>{health.slaAlerts.overdueCount} SLA BREACH RISK</span>
                </div>
              ) : null}

              {/* Mode Control Button */}
              <button
                onClick={() => setShowEnclaveModal(true)}
                className="hidden md:flex items-center space-x-1.5 bg-[#141414] hover:bg-[#1C1C1C] border border-[#2B2B2B] hover:border-[#444444] px-2.5 py-1 text-xs text-[#D1D1D1] hover:text-white transition shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
                title="Manage Air-Gap & Frontend/Server Operational Modes"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-[11px]">{mode === 'frontend' ? 'Frontend Engine' : 'Node REST'}</span>
              </button>

              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 bg-[#161616] hover:bg-[#222222] text-[#B0B0B0] hover:text-white border border-[#2E2E2E] shadow-[2px_2px_0px_0px_#000000] transition cursor-pointer"
                title="Refresh Telemetry & Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FF4D4D]' : ''}`} />
              </button>

              <button
                onClick={onOpenDataExchange}
                className="hidden sm:flex px-3 py-1.5 bg-[#161616] hover:bg-[#222222] text-[#D1D1D1] hover:text-white text-xs font-medium border border-[#2E2E2E] shadow-[2px_2px_0px_0px_#000000] transition items-center space-x-1.5 cursor-pointer"
              >
                <span>Core Banking IPC</span>
              </button>

              <button
                onClick={onOpenNewTicket}
                className="px-3.5 py-1.5 bg-[#C11212] hover:bg-[#D91818] text-white text-xs font-bold border border-[#E61919] shadow-[2px_2px_0px_0px_#000000] transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>+ New DSR Intake</span>
              </button>

              {/* DPO Avatar */}
              <div
                onClick={() => setShowEnclaveModal(true)}
                className="w-8 h-8 bg-[#161616] hover:bg-[#222] border border-[#2E2E2E] shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center font-bold text-xs text-[#FF4D4D] font-mono cursor-pointer"
                title="Logged in as: Data Protection Officer (Click for Air-Gap Settings)"
              >
                DPO
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Air-Gapped & Frontend Operational Control Modal */}
      {showEnclaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 font-mono">
          <div className="bg-[#0D0D0D] border border-[#333333] w-full max-w-xl shadow-[6px_6px_0px_0px_#000000] text-[#EBEBEB]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#141414] border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-[#FF4D4D]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Air-Gapped & Frontend Mode Configuration
                </h3>
              </div>
              <button
                onClick={() => setShowEnclaveModal(false)}
                className="text-[#888888] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              {/* Architecture Overview */}
              <div className="bg-[#070707] p-4 border border-[#222222] space-y-2">
                <div className="text-[#FF4D4D] font-bold uppercase tracking-wider flex items-center space-x-2">
                  <Radio className="w-4 h-4 animate-pulse" />
                  <span>Sovereign Security Enclave Status</span>
                </div>
                <p className="text-[#A0A0A0] leading-relaxed">
                  RightsFlow Metrics can execute in <strong>100% In-Browser Frontend Mode</strong> with local virtual storage and cryptographic SHA-256 block sealing, or connect via REST to an isolated Node.js container backend.
                </p>
              </div>

              {/* Mode Toggle Selection */}
              <div className="space-y-3">
                <label className="text-white font-bold uppercase tracking-wider block text-xs">
                  Operational Execution Engine
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Frontend Mode */}
                  <div
                    onClick={() => handleToggleMode('frontend')}
                    className={`p-3.5 border cursor-pointer transition ${
                      mode === 'frontend'
                        ? 'bg-[#061C14] border-emerald-600 shadow-[2px_2px_0px_0px_#059669]'
                        : 'bg-[#111111] border-[#2B2B2B] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" />
                        <span>Frontend Mode</span>
                      </span>
                      {mode === 'frontend' && (
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] px-1.5 py-0.5 border border-emerald-800 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#888888] leading-normal">
                      Zero backend dependency. Operates entirely in browser memory & localStorage. Instant query latency (&lt;0.2ms).
                    </p>
                  </div>

                  {/* Option 2: Server Mode */}
                  <div
                    onClick={() => handleToggleMode('server')}
                    className={`p-3.5 border cursor-pointer transition ${
                      mode === 'server'
                        ? 'bg-[#0E1A2E] border-cyan-600 shadow-[2px_2px_0px_0px_#0284C7]'
                        : 'bg-[#111111] border-[#2B2B2B] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        <Server className="w-4 h-4 text-cyan-400" />
                        <span>Server REST Mode</span>
                      </span>
                      {mode === 'server' && (
                        <span className="bg-cyan-950 text-cyan-300 text-[10px] px-1.5 py-0.5 border border-cyan-800 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#888888] leading-normal">
                      Connects to Node.js backend with SQLite WAL file persistence on disk. Auto-falls back to Frontend if offline.
                    </p>
                  </div>
                </div>
              </div>

              {/* Air-Gapped Egress Isolation */}
              <div className="space-y-3">
                <label className="text-white font-bold uppercase tracking-wider block text-xs">
                  Zero-Trust Network Air-Gap Control
                </label>
                <div className="bg-[#111111] p-4 border border-[#2B2B2B] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-white font-semibold flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-[#FF4D4D]" />
                      <span>Strict Air-Gapped Isolation</span>
                    </div>
                    <p className="text-[11px] text-[#888888]">
                      Blocks all external third-party network egress. Prohibits telemetry relays, external fonts, and analytics.
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleAirGap(!airGappedActive)}
                    className={`px-3 py-1.5 text-xs font-bold border transition shrink-0 cursor-pointer ${
                      airGappedActive
                        ? 'bg-[#3B0A0A] text-[#FF6B6B] border-[#991B1B] hover:bg-[#4C0D0D]'
                        : 'bg-[#161616] text-[#A0A0A0] border-[#333] hover:text-white'
                    }`}
                  >
                    {airGappedActive ? 'AIR-GAP: ON' : 'AIR-GAP: OFF'}
                  </button>
                </div>
              </div>

              {/* Technical Safeguards & Diagnostics */}
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono bg-[#070707] p-3.5 border border-[#222222]">
                <div>
                  <span className="text-[#666666] block">Tamper Ledger Root:</span>
                  <span className="text-[#FF4D4D] font-bold">SHA-256 Merkle Chain (Sealed)</span>
                </div>
                <div>
                  <span className="text-[#666666] block">Core Banking IPC:</span>
                  <span className="text-emerald-400 font-bold">Simulated Localhost Socket</span>
                </div>
                <div>
                  <span className="text-[#666666] block">Storage Engine:</span>
                  <span className="text-[#D1D1D1]">
                    {mode === 'frontend' ? 'In-Browser Virtual WAL' : 'SQLite 3.45 WAL Disk'}
                  </span>
                </div>
                <div>
                  <span className="text-[#666666] block">Egress Status:</span>
                  <span className={airGappedActive ? 'text-emerald-400 font-bold' : 'text-[#F59E0B] font-bold'}>
                    {airGappedActive ? '0 B (AIR-GAP ENFORCED)' : 'STANDARD OUTBOUND'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-[#222222] flex items-center justify-between gap-3">
                <button
                  onClick={handleResetVirtualStore}
                  className="px-3 py-1.5 bg-[#141414] hover:bg-[#202020] text-[#999999] hover:text-white border border-[#2B2B2B] text-xs flex items-center space-x-1.5 cursor-pointer"
                  title="Reset local changes back to default retail banking records"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Seed Data</span>
                </button>

                <button
                  onClick={() => setShowEnclaveModal(false)}
                  className="px-4 py-1.5 bg-[#C11212] hover:bg-[#D91818] text-white font-bold border border-[#E61919] shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
                >
                  Apply & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
