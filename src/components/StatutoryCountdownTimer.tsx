import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, AlertOctagon, CheckCircle2, PauseCircle, ShieldAlert, Sparkles } from 'lucide-react';
import { DsrTicket } from '../types';

interface StatutoryCountdownTimerProps {
  ticket: DsrTicket;
  compact?: boolean;
  showProgressBar?: boolean;
}

interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSecondsRemaining: number;
  isOverdue: boolean;
  isPaused: boolean;
  isResolved: boolean;
  percentElapsed: number;
  urgencyLevel: 'normal' | 'moderate' | 'warning' | 'critical' | 'overdue' | 'paused' | 'resolved';
  formattedTime: string;
}

export const StatutoryCountdownTimer: React.FC<StatutoryCountdownTimerProps> = ({
  ticket,
  compact = false,
  showProgressBar = true
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Update ticker every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const calculateCountdown = (): CountdownState => {
    const isResolved = ticket.status === 'Completed & Sealed' || ticket.status === 'Statutorily Refused';
    const isPaused = ticket.id_verification_status === 'Clock Paused - Awaiting ID';

    // Base request date
    const reqDate = new Date(ticket.request_date).getTime();
    
    // Effective target date
    let targetDate: number;
    if (ticket.extended_deadline) {
      targetDate = new Date(ticket.extended_deadline).getTime();
    } else if (ticket.baseline_deadline) {
      targetDate = new Date(ticket.baseline_deadline).getTime();
    } else if (ticket.deadlineInfo?.effectiveDeadline) {
      targetDate = new Date(ticket.deadlineInfo.effectiveDeadline).getTime();
    } else {
      // Default 30 days statutory window
      const d = new Date(ticket.request_date);
      d.setDate(d.getDate() + 30 + (ticket.id_paused_days || 0));
      targetDate = d.getTime();
    }

    const totalDurationMs = Math.max(1000, targetDate - reqDate);
    const diffMs = targetDate - now;
    const totalSecondsRemaining = Math.floor(diffMs / 1000);
    const isOverdue = totalSecondsRemaining < 0 && !isResolved;

    const absSeconds = Math.abs(totalSecondsRemaining);
    const days = Math.floor(absSeconds / 86400);
    const hours = Math.floor((absSeconds % 86400) / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = absSeconds % 60;

    // Elapsed percentage (0 to 100)
    const elapsedMs = Math.max(0, now - reqDate);
    const percentElapsed = isResolved
      ? 100
      : Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    let urgencyLevel: CountdownState['urgencyLevel'] = 'normal';

    if (isResolved) {
      urgencyLevel = 'resolved';
    } else if (isPaused) {
      urgencyLevel = 'paused';
    } else if (isOverdue) {
      urgencyLevel = 'overdue';
    } else if (days <= 2) {
      urgencyLevel = 'critical'; // < 48h
    } else if (days <= 5) {
      urgencyLevel = 'warning'; // 3-5 days
    } else if (days <= 10) {
      urgencyLevel = 'moderate'; // 6-10 days
    } else {
      urgencyLevel = 'normal'; // > 10 days
    }

    // Format readable string
    const pad = (n: number) => n.toString().padStart(2, '0');
    let formattedTime = '';
    if (isPaused) {
      formattedTime = 'CLOCK PAUSED';
    } else if (isResolved) {
      formattedTime = 'SLA SEALED';
    } else if (isOverdue) {
      formattedTime = `-${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    } else if (days > 0) {
      formattedTime = `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    } else {
      formattedTime = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSecondsRemaining,
      isOverdue,
      isPaused,
      isResolved,
      percentElapsed,
      urgencyLevel,
      formattedTime
    };
  };

  const countdown = calculateCountdown();

  // Urgency styling configurations
  const getTheme = () => {
    switch (countdown.urgencyLevel) {
      case 'resolved':
        return {
          badgeBg: 'bg-emerald-950/70 border-emerald-800 text-emerald-300',
          textClass: 'text-emerald-400',
          barClass: 'bg-emerald-500',
          borderClass: 'border-emerald-800/60',
          label: 'COMPLIED & SEALED',
          pulse: false
        };
      case 'paused':
        return {
          badgeBg: 'bg-amber-950/80 border-amber-700 text-amber-300',
          textClass: 'text-amber-400',
          barClass: 'bg-amber-500',
          borderClass: 'border-amber-700/80',
          label: 'CLOCK PAUSED (ART. 12(6))',
          pulse: true
        };
      case 'overdue':
        return {
          badgeBg: 'bg-rose-950/90 border-rose-600 text-rose-200',
          textClass: 'text-rose-400',
          barClass: 'bg-rose-600 animate-pulse',
          borderClass: 'border-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.3)]',
          label: 'SLA BREACHED / OVERDUE',
          pulse: true
        };
      case 'critical':
        return {
          badgeBg: 'bg-rose-950/60 border-rose-700 text-rose-300',
          textClass: 'text-rose-400 font-bold',
          barClass: 'bg-rose-500',
          borderClass: 'border-rose-700/80 shadow-[0_0_8px_rgba(244,63,94,0.2)]',
          label: 'CRITICAL (<48H REMAINING)',
          pulse: true
        };
      case 'warning':
        return {
          badgeBg: 'bg-amber-950/60 border-amber-800 text-amber-300',
          textClass: 'text-amber-400 font-semibold',
          barClass: 'bg-amber-500',
          borderClass: 'border-amber-800/80',
          label: 'SLA WARNING (<5 DAYS)',
          pulse: false
        };
      case 'moderate':
        return {
          badgeBg: 'bg-cyan-950/40 border-cyan-800 text-cyan-300',
          textClass: 'text-cyan-400',
          barClass: 'bg-cyan-500',
          borderClass: 'border-cyan-800/50',
          label: 'EXPEDITED (6-10 DAYS)',
          pulse: false
        };
      case 'normal':
      default:
        return {
          badgeBg: 'bg-[#181818] border-[#333333] text-emerald-300',
          textClass: 'text-emerald-400',
          barClass: 'bg-emerald-500',
          borderClass: 'border-[#262626]',
          label: 'ON TRACK (GDPR 30-DAY SLA)',
          pulse: false
        };
    }
  };

  const theme = getTheme();
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded font-mono text-[11px] border ${theme.badgeBg}`}>
        {countdown.isPaused ? (
          <PauseCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        ) : countdown.isOverdue ? (
          <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
        ) : countdown.isResolved ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : countdown.urgencyLevel === 'critical' ? (
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
        ) : (
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="font-bold tracking-tight">{countdown.formattedTime}</span>
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-xs bg-[#080808] border ${theme.borderClass} transition-all duration-300 space-y-2 min-w-[210px]`}>
      {/* Header with Urgency Chip & Status */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center space-x-1.5">
          {countdown.isPaused ? (
            <PauseCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
          ) : countdown.isOverdue ? (
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
          ) : countdown.isResolved ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : countdown.urgencyLevel === 'critical' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-[#8C8C8C] shrink-0" />
          )}
          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${theme.textClass}`}>
            {theme.label}
          </span>
        </div>

        {ticket.extension_applied === 1 && (
          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-700" title="Art. 12(3) 60-Day Extension Active">
            +60d Ext
          </span>
        )}
      </div>

      {/* Primary Visual Digital Countdown Display */}
      {countdown.isPaused ? (
        <div className="bg-[#120B02] border border-amber-800/80 rounded px-2 py-1.5 text-center font-mono">
          <div className="text-amber-400 font-bold text-xs tracking-wider flex items-center justify-center gap-1">
            <PauseCircle className="w-3 h-3" />
            <span>STATUTORY CLOCK HALTED</span>
          </div>
          <div className="text-[10px] text-amber-300/80 mt-0.5">
            Awaiting Customer ID Proof (+{ticket.id_paused_days || 0}d recorded)
          </div>
        </div>
      ) : countdown.isResolved ? (
        <div className="bg-[#051A0E] border border-emerald-800/70 rounded px-2 py-1.5 text-center font-mono">
          <div className="text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>STATUTORY REQUIREMENT SATISFIED</span>
          </div>
          <div className="text-[10px] text-emerald-300/70 mt-0.5">
            Cryptographically sealed to audit chain
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 font-mono text-center">
          {/* Days */}
          <div className="bg-[#111111] border border-[#222222] rounded p-1">
            <span className={`text-xs sm:text-sm font-bold block ${theme.textClass}`}>
              {countdown.isOverdue ? `-${countdown.days}` : countdown.days}
            </span>
            <span className="text-[9px] uppercase text-[#666666] tracking-tighter">Days</span>
          </div>

          {/* Hours */}
          <div className="bg-[#111111] border border-[#222222] rounded p-1">
            <span className={`text-xs sm:text-sm font-bold block ${theme.textClass}`}>
              {pad(countdown.hours)}
            </span>
            <span className="text-[9px] uppercase text-[#666666] tracking-tighter">Hours</span>
          </div>

          {/* Minutes */}
          <div className="bg-[#111111] border border-[#222222] rounded p-1">
            <span className={`text-xs sm:text-sm font-bold block ${theme.textClass}`}>
              {pad(countdown.minutes)}
            </span>
            <span className="text-[9px] uppercase text-[#666666] tracking-tighter">Min</span>
          </div>

          {/* Seconds */}
          <div className="bg-[#111111] border border-[#222222] rounded p-1">
            <span className={`text-xs sm:text-sm font-bold block ${theme.textClass} ${theme.pulse ? 'animate-pulse' : ''}`}>
              {pad(countdown.seconds)}
            </span>
            <span className="text-[9px] uppercase text-[#666666] tracking-tighter">Sec</span>
          </div>
        </div>
      )}

      {/* Statutory Progress Bar & Elapsed Meter */}
      {showProgressBar && (
        <div className="space-y-1 pt-0.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-[#8C8C8C]">
            <span>Elapsed: {countdown.percentElapsed}%</span>
            <span>
              {ticket.extension_applied === 1
                ? '90d Window (Art. 12(3))'
                : '30d Statutory Limit'}
            </span>
          </div>
          <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden border border-[#2A2A2A]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${theme.barClass}`}
              style={{ width: `${Math.max(4, countdown.percentElapsed)}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtext Timestamps */}
      <div className="flex items-center justify-between text-[9px] font-mono text-[#666666] border-t border-[#1C1C1C] pt-1">
        <span>Req: {new Date(ticket.request_date).toLocaleDateString()}</span>
        <span>
          Due: {new Date(ticket.extended_deadline || ticket.baseline_deadline || ticket.request_date).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};
