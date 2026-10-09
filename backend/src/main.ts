import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SanitizeLogsInterceptor } from './common/interceptors/sanitize-logs.interceptor';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './modules/health/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Milestone 3: Helmet middleware with strict CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          objectSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Milestone 3: CORS whitelist (admin web domain + local dev)
  const allowedOrigins = [
    process.env.ADMIN_WEB_ORIGIN || 'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'https://admin.queueless.in',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Mobile apps don't pass Origin; allow non-origin and whitelisted domains
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-api-key'],
  });

  // Global prefix with health/readiness/metrics roots for Prometheus/Docker probes
  app.setGlobalPrefix('api/v1', {
    exclude: ['healthz', 'readyz', 'metrics'],
  });

  const metricsService = app.get(MetricsService);

  // Apply DPDP log/payload sanitization & metrics interceptors globally
  app.useGlobalInterceptors(
    new SanitizeLogsInterceptor(),
    new MetricsInterceptor(metricsService),
  );

  // Apply Sentry exception filter with automatic PII scrubbing
  app.useGlobalFilters(new SentryExceptionFilter());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`[QueueLess India] Backend core initialized on port ${port}`);
}

bootstrap();
