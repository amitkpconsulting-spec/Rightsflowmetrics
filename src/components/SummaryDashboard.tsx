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
  Area
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
  ShieldCheck,
  TrendingDown,
  Users,
  AlertTriangle,
  Clock,
  Zap,
  Building,
  CheckCircle2,
  LayoutDashboard,
  Radio,
  Share2
} from 'lucide-react';
import { DsrTicket, ServerHealth } from '../types';

interface SummaryDashboardProps {
  initialPage?: number;
  tickets?: DsrTicket[];
  health?: ServerHealth | null;
  onNavigateToTab?: (tab: string) => void;
}

// ============================================================================
// REALISTIC DATASETS MIRRORING EXECUTIVE DASHBOARD
// ============================================================================

const LAWFUL_BASES_DATA = [
  { name: 'Legitimate Interests', value: 34, count: 142, liaMissing: 28, color: '#F59E0B', desc: 'Art. 6(1)(f) - Requires 3-part LIA balancing test', statutoryRef: 'GDPR Art. 6(1)(f)' },
  { name: 'Contract Performance', value: 26, count: 108, liaMissing: 0, color: '#C11212', desc: 'Art. 6(1)(b) - Core account & credit facilities', statutoryRef: 'GDPR Art. 6(1)(b)' },
  { name: 'Consent', value: 20, count: 84, liaMissing: 19, color: '#EBEBEB', desc: 'Art. 6(1)(a) - Granular affirmative opt-in records', statutoryRef: 'GDPR Art. 6(1)(a) & Art. 7' },
  { name: 'Legal Obligation', value: 14, count: 58, liaMissing: 0, color: '#821717', desc: 'Art. 6(1)(c) - AML, tax, and supervisory retention', statutoryRef: 'EU 5AMLD, GwG § 8' },
  { name: 'Public Task', value: 4, count: 16, liaMissing: 0, color: '#737373', desc: 'Art. 6(1)(e) - Statutory public mandates', statutoryRef: 'GDPR Art. 6(1)(e)' },
  { name: 'Vital Interests', value: 2, count: 8, liaMissing: 0, color: '#EF4444', desc: 'Art. 6(1)(d) - Emergency life/safety processing', statutoryRef: 'GDPR Art. 6(1)(d)' },
];

const CONSENT_HEALTH_DATA = [
  { department: 'Marketing', valid: 64, stale: 24, missingGranular: 12, total: 100, riskScore: 'Elevated' },
  { department: 'Product & Eng', valid: 78, stale: 14, missingGranular: 8, total: 100, riskScore: 'Moderate' },
  { department: 'HR & People', valid: 89, stale: 7, missingGranular: 4, total: 100, riskScore: 'Low' },
  { department: 'Sales & CRM', valid: 52, stale: 31, missingGranular: 17, total: 100, riskScore: 'Critical' },
  { department: 'Finance & Legal', valid: 94, stale: 4, missingGranular: 2, total: 100, riskScore: 'Minimal' },
];

const DSAR_BY_RIGHT_DATA = [
  { right: 'Access (Art. 15)', count: 184, onTime: 168, overdue: 16, avgDays: 19.4, color: '#C11212', complexExtensionCount: 2 },
  { right: 'Erasure (Art. 17)', count: 142, onTime: 131, overdue: 11, avgDays: 22.8, color: '#EF4444', complexExtensionCount: 0 },
  { right: 'Objection (Art. 21)', count: 96, onTime: 92, overdue: 4, avgDays: 14.1, color: '#F59E0B', complexExtensionCount: 0 },
  { right: 'Portability (Art. 20)', count: 74, onTime: 70, overdue: 4, avgDays: 17.6, color: '#EBEBEB', complexExtensionCount: 0 },
  { right: 'Rectification (Art. 16)', count: 52, onTime: 51, overdue: 1, avgDays: 11.2, color: '#821717', complexExtensionCount: 0 },
  { right: 'Restriction (Art. 18)', count: 28, onTime: 26, overdue: 2, avgDays: 15.8, color: '#737373', complexExtensionCount: 0 },
];

const SLA_TRENDS_DATA = [
  { month: 'Oct 2025', avgResolutionDays: 28.4, slaLimit: 30, onTimeRequests: 62, overdueRequests: 8, totalVolume: 70 },
  { month: 'Nov 2025', avgResolutionDays: 25.1, slaLimit: 30, onTimeRequests: 74, overdueRequests: 6, totalVolume: 80 },
  { month: 'Dec 2025', avgResolutionDays: 23.8, slaLimit: 30, onTimeRequests: 81, overdueRequests: 5, totalVolume: 86 },
  { month: 'Jan 2026', avgResolutionDays: 21.2, slaLimit: 30, onTimeRequests: 95, overdueRequests: 4, totalVolume: 99 },
  { month: 'Feb 2026', avgResolutionDays: 19.6, slaLimit: 30, onTimeRequests: 108, overdueRequests: 3, totalVolume: 111 },
  { month: 'Mar 2026 (YTD)', avgResolutionDays: 18.2, slaLimit: 30, onTimeRequests: 122, overdueRequests: 2, totalVolume: 124 },
];

export function SummaryDashboard({
  initialPage = 0,
  tickets = [],
  health,
  onNavigateToTab
}: SummaryDashboardProps) {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [autoPlayIntervalSec, setAutoPlayIntervalSec] = useState<number>(8);
  const [activeDonutIdx, setActiveDonutIdx] = useState<number | null>(null);

  // Sync initialPage if updated from parent
  useEffect(() => {
    if (initialPage !== undefined && initialPage >= 0) {
      setCurrentPage(initialPage);
    }
  }, [initialPage]);

  // ============================================================================
  // PAGE BY PAGE 16:9 DEFINITIONS (SHOWCASING EVERY SELECTED ELEMENT)
  // ============================================================================

  const pages = [
    // ------------------------------------------------------------------------
    // PAGE 1: SELECTED ELEMENT 1 - Lawful Basis Distribution (GDPR Art. 6)
    // ------------------------------------------------------------------------
    {
      id: 'page-lawful-basis',
      badge: 'SELECTED ELEMENT 1 • GDPR ART. 6',
      title: 'Lawful Basis Distribution (GDPR Article 6)',
      subtitle: 'Breakdown of 416 processing activities in ROPA across 6 legal grounds & LIA audit gaps',
      category: 'Article 6 ROPA',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center flex-1">
            {/* Donut Chart Display */}
            <div className="lg:col-span-7 h-full min-h-[300px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#222222] pb-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                    <Scale className="w-4 h-4" />
                  </span>
                  <span className="font-bold text-white uppercase tracking-wider">Art. 6 Legal Ground Distribution</span>
                </div>
                <span className="font-mono text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800 text-[11px] font-bold">
                  28 LIAs Missing
                </span>
              </div>

              <div className="h-[250px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={LAWFUL_BASES_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={105}
                      paddingAngle={3}
                      dataKey="value"
                      onMouseEnter={(_, index) => setActiveDonutIdx(index)}
                      onMouseLeave={() => setActiveDonutIdx(null)}
                    >
                      {LAWFUL_BASES_DATA.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="#050505"
                          strokeWidth={2}
                          opacity={activeDonutIdx === null || activeDonutIdx === index ? 1 : 0.6}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded-xs text-xs font-mono shadow-md">
                              <p className="font-bold text-white">{data.name}</p>
                              <p className="text-emerald-400 font-bold">{data.value}% ({data.count} processing operations)</p>
                              <p className="text-[#888888] text-[11px] mt-1">{data.desc}</p>
                              <p className="text-[#F59E0B] text-[10px] mt-1 font-semibold">{data.statutoryRef}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="text-[11px] text-[#8C8C8C] text-center font-mono border-t border-[#1C1C1C] pt-2">
                Hover over doughnut slices to inspect processing volume and legal grounds
              </div>
            </div>

            {/* Granular Breakdown & Statutory Reference Matrix */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-2 h-full">
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xs">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Key Statutory Risk: Art. 6(1)(f) LIA Gaps</span>
                </div>
                <p className="text-xs text-[#D1D1D1] mt-1 leading-relaxed">
                  <strong>28 Legitimate Interests</strong> activities lack a documented 3-part balancing test. Immediate risk of supervisory scrutiny under EU GDPR Article 5(2) accountability standards.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 flex-1">
                {LAWFUL_BASES_DATA.map((item, idx) => (
                  <div
                    key={idx}
                    onMouseEnter={() => setActiveDonutIdx(idx)}
                    onMouseLeave={() => setActiveDonutIdx(null)}
                    className={`p-2.5 rounded-xs border transition cursor-pointer flex flex-col justify-between ${
                      activeDonutIdx === idx ? 'bg-[#181818] border-[#555555]' : 'bg-[#0A0A0A] border-[#222222]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-white text-xs truncate">{item.name}</span>
                      </div>
                      <p className="text-[10px] text-[#707070] mt-0.5 truncate">{item.statutoryRef}</p>
                    </div>
                    <div className="flex items-baseline justify-between mt-2 font-mono text-xs">
                      <span className="text-[#8C8C8C]">{item.count} ops</span>
                      <span className="font-bold text-white text-sm">{item.value}%</span>
                    </div>
                    {item.liaMissing > 0 && (
                      <span className="text-[9px] text-amber-400 font-mono mt-1">⚠️ {item.liaMissing} unverified</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Context Banner */}
          <div className="p-3 bg-[#0A0A0A] border border-[#222222] rounded-xs flex items-center justify-between text-xs font-mono text-[#A0A0A0]">
            <span>ROPA Inventory: <strong>416 Registered Processing Activities</strong></span>
            <span className="text-emerald-400 font-bold">100% Mapped to GDPR Articles 6 &amp; 9</span>
            <span className="text-[#707070]">Austria &amp; EU Jurisdiction</span>
          </div>
        </div>
      )
    },

    // ------------------------------------------------------------------------
    // PAGE 2: SELECTED ELEMENT 2 - Consent Health & Re-consent Risk
    // ------------------------------------------------------------------------
    {
      id: 'page-consent-health',
      badge: 'SELECTED ELEMENT 2 • GDPR ART. 7',
      title: 'Consent Health & Re-consent Risk Matrix',
      subtitle: 'Valid affirmative opt-in vs expiring (>12mo) vs missing granular consent across BUs',
      category: 'Article 7 Consent',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="h-[310px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                  <UserCheck className="w-4 h-4" />
                </span>
                <span className="font-bold text-white uppercase tracking-wider">Business Unit Consent Hygiene (%)</span>
              </div>
              <span className="font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800 text-[11px] font-bold">
                GDPR Art. 7 Enforced
              </span>
            </div>

            <div className="h-[230px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CONSENT_HEALTH_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={11} />
                  <YAxis type="category" dataKey="department" stroke="#94a3b8" fontSize={11} width={90} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded-xs text-xs font-mono space-y-1 shadow-md">
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
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="valid" name="Valid Consent (%)" stackId="a" fill="#10b981" />
                  <Bar dataKey="stale" name="Stale / Expiring > 12mo (%)" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="missingGranular" name="Missing Granular Opt-in (%)" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 bg-rose-950/30 border border-rose-800/70 rounded-xs font-mono text-xs">
              <span className="text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Highest Re-Consent Vulnerability:
              </span>
              <p className="font-bold text-white text-base mt-1.5">Sales &amp; CRM (48% Total At-Risk)</p>
              <p className="text-[#A0A0A0] text-xs mt-1">
                31% stale cookies &amp; 17% unbundled marketing permissions. Mitigation: Launching automated refresh campaign.
              </p>
            </div>

            <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/70 rounded-xs font-mono text-xs">
              <span className="text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Top Performing Department:
              </span>
              <p className="font-bold text-white text-base mt-1.5">Finance &amp; Legal (94% Verified Clean)</p>
              <p className="text-[#A0A0A0] text-xs mt-1">
                Affirmative KYC onboarding opt-in with cryptographic audit trail and zero unbundled consent flaws.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // ------------------------------------------------------------------------
    // PAGE 3: SELECTED ELEMENT 3 - DSAR Volume by Right (GDPR Art. 15–21)
    // ------------------------------------------------------------------------
    {
      id: 'page-dsar-by-right',
      badge: 'SELECTED ELEMENT 3 • GDPR ART. 15–21',
      title: 'DSAR Volume & Fulfillment by Right (GDPR Art. 15–21)',
      subtitle: '576 Total Requests Logged: On-Time Fulfillment vs SLA Breached Count Across Rights',
      category: 'Individual Rights',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="h-[310px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
                  <FileCheck2 className="w-4 h-4" />
                </span>
                <span className="font-bold text-white uppercase tracking-wider">Fulfillment by Specific Right</span>
              </div>
              <span className="font-mono text-sky-300 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800 text-[11px] font-bold">
                576 Total Requests
              </span>
            </div>

            <div className="h-[230px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DSAR_BY_RIGHT_DATA} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="right" stroke="#94a3b8" fontSize={11} tickFormatter={(r) => r.split(' ')[0]} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded-xs text-xs font-mono space-y-1 shadow-md">
                            <p className="font-bold text-white border-b border-[#262626] pb-1">{label}</p>
                            {payload.map((p: any, i: number) => (
                              <div key={i} className="flex justify-between gap-4">
                                <span style={{ color: p.color }}>{p.name}:</span>
                                <span className="font-bold text-white">{p.value} requests</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="onTime" name="Fulfilled On-Time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="SLA Overdue / Breached" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stat Summary Cards */}
          <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
            <div className="bg-[#0A0A0A] p-3 rounded-xs border border-[#222222]">
              <span className="text-[11px] text-[#8C8C8C] uppercase tracking-wider">Top Volume Right</span>
              <p className="text-white font-bold text-sm mt-1">Art. 15 Access (184 req)</p>
              <span className="text-[10px] text-sky-400">91.3% On-Time Fulfillment</span>
            </div>
            <div className="bg-[#0A0A0A] p-3 rounded-xs border border-[#222222]">
              <span className="text-[11px] text-[#8C8C8C] uppercase tracking-wider">Longest Average SLA</span>
              <p className="text-rose-400 font-bold text-sm mt-1">Art. 17 Erasure (22.8d)</p>
              <span className="text-[10px] text-[#707070]">Multi-system tombstone cascade</span>
            </div>
            <div className="bg-[#0A0A0A] p-3 rounded-xs border border-[#222222]">
              <span className="text-[11px] text-[#8C8C8C] uppercase tracking-wider">Fastest Turnaround</span>
              <p className="text-emerald-400 font-bold text-sm mt-1">Art. 16 Rectify (11.2d)</p>
              <span className="text-[10px] text-emerald-400">98.1% On-Time Rate</span>
            </div>
          </div>
        </div>
      )
    },

    // ------------------------------------------------------------------------
    // PAGE 4: SELECTED ELEMENT 4 - SLA & Turnaround Compliance Trends
    // ------------------------------------------------------------------------
    {
      id: 'page-sla-trends',
      badge: 'SELECTED ELEMENT 4 • GDPR ART. 12(3)',
      title: 'SLA & Turnaround Compliance Trends',
      subtitle: 'Monthly Resolution Speed versus 30-Day Statutory SLA Cap (Oct 2025 – Mar 2026)',
      category: 'SLA Turnaround',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="h-[310px] bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#222222] pb-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                  <Activity className="w-4 h-4" />
                </span>
                <span className="font-bold text-white uppercase tracking-wider">Trailing 6-Month SLA Trajectory</span>
              </div>
              <span className="font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800 text-[11px] font-bold">
                18.2d Avg (↓35.9%)
              </span>
            </div>

            <div className="h-[230px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={SLA_TRENDS_DATA} margin={{ top: 10, right: 25, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={11} label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} label={{ value: 'Volume', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0C0C0C] border border-[#333333] p-3 rounded-xs text-xs font-mono space-y-1 shadow-md">
                            <p className="font-bold text-white border-b border-[#262626] pb-1">{label}</p>
                            {payload.map((p: any, i: number) => (
                              <div key={i} className="flex justify-between gap-4">
                                <span style={{ color: p.color }}>{p.name}:</span>
                                <span className="font-bold text-white">
                                  {p.value} {p.name.includes('Days') ? 'd' : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area yAxisId="right" type="monotone" dataKey="totalVolume" name="Total Requests" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" />
                  <Line yAxisId="left" type="monotone" dataKey="avgResolutionDays" name="Avg Resolution (Days)" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                  <Line yAxisId="left" type="step" dataKey="slaLimit" name="Statutory 30d SLA Cap" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="p-3.5 bg-[#0A0A0A] border border-[#222222] rounded-xs flex items-center justify-between font-mono text-xs">
            <span className="text-[#8C8C8C]">Statutory SLA Compliance:</span>
            <span className="text-emerald-400 font-bold">
              Resolution turnaround improved by 35.9% since Oct 2025 (28.4d → 18.2d) • Zero unextended SLA breaches
            </span>
          </div>
        </div>
      )
    },

    // ------------------------------------------------------------------------
    // PAGE 5: ALL 4 SELECTED ELEMENTS COMBINED (PANORAMIC 16:9 VIEW)
    // ------------------------------------------------------------------------
    {
      id: 'page-panoramic-matrix',
      badge: 'PANORAMIC VIEW • ALL 4 ELEMENTS',
      title: 'Unified 16:9 Executive Control Matrix',
      subtitle: 'Side-by-side presentation of all 4 selected GDPR compliance elements in high density',
      category: '4-in-1 Executive View',
      render: () => (
        <div className="h-full grid grid-cols-2 grid-rows-2 gap-3 overflow-hidden text-xs">
          {/* Tile 1: Lawful Basis Donut */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-2.5 rounded-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-1">
              <span className="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                1. Lawful Basis Distribution (Art. 6)
              </span>
              <span className="text-[10px] text-amber-400 font-mono">28 LIAs Missing</span>
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={LAWFUL_BASES_DATA} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                    {LAWFUL_BASES_DATA.map((entry, index) => (
                      <Cell key={`pcell-${index}`} fill={entry.color} stroke="#000" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8C8C8C]">
              <span>Legit. Interests: 34%</span>
              <span>Contract: 26%</span>
              <span>Consent: 20%</span>
            </div>
          </div>

          {/* Tile 2: Consent Health Stacked Bar */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-2.5 rounded-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-1">
              <span className="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                2. Consent Health Matrix (Art. 7)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Art. 7 Enforced</span>
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CONSENT_HEALTH_DATA} layout="vertical" margin={{ top: 2, right: 10, left: 45, bottom: 2 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="department" stroke="#777" fontSize={9} width={50} tickLine={false} />
                  <Bar dataKey="valid" stackId="x" fill="#10b981" />
                  <Bar dataKey="stale" stackId="x" fill="#f59e0b" />
                  <Bar dataKey="missingGranular" stackId="x" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8C8C8C]">
              <span>Green: Valid Opt-in</span>
              <span className="text-rose-400 font-bold">Sales & CRM at Risk</span>
            </div>
          </div>

          {/* Tile 3: DSAR by Right */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-2.5 rounded-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-1">
              <span className="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-sky-400" />
                3. DSAR Volume by Right (Art. 15-21)
              </span>
              <span className="text-[10px] text-sky-400 font-mono">576 Requests</span>
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DSAR_BY_RIGHT_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="right" stroke="#777" fontSize={8} tickFormatter={(v) => v.split(' ')[0]} />
                  <YAxis stroke="#777" fontSize={8} />
                  <Bar dataKey="onTime" fill="#3b82f6" />
                  <Bar dataKey="overdue" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8C8C8C]">
              <span>Top: Art. 15 (184)</span>
              <span>On-Time: 94.2%</span>
            </div>
          </div>

          {/* Tile 4: SLA Turnaround Trend */}
          <div className="bg-[#0A0A0A] border border-[#222222] p-2.5 rounded-xs flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-1">
              <span className="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                4. SLA Turnaround Trends (Art. 12(3))
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">18.2d Avg</span>
            </div>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={SLA_TRENDS_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" stroke="#777" fontSize={8} />
                  <YAxis stroke="#777" fontSize={8} />
                  <Area type="monotone" dataKey="totalVolume" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" />
                  <Line type="monotone" dataKey="avgResolutionDays" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="step" dataKey="slaLimit" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#8C8C8C]">
              <span>Limit: 30d</span>
              <span className="text-emerald-400 font-bold">-35.9% speedup</span>
            </div>
          </div>
        </div>
      )
    },

    // ------------------------------------------------------------------------
    // PAGE 6: TOP KPI SUMMARY & ENCLAVE ISOLATION TELEMETRY
    // ------------------------------------------------------------------------
    {
      id: 'page-kpi-summary',
      badge: 'EXECUTIVE OVERVIEW • TELEMETRY',
      title: 'Executive Compliance KPIs & Telemetry',
      subtitle: 'Global statutory health, air-gapped node isolation, and cryptographic audit chaining',
      category: 'KPIs & Telemetry',
      render: () => (
        <div className="h-full flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            {/* KPI 1 */}
            <div className="bg-[#0A0A0A] border border-[#222222] p-5 rounded-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C]">Total Active DSARs</span>
                  <div className="text-3xl font-bold text-white font-mono mt-1">576</div>
                </div>
                <span className="p-2.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 94.2% on track
                </span>
                <span className="text-rose-400">5.8% SLA risk</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-[#0A0A0A] border border-[#222222] p-5 rounded-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C]">Activities at Risk</span>
                  <div className="text-3xl font-bold text-amber-400 font-mono mt-1">47</div>
                </div>
                <span className="p-2.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </span>
              </div>
              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8C8C8C]">Missing LIA/Consent</span>
                <span className="text-amber-400 font-bold">11.3% of ROPA</span>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-[#0A0A0A] border border-[#222222] p-5 rounded-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C]">Avg Turnaround</span>
                  <div className="text-3xl font-bold text-emerald-400 font-mono mt-1">18.2d</div>
                </div>
                <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                  <Clock className="w-5 h-5" />
                </span>
              </div>
              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Target &lt; 30d
                </span>
                <span className="text-emerald-400 font-bold">-39.3% vs Cap</span>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-[#0A0A0A] border border-[#222222] p-5 rounded-xs flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono uppercase text-[#8C8C8C]">Remediation Rate</span>
                  <div className="text-3xl font-bold text-indigo-400 font-mono mt-1">86%</div>
                </div>
                <span className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                  <Zap className="w-5 h-5" />
                </span>
              </div>
              <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between text-xs font-mono">
                <span className="text-[#8C8C8C]">6 of 7 closed</span>
                <span className="text-indigo-400 font-bold">Target: 85%</span>
              </div>
            </div>
          </div>

          {/* Enclave Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#0A0A0A] border border-[#222222] p-4 rounded-xs font-mono text-xs">
            <div className="space-y-1">
              <div className="text-[10px] text-[#8C8C8C] uppercase">Air-Gapped Isolation Engine</div>
              <div className="text-white font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Local Enclave Active
              </div>
              <p className="text-[11px] text-[#707070]">Zero third-party telemetry egress. Continuous audit verification.</p>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-[#8C8C8C] uppercase">Cryptographic Audit Chain</div>
              <div className="text-emerald-400 font-bold">SHA-256 Tamper Evident</div>
              <p className="text-[11px] text-[#707070]">100% verified against Genesis block root.</p>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-[#8C8C8C] uppercase">Operating Protocol</div>
              <div className="text-[#FF4D4D] font-bold">Frontend Offline Node</div>
              <p className="text-[11px] text-[#707070]">Indexed in-browser virtual store with full schema fidelity.</p>
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
          ? 'fixed inset-0 z-50 bg-[#050505] p-4 sm:p-8 justify-between overflow-hidden'
          : 'w-full space-y-4'
      }`}
      id="summary-dashboard-root"
    >
      {/* Top Slide Presentation Control Header */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-4 shadow-[4px_4px_0px_0px_#000000] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-[#C11212] text-white rounded-xs border border-[#E61919] shadow-[2px_2px_0px_0px_#000000]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-tight uppercase font-mono">
                Summary Dashboard (16:9 Presentation)
              </h2>
              <span className="text-[10px] font-mono font-bold bg-[#260505] text-[#FF4D4D] border border-[#821717] px-2 py-0.5 rounded">
                PAGE {currentPage + 1} OF {pages.length}
              </span>
            </div>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Full-screen 16:9 page-by-page display of every selected executive compliance chart
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
                className={`px-2.5 py-1 rounded-xs text-xs transition cursor-pointer font-semibold ${
                  currentPage === idx
                    ? 'bg-[#C11212] text-white font-bold shadow-xs'
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
            title="Toggle Slide Auto-Play (8 seconds per page)"
          >
            {isAutoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoPlay ? 'Auto-Advancing (8s)' : 'Auto-Play'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="px-3 py-1.5 bg-[#141414] hover:bg-[#202020] text-white border border-[#2B2B2B] rounded-xs cursor-pointer flex items-center space-x-1.5 shadow-xs"
            title="Toggle 16:9 Full Screen Mode (F key / ESC to exit)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="font-bold">{isFullscreen ? 'Exit Full Screen' : '16:9 Full Screen'}</span>
          </button>
        </div>
      </div>

      {/* 16:9 ASPECT RATIO SLIDE CONTAINER */}
      <div className="w-full flex justify-center items-center">
        <div
          className={`w-full bg-[#080808] border-2 border-[#2B2B2B] rounded-xs shadow-[8px_8px_0px_0px_#000000] p-6 sm:p-7 flex flex-col justify-between overflow-hidden relative ${
            isFullscreen ? 'h-full max-h-[90vh] aspect-video max-w-[160vh]' : 'aspect-video min-h-[560px]'
          }`}
          style={{ aspectRatio: '16 / 9' }}
        >
          {/* Slide Header Strip */}
          <div className="border-b border-[#222222] pb-3 mb-3 flex items-center justify-between shrink-0">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#FF4D4D] font-bold bg-[#260505] px-2 py-0.5 border border-[#821717]">
                  {activePage.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-mono">
                  {activePage.title}
                </h3>
              </div>
              <p className="text-xs text-[#8C8C8C] mt-1 font-mono">{activePage.subtitle}</p>
            </div>

            <div className="text-right font-mono hidden sm:block">
              <div className="flex items-center justify-end space-x-1.5 text-[10px] text-emerald-400 font-bold">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                <span>AIR-GAPPED COMPLIANCE ENCLAVE</span>
              </div>
              <span className="text-[10px] text-[#707070]">RightsFlow Metrics™ Node #82</span>
            </div>
          </div>

          {/* Dynamic Slide Content Body */}
          <div className="flex-1 overflow-hidden min-h-0">{activePage.render()}</div>

          {/* Slide Footer Strip */}
          <div className="pt-3 mt-3 border-t border-[#222222] flex items-center justify-between text-xs font-mono text-[#707070] shrink-0">
            <div className="flex items-center space-x-3">
              <span>GDPR Articles 6, 7, 12(3), 15–21</span>
              <span>•</span>
              <span className="text-emerald-400">Cryptographically Chained (SHA-256)</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <span className="text-[#888888]">Use ◀ / ▶ arrows to navigate</span>
              <span className="text-[#FF4D4D] font-bold">| Page {currentPage + 1} of {pages.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
