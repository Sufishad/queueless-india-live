import { Controller, Get, Head, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * GET /
   * Root endpoint for cloud load balancers & uptime monitors (Render, AWS, Cloudflare)
   */
  @Get()
  getRoot(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      name: 'QueueLess India API',
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * HEAD /
   * Root HEAD ping for cloud availability checks
   */
  @Head()
  headRoot(@Res() res: Response) {
    return res.status(HttpStatus.OK).end();
  }

  /**
   * GET /healthz
   * Liveness probe for Kubernetes / Docker container health checks
   */
  @Get('healthz')
  async getHealth(@Res() res: Response) {
    const health = await this.healthService.checkHealth();
    const statusCode =
      health.status === 'ok'
        ? HttpStatus.OK
        : health.status === 'degraded'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(health);
  }

  /**
   * GET /readyz
   * Readiness probe verifying queue engine & connection pools are operational
   */
  @Get('readyz')
  async getReadiness(@Res() res: Response) {
    const readiness = await this.healthService.checkReadiness();
    const statusCode = readiness.ready
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(statusCode).json(readiness);
  }

  /**
   * GET /metrics
   * Standard Prometheus text exposition endpoint
   */
  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    const metricsText = this.metricsService.getPrometheusMetrics();
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.status(HttpStatus.OK).send(metricsText);
  }
}
