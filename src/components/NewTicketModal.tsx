import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  Info
} from 'lucide-react';
import { Subject, RightType, PriorityLevel, EntitlementAssessment } from '../types';
import { api } from '../services/api';

interface NewTicketModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewTicketModal: React.FC<NewTicketModalProps> = ({ onClose, onSuccess }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [rightType, setRightType] = useState<RightType>('Erasure (Art. 17)');
  const [priority, setPriority] = useState<PriorityLevel>('Standard');
  const [assignedOfficer, setAssignedOfficer] = useState('DPO Officer K. Schmidt');
  const [sector, setSector] = useState('Retail Banking');
  const [notes, setNotes] = useState('');
  const [isDirectMarketing, setIsDirectMarketing] = useState(false);

  const [assessment, setAssessment] = useState<EntitlementAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load subjects
  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setIsLoading(true);
        const data = await api.getSubjects();
        setSubjects(data);
        if (data.length > 0) {
          setSelectedSubjectId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSubjects();
  }, []);

  // Recalculate statutory entitlement preview whenever rightType or isDirectMarketing changes
  useEffect(() => {
    const evaluate = async () => {
      try {
        const res = await api.evaluateEntitlement({
          rightType,
          lawfulBasis: 'Legal Obligation',
          isDirectMarketing
        });
        setAssessment(res);
      } catch (err) {
        console.error('Failed to evaluate entitlement:', err);
      }
    };
    evaluate();
  }, [rightType, isDirectMarketing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) {
      setErrorMessage('Please select a data subject.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await api.createTicket({
        subjectId: selectedSubjectId,
        rightType,
        priority,
        assignedOfficer,
        notes,
        isDirectMarketing,
        sector
      });
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0C0C0C] border border-[#303030] rounded-none w-full max-w-2xl shadow-2xl overflow-hidden text-[#E0E0E0] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#050505] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white font-mono">
              Statutory DSR / DSAR Request Intake
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8C8C8C] hover:text-white rounded-xs hover:bg-[#161616] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xs text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Subject Picker */}
          <div>
            <label className="block text-xs font-mono font-semibold text-[#8C8C8C] mb-1.5">
              1. Select Data Subject (Customer Master / CIF)
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.cif_number} - {s.full_name} ({s.customer_segment} • {s.kyc_status})
                </option>
              ))}
            </select>
          </div>

          {/* GDPR Right Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-[#8C8C8C] mb-1.5">
                2. GDPR Right Exercised
              </label>
              <select
                value={rightType}
                onChange={(e: any) => setRightType(e.target.value)}
                className="w-full px-3 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
              >
                <option value="Erasure (Art. 17)">Erasure (Art. 17)</option>
                <option value="Access (Art. 15)">Access (Art. 15)</option>
                <option value="Rectification (Art. 16)">Rectification (Art. 16)</option>
                <option value="Restriction (Art. 18)">Restriction (Art. 18)</option>
                <option value="Portability (Art. 20)">Portability (Art. 20)</option>
                <option value="Objection (Art. 21)">Objection (Art. 21)</option>
                <option value="Automated Decision Review (Art. 22)">Art. 22 Automated Decision Review</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-[#8C8C8C] mb-1.5">
                3. Operational Priority
              </label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
              >
                <option value="Standard">Standard (30-day standard SLA)</option>
                <option value="High (SLA Warning)">High (SLA Warning)</option>
                <option value="Critical (SLA Escalated)">Critical (SLA Escalated)</option>
              </select>
            </div>
          </div>

          {/* Direct Marketing checkbox for Art. 21 */}
          {rightType === 'Objection (Art. 21)' && (
            <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xs flex items-center space-x-2.5">
              <input
                type="checkbox"
                id="dm-check"
                checked={isDirectMarketing}
                onChange={(e) => setIsDirectMarketing(e.target.checked)}
                className="rounded bg-[#0C0C0C] border-[#333333] text-purple-600 focus:ring-0 w-4 h-4"
              />
              <label htmlFor="dm-check" className="text-xs text-purple-200 font-medium cursor-pointer">
                Targeting Direct Marketing / Profiling (Triggers Absolute Suppression under Art. 21(2))
              </label>
            </div>
          )}

          {/* LIVE STATUTORY ENTITLEMENT ASSESSMENT PREVIEW */}
          {assessment && (
            <div className="bg-[#050505] border border-[#262626] p-4 rounded-xs space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-[#8C8C8C]">
                <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  Statutory Entitlement Engine Preview:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    assessment.status === 'Fully Granted'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : assessment.status === 'Lawfully Blocked'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {assessment.status}
                </span>
              </div>

              <p className="text-[#D1D1D1] text-[11px] leading-relaxed">
                {assessment.legalJustification}
              </p>

              <div className="text-[10px] text-[#666666] pt-1 border-t border-[#242424]">
                Statutory Ground: {assessment.statutoryReference} • Scenario Note: {assessment.bankingScenarioNote}
              </div>
            </div>
          )}

          {/* Assigned Officer & Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-semibold text-[#8C8C8C] mb-1.5">
                4. Assigned Compliance Officer
              </label>
              <input
                type="text"
                value={assignedOfficer}
                onChange={(e) => setAssignedOfficer(e.target.value)}
                className="w-full px-3 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-[#8C8C8C] mb-1.5">
                5. Sector Profile
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
              >
                <option value="Retail Banking">Retail Banking</option>
                <option value="Corporate Banking">Corporate Banking</option>
                <option value="Insurance">Insurance</option>
                <option value="Principle Finance">Principle Finance</option>
                <option value="Transaction Banking">Transaction Banking</option>
                <option value="Properties">Properties</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-[#8C8C8C] mb-1.5">
              6. Intake Context & Initial Channel Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via authenticated online banking portal with 2FA token verified..."
              className="w-full px-3 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="border-t border-[#262626] pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#161616] hover:bg-[#252525] text-[#D1D1D1] rounded-xs text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xs text-xs font-semibold shadow-[2px_2px_0px_0px_#000000] shadow-emerald-950/50 transition cursor-pointer"
            >
              {isSubmitting ? 'Recording Ticket...' : 'Initiate Statutory DSR Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
