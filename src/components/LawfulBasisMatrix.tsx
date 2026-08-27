import React, { useState } from 'react';
import {
  ShieldAlert,
  Scale,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  Building2,
  FileCheck2,
  ArrowRight,
  Info
} from 'lucide-react';
import { LawfulBasisType, RightType } from '../types';
import { evaluateRightEntitlement } from '../../server/complianceEngine';

export const LawfulBasisMatrix: React.FC = () => {
  const lawfulBases: LawfulBasisType[] = [
    'Consent',
    'Contract',
    'Legal Obligation',
    'Vital Interests',
    'Public Task',
    'Legitimate Interests'
  ];

  const rights: RightType[] = [
    'Access (Art. 15)',
    'Rectification (Art. 16)',
    'Erasure (Art. 17)',
    'Restriction (Art. 18)',
    'Portability (Art. 20)',
    'Objection (Art. 21)',
    'Automated Decision Review (Art. 22)'
  ];

  const [selectedCell, setSelectedCell] = useState<{
    basis: LawfulBasisType;
    right: RightType;
  }>({
    basis: 'Legal Obligation',
    right: 'Erasure (Art. 17)'
  });

  const [sandboxBasis, setSandboxBasis] = useState<LawfulBasisType>('Legal Obligation');
  const [sandboxRight, setSandboxRight] = useState<RightType>('Erasure (Art. 17)');
  const [sandboxMarketing, setSandboxMarketing] = useState(false);

  const activeAssessment = evaluateRightEntitlement(selectedCell.right, selectedCell.basis);
  const sandboxAssessment = evaluateRightEntitlement(sandboxRight, sandboxBasis, sandboxMarketing);

  // Matrix cell cell mapping value
  const getMatrixCellStatus = (basis: LawfulBasisType, right: RightType) => {
    if (right === 'Access (Art. 15)' || right === 'Rectification (Art. 16)' || right === 'Restriction (Art. 18)') {
      return { text: 'Yes', class: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80', icon: CheckCircle2 };
    }
    if (right === 'Erasure (Art. 17)') {
      if (basis === 'Legal Obligation' || basis === 'Public Task') {
        return { text: 'No (AML Lock)', class: 'bg-rose-950/80 text-rose-300 border-rose-800', icon: XCircle };
      }
      if (basis === 'Consent') {
        return { text: 'Yes (Upon Withdrawal)', class: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80', icon: CheckCircle2 };
      }
      return { text: 'Qualified', class: 'bg-amber-950/60 text-amber-300 border-amber-800/80', icon: HelpCircle };
    }
    if (right === 'Portability (Art. 20)') {
      if (basis === 'Consent' || basis === 'Contract') {
        return { text: 'Yes (Automated)', class: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80', icon: CheckCircle2 };
      }
      return { text: 'No (Exempt)', class: 'bg-[#0C0C0C] text-[#8C8C8C] border-[#262626]', icon: XCircle };
    }
    if (right === 'Objection (Art. 21)') {
      if (basis === 'Legitimate Interests') {
        return { text: 'Yes (Absolute for Mkt)', class: 'bg-purple-950/60 text-purple-300 border-purple-800/80', icon: CheckCircle2 };
      }
      if (basis === 'Public Task') {
        return { text: 'Qualified', class: 'bg-amber-950/60 text-amber-300 border-amber-800/80', icon: HelpCircle };
      }
      return { text: 'No (Consent/Contract applies)', class: 'bg-[#0C0C0C] text-[#8C8C8C] border-[#262626]', icon: XCircle };
    }
    if (right === 'Automated Decision Review (Art. 22)') {
      if (basis === 'Consent') {
        return { text: 'Explicit Consent Req', class: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/80', icon: CheckCircle2 };
      }
      if (basis === 'Contract') {
        return { text: 'Permitted (Human Review)', class: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80', icon: CheckCircle2 };
      }
      return { text: 'Restricted / Reviewable', class: 'bg-amber-950/60 text-amber-300 border-amber-800/80', icon: HelpCircle };
    }
    return { text: 'Qualified', class: 'bg-[#161616] text-[#D1D1D1] border-[#333333]', icon: HelpCircle };
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-[#0C0C0C] border border-[#262626] p-5 rounded-xs shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-white font-mono">
                GDPR Statutory Lawful Basis vs. Individual Rights Matrix
              </h2>
            </div>
            <p className="text-xs text-[#8C8C8C] max-w-3xl leading-relaxed">
              Under GDPR Chapter III, individual rights do not apply uniformly. Their entitlement is strictly dependent on the underlying Art. 6 lawful basis. Click any cell to inspect statutory references, retail banking exemptions, and remediation rules.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="flex items-center space-x-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> <span>Granted</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-400">
              <XCircle className="w-3.5 h-3.5" /> <span>Blocked / Carveout</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-400">
              <HelpCircle className="w-3.5 h-3.5" /> <span>Qualified / Review</span>
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Matrix Grid */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050505] border-b border-[#262626] font-mono text-[11px] text-[#8C8C8C]">
              <tr>
                <th className="py-3 px-4 min-w-[180px]">Lawful Basis (Art. 6)</th>
                {rights.map((r) => (
                  <th key={r} className="py-3 px-3 min-w-[130px] text-center font-semibold">
                    {r.split('(')[0]}
                    <span className="block text-[10px] text-[#666666] font-normal">
                      ({r.split('(')[1]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {lawfulBases.map((basis) => (
                <tr key={basis} className="hover:bg-[#161616]/90 transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#E0E0E0] bg-[#050505]/90 border-r border-[#262626]">
                    {basis}
                    <span className="block text-[10px] font-normal text-[#666666]">
                      {basis === 'Consent' && 'Art. 6(1)(a)'}
                      {basis === 'Contract' && 'Art. 6(1)(b)'}
                      {basis === 'Legal Obligation' && 'Art. 6(1)(c) [AML/KYC]'}
                      {basis === 'Vital Interests' && 'Art. 6(1)(d)'}
                      {basis === 'Public Task' && 'Art. 6(1)(e)'}
                      {basis === 'Legitimate Interests' && 'Art. 6(1)(f)'}
                    </span>
                  </td>

                  {rights.map((right) => {
                    const cell = getMatrixCellStatus(basis, right);
                    const isSelected = selectedCell.basis === basis && selectedCell.right === right;

                    return (
                      <td
                        key={right}
                        onClick={() => setSelectedCell({ basis, right })}
                        className={`py-3 px-2 text-center cursor-pointer transition ${
                          isSelected ? 'bg-blue-950/50 ring-1 ring-blue-500' : ''
                        }`}
                      >
                        <div
                          className={`px-2 py-1 rounded text-[11px] font-mono font-medium border flex items-center justify-center space-x-1 ${cell.class}`}
                        >
                          <cell.icon className="w-3 h-3 shrink-0" />
                          <span className="truncate">{cell.text}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deep Inspection Panel for Selected Cell */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Deep Statutory Breakdown */}
        <div className="lg:col-span-2 bg-[#0C0C0C] border border-[#262626] p-5 rounded-xs shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div className="flex items-center space-x-2.5">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-white font-mono">
                  {selectedCell.right} vs. {selectedCell.basis}
                </h3>
                <span className="text-[11px] text-[#8C8C8C] font-mono">
                  Statutory Rule Reference: {activeAssessment.statutoryReference}
                </span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                activeAssessment.status === 'Fully Granted'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : activeAssessment.status === 'Lawfully Blocked'
                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              {activeAssessment.status}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-mono text-[#8C8C8C] uppercase tracking-wider text-[11px] font-semibold block mb-1">
                Legal Basis & Statutory Entitlement Rationale:
              </span>
              <p className="text-[#E0E0E0] leading-relaxed bg-[#050505] p-3 rounded-xs border border-[#242424] font-mono">
                {activeAssessment.legalJustification}
              </p>
            </div>

            <div>
              <span className="font-mono text-[#8C8C8C] uppercase tracking-wider text-[11px] font-semibold block mb-1">
                Retail Banking Operational Scenario & Mandates:
              </span>
              <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-xs text-blue-200 font-mono text-[11px] leading-relaxed flex items-start space-x-2">
                <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{activeAssessment.bankingScenarioNote}</span>
              </div>
            </div>

            <div>
              <span className="font-mono text-[#8C8C8C] uppercase tracking-wider text-[11px] font-semibold block mb-1">
                Required Operational Remediation Tasks:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                {activeAssessment.remediationActions.map((act, i) => (
                  <li
                    key={i}
                    className="p-2 bg-[#050505] border border-[#262626] rounded flex items-center space-x-2 text-[#D1D1D1]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right Col: Retail Banking Real-World Scenarios */}
        <div className="bg-[#0C0C0C] border border-[#262626] p-5 rounded-xs shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#262626] pb-3">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
              Retail Banking Compliance Blueprints
            </h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-[#050505] border border-[#262626] rounded-xs space-y-1">
              <span className="font-semibold text-rose-300 text-[11px] block">
                1. Customer Onboarding (AML/KYC vs Art. 17)
              </span>
              <p className="text-[#8C8C8C] text-[11px]">
                AML/KYC documents are held under legal obligations. Erasure of core KYC/AML transactional data is rejected under Art. 17(3)(b) statutory exemptions, but non-essential marketing profiling is purged.
              </p>
            </div>

            <div className="p-3 bg-[#050505] border border-[#262626] rounded-xs space-y-1">
              <span className="font-semibold text-cyan-300 text-[11px] block">
                2. Credit Decisioning (Art. 22 Overrides)
              </span>
              <p className="text-[#8C8C8C] text-[11px]">
                Automated credit scoring triggers Art. 22 rights. Operations provides human review mechanisms and clear logic disclosures if loan terms or accounts are denied automatically.
              </p>
            </div>

            <div className="p-3 bg-[#050505] border border-[#262626] rounded-xs space-y-1">
              <span className="font-semibold text-amber-300 text-[11px] block">
                3. Rectification & Freeze (Art. 16 & 18)
              </span>
              <p className="text-[#8C8C8C] text-[11px]">
                When an applicant disputes income or credit details, automated processing is temporarily suppressed/restricted while updated documentation is validated.
              </p>
            </div>

            <div className="p-3 bg-[#050505] border border-[#262626] rounded-xs space-y-1">
              <span className="font-semibold text-purple-300 text-[11px] block">
                4. Downstream Propagation (Art. 19)
              </span>
              <p className="text-[#8C8C8C] text-[11px]">
                Operations notifies integrated credit reference bureaus (SCHUFA, Creditreform) and fraud registries upon executing rectification or erasure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
