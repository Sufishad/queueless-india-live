import React from 'react';
import { PageTab } from '../types';
import { 
  LayoutDashboard, 
  Activity, 
  ShieldCheck, 
  Power, 
  FileText, 
  Radio, 
  ShieldAlert
} from 'lucide-react';

interface SidebarProps {
  currentTab: PageTab;
  onTabChange: (tab: PageTab) => void;
  systemPausedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onTabChange,
  systemPausedCount
}) => {
  const navItems = [
    {
      tab: 'overview' as PageTab,
      label: 'Platform Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      tab: 'health-map' as PageTab,
      label: 'Branch Health Map',
      icon: Activity,
      badge: 'Live',
    },
    {
      tab: 'verification' as PageTab,
      label: 'Merchant Verification',
      icon: ShieldCheck,
      badge: '2 Pending',
    },
    {
      tab: 'kill-switch' as PageTab,
      label: 'Emergency Kill-Switch',
      icon: Power,
      badge: systemPausedCount > 0 ? `${systemPausedCount} PAUSED` : null,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/40',
    },
    {
      tab: 'audit-logs' as PageTab,
      label: 'DPDP Audit Logs',
      icon: FileText,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-[#0F1626] border-r border-[#1E293B] flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1E293B] flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center shadow-lg shadow-orange-500/20 font-bold text-lg text-white">
          QL
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-tight text-base">QueueLess</span>
            <span className="text-[10px] font-semibold bg-[#F97316]/20 text-[#F97316] px-1.5 py-0.5 rounded border border-[#F97316]/30">
              INDIA
            </span>
          </div>
          <p className="text-xs text-[#8B98AD]">Platform Admin Suite</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-[#8B98AD] uppercase">
          Command Center
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onTabChange(item.tab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1E293B] text-[#F8FAFC] shadow-sm border border-[#F97316]/40'
                  : 'text-[#8B98AD] hover:bg-[#151F33] hover:text-[#F8FAFC]'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  size={18}
                  className={isActive ? 'text-[#F97316]' : 'text-[#8B98AD]'}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    item.badgeColor || 'bg-[#1E293B] text-[#10B981] border border-[#10B981]/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0B0F19]/60">
        <div className="flex items-center justify-between text-xs text-[#8B98AD] mb-2">
          <span className="flex items-center space-x-1.5">
            <Radio size={12} className="text-[#10B981] animate-pulse" />
            <span className="text-[#F8FAFC]">Mesh Cluster</span>
          </span>
          <span className="text-[#10B981] font-mono font-medium">99.98% UP</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px] text-[#8B98AD]">
          <ShieldAlert size={12} className="text-[#F97316]" />
          <span>DPDP Act 2023 Masking: Active</span>
        </div>
      </div>
    </aside>
  );
};
