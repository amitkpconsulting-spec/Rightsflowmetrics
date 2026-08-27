import React, { useState, useEffect } from 'react';
import {
  Ban,
  Lock,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { SuppressionRecord, Subject } from '../types';
import { api } from '../services/api';

export const SuppressionRegisterView: React.FC = () => {
  const [suppressions, setSuppressions] = useState<SuppressionRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [identifierType, setIdentifierType] = useState<'CIF' | 'Email' | 'Phone' | 'National ID'>('CIF');
  const [identifierValue, setIdentifierValue] = useState('');
  const [suppressionType, setSuppressionType] = useState<
    | 'Art. 21 Direct Marketing Opt-Out (Absolute)'
    | 'Art. 18 Temporary Processing Freeze (Disputed Accuracy)'
    | 'Art. 18 Unlawful Processing Freeze'
    | 'Legal Hold Protection'
  >('Art. 21 Direct Marketing Opt-Out (Absolute)');
  const [lawfulGrounds, setLawfulGrounds] = useState('GDPR Art. 21(2) - Absolute Direct Marketing Objection');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [supList, subList] = await Promise.all([
        api.getSuppressions(),
        api.getSubjects()
      ]);
      setSuppressions(supList);
      setSubjects(subList);
      if (subList.length > 0) {
        setSelectedSubjectId(subList[0].id);
        setIdentifierValue(subList[0].cif_number);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleActive = async (id: string) => {
    try {
      await api.toggleSuppression(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSuppression({
        subjectId: selectedSubjectId,
        identifierType,
        identifierValue,
        suppressionType,
        lawfulGrounds,
        createdBy: 'DPO Officer K. Schmidt'
      });
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = suppressions.filter(
    (s) =>
      s.identifier_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cif_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.full_name && s.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0C0C0C] border border-[#262626] p-5 rounded-xs shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Ban className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white font-mono">
              Suppression Register & Temporary Processing Freeze Engine
            </h2>
          </div>
          <p className="text-xs text-[#8C8C8C] max-w-3xl leading-relaxed">
            Centralized enforcement register for GDPR Art. 21 Direct Marketing Opt-Outs and Art. 18 Temporary Processing Freezes. Outbound email servers, marketing automation, and credit models query this register via local IPC before processing.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xs text-xs font-semibold shadow transition flex items-center space-x-1.5 cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Add Suppression Record</span>
        </button>
      </div>

      {/* Search & Stats */}
      <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search suppression register by CIF, name, or identifier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#050505] border border-[#262626] rounded-xs text-xs text-[#E0E0E0] font-mono focus:outline-hidden focus:border-purple-500"
          />
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-[#8C8C8C]">
          <span>Total Records: <strong className="text-white">{suppressions.length}</strong></span>
          <span>Active Freezes: <strong className="text-emerald-400">{suppressions.filter((s) => s.active === 1).length}</strong></span>
        </div>
      </div>

      {/* Suppressions Table */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050505] border-b border-[#262626] font-mono text-[11px] text-[#8C8C8C]">
              <tr>
                <th className="py-3 px-4">Subject & Identifier</th>
                <th className="py-3 px-4">Suppression Ground & Type</th>
                <th className="py-3 px-4">Effective Since</th>
                <th className="py-3 px-4">Authorized By</th>
                <th className="py-3 px-4 text-center">Enforcement State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666666]">
                    Loading suppression register...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666666]">
                    No suppression records matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#161616]/90 transition">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#E0E0E0] block text-xs">
                        {item.full_name || 'Customer Master'}
                      </span>
                      <span className="text-[10px] text-[#8C8C8C]">
                        {item.identifier_type}: <strong className="text-[#D1D1D1]">{item.identifier_value}</strong>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border mb-1 ${
                          item.suppression_type.includes('Art. 21')
                            ? 'bg-purple-950/70 text-purple-300 border-purple-800'
                            : 'bg-amber-950/70 text-amber-300 border-amber-800'
                        }`}
                      >
                        {item.suppression_type}
                      </span>
                      <div className="text-[10px] text-[#8C8C8C] truncate max-w-sm">
                        {item.lawful_grounds}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#D1D1D1]">
                      <div>{new Date(item.effective_from).toLocaleDateString('en-GB')}</div>
                      <span className="text-[10px] text-[#666666]">
                        {item.expires_at ? `Exp: ${new Date(item.expires_at).toLocaleDateString('en-GB')}` : 'Permanent Freeze'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#8C8C8C]">
                      {item.created_by}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold border flex items-center justify-center space-x-1 mx-auto transition ${
                          item.active === 1
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-[#161616] text-[#8C8C8C] border-[#333333] hover:bg-[#252525]'
                        }`}
                      >
                        {item.active === 1 ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ACTIVE ENFORCED</span>
                          </>
                        ) : (
                          <span>SUSPENDED</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#050505]/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0C0C0C] border border-[#333333] rounded-none w-full max-w-lg shadow-2xl p-6 space-y-4 text-[#E0E0E0]">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="font-bold text-white font-mono flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>+ Enforce Suppression / Processing Freeze</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8C8C8C] hover:text-white">
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSuppression} className="space-y-3.5 text-xs font-mono">
              <div>
                <label className="block text-[#8C8C8C] mb-1">Target Customer</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const sub = subjects.find((s) => s.id === e.target.value);
                    if (sub) setIdentifierValue(sub.cif_number);
                  }}
                  className="w-full p-2 bg-[#050505] border border-[#262626] rounded text-[#E0E0E0]"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.cif_number} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8C8C8C] mb-1">Identifier Type</label>
                  <select
                    value={identifierType}
                    onChange={(e: any) => setIdentifierType(e.target.value)}
                    className="w-full p-2 bg-[#050505] border border-[#262626] rounded text-[#E0E0E0]"
                  >
                    <option value="CIF">CIF Number</option>
                    <option value="Email">Email Address</option>
                    <option value="Phone">Phone Number</option>
                    <option value="National ID">National ID</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8C8C8C] mb-1">Identifier Value</label>
                  <input
                    type="text"
                    value={identifierValue}
                    onChange={(e) => setIdentifierValue(e.target.value)}
                    className="w-full p-2 bg-[#050505] border border-[#262626] rounded text-[#E0E0E0]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1">Suppression Rule Type</label>
                <select
                  value={suppressionType}
                  onChange={(e: any) => setSuppressionType(e.target.value)}
                  className="w-full p-2 bg-[#050505] border border-[#262626] rounded text-[#E0E0E0]"
                >
                  <option value="Art. 21 Direct Marketing Opt-Out (Absolute)">
                    Art. 21 Direct Marketing Opt-Out (Absolute)
                  </option>
                  <option value="Art. 18 Temporary Processing Freeze (Disputed Accuracy)">
                    Art. 18 Temporary Processing Freeze (Disputed Accuracy)
                  </option>
                  <option value="Art. 18 Unlawful Processing Freeze">
                    Art. 18 Unlawful Processing Freeze
                  </option>
                  <option value="Legal Hold Protection">
                    Legal Hold Protection
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1">Statutory Grounds & Justification</label>
                <input
                  type="text"
                  value={lawfulGrounds}
                  onChange={(e) => setLawfulGrounds(e.target.value)}
                  className="w-full p-2 bg-[#050505] border border-[#262626] rounded text-[#E0E0E0]"
                  required
                />
              </div>

              <div className="border-t border-[#262626] pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-[#161616] text-[#D1D1D1] rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold"
                >
                  Enforce Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
