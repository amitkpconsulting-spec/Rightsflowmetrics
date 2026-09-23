import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ListFilter,
  Scale,
  Ban,
  Send,
  FileCheck2,
  Activity,
  PlusCircle,
  RefreshCw,
  Layers,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Scan,
  AlertTriangle,
  Radio,
  Lock,
  Database,
  Clock,
  Menu,
  X,
  Server
} from 'lucide-react';
import { Header } from './components/Header';
import { QueueManagement } from './components/QueueManagement';
import { TicketDetailModal } from './components/TicketDetailModal';
import { NewTicketModal } from './components/NewTicketModal';
import { LawfulBasisMatrix } from './components/LawfulBasisMatrix';
import { SuppressionRegisterView } from './components/SuppressionRegisterView';
import { DownstreamPropagationView } from './components/DownstreamPropagationView';
import { AuditLedgerView } from './components/AuditLedgerView';
import { ServerHealthView } from './components/ServerHealthView';
import { DataExchangeModal } from './components/DataExchangeModal';
import { PiaAlignmentView } from './components/PiaAlignmentView';
import { GDPRComplianceDashboard } from './components/GDPRComplianceDashboard';
import { SummaryDashboard } from './components/SummaryDashboard';
import { DsrTicket, ServerHealth } from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'summary' | 'queue' | 'pia' | 'matrix' | 'suppression' | 'downstream' | 'audit' | 'health'
  >('dashboard');

  const [tickets, setTickets] = useState<DsrTicket[]>([]);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [operatingMode, setOperatingModeState] = useState(api.getOperatingMode());
  const [isAirGappedState, setIsAirGappedState] = useState(api.isAirGapped());

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<DsrTicket | null>(null);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [showDataExchangeModal, setShowDataExchangeModal] = useState(false);
  const [summaryInitialSlide, setSummaryInitialSlide] = useState<number>(0);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [ticketList, healthData] = await Promise.all([
        api.getTickets(),
        api.getHealth()
      ]);
      setTickets(ticketList);
      setHealth(healthData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = api.onOperatingModeChange((newMode, isAirGappedVal) => {
      setOperatingModeState(newMode);
      setIsAirGappedState(isAirGappedVal);
      loadData();
    });
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleToggleIdPause = async (ticket: DsrTicket) => {
    try {
      const nextStatus =
        ticket.id_verification_status === 'Clock Paused - Awaiting ID'
          ? 'Verified'
          : 'Clock Paused - Awaiting ID';
      await api.updateTicket(ticket.id, {
        idVerificationStatus: nextStatus,
        operatorName: 'Compliance Officer J. Weber'
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyExtension = async (ticket: DsrTicket) => {
    setSelectedTicket(ticket);
  };

  const navItems = [
    { id: 'dashboard' as const, label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'summary' as const, label: 'Summary Dashboard', icon: Layers },
    { id: 'queue' as const, label: 'Operations Queue', icon: ListFilter, count: tickets.length },
    { id: 'pia' as const, label: 'Individual Rights Scanner', icon: Scan },
    { id: 'matrix' as const, label: 'Lawful Basis Matrix', icon: Scale },
    { id: 'suppression' as const, label: 'Suppression Register', icon: Ban },
    { id: 'downstream' as const, label: 'Art. 19 Downstream', icon: Send },
    { id: 'audit' as const, label: 'Tamper Audit Ledger', icon: FileCheck2 },
    { id: 'health' as const, label: 'Server Telemetry', icon: Activity },
  ];

  return (
    <div className="flex h-screen bg-[#050505] text-[#EBEBEB] font-mono overflow-hidden selection:bg-[#C11212] selection:text-white">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Terminal Dark Russian Navigation */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-[#222222] flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-[#222222] bg-[#080808] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-8 h-8 bg-[#C11212] flex items-center justify-center font-bold text-white shadow-[2px_2px_0px_0px_#000000] border border-[#E61919] cursor-pointer hover:bg-[#D91818] transition-colors"
                title="Redirect to Executive Dashboard"
              >
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="font-bold text-sm leading-tight text-white tracking-tight cursor-pointer hover:text-[#FF4D4D] transition-colors uppercase"
                  title="Redirect to Executive Dashboard"
                >
                  RightsFlow Metrics
                </h1>
                <p className="text-[9px] font-mono text-[#FF4D4D] uppercase tracking-widest font-semibold">AIR-GAPPED NODE #82</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-[#808080] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium transition cursor-pointer border ${
                    isActive
                      ? 'bg-[#181818] text-white border-l-4 border-l-[#C11212] border-t-[#2E2E2E] border-r-[#2E2E2E] border-b-[#2E2E2E] font-semibold shadow-[2px_2px_0px_0px_#000000]'
                      : 'text-[#999999] hover:bg-[#141414] hover:text-[#EBEBEB] border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={`w-2 h-2 ${isActive ? 'bg-[#C11212] shadow-xs shadow-red-500' : 'bg-[#404040]'}`} />
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF4D4D]' : 'text-[#808080]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 ${
                        isActive
                          ? 'bg-[#2B0505] text-[#FF4D4D] border border-[#821717]'
                          : 'bg-[#1A1A1A] text-[#808080] border border-[#2E2E2E]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Persistence Status */}
        <div className="p-3 border-t border-[#222222] bg-[#080808]">
          <div className="bg-[#0D0D0D] p-3 border border-[#242424] space-y-1.5 shadow-[2px_2px_0px_0px_#000000]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#808080] font-mono uppercase tracking-wider">
                {operatingMode === 'frontend' ? 'Frontend Engine' : 'Node REST Server'}
              </span>
              <span className={`font-mono text-[9px] font-bold px-1.5 py-0.5 border ${
                isAirGappedState
                  ? 'bg-[#2B0505] text-[#FF4D4D] border-[#821717]'
                  : 'bg-[#141414] text-[#A0A0A0] border-[#333333]'
              }`}>
                {isAirGappedState ? 'AIR-GAP ON' : 'CONNECTED'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-[#FF4D4D] italic">
              {operatingMode === 'frontend' ? 'IN_BROWSER_VIRTUAL_WAL' : 'SQLITE_WAL_SERVER'}
            </p>
            <div className="text-[10px] text-[#707070] font-mono flex items-center justify-between pt-1 border-t border-[#1F1F1F]">
              <span>Storage Enclave</span>
              <span className="text-[#A0A0A0]">{operatingMode === 'frontend' ? 'LOCAL_STORAGE' : 'SQLITE_DISK'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Right Content Section */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#050505]">
        {/* Top Header Bar */}
        <Header
          health={health}
          onRefresh={loadData}
          onOpenNewTicket={() => setShowNewTicketModal(true)}
          onOpenDataExchange={() => setShowDataExchangeModal(true)}
          isRefreshing={isRefreshing}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onNavigateToDashboard={() => setActiveTab('dashboard')}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6 bg-[#050505]">
          {activeTab === 'dashboard' && (
            <GDPRComplianceDashboard
              onNavigateToSummary={(slideIdx = 0) => {
                setSummaryInitialSlide(slideIdx);
                setActiveTab('summary');
              }}
            />
          )}

          {activeTab === 'summary' && (
            <SummaryDashboard
              initialPage={summaryInitialSlide}
              tickets={tickets}
              health={health}
              onNavigateToTab={(tab: any) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'queue' && (
            <QueueManagement
              tickets={tickets}
              health={health}
              onSelectTicket={(ticket) => setSelectedTicket(ticket)}
              onToggleIdPause={handleToggleIdPause}
              onApplyExtension={handleApplyExtension}
              onOpenNewTicket={() => setShowNewTicketModal(true)}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'pia' && <PiaAlignmentView />}

          {activeTab === 'matrix' && <LawfulBasisMatrix />}

          {activeTab === 'suppression' && <SuppressionRegisterView />}

          {activeTab === 'downstream' && <DownstreamPropagationView />}

          {activeTab === 'audit' && <AuditLedgerView />}

          {activeTab === 'health' && (
            <ServerHealthView health={health} onRefresh={loadData} />
          )}
        </main>

        {/* Footer Strip */}
        <footer className="bg-[#0A0A0A] border-t border-[#222222] px-4 sm:px-6 py-2.5 text-[11px] font-mono text-[#999999] flex flex-col md:flex-row items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
            <div className="flex items-center space-x-1.5 text-[#EBEBEB]">
              <span className="inline-block w-2 h-2 bg-[#C11212] animate-pulse shadow-xs shadow-red-500" />
              <span className="font-bold text-white uppercase">RightsFlow Metrics</span>
            </div>
            <span className="text-[#404040] hidden sm:inline">•</span>
            <span className="bg-[#1C1505] text-[#F59E0B] text-[10px] font-semibold px-2 py-0.5 border border-[#78350F]">
              Proprietary License
            </span>
            <span className="text-[#404040] hidden sm:inline">•</span>
            <span className="text-[#999999]">
              For advisory connect to{' '}
              <a
                href="https://www.technoscope.co.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF4D4D] hover:text-[#FF8080] underline font-semibold transition-colors"
              >
                www.technoscope.co.in
              </a>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[#707070] text-[10px]">
            <span className="text-[#A0A0A0]">All rights reserved</span>
            <span>•</span>
            <span className="text-[#888888]">Air-Gapped Financial Spec (SHA-256 Chained)</span>
          </div>
        </footer>
      </div>

      {/* Modals */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRefresh={loadData}
        />
      )}

      {showNewTicketModal && (
        <NewTicketModal
          onClose={() => setShowNewTicketModal(false)}
          onSuccess={() => {
            setShowNewTicketModal(false);
            loadData();
          }}
        />
      )}

      {showDataExchangeModal && (
        <DataExchangeModal
          onClose={() => setShowDataExchangeModal(false)}
          onSuccess={() => {
            setShowDataExchangeModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

export default App;

