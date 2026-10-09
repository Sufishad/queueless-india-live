import React, { useState } from 'react';
import { PageTab, OverviewMetrics, BranchHealth, MerchantVerification, AuditLogEntry } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { HealthMapPage } from './pages/HealthMapPage';
import { VerificationPage } from './pages/VerificationPage';
import { KillSwitchPage } from './pages/KillSwitchPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<PageTab>('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Initial Metrics (aligned with k6 & Pilot seed)
  const [metrics] = useState<OverviewMetrics>({
    registeredBusinesses: 5,
    activeQueuesToday: 18,
    tokensIssuedTotal: 14820,
    customerHoursSaved: 2964,
    peakThroughputRps: 3530,
    systemAvailabilityPercent: 99.98,
  });

  // Pilot Branches (Matching backend seed: 3 BLR, 1 MUM, 1 PUN)
  const [branches, setBranches] = useState<BranchHealth[]>([
    {
      id: 'br-blr-1',
      name: 'Apollo Clinic Indiranagar',
      zone: 'South',
      city: 'Bengaluru',
      activeQueues: 3,
      tokensWaiting: 14,
      p95LatencyMs: 104,
      cacheHitRatio: 0.94,
      status: 'HEALTHY',
      isPaused: false,
      lastHeartbeat: '2s ago',
    },
    {
      id: 'br-blr-2',
      name: "Dr. Mohan's Diabetes Specialities Koramangala",
      zone: 'South',
      city: 'Bengaluru',
      activeQueues: 2,
      tokensWaiting: 8,
      p95LatencyMs: 112,
      cacheHitRatio: 0.91,
      status: 'HEALTHY',
      isPaused: false,
      lastHeartbeat: '5s ago',
    },
    {
      id: 'br-blr-3',
      name: 'RTO Central (KA-01) Shanthi Nagar',
      zone: 'South',
      city: 'Bengaluru',
      activeQueues: 3,
      tokensWaiting: 27,
      p95LatencyMs: 138,
      cacheHitRatio: 0.89,
      status: 'HEALTHY',
      isPaused: false,
      lastHeartbeat: '1s ago',
    },
    {
      id: 'br-mum-1',
      name: 'Lilavati Hospital OPD Bandra West',
      zone: 'West',
      city: 'Mumbai',
      activeQueues: 3,
      tokensWaiting: 34,
      p95LatencyMs: 142,
      cacheHitRatio: 0.95,
      status: 'HEALTHY',
      isPaused: false,
      lastHeartbeat: '3s ago',
    },
    {
      id: 'br-pun-1',
      name: 'Poona Hospital Diagnostic Care Sadashiv Peth',
      zone: 'West',
      city: 'Pune',
      activeQueues: 3,
      tokensWaiting: 12,
      p95LatencyMs: 98,
      cacheHitRatio: 0.93,
      status: 'HEALTHY',
      isPaused: false,
      lastHeartbeat: '4s ago',
    },
  ]);

  // Merchant Verifications
  const [verifications, setVerifications] = useState<MerchantVerification[]>([
    {
      id: 'mv-1',
      businessName: 'Apollo Clinics India',
      category: 'Healthcare & Clinic',
      city: 'Bengaluru',
      ownerName: 'Dr. Arvind Rao',
      ownerMobile: '9845012345',
      kycVerified: true,
      gstVerified: true,
      dataSafetyCertified: true,
      status: 'APPROVED',
      appliedAt: '2026-09-12 11:30 IST',
      reviewedBy: 'secops@queueless.in',
    },
    {
      id: 'mv-2',
      businessName: "Dr. Mohan's Diabetes Care",
      category: 'Diagnostic Lab',
      city: 'Bengaluru',
      ownerName: 'Dr. V. Mohan',
      ownerMobile: '9880198765',
      kycVerified: true,
      gstVerified: true,
      dataSafetyCertified: true,
      status: 'APPROVED',
      appliedAt: '2026-09-15 09:20 IST',
      reviewedBy: 'secops@queueless.in',
    },
    {
      id: 'mv-3',
      businessName: 'Karnataka Transport Dept (RTO)',
      category: 'Government Civic',
      city: 'Bengaluru',
      ownerName: 'Officer Manjunath K',
      ownerMobile: '9448054321',
      kycVerified: true,
      gstVerified: true,
      dataSafetyCertified: true,
      status: 'APPROVED',
      appliedAt: '2026-09-18 14:10 IST',
      reviewedBy: 'secops@queueless.in',
    },
    {
      id: 'mv-4',
      businessName: 'Fortis OPD Care Bannerghatta',
      category: 'Healthcare & Clinic',
      city: 'Bengaluru',
      ownerName: 'Dr. Sheila Raman',
      ownerMobile: '9820011223',
      kycVerified: true,
      gstVerified: true,
      dataSafetyCertified: false,
      status: 'PENDING',
      appliedAt: '2026-10-08 16:45 IST',
    },
    {
      id: 'mv-5',
      businessName: 'Noble Chemists Retail Hub',
      category: 'Pharmacy & Retail',
      city: 'Pune',
      ownerName: 'Ramesh Jain',
      ownerMobile: '9890044556',
      kycVerified: true,
      gstVerified: false,
      dataSafetyCertified: true,
      status: 'PENDING',
      appliedAt: '2026-10-09 10:15 IST',
    },
  ]);

  // Audit Logs (with strict DPDP Masking)
  const [logs, setLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-101',
      timestamp: '2026-10-09 20:14:22 IST',
      category: 'MERCHANT_ACTION',
      severity: 'INFO',
      actor: 'Operator (98XXXX2345)',
      action: 'COUNTER_CALL',
      target: 'Branch #br-blr-1 / Counter A',
      ipAddress: '49.207.181.12',
      details: 'Called Token #14. High-priority FCM dispatched.',
    },
    {
      id: 'log-102',
      timestamp: '2026-10-09 20:12:05 IST',
      category: 'RATE_LIMIT_VIOLATION',
      severity: 'WARN',
      actor: 'Client (98XXXX7890)',
      action: 'TOKEN_JOIN_THROTTLED',
      target: 'Branch #br-mum-1',
      ipAddress: '103.21.124.9',
      details: 'Blocked: Exceeded 5 token joins/hour limit (sliding window).',
    },
    {
      id: 'log-103',
      timestamp: '2026-10-09 20:05:40 IST',
      category: 'ADMIN_CHANGE',
      severity: 'INFO',
      actor: 'Admin (secops@queueless.in)',
      action: 'MERCHANT_VERIFIED',
      target: 'Business #mv-3 (RTO Central)',
      ipAddress: '152.58.14.77',
      details: 'Approved GSTIN and DPDP consent agreement.',
    },
    {
      id: 'log-104',
      timestamp: '2026-10-09 19:48:19 IST',
      category: 'RATE_LIMIT_VIOLATION',
      severity: 'SECURITY',
      actor: 'IP 185.220.101.5',
      action: 'OTP_BRUTE_FORCE_BLOCKED',
      target: 'Auth Service (/auth/send-otp)',
      ipAddress: '185.220.101.5',
      details: 'Blocked: 10 OTP requests exceeded / hour limit. IP blacklisted for 3600s.',
    },
    {
      id: 'log-105',
      timestamp: '2026-10-09 18:30:11 IST',
      category: 'DPDP_ERASURE',
      severity: 'INFO',
      actor: 'Customer (98XXXX1100)',
      action: 'ACCOUNT_DATA_ERASED',
      target: 'User Account #usr-9182',
      ipAddress: '223.185.42.10',
      details: 'Right-to-erasure exercised. Anonymized 12 historical token associations.',
    },
  ]);

  // Handlers
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSyncTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 600);
  };

  const handleApproveVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'APPROVED' as const, reviewedBy: 'secops@queueless.in' } : v))
    );
    const target = verifications.find((v) => v.id === id);
    if (target) {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-IN') + ' IST',
          category: 'ADMIN_CHANGE',
          severity: 'INFO',
          actor: 'Admin (secops@queueless.in)',
          action: 'MERCHANT_APPROVED',
          target: `${target.businessName} (${target.city})`,
          ipAddress: '127.0.0.1',
          details: 'Approved merchant compliance verification and generated production credentials.',
        },
        ...prev,
      ]);
    }
  };

  const handleRevokeVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'REVOKED' as const } : v))
    );
    const target = verifications.find((v) => v.id === id);
    if (target) {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-IN') + ' IST',
          category: 'ADMIN_CHANGE',
          severity: 'WARN',
          actor: 'Admin (secops@queueless.in)',
          action: 'MERCHANT_REVOKED',
          target: `${target.businessName} (${target.city})`,
          ipAddress: '127.0.0.1',
          details: 'Revoked merchant compliance status and de-activated queue services.',
        },
        ...prev,
      ]);
    }
  };

  const handleTogglePause = (branchId: string, shouldPause: boolean, reason: string) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, isPaused: shouldPause } : b))
    );
    const branch = branches.find((b) => b.id === branchId);
    if (branch) {
      setLogs((prev) => [
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('en-IN') + ' IST',
          category: 'ADMIN_CHANGE',
          severity: shouldPause ? 'SECURITY' : 'INFO',
          actor: 'Admin (secops@queueless.in)',
          action: shouldPause ? 'KILL_SWITCH_ENGAGED' : 'KILL_SWITCH_DISENGAGED',
          target: `${branch.name} (${branch.city})`,
          ipAddress: '127.0.0.1',
          details: `Emergency Broadcast: "${reason}". Total tokens alerted: ${branch.tokensWaiting}.`,
        },
        ...prev,
      ]);
    }
  };

  const systemPausedCount = branches.filter((b) => b.isPaused).length;

  return (
    <div className="flex h-screen bg-[#0B0F19] text-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        systemPausedCount={systemPausedCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          currentTab={currentTab}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          lastSyncTime={lastSyncTime}
        />

        <main className="flex-1 overflow-y-auto p-8">
          {currentTab === 'overview' && <OverviewPage metrics={metrics} />}
          {currentTab === 'health-map' && <HealthMapPage branches={branches} />}
          {currentTab === 'verification' && (
            <VerificationPage
              verifications={verifications}
              onApprove={handleApproveVerification}
              onRevoke={handleRevokeVerification}
            />
          )}
          {currentTab === 'kill-switch' && (
            <KillSwitchPage
              branches={branches}
              onTogglePause={handleTogglePause}
            />
          )}
          {currentTab === 'audit-logs' && <AuditLogsPage logs={logs} />}
        </main>
      </div>
    </div>
  );
};

export default App;
