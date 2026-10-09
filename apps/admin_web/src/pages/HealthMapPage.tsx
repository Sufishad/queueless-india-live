import React, { useState } from 'react';
import { 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Filter, 
  Search,
  Globe2
} from 'lucide-react';
import { BranchHealth, RegionalZone, BranchHealthStatus } from '../types';

interface HealthMapPageProps {
  branches: BranchHealth[];
}

export const HealthMapPage: React.FC<HealthMapPageProps> = ({ branches }) => {
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredBranches = branches.filter((b) => {
    const matchesZone = selectedZone === 'ALL' || b.zone === selectedZone;
    const matchesStatus = selectedStatus === 'ALL' || b.status === selectedStatus;
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesZone && matchesStatus && matchesSearch;
  });

  const zoneSummary = {
    South: branches.filter((b) => b.zone === 'South'),
    West: branches.filter((b) => b.zone === 'West'),
    North: branches.filter((b) => b.zone === 'North'),
  };

  const getStatusBadge = (status: BranchHealthStatus) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle size={12} />
            <span>HEALTHY</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle size={12} />
            <span>DEGRADED</span>
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle size={12} />
            <span>CRITICAL</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone Aggregation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['South', 'West', 'North'] as RegionalZone[]).map((zone) => {
          const list = zoneSummary[zone];
          const totalQueues = list.reduce((acc, curr) => acc + curr.activeQueues, 0);
          const totalWaiting = list.reduce((acc, curr) => acc + curr.tokensWaiting, 0);
          const avgLatency =
            list.length > 0
              ? Math.round(list.reduce((acc, curr) => acc + curr.p95LatencyMs, 0) / list.length)
              : 0;

          return (
            <div
              key={zone}
              onClick={() => setSelectedZone(selectedZone === zone ? 'ALL' : zone)}
              className={`cursor-pointer bg-[#121A2B] rounded-xl p-5 border transition-all ${
                selectedZone === zone
                  ? 'border-[#F97316] ring-1 ring-[#F97316]/50 shadow-lg'
                  : 'border-[#1E293B] hover:border-[#1E293B]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Globe2 size={18} className="text-[#F97316]" />
                  <h3 className="font-bold text-white text-base">
                    Zone {zone}
                  </h3>
                </div>
                <span className="text-xs text-[#8B98AD] bg-[#1E293B] px-2 py-0.5 rounded">
                  {list.length} Pilot Branches
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[#1E293B]">
                <div>
                  <div className="text-[11px] text-[#8B98AD]">Active Queues</div>
                  <div className="text-lg font-bold text-white mt-0.5">{totalQueues}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8B98AD]">Waiting Now</div>
                  <div className="text-lg font-bold text-[#F97316] mt-0.5">{totalWaiting}</div>
                </div>
                <div>
                  <div className="text-[11px] text-[#8B98AD]">Avg p95 Latency</div>
                  <div className="text-lg font-bold text-[#10B981] mt-0.5">{avgLatency} ms</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-3 top-3 text-[#8B98AD]" />
            <input
              type="text"
              placeholder="Filter by branch or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#8B98AD] focus:outline-none focus:border-[#F97316]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter size={14} className="text-[#8B98AD]" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
            >
              <option value="ALL">All Zones</option>
              <option value="South">South Zone</option>
              <option value="West">West Zone</option>
              <option value="North">North Zone</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F97316]"
            >
              <option value="ALL">All Statuses</option>
              <option value="HEALTHY">Healthy Only</option>
              <option value="DEGRADED">Degraded Only</option>
              <option value="CRITICAL">Critical Only</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-[#8B98AD]">
          Showing <span className="text-white font-semibold">{filteredBranches.length}</span> of {branches.length} branches
        </div>
      </div>

      {/* Health Map Table */}
      <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0F1626] border-b border-[#1E293B] text-[#8B98AD] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Branch Details</th>
                <th className="py-3.5 px-4">Region Zone</th>
                <th className="py-3.5 px-4">Queues / Counters</th>
                <th className="py-3.5 px-4">Tokens In Queue</th>
                <th className="py-3.5 px-4">p95 Latency</th>
                <th className="py-3.5 px-4">Redis Cache Hit</th>
                <th className="py-3.5 px-4">Heartbeat</th>
                <th className="py-3.5 px-4 text-right">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/60 text-white">
              {filteredBranches.map((b) => (
                <tr key={b.id} className="hover:bg-[#151F33]/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{b.name}</div>
                    <div className="text-[11px] text-[#8B98AD] flex items-center space-x-1 mt-0.5">
                      <MapPin size={11} className="text-[#F97316]" />
                      <span>{b.city}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-[#1E293B] text-[#8B98AD] font-medium text-[11px]">
                      Zone {b.zone}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium">
                    {b.activeQueues} Active
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#F97316]">
                    {b.tokensWaiting} waiting
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`font-mono font-medium ${b.p95LatencyMs < 150 ? 'text-[#10B981]' : 'text-amber-400'}`}>
                      {b.p95LatencyMs} ms
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#8B98AD]">
                    {(b.cacheHitRatio * 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5 px-4 text-[#8B98AD] font-mono text-[11px]">
                    {b.lastHeartbeat}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {getStatusBadge(b.status)}
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
