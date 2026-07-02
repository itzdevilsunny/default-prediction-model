import React, { useEffect, useState } from 'react';
import { fetchAuditLogs } from '../lib/supabase';
import { ShieldCheck, Search, Calendar, FileText, ArrowRight, Loader2 } from 'lucide-react';

interface AuditLogViewerProps {
  onInspectLoan: (loanId: string) => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onInspectLoan }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    return (
      log.loan_id.toLowerCase().includes(q) ||
      log.analyst_name.toLowerCase().includes(q) ||
      log.notes.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
          <Loader2 className="h-10 w-10 text-zinc-950 animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-emerald-600" />
            Compliance & System Audits
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Review immutable ledger override activities, manual underwriting approvals, and outcome resolutions.
          </p>
        </div>
        
        {/* Search */}
        <div className="relative mt-4 md:mt-0 w-full md:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search audits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950"
          />
        </div>
      </div>

      {/* Audit Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card p-5 bg-zinc-50/20 border-zinc-200">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Audited Events</span>
          <span className="text-2xl font-extrabold block mt-1 font-mono text-zinc-900">{logs.length}</span>
        </div>
        <div className="premium-card p-5 bg-zinc-50/20 border-zinc-200">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Manual Overrides</span>
          <span className="text-2xl font-extrabold block mt-1 font-mono text-zinc-900">
            {logs.filter(l => l.action === 'review' || l.action === 'override').length}
          </span>
        </div>
        <div className="premium-card p-5 bg-emerald-50/20 border-emerald-100">
          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Compliance Registry</span>
          <span className="text-xs text-emerald-800 font-medium block mt-1">Immutable Supabase Storage</span>
        </div>
      </div>

      {/* Grid Table */}
      <div className="premium-card bg-white overflow-hidden">
        {filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-4">Loan Reference</th>
                  <th className="py-4 px-4">Analyst Name</th>
                  <th className="py-4 px-4 text-center">Action</th>
                  <th className="py-4 px-4 text-center">Override Risk</th>
                  <th className="py-4 px-5">Override Notes / Justification</th>
                  <th className="py-4 px-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="py-4 px-5 whitespace-nowrap text-zinc-500 font-mono flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      {formatDate(log.created_at)}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-zinc-900">{log.loan_id}</td>
                    <td className="py-4 px-4 font-semibold text-zinc-700">{log.analyst_name}</td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action === 'outcome_resolution' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {log.action === 'outcome_resolution' ? 'Outcome Set' : 'Risk Override'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        log.risk_override === 'High' ? 'bg-rose-100 text-rose-700' :
                        log.risk_override === 'Medium' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {log.risk_override}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-zinc-600 max-w-sm font-medium leading-relaxed italic truncate" title={log.notes}>
                      "{log.notes}"
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => onInspectLoan(log.loan_id)}
                        className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-950 font-bold hover:underline"
                      >
                        Inspect
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-400 space-y-2">
            <FileText className="h-8 w-8 text-zinc-300 mx-auto" />
            <p className="font-semibold text-sm">No audit logs found</p>
            <p className="text-xs">Adjust your search term or log manual overrides in the details pane.</p>
          </div>
        )}
      </div>
    </div>
  );
};
