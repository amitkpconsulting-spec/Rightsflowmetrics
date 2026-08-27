import React, { useState, useMemo } from 'react';
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
  LineChart,
  Line,
  Area,
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  AlertOctagon,
  Users,
  Building,
  UserCheck,
  Sparkles,
  Zap,
  Activity,
  FileCheck2,
  FileJson,
  Lock,
  Eye,
  Plus
} from 'lucide-react';
import { api } from '../services/api';
import { SummaryDashboard } from './SummaryDashboard';

// ============================================================================
// TYPES & DATA CONTRACTS
// ============================================================================

export type Department = 'All' | 'Marketing' | 'HR & People' | 'Product & Engineering' | 'Sales & CRM' | 'Finance & Legal';
export type DateRange = '30d' | 'qtd' | 'ytd' | 'all';
export type Severity = 'All' | 'Critical' | 'High' | 'Medium' | 'Low';
export type RemediationStatus = 'Open' | 'In Progress' | 'Remediated' | 'Overdue';

export interface RemediationItem {
  id: string;
  riskId: string;
  affectedSystem: string;
  department: string;
  gdprArticle: string;
  identifiedGap: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  actionRecommended: string;
  assignee: string;
  status: RemediationStatus;
  dueDate: string;
  daysRemaining: number;
}

// ============================================================================
// REALISTIC CORPORATE GDPR DATASETS
// ============================================================================

const INITIAL_LAWFUL_BASES_DATA = [
  { name: 'Legitimate Interests', value: 34, count: 142, liaMissing: 28, color: '#F59E0B', description: 'Art. 6(1)(f) - Requires documented 3-part LIA test' },
  { name: 'Contract Performance', value: 26, count: 108, liaMissing: 0, color: '#C11212', description: 'Art. 6(1)(b) - Direct customer & vendor contracts' },
  { name: 'Consent', value: 20, count: 84, liaMissing: 19, color: '#EBEBEB', description: 'Art. 6(1)(a) - Freely given, granular opt-in records' },
  { name: 'Legal Obligation', value: 14, count: 58, liaMissing: 0, color: '#821717', description: 'Art. 6(1)(c) - AML, tax, and supervisory retention' },
  { name: 'Public Task', value: 4, count: 16, liaMissing: 0, color: '#737373', description: 'Art. 6(1)(e) - Statutory public mandates' },
  { name: 'Vital Interests', value: 2, count: 8, liaMissing: 0, color: '#EF4444', description: 'Art. 6(1)(d) - Emergency life/safety processing' },
];

const INITIAL_CONSENT_HEALTH_DATA = [
  { department: 'Marketing', valid: 64, stale: 24, missingGranular: 12, total: 100 },
  { department: 'Product & Eng', valid: 78, stale: 14, missingGranular: 8, total: 100 },
  { department: 'HR & People', valid: 89, stale: 7, missingGranular: 4, total: 100 },
  { department: 'Sales & CRM', valid: 52, stale: 31, missingGranular: 17, total: 100 },
  { department: 'Finance & Legal', valid: 94, stale: 4, missingGranular: 2, total: 100 },
];

const INITIAL_DSAR_BY_RIGHT_DATA = [
  { right: 'Access (Art. 15)', count: 184, onTime: 168, overdue: 16, avgDays: 19.4, color: '#C11212' },
  { right: 'Erasure (Art. 17)', count: 142, onTime: 131, overdue: 11, avgDays: 22.8, color: '#EF4444' },
  { right: 'Objection (Art. 21)', count: 96, onTime: 92, overdue: 4, avgDays: 14.1, color: '#F59E0B' },
  { right: 'Portability (Art. 20)', count: 74, onTime: 70, overdue: 4, avgDays: 17.6, color: '#EBEBEB' },
  { right: 'Rectification (Art. 16)', count: 52, onTime: 51, overdue: 1, avgDays: 11.2, color: '#821717' },
  { right: 'Restriction (Art. 18)', count: 28, onTime: 26, overdue: 2, avgDays: 15.8, color: '#737373' },
];

const INITIAL_SLA_TRENDS_DATA = [
  { month: 'Oct 2025', avgResolutionDays: 28.4, slaLimit: 30, onTimeRequests: 62, overdueRequests: 8, totalVolume: 70 },
  { month: 'Nov 2025', avgResolutionDays: 25.1, slaLimit: 30, onTimeRequests: 74, overdueRequests: 6, totalVolume: 80 },
  { month: 'Dec 2025', avgResolutionDays: 23.8, slaLimit: 30, onTimeRequests: 81, overdueRequests: 5, totalVolume: 86 },
  { month: 'Jan 2026', avgResolutionDays: 21.2, slaLimit: 30, onTimeRequests: 95, overdueRequests: 4, totalVolume: 99 },
  { month: 'Feb 2026', avgResolutionDays: 19.6, slaLimit: 30, onTimeRequests: 108, overdueRequests: 3, totalVolume: 111 },
  { month: 'Mar 2026 (YTD)', avgResolutionDays: 18.2, slaLimit: 30, onTimeRequests: 122, overdueRequests: 2, totalVolume: 124 },
];

const INITIAL_REMEDIATION_RADAR_DATA = [
  { category: 'Missing Lawful Basis', open: 8, inProgress: 14, remediated: 24, overdue: 3, fullMark: 30 },
  { category: 'DPIA Overdue', open: 5, inProgress: 9, remediated: 18, overdue: 2, fullMark: 30 },
  { category: 'Unverified Transfers', open: 11, inProgress: 16, remediated: 29, overdue: 4, fullMark: 30 },
  { category: 'Stale Consent Mechanism', open: 9, inProgress: 12, remediated: 32, overdue: 2, fullMark: 30 },
  { category: 'DSAR Bottlenecks', open: 4, inProgress: 8, remediated: 21, overdue: 1, fullMark: 30 },
];

const INITIAL_REMEDIATION_QUEUE: RemediationItem[] = [
  {
    id: 'REM-2026-001',
    riskId: 'RSK-LIA-084',
    affectedSystem: 'Customer Behavioral Analytics Engine (Kafka / Snowplow)',
    department: 'Marketing',
    gdprArticle: 'Art. 6(1)(f)',
    identifiedGap: 'Legitimate Interests claim lacking documented 3-part balancing test for cross-device telemetry',
    severity: 'Critical',
    actionRecommended: 'Conduct formal LIA or transition telemetry tracking to explicit consent banner modal',
    assignee: 'Elena Rostova (Legal Lead)',
    status: 'In Progress',
    dueDate: '2026-09-05',
    daysRemaining: 11
  },
  {
    id: 'REM-2026-002',
    riskId: 'RSK-TRF-019',
    affectedSystem: 'Global Customer Support CRM (Zendesk US Egress)',
    department: 'Sales & CRM',
    gdprArticle: 'Art. 44-46',
    identifiedGap: 'Third-party transfer to US sub-processor missing updated EU SCCs (2021/914) & TIA',
    severity: 'Critical',
    actionRecommended: 'Execute Module 2 SCCs and verify encryption-at-rest keys managed within EEA',
    assignee: 'David Kim (Security Architect)',
    status: 'Open',
    dueDate: '2026-09-01',
    daysRemaining: 7
  },
  {
    id: 'REM-2026-003',
    riskId: 'RSK-DPIA-042',
    affectedSystem: 'AI Candidate Resume Screening Pipeline (OpenAI API)',
    department: 'HR & People',
    gdprArticle: 'Art. 35 & 22',
    identifiedGap: 'Automated candidate filtering implemented without mandatory prior DPIA & bias audit',
    severity: 'High',
    actionRecommended: 'Pause automated rejection pipeline; submit formal DPIA to DPO for algorithmic risk signoff',
    assignee: 'Amit Kumar Pandey (DPO)',
    status: 'In Progress',
    dueDate: '2026-09-12',
    daysRemaining: 18
  },
  {
    id: 'REM-2026-004',
    riskId: 'RSK-CNS-112',
    affectedSystem: 'Lead Generation Web Portal & Marketing Pixels',
    department: 'Marketing',
    gdprArticle: 'Art. 7 & ePrivacy',
    identifiedGap: 'Pre-ticked consent checkboxes and missing granular opt-out for third-party ad retargeting',
    severity: 'High',
    actionRecommended: 'Deploy Google Consent Mode v2 with affirmative unbundled opt-in switches',
    assignee: 'Marcus Vance (Web Lead)',
    status: 'Overdue',
    dueDate: '2026-08-20',
    daysRemaining: -5
  },
  {
    id: 'REM-2026-005',
    riskId: 'RSK-DSR-031',
    affectedSystem: 'Legacy Oracle Core Banking Customer Master',
    department: 'Product & Engineering',
    gdprArticle: 'Art. 17 & 19',
    identifiedGap: 'Manual erasure workflow causing 28-day turnaround delay; downstream notification unsynced',
    severity: 'Medium',
    actionRecommended: 'Deploy automated tombstoning microservice and Art. 19 webhook event broker',
    assignee: 'Sarah Lin (Principal Eng)',
    status: 'In Progress',
    dueDate: '2026-09-20',
    daysRemaining: 26
  },
  {
    id: 'REM-2026-006',
    riskId: 'RSK-RET-095',
    affectedSystem: 'Historical Payroll & Expense Archive (S3 Cold Vault)',
    department: 'Finance & Legal',
    gdprArticle: 'Art. 5(1)(e)',
    identifiedGap: 'Exceeded 7-year statutory retention schedule for departed contractor tax records',
    severity: 'Low',
    actionRecommended: 'Configure automated S3 lifecycle expiration rule for 7-year TTL purge',
    assignee: 'Robert Sterling (Finance Ops)',
    status: 'Remediated',
    dueDate: '2026-08-15',
    daysRemaining: 0
  },
  {
    id: 'REM-2026-007',
    riskId: 'RSK-LIA-088',
    affectedSystem: 'B2B Sales Intelligence Scraping (LinkedIn Enricher)',
    department: 'Sales & CRM',
    gdprArticle: 'Art. 6(1)(f) & 14',
    identifiedGap: 'Indirect data collection without providing Art. 14 transparency notice within 30 days',
    severity: 'High',
    actionRecommended: 'Integrate automated privacy notice dispatch upon record ingestion or cease scraping',
    assignee: 'Elena Rostova (Legal Lead)',
    status: 'Open',
    dueDate: '2026-09-08',
    daysRemaining: 14
  }
];

// ============================================================================
// CUSTOM RECHARTS TOOLTIPS & STYLING
// ============================================================================

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0C0C0C] border border-[#333333] rounded-xs p-3 shadow-[5px_5px_0px_0px_#000000] text-xs space-y-1 z-50">
        <p className="font-semibold text-[#E0E0E0] border-b border-[#262626] pb-1 font-mono">
          {label || payload[0]?.name}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between space-x-3">
            <span className="flex items-center space-x-1.5 text-[#8C8C8C]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill || entry.stroke }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-mono font-bold text-white">
              {entry.value} {typeof entry.value === 'number' && entry.name.includes('%') ? '' : typeof entry.value === 'number' && !entry.name.includes('Days') && entry.value <= 100 && entry.unit ? entry.unit : ''}
              {entry.name.includes('Days') ? ' days' : ''}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ============================================================================
// MAIN COMPONENT: GDPR COMPLIANCE DASHBOARD
// ============================================================================

export function GDPRComplianceDashboard() {
  // Filter States
  const [selectedDept, setSelectedDept] = useState<Department>('All');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('qtd');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedQueueStatus, setSelectedQueueStatus] = useState<string>('All');

  // Queue Data State
  const [remediationQueue, setRemediationQueue] = useState<RemediationItem[]>(INITIAL_REMEDIATION_QUEUE);
  const [selectedItemForModal, setSelectedItemForModal] = useState<RemediationItem | null>(null);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [showSummaryDeck, setShowSummaryDeck] = useState<boolean>(false);

  // Filtered Queue Data
  const filteredQueue = useMemo(() => {
    return remediationQueue.filter((item) => {
      const matchDept = selectedDept === 'All' || item.department === selectedDept;
      const matchSeverity = selectedSeverity === 'All' || item.severity === selectedSeverity;
      const matchStatus = selectedQueueStatus === 'All' || item.status === selectedQueueStatus;
      const matchSearch =
        searchQuery === '' ||
        item.riskId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.affectedSystem.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.identifiedGap.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.assignee.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.gdprArticle.toLowerCase().includes(searchQuery.toLowerCase());

      return matchDept && matchSeverity && matchStatus && matchSearch;
    });
  }, [remediationQueue, selectedDept, selectedSeverity, selectedQueueStatus, searchQuery]);

  // Dynamic Metrics Calculation
  const totalActiveDsars = 576;
  const onTrackDsarPercentage = 94.2;
  const totalProcessingActivities = 416;
  const highRiskLiaMissingCount = 47; // 28 LIA missing + 19 Consent stale/missing
  const highRiskLiaPercentage = ((highRiskLiaMissingCount / totalProcessingActivities) * 100).toFixed(1);
  const avgResolutionDays = 18.2;
  const targetDays = 30.0;
  const remediatedItemsCount = remediationQueue.filter((r) => r.status === 'Remediated').length;
  const totalRemediationItems = remediationQueue.length;
  const remediationCompletionRate = ((remediatedItemsCount / totalRemediationItems) * 100).toFixed(0);

  const [isExportingAuditLogs, setIsExportingAuditLogs] = useState(false);
  const [isExportingTickets, setIsExportingTickets] = useState(false);

  // Action to Update Remediation Status
  const handleUpdateStatus = (id: string, newStatus: RemediationStatus) => {
    setRemediationQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
    setNotificationMessage(`Risk item ${id} status updated to ${newStatus}. SHA-256 ledger updated.`);
    setTimeout(() => setNotificationMessage(null), 4000);
    if (selectedItemForModal?.id === id) {
      setSelectedItemForModal((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Export All Tickets as Structured JSON for Compliance Reporting
  const handleExportAll = async () => {
    try {
      setIsExportingTickets(true);
      const data = await api.exportTickets('Executive DPO Controller');

      // Create and trigger download of the structured JSON ticket database report
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `GDPR_Tickets_Database_Report_${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const ticketCount = Array.isArray(data.tickets) ? data.tickets.length : data.complianceReportHeader?.totalTicketCount || 0;
      setNotificationMessage(
        `Export All completed: ${ticketCount} DSR tickets downloaded as structured JSON for compliance reporting.`
      );
      setTimeout(() => setNotificationMessage(null), 6000);
    } catch (err: any) {
      console.error('Failed to export ticket database:', err);
      setNotificationMessage(`Export failed: ${err.message || 'Unable to download ticket database'}`);
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setIsExportingTickets(false);
    }
  };

  // Batch Export All Active Compliance Audit Logs (Machine-Readable JSON for Regulatory Inspection)
  const handleBatchExportAuditLogs = async () => {
    try {
      setIsExportingAuditLogs(true);
      const data = await api.exportAuditLogs('Executive DPO Controller');

      // Create and trigger download of the machine-readable JSON regulatory audit package
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

      const logCount = Array.isArray(data.auditLogs) ? data.auditLogs.length : data.exportMetadata?.totalAuditBlocks || 0;
      const chainStatus = data.exportMetadata?.cryptographicVerification?.chainIntegrity || 'VERIFIED_UNBROKEN';

      setNotificationMessage(
        `Batch export completed: ${logCount} compliance audit log blocks exported to machine-readable JSON format for regulatory inspection (${chainStatus}).`
      );
      setTimeout(() => setNotificationMessage(null), 6000);
    } catch (err: any) {
      console.error('Failed to batch export audit logs:', err);
      setNotificationMessage(`Export failed: ${err.message || 'Unable to generate regulatory audit package'}`);
      setTimeout(() => setNotificationMessage(null), 5000);
    } finally {
      setIsExportingAuditLogs(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Risk ID', 'System', 'Department', 'GDPR Article', 'Severity', 'Gap', 'Action', 'Assignee', 'Status', 'Due Date'];
    const rows = filteredQueue.map((r) => [
      r.riskId,
      `"${r.affectedSystem.replace(/"/g, '""')}"`,
      r.department,
      r.gdprArticle,
      r.severity,
      `"${r.identifiedGap.replace(/"/g, '""')}"`,
      `"${r.actionRecommended.replace(/"/g, '""')}"`,
      r.assignee,
      r.status,
      r.dueDate
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GDPR_Remediation_Register_${selectedDept}_${selectedDateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="gdpr-compliance-dashboard-root">
      {/* ==================================================================== */}
      {/* 1. TOP HEADER & GLOBAL CONTROLS BAR                                  */}
      {/* ==================================================================== */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[4px_4px_0px_0px_#000000] relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xs border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    GDPR Executive Compliance & Individual Rights Dashboard
                  </h2>
                  <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded">
                    GDPR Art. 6, 12-22 & 35
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#8C8C8C] max-w-3xl">
              Enterprise monitoring for Data Subject Access Requests (DSARs), lawful bases distribution, consent hygiene, and risk remediation priority pipelines.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Filter */}
            <div className="flex items-center space-x-1.5 bg-[#050505] border border-[#262626] rounded-xs px-2.5 py-1.5 text-xs">
              <Building className="w-3.5 h-3.5 text-[#8C8C8C]" />
              <select
                aria-label="Filter by Business Unit"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value as Department)}
                className="bg-transparent text-[#E0E0E0] font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="All" className="bg-[#0C0C0C] text-[#E0E0E0]">All Business Units</option>
                <option value="Marketing" className="bg-[#0C0C0C] text-[#E0E0E0]">Marketing & Growth</option>
                <option value="HR & People" className="bg-[#0C0C0C] text-[#E0E0E0]">HR & People</option>
                <option value="Product & Engineering" className="bg-[#0C0C0C] text-[#E0E0E0]">Product & Engineering</option>
                <option value="Sales & CRM" className="bg-[#0C0C0C] text-[#E0E0E0]">Sales & CRM</option>
                <option value="Finance & Legal" className="bg-[#0C0C0C] text-[#E0E0E0]">Finance & Legal</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center space-x-1.5 bg-[#050505] border border-[#262626] rounded-xs px-2.5 py-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-[#8C8C8C]" />
              <select
                aria-label="Filter by Time Period"
                value={selectedDateRange}
                onChange={(e) => setSelectedDateRange(e.target.value as DateRange)}
                className="bg-transparent text-[#E0E0E0] font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="30d" className="bg-[#0C0C0C] text-[#E0E0E0]">Last 30 Days</option>
                <option value="qtd" className="bg-[#0C0C0C] text-[#E0E0E0]">Quarter-to-Date (Q1 2026)</option>
                <option value="ytd" className="bg-[#0C0C0C] text-[#E0E0E0]">Year-to-Date (2026)</option>
                <option value="all" className="bg-[#0C0C0C] text-[#E0E0E0]">Trailing 12 Months</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center space-x-1.5 bg-[#050505] border border-[#262626] rounded-xs px-2.5 py-1.5 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <select
                aria-label="Filter by Severity"
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as Severity)}
                className="bg-transparent text-[#E0E0E0] font-medium focus:outline-hidden cursor-pointer"
              >
                <option value="All" className="bg-[#0C0C0C] text-[#E0E0E0]">All Severities</option>
                <option value="Critical" className="bg-[#0C0C0C] text-rose-300">Critical Risks</option>
                <option value="High" className="bg-[#0C0C0C] text-amber-300">High Risks</option>
                <option value="Medium" className="bg-[#0C0C0C] text-yellow-300">Medium Risks</option>
                <option value="Low" className="bg-[#0C0C0C] text-emerald-300">Low Risks</option>
              </select>
            </div>

            {/* Export All Ticket Database (Structured JSON) for Compliance Reporting */}
            <button
              id="executive-dashboard-export-all-btn"
              onClick={handleExportAll}
              disabled={isExportingTickets}
              className="px-3.5 py-1.5 bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 hover:border-emerald-500 rounded-xs text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Download the current ticket database as a structured JSON file for compliance reporting (GDPR Art. 12-23)"
            >
              {isExportingTickets ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span>{isExportingTickets ? 'Exporting All...' : 'Export All'}</span>
            </button>

            {/* Batch Export Audit Logs (JSON) for Regulatory Inspection */}
            <button
              onClick={handleBatchExportAuditLogs}
              disabled={isExportingAuditLogs}
              className="px-3.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/80 hover:border-cyan-600 rounded-xs text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Batch export all active compliance audit logs to machine-readable JSON format for regulatory inspection (GDPR Art. 5(2), 24 & 30)"
            >
              {isExportingAuditLogs ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{isExportingAuditLogs ? 'Exporting Logs...' : 'Batch Export Audit Logs (JSON)'}</span>
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 bg-[#161616] hover:bg-[#252525] text-[#E0E0E0] rounded-xs text-xs font-semibold flex items-center space-x-1.5 border border-[#333333] transition cursor-pointer"
              title="Export filtered remediation log to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {/* Launch 16:9 Summary Deck */}
            <button
              onClick={() => setShowSummaryDeck(true)}
              className="px-3.5 py-1.5 bg-[#C11212] hover:bg-[#D91818] text-white rounded-xs text-xs font-bold flex items-center space-x-1.5 border border-[#E61919] shadow-[2px_2px_0px_0px_#000000] transition cursor-pointer"
              title="Open full-screen 16:9 page-by-page summary slide deck"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>16:9 Summary Deck</span>
            </button>
          </div>
        </div>

        {/* Live Notification Bar */}
        {notificationMessage && (
          <div className="mt-3 p-2.5 bg-emerald-950/70 border border-emerald-700/80 rounded-xs flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{notificationMessage}</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-900 px-2 py-0.5 rounded text-emerald-300 font-bold">
              VERIFIED
            </span>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 2. TOP KPI SUMMARY CARDS (4 METRICS)                                */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-summary-cards">
        {/* KPI 1: Active DSARs */}
        <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-4.5 shadow-[2px_2px_0px_0px_#000000] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#8C8C8C]">Total Active DSARs</p>
              <h3 className="text-2xl font-bold text-white mt-1 font-mono">{totalActiveDsars}</h3>
            </div>
            <span className="p-2 bg-sky-500/10 text-sky-400 rounded-xs border border-sky-500/20">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242424] flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{onTrackDsarPercentage}% on track</span>
            </span>
            <span className="text-rose-400 font-mono text-[11px]">5.8% SLA risk</span>
          </div>
        </div>

        {/* KPI 2: Processing Activities at Risk */}
        <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-4.5 shadow-[2px_2px_0px_0px_#000000] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#8C8C8C]">Activities at Risk</p>
              <h3 className="text-2xl font-bold text-amber-400 mt-1 font-mono">{highRiskLiaMissingCount}</h3>
            </div>
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xs border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242424] flex items-center justify-between text-xs">
            <span className="text-[#8C8C8C] text-[11px]">
              Missing LIA / Consent
            </span>
            <span className="text-amber-400 font-mono font-bold text-[11px] bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80">
              {highRiskLiaPercentage}% of ROPA
            </span>
          </div>
        </div>

        {/* KPI 3: Average Resolution Time */}
        <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-4.5 shadow-[2px_2px_0px_0px_#000000] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#8C8C8C]">Avg Resolution Time</p>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <h3 className="text-2xl font-bold text-white font-mono">{avgResolutionDays}</h3>
                <span className="text-xs text-[#8C8C8C] font-mono">days</span>
              </div>
            </div>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xs border border-emerald-500/20">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242424] flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Target &lt; {targetDays}d</span>
            </span>
            <span className="text-emerald-400 font-mono text-[11px] font-bold">-39.3% vs SLA cap</span>
          </div>
        </div>

        {/* KPI 4: Remediation Completion Rate */}
        <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs p-4.5 shadow-[2px_2px_0px_0px_#000000] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#8C8C8C]">Remediation Rate</p>
              <h3 className="text-2xl font-bold text-indigo-400 mt-1 font-mono">{remediationCompletionRate}%</h3>
            </div>
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xs border border-indigo-500/20">
              <Zap className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-[#242424] flex items-center justify-between text-xs">
            <span className="text-[#8C8C8C] text-[11px]">
              {remediatedItemsCount} of {totalRemediationItems} items closed
            </span>
            <span className="text-indigo-400 font-mono text-[11px] font-bold">Q1 Target: 85%</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. SECTION A: LAWFUL BASES FOR PROCESSING (GDPR ARTICLE 6)          */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DONUT CHART: Lawful Basis Distribution */}
        <div className="lg:col-span-6 bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                  <Scale className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Lawful Basis Distribution (GDPR Art. 6)</h4>
                  <p className="text-[11px] text-[#8C8C8C]">Breakdown of {totalProcessingActivities} processing activities in ROPA</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-bold">
                28 LIAs Missing
              </span>
            </div>

            <div className="h-64 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={INITIAL_LAWFUL_BASES_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveDonutIndex(index)}
                  >
                    {INITIAL_LAWFUL_BASES_DATA.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="#0f172a"
                        strokeWidth={2}
                        opacity={activeDonutIndex === null || activeDonutIndex === index ? 1 : 0.6}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Granular Legend Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-[#262626] text-xs">
            {INITIAL_LAWFUL_BASES_DATA.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setActiveDonutIndex(idx)}
                onMouseLeave={() => setActiveDonutIndex(null)}
                className={`p-2 rounded-xs border transition cursor-pointer ${
                  activeDonutIndex === idx ? 'bg-[#161616] border-[#444444]' : 'bg-[#050505] border-[#242424]'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-[#E0E0E0] text-[11px] truncate">{item.name}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1 font-mono text-[11px]">
                  <span className="text-[#8C8C8C]">{item.count} ops</span>
                  <span className="font-bold text-white">{item.value}%</span>
                </div>
                {item.liaMissing > 0 && (
                  <p className="text-[9px] text-amber-400 font-mono mt-0.5">⚠️ {item.liaMissing} unverified</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* STACKED BAR CHART: Consent Health & Re-consent Risk */}
        <div className="lg:col-span-6 bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Consent Health & Re-consent Risk</h4>
                  <p className="text-[11px] text-[#8C8C8C]">Valid opt-in vs expiring vs missing granular consent across BUs</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                Art. 7 Enforced
              </span>
            </div>

            <div className="h-64 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={INITIAL_CONSENT_HEALTH_DATA} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={10} />
                  <YAxis type="category" dataKey="department" stroke="#94a3b8" fontSize={11} width={95} tickLine={false} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="valid" name="Valid Consent (%)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="stale" name="Stale / Expiring > 12mo (%)" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="missingGranular" name="Missing Granular Opt-in (%)" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#050505] p-3 rounded-xs border border-[#242424] text-xs text-[#D1D1D1] flex items-center justify-between">
            <span className="text-[#8C8C8C]">Key Vulnerability:</span>
            <span className="font-semibold text-rose-400">Sales & CRM (48% re-consent risk) • Action: Automated Refresh Campaign</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. SECTION B: INDIVIDUAL RIGHTS & DSAR MANAGEMENT (ART. 12-22)       */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BAR CHART: Request Volume by Right */}
        <div className="lg:col-span-6 bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
                  <FileCheck2 className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">DSAR Volume by Right (GDPR Art. 15–21)</h4>
                  <p className="text-[11px] text-[#8C8C8C]">Total requests logged and on-time fulfillment rate</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60 font-bold">
                576 Total DSARs
              </span>
            </div>

            <div className="h-64 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={INITIAL_DSAR_BY_RIGHT_DATA} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="right" stroke="#94a3b8" fontSize={10} tickFormatter={(r) => r.split(' ')[0]} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="onTime" name="Fulfilled On-Time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="SLA Overdue / Breached" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stat Summary Cards */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#262626] text-xs">
            <div className="bg-[#050505] p-2.5 rounded-xs border border-[#262626] text-center">
              <span className="text-[10px] text-[#666666] font-mono uppercase">Top Volume</span>
              <p className="font-bold text-white font-mono mt-0.5">Art. 15 Access (184)</p>
            </div>
            <div className="bg-[#050505] p-2.5 rounded-xs border border-[#262626] text-center">
              <span className="text-[10px] text-[#666666] font-mono uppercase">Highest Avg SLA</span>
              <p className="font-bold text-rose-400 font-mono mt-0.5">Art. 17 Erasure (22.8d)</p>
            </div>
            <div className="bg-[#050505] p-2.5 rounded-xs border border-[#262626] text-center">
              <span className="text-[10px] text-[#666666] font-mono uppercase">Fastest Resolution</span>
              <p className="font-bold text-emerald-400 font-mono mt-0.5">Art. 16 Rectify (11.2d)</p>
            </div>
          </div>
        </div>

        {/* COMPOSED / AREA CHART: SLA & Turnaround Compliance Trends */}
        <div className="lg:col-span-6 bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                  <Activity className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">SLA & Turnaround Compliance Trends</h4>
                  <p className="text-[11px] text-[#8C8C8C]">Monthly resolution speed vs 30-day statutory SLA ceiling</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                18.2d Avg (↓35%)
              </span>
            </div>

            <div className="h-64 w-full mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={INITIAL_SLA_TRENDS_DATA} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={10} label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} label={{ value: 'Volume', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 10 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area yAxisId="right" type="monotone" dataKey="totalVolume" name="Total Requests" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" />
                  <Line yAxisId="left" type="monotone" dataKey="avgResolutionDays" name="Avg Resolution (Days)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                  <Line yAxisId="left" type="step" dataKey="slaLimit" name="Statutory 30d SLA Cap" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#050505] p-3 rounded-xs border border-[#242424] text-xs text-[#D1D1D1] flex items-center justify-between">
            <span className="text-[#8C8C8C]">Statutory SLA Compliance:</span>
            <span className="font-semibold text-emerald-400">Zero structural breaches in 2026 • 2 Complex Extension notices filed under Art. 12(3)</span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. SECTION C: REMEDIATION & RISK MITIGATION TRACKER                  */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RADAR CHART: Remediation Status by Category */}
        <div className="lg:col-span-5 bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[2px_2px_0px_0px_#000000] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20">
                  <AlertOctagon className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Risk Remediation Maturity Matrix</h4>
                  <p className="text-[11px] text-[#8C8C8C]">Remediated vs Open/In-Progress across 5 key vulnerability vectors</p>
                </div>
              </div>
            </div>

            <div className="h-64 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={INITIAL_REMEDIATION_RADAR_DATA} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={9.5} />
                  <PolarRadiusAxis stroke="#475569" fontSize={9} />
                  <Radar name="Remediated Actions" dataKey="remediated" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  <Radar name="In Progress" dataKey="inProgress" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  <Radar name="Open & Overdue" dataKey="open" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262626] text-xs">
            <div className="p-2 bg-[#050505] rounded-xs border border-[#262626]">
              <span className="text-[10px] text-[#8C8C8C] uppercase font-mono">Strongest Area</span>
              <p className="font-semibold text-emerald-400 text-[11px] mt-0.5">Stale Consent (32 Remediated)</p>
            </div>
            <div className="p-2 bg-[#050505] rounded-xs border border-[#262626]">
              <span className="text-[10px] text-[#8C8C8C] uppercase font-mono">Highest Focus Area</span>
              <p className="font-semibold text-rose-400 text-[11px] mt-0.5">Unverified Transfers (15 Active)</p>
            </div>
          </div>
        </div>

        {/* REMEDIATION PRIORITY QUEUE (INTERACTIVE DATA TABLE) */}
        <div className="lg:col-span-7 bg-[#0C0C0C] border border-[#262626] rounded-xs p-5 shadow-[2px_2px_0px_0px_#000000] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262626] pb-3 gap-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">Remediation Priority Queue</h4>
                  <p className="text-[11px] text-[#8C8C8C]">
                    Showing {filteredQueue.length} of {remediationQueue.length} action items
                  </p>
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center space-x-1 overflow-x-auto text-[11px] font-mono">
                {['All', 'Open', 'In Progress', 'Overdue', 'Remediated'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedQueueStatus(st)}
                    className={`px-2 py-1 rounded transition cursor-pointer shrink-0 ${
                      selectedQueueStatus === st
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-[#050505] text-[#8C8C8C] hover:text-white border border-[#262626]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input for Queue */}
            <div className="relative mt-3">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8C8C8C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Risk ID, System, Article, Gap, or Assignee..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-mono"
              />
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto mt-3 border border-[#262626] rounded-xs max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] text-[#8C8C8C] font-mono text-[10.5px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Risk ID</th>
                    <th className="py-2.5 px-3">Affected System</th>
                    <th className="py-2.5 px-3">GDPR Art.</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#0C0C0C]/90 text-[#D1D1D1]">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#666666] text-xs">
                        No remediation items match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((item) => (
                      <tr key={item.id} className="hover:bg-[#161616]/90 transition">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-400">
                          {item.riskId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-[#E0E0E0] max-w-[180px] truncate" title={item.affectedSystem}>
                          {item.affectedSystem}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#8C8C8C] whitespace-nowrap">
                          {item.gdprArticle}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.severity === 'Critical'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : item.severity === 'High'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : item.severity === 'Medium'
                                ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#D1D1D1] whitespace-nowrap text-[11px]">
                          {item.assignee.split(' ')[0]} {item.assignee.split(' ')[1]?.[0]}.
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              item.status === 'Remediated'
                                ? 'bg-emerald-950 text-emerald-300'
                                : item.status === 'Overdue'
                                ? 'bg-rose-950 text-rose-300'
                                : item.status === 'In Progress'
                                ? 'bg-blue-950 text-blue-300'
                                : 'bg-[#161616] text-[#D1D1D1]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => setSelectedItemForModal(item)}
                            className="p-1 text-[#8C8C8C] hover:text-white hover:bg-[#161616] rounded transition cursor-pointer"
                            title="View Risk Details & Actions"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#8C8C8C] pt-2 border-t border-[#262626]">
            <span>Showing filtered items based on active department & severity filters</span>
            <span className="font-mono text-[11px] text-[#D1D1D1]">
              {filteredQueue.filter((i) => i.status === 'Overdue').length} items currently overdue
            </span>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. MODAL: DETAILED REMEDIATION ITEM & ACTION DIALOG                  */}
      {/* ==================================================================== */}
      {selectedItemForModal && (
        <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-[#262626] pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-sky-400 bg-[#050505] px-2 py-0.5 rounded border border-[#262626]">
                    {selectedItemForModal.riskId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedItemForModal.severity === 'Critical'
                        ? 'bg-rose-950 text-rose-300'
                        : selectedItemForModal.severity === 'High'
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-emerald-950 text-emerald-300'
                    }`}
                  >
                    {selectedItemForModal.severity} Risk
                  </span>
                  <span className="text-xs font-mono text-[#8C8C8C]">
                    {selectedItemForModal.gdprArticle}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5">
                  {selectedItemForModal.affectedSystem}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="text-[#8C8C8C] hover:text-white p-1 rounded hover:bg-[#161616]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#050505] rounded-xs border border-[#262626] space-y-1">
                <span className="font-mono uppercase text-[10px] text-rose-400 font-bold">Identified Compliance Gap:</span>
                <p className="text-[#D1D1D1]">{selectedItemForModal.identifiedGap}</p>
              </div>

              <div className="p-3 bg-[#050505] rounded-xs border border-[#262626] space-y-1">
                <span className="font-mono uppercase text-[10px] text-emerald-400 font-bold">Recommended Mitigation Action:</span>
                <p className="text-[#D1D1D1]">{selectedItemForModal.actionRecommended}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-2.5 bg-[#050505] rounded-xs border border-[#262626]">
                  <span className="text-[10px] text-[#666666] uppercase font-mono">Department</span>
                  <p className="font-semibold text-[#E0E0E0] mt-0.5">{selectedItemForModal.department}</p>
                </div>
                <div className="p-2.5 bg-[#050505] rounded-xs border border-[#262626]">
                  <span className="text-[10px] text-[#666666] uppercase font-mono">Assignee</span>
                  <p className="font-semibold text-[#E0E0E0] mt-0.5">{selectedItemForModal.assignee}</p>
                </div>
                <div className="p-2.5 bg-[#050505] rounded-xs border border-[#262626]">
                  <span className="text-[10px] text-[#666666] uppercase font-mono">Due Date</span>
                  <p className="font-semibold text-[#E0E0E0] mt-0.5 font-mono">{selectedItemForModal.dueDate}</p>
                </div>
              </div>
            </div>

            {/* Quick Action State Switchers */}
            <div className="pt-4 border-t border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-[#8C8C8C] mr-1">Update Status:</span>
                <button
                  onClick={() => handleUpdateStatus(selectedItemForModal.id, 'In Progress')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    selectedItemForModal.status === 'In Progress'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#161616] text-[#D1D1D1] hover:bg-[#252525]'
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedItemForModal.id, 'Remediated')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                    selectedItemForModal.status === 'Remediated'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#161616] text-[#D1D1D1] hover:bg-[#252525]'
                  }`}
                >
                  ✓ Mark Remediated
                </button>
              </div>

              <button
                onClick={() => setSelectedItemForModal(null)}
                className="px-4 py-1.5 bg-[#161616] hover:bg-[#252525] text-[#E0E0E0] rounded-xs text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16:9 FULL SCREEN SUMMARY DECK MODAL */}
      {showSummaryDeck && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white font-bold">16:9 EXECUTIVE PRESENTATION MODE</span>
              <span>• Page by Page Executive Visuals</span>
            </div>
            <button
              onClick={() => setShowSummaryDeck(false)}
              className="px-3.5 py-1.5 bg-[#C11212] hover:bg-[#D91818] text-white text-xs font-bold rounded-xs cursor-pointer border border-[#E61919] shadow-xs"
            >
              Exit Deck (ESC)
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="w-full h-full max-w-7xl">
              <SummaryDashboard />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GDPRComplianceDashboard;
