import React from 'react';
import { PageTab } from '../types';
import { Wifi, RefreshCw, Bell, User } from 'lucide-react';

interface HeaderProps {
  currentTab: PageTab;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastSyncTime: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onRefresh,
  isRefreshing,
  lastSyncTime,
}) => {
  const titles: Record<PageTab, { title: string; subtitle: string }> = {
    overview: {
      title: 'Platform Overview & Live Metrics',
      subtitle: 'Real-time telemetry across Indian pilot branches and active consumer tokens',
    },
    'health-map': {
      title: 'Multi-Region Branch Health Map',
      subtitle: 'Live latency, Redis cache performance, and queue states across South, West, and North zones',
    },
    verification: {
      title: 'Merchant Verification & Compliance Workflow',
      subtitle: 'KYC, GSTIN, and DPDP Data-Safety validation audit for merchant partners',
    },
    'kill-switch': {
      title: 'Emergency Branch Kill-Switch & Broadcasting',
      subtitle: 'Instant circuit-breaker controls with real-time customer WebSocket/FCM alerts',
    },
    'audit-logs': {
      title: 'DPDP Act 2023 Audit & Security Logs',
      subtitle: 'Immutable record of merchant operations, administrative overrides, and rate limit defenses',
    },
  };

  const { title, subtitle } = titles[currentTab];

  return (
    <header className="h-20 bg-[#0F1626]/80 backdrop-blur-md border-b border-[#1E293B] px-8 flex items-center justify-between z-10 sticky top-0">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center space-x-3">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-[#10B981] border border-emerald-500/30 flex items-center space-x-1">
            <Wifi size={12} className="animate-pulse" />
            <span>STAGING CLUSTER</span>
          </span>
        </h1>
        <p className="text-xs text-[#8B98AD] mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-4">
        {/* Sync Status Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#151F33] border border-[#1E293B] text-xs text-[#8B98AD] hover:text-white hover:border-[#F97316]/50 transition-colors"
          title="Manual Refresh"
        >
          <RefreshCw
            size={13}
            className={`${isRefreshing ? 'animate-spin text-[#F97316]' : 'text-[#8B98AD]'}`}
          />
          <span>Sync: {lastSyncTime}</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            className="w-9 h-9 rounded-lg bg-[#151F33] border border-[#1E293B] flex items-center justify-center text-[#8B98AD] hover:text-white hover:border-[#1E293B] transition-colors"
            title="System Alerts"
          >
            <Bell size={16} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#F97316]" />
          </button>
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center space-x-3 pl-2 border-l border-[#1E293B]">
          <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-[#F97316]/40 flex items-center justify-center text-[#F97316]">
            <User size={18} />
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white">Super Admin</div>
            <div className="text-[10px] text-[#8B98AD]">secops@queueless.in</div>
          </div>
        </div>
      </div>
    </header>
  );
};
