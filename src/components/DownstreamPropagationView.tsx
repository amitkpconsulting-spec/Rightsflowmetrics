import React, { useState, useEffect } from 'react';
import {
  Send,
  Radio,
  CheckCircle2,
  Clock,
  RefreshCw,
  Building2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { DownstreamNotification } from '../types';
import { api } from '../services/api';

export const DownstreamPropagationView: React.FC = () => {
  const [notifications, setNotifications] = useState<DownstreamNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await api.getDownstream();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load downstream notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDispatch = async (id: string) => {
    try {
      setDispatchingId(id);
      await api.dispatchDownstream(id);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setDispatchingId(null);
    }
  };

  const queuedCount = notifications.filter((n) => n.dispatch_status === 'Queued').length;
  const dispatchedCount = notifications.filter((n) => n.dispatch_status === 'Dispatched').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0C0C0C] border border-[#262626] p-5 rounded-xs shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Send className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white font-mono">
              GDPR Article 19 Downstream Recipient Propagation
            </h2>
          </div>
          <p className="text-xs text-[#8C8C8C] max-w-3xl leading-relaxed">
            The controller shall communicate any rectification (Art. 16), erasure (Art. 17) or restriction of processing (Art. 18) to each recipient to whom the personal data have been disclosed (Credit Reference Bureaus, Fraud Registries, Marketing CRM Nodes, Cloud Storage).
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-[#161616] hover:bg-[#252525] text-[#D1D1D1] rounded-xs border border-[#333333] transition self-start md:self-auto"
          title="Refresh Propagation Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs">
          <span className="text-xs text-[#8C8C8C] font-mono">Total Propagation Nodes</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">{notifications.length}</div>
        </div>
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs">
          <span className="text-xs text-[#8C8C8C] font-mono">Queued for Dispatch</span>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">{queuedCount}</div>
        </div>
        <div className="bg-[#0C0C0C] border border-[#262626] p-4 rounded-xs">
          <span className="text-xs text-[#8C8C8C] font-mono">Dispatched & Acknowledged</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">{dispatchedCount}</div>
        </div>
      </div>

      {/* Propagation Table */}
      <div className="bg-[#0C0C0C] border border-[#262626] rounded-xs shadow-[3px_3px_0px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#050505] border-b border-[#262626] font-mono text-[11px] text-[#8C8C8C]">
              <tr>
                <th className="py-3 px-4">Ticket Ref</th>
                <th className="py-3 px-4">Recipient Institution & Type</th>
                <th className="py-3 px-4">Notification Directive</th>
                <th className="py-3 px-4">Payload & Instruction Summary</th>
                <th className="py-3 px-4 text-right">Dispatch Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666666]">
                    Loading downstream propagation register...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#666666]">
                    No downstream recipient notifications recorded.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-[#161616]/90 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-white bg-[#161616] px-2 py-0.5 rounded border border-[#333333]">
                        {n.ticket_ref}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[#E0E0E0] block text-xs">
                          {n.recipient_name}
                        </span>
                        <span className="text-[10px] text-[#8C8C8C]">
                          {n.recipient_type}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                          n.notification_type === 'Erasure Instruction'
                            ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                            : n.notification_type === 'Rectification Notice'
                            ? 'bg-blue-950/70 text-blue-300 border-blue-800'
                            : 'bg-amber-950/70 text-amber-300 border-amber-800'
                        }`}
                      >
                        {n.notification_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[#D1D1D1] max-w-sm truncate">
                      {n.payload_summary}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            n.dispatch_status === 'Dispatched'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {n.dispatch_status}
                        </span>

                        {n.dispatch_status === 'Queued' && (
                          <button
                            onClick={() => handleDispatch(n.id)}
                            disabled={dispatchingId === n.id}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold transition"
                          >
                            {dispatchingId === n.id ? 'Sending...' : 'Dispatch'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
