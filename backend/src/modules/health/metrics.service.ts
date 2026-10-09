import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly tokensIssued = new Map<string, number>();
  private readonly queueWaitTimes = new Map<string, number>();
  private readonly fcmDelivered = new Map<string, number>();
  private readonly httpRequests = new Map<string, number>();
  private readonly httpRequestDurations = new Map<string, { totalMs: number; count: number }>();
  private readonly startTime = Date.now();

  /**
   * Increment tokens issued counter
   */
  incrementTokensIssued(branchId: string, source: string): void {
    const key = `branch_id="${branchId}",source="${source}"`;
    this.tokensIssued.set(key, (this.tokensIssued.get(key) || 0) + 1);
  }

  /**
   * Set estimated/actual queue wait time in seconds for a branch
   */
  setQueueWaitTime(branchId: string, waitTimeSeconds: number): void {
    this.queueWaitTimes.set(`branch_id="${branchId}"`, Math.max(0, waitTimeSeconds));
  }

  /**
   * Increment FCM notification delivery counter
   */
  incrementFcmDelivered(status: 'delivered' | 'failed' | 'skipped'): void {
    const key = `status="${status}"`;
    this.fcmDelivered.set(key, (this.fcmDelivered.get(key) || 0) + 1);
  }

  /**
   * Record HTTP request metric
   */
  recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    const normalizedPath = path.split('?')[0].replace(/[0-9a-f-]{36}/gi, ':id');
    const key = `method="${method}",path="${normalizedPath}",status="${statusCode}"`;
    this.httpRequests.set(key, (this.httpRequests.get(key) || 0) + 1);

    const durKey = `method="${method}",path="${normalizedPath}"`;
    const existing = this.httpRequestDurations.get(durKey) || { totalMs: 0, count: 0 };
    existing.totalMs += durationMs;
    existing.count += 1;
    this.httpRequestDurations.set(durKey, existing);
  }

  /**
   * Generates standard Prometheus exposition formatted metrics text
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];

    // Header & Uptime
    lines.push('# HELP process_uptime_seconds Total backend uptime in seconds');
    lines.push('# TYPE process_uptime_seconds gauge');
    lines.push(`process_uptime_seconds ${((Date.now() - this.startTime) / 1000).toFixed(1)}`);
    lines.push('');

    // Process Memory
    const mem = process.memoryUsage();
    lines.push('# HELP nodejs_heap_used_bytes Process heap memory used');
    lines.push('# TYPE nodejs_heap_used_bytes gauge');
    lines.push(`nodejs_heap_used_bytes ${mem.heapUsed}`);
    lines.push('# HELP nodejs_heap_total_bytes Process heap memory allocated');
    lines.push('# TYPE nodejs_heap_total_bytes gauge');
    lines.push(`nodejs_heap_total_bytes ${mem.heapTotal}`);
    lines.push('# HELP nodejs_rss_bytes Process resident set size');
    lines.push('# TYPE nodejs_rss_bytes gauge');
    lines.push(`nodejs_rss_bytes ${mem.rss}`);
    lines.push('');

    // Tokens Issued Counter
    lines.push('# HELP tokens_issued_total Total tokens issued across branches');
    lines.push('# TYPE tokens_issued_total counter');
    if (this.tokensIssued.size === 0) {
      lines.push('tokens_issued_total{branch_id="default",source="APP"} 0');
    } else {
      for (const [labels, count] of this.tokensIssued.entries()) {
        lines.push(`tokens_issued_total{${labels}} ${count}`);
      }
    }
    lines.push('');

    // Queue Wait Time Gauge
    lines.push('# HELP queue_wait_time_seconds Estimated queue wait time in seconds');
    lines.push('# TYPE queue_wait_time_seconds gauge');
    if (this.queueWaitTimes.size === 0) {
      lines.push('queue_wait_time_seconds{branch_id="default"} 0');
    } else {
      for (const [labels, seconds] of this.queueWaitTimes.entries()) {
        lines.push(`queue_wait_time_seconds{${labels}} ${seconds}`);
      }
    }
    lines.push('');

    // FCM Delivered Counter
    lines.push('# HELP fcm_delivered_total Total FCM push notifications dispatched');
    lines.push('# TYPE fcm_delivered_total counter');
    if (this.fcmDelivered.size === 0) {
      lines.push('fcm_delivered_total{status="delivered"} 0');
    } else {
      for (const [labels, count] of this.fcmDelivered.entries()) {
        lines.push(`fcm_delivered_total{${labels}} ${count}`);
      }
    }
    lines.push('');

    // HTTP Requests Total
    lines.push('# HELP http_requests_total Total HTTP requests handled');
    lines.push('# TYPE http_requests_total counter');
    for (const [labels, count] of this.httpRequests.entries()) {
      lines.push(`http_requests_total{${labels}} ${count}`);
    }
    lines.push('');

    // HTTP Request Duration Average
    lines.push('# HELP http_request_duration_seconds Average HTTP request duration in seconds');
    lines.push('# TYPE http_request_duration_seconds gauge');
    for (const [labels, stats] of this.httpRequestDurations.entries()) {
      const avgSec = stats.count > 0 ? (stats.totalMs / stats.count / 1000).toFixed(4) : '0';
      lines.push(`http_request_duration_seconds{${labels}} ${avgSec}`);
    }
    lines.push('');

    return lines.join('\n');
  }
}
