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
  UserCheck
} from 'lucide-react';
import { ServerHealth } from '../types';

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

  return (
    <header className="bg-[#0A0A0A] border-b border-[#222222] text-[#EBEBEB] sticky top-0 z-30 shrink-0 font-mono">
      {/* Top Telemetry / Status Bar */}
      <div className="bg-[#050505] px-4 py-1.5 border-b border-[#1F1F1F] flex flex-wrap items-center justify-between text-xs text-[#888888]">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <span className="flex items-center space-x-1.5 font-mono text-[#FF4D4D] font-bold bg-[#260505] px-2 py-0.5 border border-[#821717] text-[10px] tracking-wider">
            <Radio className="w-3 h-3 animate-pulse text-[#FF4D4D]" />
            <span>AIR-GAPPED ISOLATION</span>
          </span>
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
            <span>LAT: <strong className="text-[#EBEBEB] font-semibold">{health?.database ? `${health.database.avgLatencyMs}ms` : '0.14ms'}</strong></span>
          </div>
        </div>
      </div>

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
          <div className="flex items-center space-x-2.5">
            {health?.slaAlerts?.overdueCount ? (
              <div className="hidden sm:flex items-center space-x-1.5 bg-[#3B0A0A] text-[#FF6B6B] border border-[#991B1B] px-2.5 py-1 text-xs font-semibold animate-pulse shadow-[2px_2px_0px_0px_#000000]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B6B]" />
                <span>{health.slaAlerts.overdueCount} SLA BREACH RISK</span>
              </div>
            ) : null}

            {/* Zero-Trust Authenticated Status */}
            <div className="hidden md:flex items-center space-x-2 bg-[#141414] border border-[#2B2B2B] px-3 py-1.5 text-xs shadow-[2px_2px_0px_0px_#000000]">
              <span className="w-2 h-2 bg-[#C11212] animate-pulse" />
              <span className="text-[#D1D1D1] font-mono text-[11px] font-medium">Zero-Trust Localhost</span>
            </div>

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
            <div className="w-8 h-8 bg-[#161616] border border-[#2E2E2E] shadow-[2px_2px_0px_0px_#000000] flex items-center justify-center font-bold text-xs text-[#FF4D4D] font-mono" title="Logged in as: Data Protection Officer">
              DPO
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

