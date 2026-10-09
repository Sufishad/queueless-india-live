import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../modules/health/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        const method = req.method || 'GET';
        const url = req.originalUrl || req.url || '/';
        const statusCode = res.statusCode || 200;
        this.metrics.recordHttpRequest(method, url, statusCode, durationMs);
      }),
    );
  }
}
