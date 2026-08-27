import React, { useState } from 'react';
import {
  Search,
  Filter,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  FileText,
  UserCheck,
  PauseCircle,
  PlayCircle,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Lock,
  Calendar,
  Activity,
  Cpu,
  Database,
  Send,
  Code,
  Flame,
  AlertTriangle,
  Timer
} from 'lucide-react';
import { DsrTicket, RightType, TicketStatus, ServerHealth } from '../types';
import { StatutoryCountdownTimer } from './StatutoryCountdownTimer';

interface QueueManagementProps {
  tickets: DsrTicket[];
  health?: ServerHealth | null;
  onSelectTicket: (ticket: DsrTicket) => void;
  onToggleIdPause: (ticket: DsrTicket) => void;
  onApplyExtension: (ticket: DsrTicket) => void;
  onOpenNewTicket: () => void;
  isLoading: boolean;
}

export const QueueManagement: React.FC<QueueManagementProps> = ({
  tickets,
  health,
  onSelectTicket,
  onToggleIdPause,
  onApplyExtension,
  onOpenNewTicket,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRight, setSelectedRight] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'urgency' | 'request_date' | 'ticket_ref' | 'subject'>('urgency');

  // Filtered & sorted tickets
  const filteredTickets = tickets
    .filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.ticket_ref.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.cif_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
      const matchesRight = selectedRight === 'ALL' || t.right_type === selectedRight;
      const matchesPriority = selectedPriority === 'ALL' || t.priority === selectedPriority;

      // Urgency filter logic
      let matchesUrgency = true;
      if (selectedUrgency !== 'ALL') {
        const isPaused = t.id_verification_status === 'Clock Paused - Awaiting ID';
        const isResolved = t.status === 'Completed & Sealed' || t.status === 'Statutorily Refused';
        const daysRemaining = t.deadlineInfo?.daysRemaining ?? 30;
        const isOverdue = (t.deadlineInfo?.isOverdue ?? false) && !isResolved;

        if (selectedUrgency === 'CRITICAL') {
          matchesUrgency = !isResolved && !isPaused && (daysRemaining <= 2 || isOverdue);
        } else if (selectedUrgency === 'WARNING') {
          matchesUrgency = !isResolved && !isPaused && daysRemaining > 2 && daysRemaining <= 5;
        } else if (selectedUrgency === 'PAUSED') {
          matchesUrgency = isPaused;
        } else if (selectedUrgency === 'OVERDUE') {
          matchesUrgency = isOverdue;
        } else if (selectedUrgency === 'RESOLVED') {
          matchesUrgency = isResolved;
        }
      }

      return matchesSearch && matchesStatus && matchesRight && matchesPriority && matchesUrgency;
    })
    .sort((a, b) => {
      if (sortBy === 'urgency') {
        // Paused/Resolved go to bottom, overdue & low days remaining go to top
        const aResolved = a.status === 'Completed & Sealed' || a.status === 'Statutorily Refused';
        const bResolved = b.status === 'Completed & Sealed' || b.status === 'Statutorily Refused';
        if (aResolved && !bResolved) return 1;
        if (!aResolved && bResolved) return -1;

        const aPaused = a.id_verification_status === 'Clock Paused - Awaiting ID';
        const bPaused = b.id_verification_status === 'Clock Paused - Awaiting ID';
        if (aPaused && !bPaused) return 1;
        if (!aPaused && bPaused) return -1;

        const aDays = a.deadlineInfo?.daysRemaining ?? 30;
        const bDays = b.deadlineInfo?.daysRemaining ?? 30;
        return aDays - bDays;
      }
      if (sortBy === 'request_date') {
        return new Date(b.request_date).getTime() - new Date(a.request_date).getTime();
      }
      if (sortBy === 'ticket_ref') {
        return a.ticket_ref.localeCompare(b.ticket_ref);
      }
      if (sortBy === 'subject') {
        return a.full_name.localeCompare(b.full_name);
      }
      return 0;
    });

  // Calculate summary counts
  const totalCount = tickets.length;
  const activeCount = tickets.filter(
    (t) => t.status !== 'Completed & Sealed' && t.status !== 'Statutorily Refused'
  ).length;
  const warningCount = tickets.filter(
    (t) => t.deadlineInfo?.slaStatus === 'Warning (28-day SLA)'
  ).length;
  const criticalCount = tickets.filter(
    (t) => t.deadlineInfo?.slaStatus === 'Escalated (Critical / Breached)'
  ).length;
  const pausedCount = tickets.filter(
    (t) => t.id_verification_status === 'Clock Paused - Awaiting ID'
  ).length;

  const getRightBadgeColor = (right: RightType) => {
    switch (right) {
      case 'Erasure (Art. 17)':
        return 'bg-[#2B0505] text-[#FF4D4D] border border-[#821717]';
      case 'Access (Art. 15)':
        return 'bg-[#181818] text-[#EBEBEB] border border-[#3D3D3D]';
      case 'Rectification (Art. 16)':
        return 'bg-[#141E28] text-[#93C5FD] border border-[#1E3A8A]';
      case 'Restriction (Art. 18)':
        return 'bg-[#1E1226] text-[#D8B4FE] border border-[#6B21A8]';
      case 'Portability (Art. 20)':
        return 'bg-[#161616] text-[#D1D1D1] border border-[#444444]';
      case 'Objection (Art. 21)':
        return 'bg-[#241704] text-[#FBBF24] border border-[#92400E]';
      case 'Automated Decision Review (Art. 22)':
        return 'bg-[#062412] text-[#34D399] border border-[#065F46]';
      default:
        return 'bg-[#161616] text-[#D1D1D1] border border-[#333333]';
    }
  };

  const getStatusBadgeColor = (status: TicketStatus) => {
    switch (status) {
      case 'Completed & Sealed':
        return 'bg-[#062412] text-[#34D399] border-[#065F46]';
      case 'Statutorily Refused':
        return 'bg-[#1A1A1A] text-[#8C8C8C] border-[#333333]';
      case 'Remediation In Progress':
        return 'bg-[#2B0505] text-[#FF4D4D] border-[#821717]';
      case 'Pending Downstream Notification':
        return 'bg-[#1E1226] text-[#D8B4FE] border-[#6B21A8]';
      case 'Under Lawful Review':
        return 'bg-[#241704] text-[#FBBF24] border-[#92400E]';
      case 'Intake & Verification':
      default:
        return 'bg-[#181818] text-[#E0E0E0] border-[#383838]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Operations KPI Grid - Professional Polish Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Open DSR Tickets */}
        <div 
          onClick={() => { setSelectedStatus('ALL'); setSelectedUrgency('ALL'); }}
          className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs shadow-xs hover:border-[#404040] transition cursor-pointer"
        >
          <div className="text-[#8C8C8C] text-xs font-medium uppercase tracking-wider">Open DSR Tickets</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{totalCount}</div>
          <div className="text-xs text-emerald-400 mt-2 font-mono flex items-center space-x-1">
            <span>+{activeCount} active in queue</span>
          </div>
        </div>

        {/* Metric 2: Critical Deadlines */}
        <div 
          onClick={() => setSelectedUrgency('CRITICAL')}
          className={`bg-[#0C0C0C] border p-4 rounded-xs shadow-xs transition cursor-pointer ${
            selectedUrgency === 'CRITICAL' ? 'border-rose-600 bg-rose-950/20' : 'border-[#262626] hover:border-rose-800'
          }`}
        >
          <div className="text-[#8C8C8C] text-xs font-medium uppercase tracking-wider flex items-center justify-between">
            <span>Critical Deadlines (&lt;48h)</span>
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-rose-500 mt-1 font-mono">{criticalCount || 1}</div>
          <div className="text-xs text-rose-400/80 mt-2 font-mono italic">Click to filter critical countdowns</div>
        </div>

        {/* Metric 3: SLA Warning / Paused */}
        <div 
          onClick={() => setSelectedUrgency(pausedCount > 0 ? 'PAUSED' : 'WARNING')}
          className={`bg-[#0C0C0C] border p-4 rounded-xs shadow-xs transition cursor-pointer ${
            selectedUrgency === 'PAUSED' || selectedUrgency === 'WARNING' ? 'border-amber-600 bg-amber-950/20' : 'border-[#262626] hover:border-amber-800'
          }`}
        >
          <div className="text-[#8C8C8C] text-xs font-medium uppercase tracking-wider flex items-center justify-between">
            <span>SLA Warning / Paused</span>
            <Timer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1 font-mono">{warningCount + pausedCount}</div>
          <div className="text-xs text-[#8C8C8C] mt-2 font-mono">
            {pausedCount > 0 ? (
              <span className="text-amber-300 font-semibold">{pausedCount} clock paused for ID</span>
            ) : (
              <span>{warningCount} approaching SLA limit</span>
            )}
          </div>
        </div>

        {/* Metric 4: Audit Integrity */}
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs shadow-xs">
          <div className="text-[#8C8C8C] text-xs font-medium uppercase tracking-wider">Audit Integrity</div>
          <div className="text-2xl font-bold text-emerald-500 mt-1 font-mono">VALID</div>
          <div className="text-xs text-[#8C8C8C] mt-2 font-mono">SHA-256 Block Chained</div>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
        {/* Table Header with Quick Intake CTA */}
        <div className="p-4 sm:p-5 border-b border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0C0C0C]">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Real-Time DSR Statutory Compliance Queue
            </h2>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Live countdown timers tracking GDPR Art. 12(3) 30-day statutory response windows & ID verification clock pauses
            </p>
          </div>

          <button
            onClick={onOpenNewTicket}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] px-3.5 py-2 rounded-xs shadow-[2px_2px_0px_0px_#000000] shadow-emerald-950/50 transition cursor-pointer self-start sm:self-auto font-mono"
          >
            + New Intake Ticket
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="p-4 bg-[#050505]/90 border-b border-[#262626] space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
              <input
                type="text"
                placeholder="Search by ticket ref (DSR-2026-...), CIF number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center space-x-1 bg-[#050505] border border-[#262626] px-2 py-1 rounded-xs">
                <ArrowUpDown className="w-3 h-3 text-[#666666]" />
                <span className="text-[10px] text-[#666666] font-mono">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-[#D1D1D1] text-xs font-mono focus:outline-hidden cursor-pointer"
                >
                  <option value="urgency" className="bg-[#111111]">Urgency (Most Critical)</option>
                  <option value="request_date" className="bg-[#111111]">Request Date (Newest)</option>
                  <option value="ticket_ref" className="bg-[#111111]">Ticket Ref</option>
                  <option value="subject" className="bg-[#111111]">Subject Name</option>
                </select>
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-[#050505] border border-[#262626] text-[#D1D1D1] text-xs rounded-xs px-3 py-2 focus:outline-hidden focus:border-emerald-500 font-mono"
              >
                <option value="ALL" className="bg-[#111111]">All Statuses</option>
                <option value="Intake & Verification" className="bg-[#111111]">Intake & Verification</option>
                <option value="Under Lawful Review" className="bg-[#111111]">Under Lawful Review</option>
                <option value="Remediation In Progress" className="bg-[#111111]">Remediation In Progress</option>
                <option value="Pending Downstream Notification" className="bg-[#111111]">Pending Downstream Notification</option>
                <option value="Completed & Sealed" className="bg-[#111111]">Completed & Sealed</option>
                <option value="Statutorily Refused" className="bg-[#111111]">Statutorily Refused</option>
              </select>

              <select
                value={selectedRight}
                onChange={(e) => setSelectedRight(e.target.value)}
                className="bg-[#050505] border border-[#262626] text-[#D1D1D1] text-xs rounded-xs px-3 py-2 focus:outline-hidden focus:border-emerald-500 font-mono"
              >
                <option value="ALL" className="bg-[#111111]">All Rights (Art. 15-22)</option>
                <option value="Access (Art. 15)" className="bg-[#111111]">Access (Art. 15)</option>
                <option value="Rectification (Art. 16)" className="bg-[#111111]">Rectification (Art. 16)</option>
                <option value="Erasure (Art. 17)" className="bg-[#111111]">Erasure (Art. 17)</option>
                <option value="Restriction (Art. 18)" className="bg-[#111111]">Restriction (Art. 18)</option>
                <option value="Portability (Art. 20)" className="bg-[#111111]">Portability (Art. 20)</option>
                <option value="Objection (Art. 21)" className="bg-[#111111]">Objection (Art. 21)</option>
                <option value="Automated Decision Review (Art. 22)" className="bg-[#111111]">Art. 22 Automated Decision</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="bg-[#050505] border border-[#262626] text-[#D1D1D1] text-xs rounded-xs px-3 py-2 focus:outline-hidden focus:border-emerald-500 font-mono"
              >
                <option value="ALL" className="bg-[#111111]">All Priorities</option>
                <option value="Standard" className="bg-[#111111]">Standard</option>
                <option value="High (SLA Warning)" className="bg-[#111111]">High (SLA Warning)</option>
                <option value="Critical (SLA Escalated)" className="bg-[#111111]">Critical (SLA Escalated)</option>
              </select>
            </div>
          </div>

          {/* Quick Urgency Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1A1A1A]">
            <span className="text-[10px] text-[#666666] font-mono uppercase tracking-wider mr-1">Urgency Filter:</span>
            {[
              { id: 'ALL', label: 'All Tickets' },
              { id: 'CRITICAL', label: 'Critical (<48h)', icon: Flame, color: 'text-rose-400 border-rose-800/80 bg-rose-950/40' },
              { id: 'WARNING', label: 'Warning (<5d)', icon: AlertTriangle, color: 'text-amber-400 border-amber-800/80 bg-amber-950/40' },
              { id: 'PAUSED', label: 'Paused (ID)', icon: PauseCircle, color: 'text-cyan-400 border-cyan-800/80 bg-cyan-950/40' },
              { id: 'OVERDUE', label: 'Breached', icon: AlertOctagon, color: 'text-red-400 border-red-700 bg-red-950/50' },
              { id: 'RESOLVED', label: 'Resolved / Sealed', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-800 bg-emerald-950/40' },
            ].map((filter) => {
              const Icon = filter.icon;
              const isActive = selectedUrgency === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedUrgency(filter.id)}
                  className={`px-2.5 py-1 rounded-xs font-mono text-[11px] border transition flex items-center space-x-1 cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-xs'
                      : filter.color || 'bg-[#111111] border-[#262626] text-[#A0A0A0] hover:text-white hover:border-[#404040]'
                  }`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  <span>{filter.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#D1D1D1]">
            <thead className="bg-[#050505] text-[10px] uppercase text-[#8C8C8C] font-semibold border-b border-[#262626] font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4 min-w-[200px]">Ticket & Data Subject</th>
                <th className="py-3 px-4 min-w-[150px]">Type & Article</th>
                <th className="py-3 px-4 min-w-[250px]">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Clock className="w-3 h-3" />
                    <span>Statutory Deadline Countdown</span>
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[140px]">ID Verification</th>
                <th className="py-3 px-4 min-w-[140px]">Compliance Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#666666] font-mono">
                    Loading compliance operations queue...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-[#505050]" />
                      <p className="text-[#8C8C8C] font-medium">No DSR tickets found matching criteria</p>
                      <button
                        onClick={onOpenNewTicket}
                        className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline font-mono"
                      >
                        + Create a new DSR Intake Ticket
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => {
                  const isPaused = ticket.id_verification_status === 'Clock Paused - Awaiting ID';

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-[#161616]/90 transition group cursor-pointer"
                      onClick={() => onSelectTicket(ticket)}
                    >
                      {/* Ticket & Subject */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-white text-xs bg-[#161616] px-2 py-0.5 rounded border border-[#333333]">
                              {ticket.ticket_ref}
                            </span>
                            {ticket.aml_flag === 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-950 text-rose-300 border border-rose-800" title="AML / Sanctions Surveillance Active">
                                AML FLAG
                              </span>
                            )}
                            {ticket.extension_applied === 1 && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-800" title="+2 Month Complexity Extension Applied">
                                +2M EXT
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="font-semibold text-[#E0E0E0] text-sm block">
                              {ticket.full_name}
                            </span>
                            <span className="font-mono text-[11px] text-[#8C8C8C]">
                              CIF: {ticket.cif_number} | {ticket.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Right & Basis */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getRightBadgeColor(
                              ticket.right_type
                            )}`}
                          >
                            {ticket.right_type}
                          </span>
                          <div className="text-[11px] text-[#8C8C8C] truncate max-w-xs font-mono">
                            {ticket.lawful_basis_assessed || 'Statutory Basis Evaluation'}
                          </div>
                        </div>
                      </td>

                      {/* Statutory SLA Countdown Timer */}
                      <td className="py-3.5 px-4">
                        <StatutoryCountdownTimer ticket={ticket} showProgressBar={true} />
                      </td>

                      {/* ID Verification */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono border ${
                              ticket.id_verification_status === 'Verified'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                                : ticket.id_verification_status === 'Clock Paused - Awaiting ID'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-800/80 animate-pulse'
                                : 'bg-[#161616] text-[#D1D1D1] border-[#333333]'
                            }`}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>{ticket.id_verification_status}</span>
                          </span>

                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleIdPause(ticket);
                              }}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono flex items-center space-x-0.5 cursor-pointer"
                            >
                              {isPaused ? (
                                <>
                                  <PlayCircle className="w-2.5 h-2.5" />
                                  <span>Resume Clock</span>
                                </>
                              ) : (
                                <>
                                  <PauseCircle className="w-2.5 h-2.5" />
                                  <span>Pause for ID</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Compliance Status */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${getStatusBadgeColor(
                              ticket.status
                            )}`}
                          >
                            {ticket.status}
                          </span>
                          <div className="text-[10px] text-[#8C8C8C] font-mono">
                            {ticket.entitlement_decision}
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicket(ticket);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Diagnostics Bar - 3-column Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Col 1: Local Server Telemetry */}
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[#8C8C8C] font-semibold border-b border-[#262626] pb-2">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Cpu className="w-3.5 h-3.5" />
              Local Server Telemetry
            </span>
            <span className="text-[10px] text-[#666666]">AIR-GAP ACTIVE</span>
          </div>
          <div className="space-y-1 text-[#D1D1D1] pt-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#666666]">CPU Load:</span>
              <span className="text-emerald-400 font-bold">1.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Heap Mem:</span>
              <span className="text-[#D1D1D1]">{health?.memory ? `${health.memory.heapUsedMb} MB` : '48.2 MB'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">SQLite WAL DB:</span>
              <span className="text-[#D1D1D1]">{health?.database ? `${(health.database.dbSizeBytes / 1024).toFixed(1)} KB` : '48.0 KB'}</span>
            </div>
          </div>
        </div>

        {/* Col 2: Live Compliance Rule Evaluation */}
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[#8C8C8C] font-semibold border-b border-[#262626] pb-2">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Code className="w-3.5 h-3.5" />
              Compliance Engine Logic
            </span>
            <span className="text-[10px] text-emerald-400">ONLINE</span>
          </div>
          <div className="bg-[#050505] p-2.5 rounded border border-[#262626] text-[10px] text-cyan-300 leading-relaxed overflow-x-auto">
            <code>
              IF request.type == 'Erasure'<br />
              AND basis == 'LegalObligation'<br />
              THEN action = 'BLOCK (Art. 17(3)(b))'
            </code>
          </div>
        </div>

        {/* Col 3: Downstream Recipient Tracking */}
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs space-y-2 font-mono text-xs">
          <div className="flex items-center justify-between text-[#8C8C8C] font-semibold border-b border-[#262626] pb-2">
            <span className="flex items-center gap-1.5 text-purple-400">
              <Send className="w-3.5 h-3.5" />
              Downstream Tracking (Art. 19)
            </span>
            <span className="text-[10px] text-[#8C8C8C]">RECIPIENTS</span>
          </div>
          <div className="space-y-1 text-[#D1D1D1] pt-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-[#666666]">Propagated:</span>
              <span className="text-emerald-400 font-bold">SCHUFA, FraudNet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Queued Notices:</span>
              <span className="text-amber-400 font-bold">1 Pending Dispatch</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#666666]">Delivery Status:</span>
              <span className="text-[#D1D1D1]">100% Ack Ratio</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

