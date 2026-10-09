export type PageTab = 'overview' | 'health-map' | 'verification' | 'kill-switch' | 'audit-logs';

export interface OverviewMetrics {
  registeredBusinesses: number;
  activeQueuesToday: number;
  tokensIssuedTotal: number;
  customerHoursSaved: number;
  peakThroughputRps: number;
  systemAvailabilityPercent: number;
}

export type BranchHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
export type RegionalZone = 'South' | 'West' | 'North';

export interface BranchHealth {
  id: string;
  name: string;
  zone: RegionalZone;
  city: string;
  activeQueues: number;
  tokensWaiting: number;
  p95LatencyMs: number;
  cacheHitRatio: number;
  status: BranchHealthStatus;
  isPaused: boolean;
  lastHeartbeat: string;
}

export interface MerchantVerification {
  id: string;
  businessName: string;
  category: string;
  city: string;
  ownerName: string;
  ownerMobile: string; // Must be masked in UI: 98XXXX3210
  kycVerified: boolean;
  gstVerified: boolean;
  dataSafetyCertified: boolean;
  status: 'APPROVED' | 'PENDING' | 'REVOKED';
  appliedAt: string;
  reviewedBy?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: 'MERCHANT_ACTION' | 'ADMIN_CHANGE' | 'RATE_LIMIT_VIOLATION' | 'DPDP_ERASURE';
  severity: 'INFO' | 'WARN' | 'SECURITY';
  actor: string; // e.g. "Operator (98XXXX3210)" or "Admin (root)"
  action: string;
  target: string;
  ipAddress: string;
  details: string;
}
