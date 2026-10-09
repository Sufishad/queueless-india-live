import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Ticket, 
  Clock, 
  TrendingUp, 
  Zap,
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import { OverviewMetrics } from '../types';

interface OverviewPageProps {
  metrics: OverviewMetrics;
}

interface LiveEvent {
  id: string;
  time: string;
  branch: string;
  type: 'TOKEN_ISSUED' | 'TOKEN_CALLED' | 'TOKEN_COMPLETED' | 'QUEUE_PAUSED';
  tokenNumber: number;
  badgeColor: string;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ metrics }) => {
  const [liveTokensCount, setLiveTokensCount] = useState(metrics.tokensIssuedTotal);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([
    {
      id: 'e1',
      time: 'Just now',
      branch: 'Apollo Clinic Indiranagar (BLR)',
      type: 'TOKEN_CALLED',
      tokenNumber: 14,
      badgeColor: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    },
    {
      id: 'e2',
      time: '12s ago',
      branch: 'Lilavati OPD Bandra (MUM)',
      type: 'TOKEN_ISSUED',
      tokenNumber: 87,
      badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    },
    {
      id: 'e3',
      time: '34s ago',
      branch: 'RTO Central KA-01 (BLR)',
      type: 'TOKEN_COMPLETED',
      tokenNumber: 52,
      badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    },
    {
      id: 'e4',
      time: '51s ago',
      branch: 'Poona Hospital Diagnostic (PUN)',
      type: 'TOKEN_CALLED',
      tokenNumber: 29,
      badgeColor: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    },
    {
      id: 'e5',
      time: '1m ago',
      branch: "Dr. Mohan's Diabetes Koramangala (BLR)",
      type: 'TOKEN_ISSUED',
      tokenNumber: 41,
      badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    },
  ]);

  // Simulate real-time WebSocket ticker updates every 6 seconds
  useEffect(() => {
    const branches = [
      'Apollo Clinic Indiranagar (BLR)',
      'Lilavati OPD Bandra (MUM)',
      'Poona Hospital Diagnostic (PUN)',
      'RTO Central KA-01 (BLR)',
      "Dr. Mohan's Diabetes Koramangala (BLR)",
    ];

    const interval = setInterval(() => {
      setLiveTokensCount((prev) => prev + 1);
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      const randomToken = Math.floor(Math.random() * 90) + 10;
      const isCalled = Math.random() > 0.5;

      const newEvent: LiveEvent = {
        id: `ev-${Date.now()}`,
        time: 'Just now',
        branch: randomBranch,
        type: isCalled ? 'TOKEN_CALLED' : 'TOKEN_ISSUED',
        tokenNumber: randomToken,
        badgeColor: isCalled
          ? 'text-orange-400 bg-orange-400/10 border-orange-400/30'
          : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
      };

      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 5)]);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const cards = [
    {
      title: 'Registered Businesses',
      value: metrics.registeredBusinesses.toLocaleString('en-IN'),
      unit: 'Pilots Active',
      subtext: '+3 awaiting KYC verification',
      icon: Building2,
      accent: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Active Queues Today',
      value: metrics.activeQueuesToday.toString(),
      unit: 'Operational',
      subtext: 'Across 5 branches (BLR, MUM, PUN)',
      icon: Layers,
      accent: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
      iconColor: 'text-[#10B981]',
    },
    {
      title: 'Tokens Issued Today',
      value: liveTokensCount.toLocaleString('en-IN'),
      unit: 'Real-time WS',
      subtext: '+14% vs yesterday benchmark',
      icon: Ticket,
      accent: 'from-orange-500/20 to-orange-600/10 border-orange-500/30',
      iconColor: 'text-[#F97316]',
      isLive: true,
    },
    {
      title: 'Customer Hours Saved',
      value: `${metrics.customerHoursSaved.toLocaleString('en-IN')} hrs`,
      unit: 'Calculated',
      subtext: '~12 min physical wait avoided/token',
      icon: Clock,
      accent: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`bg-[#121A2B] rounded-xl p-5 border border-[#1E293B] shadow-sm relative overflow-hidden flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#8B98AD] uppercase tracking-wider">
                    {card.title}
                  </p>
                  <div className="flex items-baseline space-x-2 mt-2">
                    <span className="text-2xl xl:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
                      {card.value}
                    </span>
                    <span className="text-xs font-medium text-[#8B98AD]">
                      {card.unit}
                    </span>
                  </div>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center border`}
                >
                  <Icon size={22} className={card.iconColor} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#1E293B]/60 flex items-center justify-between text-xs text-[#8B98AD]">
                <span>{card.subtext}</span>
                {card.isLive && (
                  <span className="flex items-center space-x-1 text-[#10B981] font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                    <span>Live WS</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Health & Live WebSocket Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Event Feed */}
        <div className="lg:col-span-2 bg-[#121A2B] border border-[#1E293B] rounded-xl p-5">
          <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
            <div className="flex items-center space-x-2">
              <Zap size={18} className="text-[#F97316]" />
              <h2 className="text-base font-bold text-white">Live Event Stream</h2>
              <span className="text-xs text-[#8B98AD]">
                (WebSocket Broadcast Channel)
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Redis Pub/Sub Active</span>
            </div>
          </div>

          <div className="mt-4 divide-y divide-[#1E293B]/60">
            {liveEvents.map((ev) => (
              <div
                key={ev.id}
                className="py-3 flex items-center justify-between hover:bg-[#151F33]/50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1E293B] flex items-center justify-center text-xs font-mono font-bold text-white border border-[#1E293B]">
                    #{ev.tokenNumber}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F8FAFC]">
                      {ev.branch}
                    </div>
                    <div className="text-xs text-[#8B98AD]">{ev.time}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-md border font-semibold tracking-wide ${ev.badgeColor}`}
                  >
                    {ev.type === 'TOKEN_CALLED' && 'NOW CALLING'}
                    {ev.type === 'TOKEN_ISSUED' && 'TOKEN ISSUED'}
                    {ev.type === 'TOKEN_COMPLETED' && 'SERVED'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs text-[#8B98AD]">
            <span>Streaming live from 5 pilot nodes &bull; P95 Latency: 118ms</span>
            <span className="text-[#F97316] hover:underline cursor-pointer flex items-center space-x-1">
              <span>View full feed</span>
              <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* System Load & SLA Benchmarks */}
        <div className="bg-[#121A2B] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 pb-4 border-b border-[#1E293B]">
              <TrendingUp size={18} className="text-[#10B981]" />
              <h2 className="text-base font-bold text-white">Staging SLA Health</h2>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#8B98AD]">Target Concurrency</span>
                  <span className="text-white">10,000 VUs (100% Passed)</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-2 rounded-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#8B98AD]">HTTP P95 Latency (Target &lt;200ms)</span>
                  <span className="text-[#10B981] font-mono">118 ms</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-2 rounded-full w-[59%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#8B98AD]">Error Rate (Target &lt;0.1%)</span>
                  <span className="text-[#10B981] font-mono">0.02%</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#10B981] h-2 rounded-full w-[20%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-[#8B98AD]">Redis Snapshot Cache Hit Rate</span>
                  <span className="text-[#F97316] font-mono">92.4%</span>
                </div>
                <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#F97316] h-2 rounded-full w-[92%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#1E293B] bg-[#0B0F19]/40 p-3 rounded-lg text-xs space-y-2">
            <div className="flex items-center space-x-2 text-white">
              <CheckCircle2 size={14} className="text-[#10B981]" />
              <span>pgBouncer Connection Pool: Healthy</span>
            </div>
            <div className="flex items-center space-x-2 text-white">
              <CheckCircle2 size={14} className="text-[#10B981]" />
              <span>DPDP Nightly Purge: Scheduled (02:00 IST)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
