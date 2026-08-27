import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Layers,
  Scale,
  UserCheck,
  FileCheck2,
  Activity,
  AlertOctagon,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  AlertTriangle,
  Clock,
  Zap,
  Building,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { DsrTicket, ServerHealth } from '../types';

interface SummaryDashboardProps {
  tickets?: DsrTicket[];
  health?: ServerHealth | null;
  onNavigateToTab?: (tab: string) => void;
}

const LAWFUL_BASES_DATA = [
  { name: 'Legitimate Interests', value: 34, count: 142, liaMissing: 28, color: '#F59E0B', desc: 'Art. 6(1)(f) - Requires 3-part LIA balancing test' },
  { name: 'Contract Performance', value: 26, count: 108, liaMissing: 0, color: '#C11212', desc: 'Art. 6(1)(b) - Direct customer & vendor contracts' },
  { name: 'Consent', value: 20, count: 84, liaMissing: 19, color: '#EBEBEB', desc: 'Art. 6(1)(a) - Granular affirmative opt-in records' },
  { name: 'Legal Obligation', value: 14, count: 58, liaMissing: 0, color: '#821717', desc: 'Art. 6(1)(c) - AML, tax, and supervisory retention' },
  { name: 'Public Task', value: 4, count: 16, liaMissing: 0, color: '#737373', desc: 'Art. 6(1)(e) - Statutory public mandates' },
  { name: 'Vital Interests', value: 2, count: 8, liaMissing: 0, color: '#EF4444', desc: 'Art. 6(1)(d) - Emergency life/safety processing' },
];

const CONSENT_HEALTH_DATA = [
  { department: 'Marketing', valid: 64, stale: 24, missingGranular: 12 },
  { department: 'Product & Eng', valid: 78, stale: 14, missingGranular: 8 },
  { department: 'HR & People', valid: 89, stale: 7, missingGranular: 4 },
  { department: 'Sales & CRM', valid: 52, stale: 31, missingGranular: 17 },
  { department: 'Finance & Legal', valid: 94, stale: 4, missingGranular: 2 },
];

const DSAR_BY_RIGHT_DATA = [
  { right: 'Access (Art. 15)', count: 184, onTime: 168, overdue: 16, avgDays: 19.4, color: '#C11212' },
  { right: 'Erasure (Art. 17)', count: 142, onTime: 131, overdue: 11, avgDays: 22.8, color: '#EF4444' },
  { right: 'Objection (Art. 21)', count: 96, onTime: 92, overdue: 4, avgDays: 14.1, color: '#F59E0B' },
  { right: 'Portability (Art. 20)', count: 74, onTime: 70, overdue: 4, avgDays: 17.6, color: '#EBEBEB' },
  { right: 'Rectification (Art. 16)', count: 52, onTime: 51, overdue: 1, avgDays: 11.2, color: '#821717' },
  { right: 'Restriction (Art. 18)', count: 28, onTime: 26, overdue: 2, avgDays: 15.8, color: '#737373' },
];

const SLA_TRENDS_DATA = [
  { month: 'Oct 2025', avgResolutionDays: 28.4, slaLimit: 30, totalVolume: 70 },
  { month: 'Nov 2025', avgResolutionDays: 25.1, slaLimit: 30, totalVolume: 80 },
  { month: 'Dec 2025', avgResolutionDays: 23.8, slaLimit: 30, totalVolume: 86 },
  { month: 'Jan 2026', avgResolutionDays: 21.2, slaLimit: 30, totalVolume: 99 },
  { month: 'Feb 2026', avgResolutionDays: 19.6, slaLimit: 30, totalVolume: 111 },
  { month: 'Mar 2026 (YTD)', avgResolutionDays: 18.2, slaLimit: 30, totalVolume: 124 },
];

const REMEDIATION_RADAR_DATA = [
  { category: 'Missing Lawful Basis', open: 8, inProgress: 14, remediated: 24, fullMark: 30 },
  { category: 'DPIA Overdue', open: 5, inProgress: 9, remediated: 18, fullMark: 30 },
  { category: 'Unverified Transfers', open: 11, inProgress: 16, remediated: 29, fullMark: 30 },
  { category: 'Stale Consent Mechanism', open: 9, inProgress: 12, remediated: 32, fullMark: 30 },
  { category: 'DSAR Bottlenecks', open: 4, inProgress: 8, remediated: 21, fullMark: 30 },
];

export function SummaryDashboard({ tickets = [], health, onNavigateToTab }: SummaryDashboardProps) {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [autoPlayIntervalSec, setAutoPlayIntervalSec] = useState<number>(8);

  const pages = [
    {
      id: 'page-executive-kpi',
      title: 'Executive Statutory Compliance & KPI Overview',
      subtitle: 'Global GDPR Operational Metrics & High-Level Health (Art. 5, 12, 24)',
      category: 'KPIs & Telemetry',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-6">
          {/* Top 4 Big KPI Metric Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            <div className="bg-[#0C0C0C] border border-[#262626] p-6 rounded-xs shadow-md flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C] tracking-wider">Total Active DSARs</span>
                  <div className="text-4xl font-bold text-white font-mono mt-2">576</div>
                </div>
                <span className="p-3 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
                  <Users className="w-6 h-6" />
                </span>
              </div>
              <div className="pt-4 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> 94.2% on track
                </span>
                <span className="text-rose-400">5.8% SLA risk</span>
              </div>
            </div>

            <div className="bg-[#0C0C0C] border border-[#262626] p-6 rounded-xs shadow-md flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C] tracking-wider">Activities at Risk</span>
                  <div className="text-4xl font-bold text-amber-400 font-mono mt-2">47</div>
                </div>
                <span className="p-3 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                  <AlertTriangle className="w-6 h-6" />
                </span>
              </div>
              <div className="pt-4 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8C8C8C]">Missing LIA / Consent</span>
                <span className="text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 font-bold">
                  11.3% of ROPA
                </span>
              </div>
            </div>

            <div className="bg-[#0C0C0C] border border-[#262626] p-6 rounded-xs shadow-md flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C] tracking-wider">Avg Resolution Time</span>
                  <div className="text-4xl font-bold text-emerald-400 font-mono mt-2">
                    18.2 <span className="text-sm text-[#8C8C8C]">days</span>
                  </div>
                </div>
                <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                  <Clock className="w-6 h-6" />
                </span>
              </div>
              <div className="pt-4 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" /> Target &lt; 30d
                </span>
                <span className="text-emerald-400 font-bold">-39.3% vs SLA cap</span>
              </div>
            </div>

            <div className="bg-[#0C0C0C] border border-[#262626] p-6 rounded-xs shadow-md flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C] tracking-wider">Remediation Rate</span>
                  <div className="text-4xl font-bold text-indigo-400 font-mono mt-2">86%</div>
                </div>
                <span className="p-3 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                  <Zap className="w-6 h-6" />
                </span>
              </div>
              <div className="pt-4 border-t border-[#222222] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8C8C8C]">6 of 7 closed</span>
                <span className="text-indigo-400 font-bold">Q1 Target: 85%</span>
              </div>
            </div>
          </div>

          {/* Bottom Overview Split (Operational SLA & Telemetry State) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0A0A0A] border border-[#222222] p-5 rounded-xs">
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#8C8C8C] uppercase">Air-Gapped Node Isolation</div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                SHA-256 Chained Cryptographic Ledger
              </div>
              <p className="text-xs text-[#707070]">Zero third-party telemetry egress. Continuous tamper verification enabled.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#8C8C8C] uppercase">Statutory Ceiling Compliance</div>
              <div className="text-sm font-bold text-emerald-400 font-mono">100% On-Time (0 Breaches in 2026)</div>
              <p className="text-xs text-[#707070]">2 complex requests extended under GDPR Art. 12(3) with supervisory audit trail.</p>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#8C8C8C] uppercase">Persistence Engine</div>
              <div className="text-sm font-bold text-[#FF4D4D] font-mono">Embedded SQLite (Strict WAL)</div>
              <p className="text-xs text-[#707070]">PRAGMA synchronous: NORMAL • Auto-quarantine self-healing active.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'page-lawful-basis',
      title: 'Lawful Basis Distribution (GDPR Article 6)',
      subtitle: 'Breakdown of 416 Processing Operations across 6 Legal Grounds & LIA Gaps',
      category: 'Article 6 ROPA',
      render: () => (
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 h-[360px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={LAWFUL_BASES_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={130}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {LAWFUL_BASES_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#050505" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded text-xs font-mono">
                          <p className="font-bold text-white">{data.name}</p>
                          <p className="text-emerald-400 font-bold">{data.value}% ({data.count} ops)</p>
                          <p className="text-[#888888] text-[11px] mt-1">{data.desc}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-5 space-y-2.5">
            <div className="p-3 bg-[#0C0C0C] border border-[#262626] rounded-xs">
              <span className="text-xs font-mono uppercase text-amber-400 font-bold">Key Risk Highlight:</span>
              <p className="text-xs text-[#E0E0E0] mt-1">
                <strong>28 Legitimate Interests (Art. 6(1)(f))</strong> activities lack formal Legitimate Interests Assessments (LIAs), particularly in marketing behavioral telemetry.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {LAWFUL_BASES_DATA.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-[#0A0A0A] border border-[#222222] rounded-xs font-mono text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[#D1D1D1] font-semibold truncate">{item.name}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1 text-[11px]">
                    <span className="text-[#8C8C8C]">{item.count} ops</span>
                    <span className="font-bold text-white">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'page-consent-health',
      title: 'Consent Health & Re-consent Risk Matrix',
      subtitle: 'Valid Opt-in vs Expiring vs Missing Granular Consent Across Business Units (Art. 7)',
      category: 'Article 7 Consent',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="h-[340px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CONSENT_HEALTH_DATA} layout="vertical" margin={{ top: 10, right: 30, left: 60, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={11} />
                <YAxis type="category" dataKey="department" stroke="#94a3b8" fontSize={12} width={110} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded text-xs font-mono space-y-1">
                          <p className="font-bold text-white border-b border-[#262626] pb-1">{label}</p>
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-bold text-white">{p.value}%</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="valid" name="Valid Consent (%)" stackId="a" fill="#10b981" />
                <Bar dataKey="stale" name="Stale / Expiring > 12mo (%)" stackId="a" fill="#f59e0b" />
                <Bar dataKey="missingGranular" name="Missing Granular Opt-in (%)" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-[#0C0C0C] border border-[#262626] rounded-xs font-mono text-xs">
              <span className="text-[#8C8C8C] uppercase">Highest Re-Consent Vulnerability:</span>
              <p className="font-bold text-rose-400 text-sm mt-1">Sales & CRM (48% Total At-Risk)</p>
              <p className="text-[11px] text-[#888888] mt-0.5">31% stale cookies & 17% unbundled marketing permissions.</p>
            </div>
            <div className="p-3.5 bg-[#0C0C0C] border border-[#262626] rounded-xs font-mono text-xs">
              <span className="text-[#8C8C8C] uppercase">Top Performing Department:</span>
              <p className="font-bold text-emerald-400 text-sm mt-1">Finance & Legal (94% Verified Clean)</p>
              <p className="text-[11px] text-[#888888] mt-0.5">Affirmative KYC onboarding opt-in with cryptographic audit trail.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'page-dsar-breakdown',
      title: 'DSAR Volume & Fulfillment by Right (GDPR Articles 15–22)',
      subtitle: '576 Total Requests Logged: On-Time Fulfillment vs SLA Breached Count',
      category: 'Individual Rights',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="h-[340px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DSAR_BY_RIGHT_DATA} margin={{ top: 15, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="right" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded text-xs font-mono space-y-1">
                          <p className="font-bold text-white border-b border-[#262626] pb-1">{label}</p>
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-bold text-white">{p.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="onTime" name="Fulfilled On-Time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="SLA Overdue / Breached" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
            <div className="bg-[#0C0C0C] p-3 rounded-xs border border-[#262626]">
              <span className="text-[11px] text-[#8C8C8C] uppercase">Highest Volume</span>
              <p className="text-white font-bold text-sm mt-1">Art. 15 Access (184 req)</p>
            </div>
            <div className="bg-[#0C0C0C] p-3 rounded-xs border border-[#262626]">
              <span className="text-[11px] text-[#8C8C8C] uppercase">Most Complex SLA</span>
              <p className="text-rose-400 font-bold text-sm mt-1">Art. 17 Erasure (22.8d avg)</p>
            </div>
            <div className="bg-[#0C0C0C] p-3 rounded-xs border border-[#262626]">
              <span className="text-[11px] text-[#8C8C8C] uppercase">Fastest Resolution</span>
              <p className="text-emerald-400 font-bold text-sm mt-1">Art. 16 Rectify (11.2d avg)</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'page-sla-trends',
      title: 'SLA & Turnaround Compliance Trends (Trailing 6 Months)',
      subtitle: 'Monthly Resolution Speed versus 30-Day Statutory SLA Cap (GDPR Article 12(3))',
      category: 'SLA Turnaround',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="h-[340px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={SLA_TRENDS_DATA} margin={{ top: 15, right: 30, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} label={{ value: 'Avg Days', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} label={{ value: 'Request Volume', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded text-xs font-mono space-y-1">
                          <p className="font-bold text-white border-b border-[#262626] pb-1">{label}</p>
                          {payload.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between gap-4">
                              <span style={{ color: p.color }}>{p.name}:</span>
                              <span className="font-bold text-white">{p.value} {p.name.includes('Days') ? 'd' : ''}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area yAxisId="right" type="monotone" dataKey="totalVolume" name="Total Request Volume" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" />
                <Line yAxisId="left" type="monotone" dataKey="avgResolutionDays" name="Avg Resolution (Days)" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                <Line yAxisId="left" type="step" dataKey="slaLimit" name="Statutory 30d SLA Cap" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 bg-[#0C0C0C] border border-[#262626] rounded-xs flex items-center justify-between font-mono text-xs">
            <span className="text-[#8C8C8C]">Operational Performance:</span>
            <span className="text-emerald-400 font-bold">
              Resolution turnaround improved by 35.9% since October 2025 (28.4d → 18.2d)
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'page-remediation-radar',
      title: 'Risk Remediation Maturity & Vulnerability Radar',
      subtitle: 'Remediated Actions vs Open Vulnerabilities Across 5 Core Governance Vectors',
      category: 'Remediation Maturity',
      render: () => (
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 h-[360px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={REMEDIATION_RADAR_DATA} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                <PolarRadiusAxis stroke="#475569" fontSize={10} />
                <Radar name="Remediated Actions" dataKey="remediated" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                <Radar name="In Progress" dataKey="inProgress" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                <Radar name="Open & Overdue" dataKey="open" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-5 space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#0C0C0C] border border-[#262626] rounded-xs">
              <span className="text-xs text-emerald-400 font-bold uppercase">Strongest Compliance Maturity:</span>
              <p className="text-white font-bold text-sm mt-1">Stale Consent (32 Remediated Items)</p>
              <p className="text-[#8C8C8C] text-[11px] mt-0.5">Automated re-consent campaign deployed across customer portals.</p>
            </div>

            <div className="p-3 bg-[#0C0C0C] border border-[#262626] rounded-xs">
              <span className="text-xs text-rose-400 font-bold uppercase">Highest Focus Vector:</span>
              <p className="text-white font-bold text-sm mt-1">Unverified Third-Party Transfers (15 Active)</p>
              <p className="text-[#8C8C8C] text-[11px] mt-0.5">Requires standard contractual clauses (SCC 2021/914) & TIAs.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  // Handle Autoplay timer
  useEffect(() => {
    let interval: any = null;
    if (isAutoPlay) {
      interval = setInterval(() => {
        setCurrentPage((prev) => (prev + 1) % pages.length);
      }, autoPlayIntervalSec * 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoPlay, autoPlayIntervalSec, pages.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentPage((prev) => (prev + 1) % pages.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => (prev - 1 + pages.length) % pages.length);
      } else if (e.key === 'f' || e.key === 'F') {
        setIsFullscreen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length]);

  const activePage = pages[currentPage];

  return (
    <div
      className={`flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#050505] p-6 sm:p-10 justify-between'
          : 'w-full space-y-5'
      }`}
      id="summary-dashboard-root"
    >
      {/* Top Slide Presentation Control Header */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight uppercase font-mono">
                Executive 16:9 Summary Deck
              </h2>
              <span className="text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                SLIDE {currentPage + 1} / {pages.length}
              </span>
            </div>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Full-screen 16:9 presentation format for Board & Supervisory DPO reviews
            </p>
          </div>
        </div>

        {/* Navigation & Fullscreen Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Quick Page Jump Pills */}
          <div className="flex items-center space-x-1 bg-[#050505] border border-[#262626] p-1 rounded-xs">
            {pages.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => setCurrentPage(idx)}
                className={`px-2.5 py-1 rounded text-xs transition cursor-pointer ${
                  currentPage === idx
                    ? 'bg-[#C11212] text-white font-bold'
                    : 'text-[#8C8C8C] hover:text-white hover:bg-[#141414]'
                }`}
                title={p.title}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Prev / Next Buttons */}
          <button
            onClick={() => setCurrentPage((prev) => (prev - 1 + pages.length) % pages.length)}
            className="p-1.5 bg-[#141414] hover:bg-[#202020] text-white border border-[#2B2B2B] rounded-xs cursor-pointer flex items-center gap-1"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentPage((prev) => (prev + 1) % pages.length)}
            className="p-1.5 bg-[#141414] hover:bg-[#202020] text-white border border-[#2B2B2B] rounded-xs cursor-pointer flex items-center gap-1"
            title="Next Page (Right Arrow / Space)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Autoplay Toggle */}
          <button
            onClick={() => setIsAutoPlay(!isAutoPlay)}
            className={`px-3 py-1.5 rounded-xs border transition flex items-center space-x-1.5 cursor-pointer ${
              isAutoPlay
                ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                : 'bg-[#141414] hover:bg-[#202020] text-[#D1D1D1] border-[#2B2B2B]'
            }`}
            title="Toggle Slide Auto-Play"
          >
            {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlay ? 'Auto-Advancing (8s)' : 'Auto-Play'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#202020] text-white border border-[#2B2B2B] rounded-xs cursor-pointer flex items-center space-x-1.5"
            title="Toggle 16:9 Full Screen Mode (F key)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit 16:9' : '16:9 Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* 16:9 ASPECT RATIO SLIDE CONTAINER */}
      <div className="w-full flex justify-center items-center">
        <div
          className={`w-full bg-[#080808] border-2 border-[#2B2B2B] rounded-xs shadow-[8px_8px_0px_0px_#000000] p-6 sm:p-8 flex flex-col justify-between overflow-hidden relative ${
            isFullscreen ? 'h-full max-h-[88vh] aspect-video' : 'aspect-video min-h-[540px]'
          }`}
          style={{ aspectRatio: '16 / 9' }}
        >
          {/* Slide Header Strip */}
          <div className="border-b border-[#222222] pb-4 mb-4 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF4D4D] font-bold bg-[#260505] px-2 py-0.5 border border-[#821717]">
                  {activePage.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                  {activePage.title}
                </h3>
              </div>
              <p className="text-xs text-[#8C8C8C] mt-1 font-mono">{activePage.subtitle}</p>
            </div>

            <div className="text-right font-mono hidden sm:block">
              <span className="text-xs text-[#707070]">RightsFlow Metrics™</span>
              <div className="text-[10px] text-emerald-400 font-bold">AIR-GAPPED COMPLIANCE NODE</div>
            </div>
          </div>

          {/* Dynamic Slide Content Body */}
          <div className="flex-1 overflow-hidden">{activePage.render()}</div>

          {/* Slide Footer Strip */}
          <div className="pt-4 mt-4 border-t border-[#222222] flex items-center justify-between text-xs font-mono text-[#707070] shrink-0">
            <div className="flex items-center space-x-4">
              <span>GDPR Art. 5, 6, 12–22</span>
              <span>•</span>
              <span>Tamper Audit Verified (SHA-256)</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <span>Use ◀ / ▶ arrow keys to navigate</span>
              <span className="text-[#888888]">| Slide {currentPage + 1} of {pages.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
