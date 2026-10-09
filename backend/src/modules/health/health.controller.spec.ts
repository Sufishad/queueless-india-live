import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';

import { Response } from 'express';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: {
    checkHealth: jest.Mock;
    checkReadiness: jest.Mock;
  };
  let metricsService: {
    getPrometheusMetrics: jest.Mock;
  };

  const createMockRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.setHeader = jest.fn().mockReturnValue(res);
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    healthService = {
      checkHealth: jest.fn().mockResolvedValue({
        status: 'ok',
        services: { postgres: { status: 'UP', latencyMs: 2 }, redis: { status: 'UP', latencyMs: 1 } },
      }),
      checkReadiness: jest.fn().mockResolvedValue({
        ready: true,
        status: 'READY',
        engine: 'QueueEngineOperational',
      }),
    };

    metricsService = {
      getPrometheusMetrics: jest.fn().mockReturnValue('# HELP tokens_issued_total Total tokens\ntokens_issued_total 12\n'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthService, useValue: healthService },
        { provide: MetricsService, useValue: metricsService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return 200 liveness status on /healthz', async () => {
    const res = createMockRes();
    await controller.getHealth(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
  });

  it('should return 200 readiness status on /readyz', async () => {
    const res = createMockRes();
    await controller.getReadiness(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'READY' }));
  });

  it('should return prometheus plain text string on /metrics', async () => {
    const res = createMockRes();
    await controller.getMetrics(res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('tokens_issued_total 12'));
  });
});
