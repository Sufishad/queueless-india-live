import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  Info, 
  Lock
} from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogsPageProps {
  logs: AuditLogEntry[];
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ logs }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    const matchesCat = selectedCategory === 'ALL' || log.category === selectedCategory;
    const matchesSev = selectedSeverity === 'ALL' || log.severity === selectedSeverity;
    const matchesSearch =
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSev && matchesSearch;
  });

  const getSeverityBadge = (severity: 'INFO' | 'WARN' | 'SECURITY') => {
    switch (severity) {
      case 'INFO':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Info size={11} />
            <span>INFO</span>
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={11} />
            <span>WARN</span>
          </span>
        );
      case 'SECURITY':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <Lock size={11} />
            <span>SECURITY</span>
          </span>
        );
    }
  };

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Category', 'Severity', 'Actor', 'Action', 'Target', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.category,
      l.severity,
      `"${l.actor}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      `"${l.details.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `queueless_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#F97316]">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">DPDP Act 2023 Compliance &amp; Security Audit Trail</h2>
            <p className="text-xs text-[#8B98AD]">
              Immutable event log with automatic PII redaction (Mobile masked to 98XXXX3210, Bearer tokens scrubbed)
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[#151F33] border border-[#1E293B] text-xs text-white hover:border-[#F97316] transition-colors"
        >
          <Download size={14} className="text-[#F97316]" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={15} className="absolute left-3 top-3 text-[#8B98AD]" />
            <input
              type="text"
              placeholder="Search actor, action, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#8B98AD] focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-[#8B98AD]" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
            >
              <option value="ALL">All Categories</option>
              <option value="MERCHANT_ACTION">Merchant Actions</option>
              <option value="ADMIN_CHANGE">Admin Changes</option>
              <option value="RATE_LIMIT_VIOLATION">Rate Limit Violations</option>
              <option value="DPDP_ERASURE">DPDP Right-to-Erasure</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
            >
              <option value="ALL">All Severities</option>
              <option value="INFO">INFO Only</option>
              <option value="WARN">WARN Only</option>
              <option value="SECURITY">SECURITY Only</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-[#8B98AD]">
          Showing <span className="text-white font-semibold">{filteredLogs.length}</span> audit records
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1626] border-b border-[#1E293B] text-[#8B98AD] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Severity</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Actor (Masked PII)</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Resource</th>
                <th className="py-3.5 px-4">Details &amp; Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 text-white font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#151F33]/50 transition-colors">
                  <td className="py-3.5 px-4 text-[#8B98AD] whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getSeverityBadge(log.severity)}
                  </td>
                  <td className="py-3.5 px-4 text-[#8B98AD]">
                    {log.category}
                  </td>
                  <td className="py-3.5 px-4 text-[#F97316]">
                    {log.actor}
                  </td>
                  <td className="py-3.5 px-4 text-white font-semibold">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 text-[#8B98AD]">
                    {log.target}
                  </td>
                  <td className="py-3.5 px-4 text-[#F8FAFC] max-w-xs truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
