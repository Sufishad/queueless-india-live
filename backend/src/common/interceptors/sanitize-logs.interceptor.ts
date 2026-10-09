import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class SanitizeLogsInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  /**
   * Masks a 10-digit Indian phone number:
   * e.g., '9876543210' -> '98XXXX3210' (first 2 digits, XXXX, last 4 digits)
   */
  static maskPhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') return phone;
    // Handle optional +91 or 91 country code
    return phone.replace(/(\+?91[\-\s]?)?([6-9]\d)(\d{4})(\d{4})/g, (_match, prefix, p1, _middle, p2) => {
      const country = prefix ? prefix.trim() : '';
      return `${country}${p1}XXXX${p2}`;
    });
  }

  /**
   * Masks JWT tokens and secrets:
   * e.g., 'Bearer eyJhbGci...' -> 'Bearer [MASKED_JWT]'
   */
  static maskJwtToken(val: string): string {
    if (!val || typeof val !== 'string') return val;
    // Match Bearer tokens
    let masked = val.replace(/Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*)/gi, 'Bearer [MASKED_JWT]');
    // Match raw JWTs (header.payload.signature)
    masked = masked.replace(/\beyJ[A-Za-z0-9\-_=]+\.eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_.+/=]+\b/g, '[MASKED_JWT]');
    return masked;
  }

  /**
   * Recursively sanitizes any object, array, or primitive data
   */
  static sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      let result = SanitizeLogsInterceptor.maskPhoneNumber(data);
      result = SanitizeLogsInterceptor.maskJwtToken(result);
      return result;
    }

    if (Array.isArray(data)) {
      return data.map((item) => SanitizeLogsInterceptor.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(data)) {
        const lowerKey = key.toLowerCase();
        const value = data[key];

        // Mask authentication tokens in logs
        if (
          lowerKey === 'authorization' ||
          lowerKey === 'accesstoken' ||
          lowerKey === 'refreshtoken' ||
          lowerKey === 'password' ||
          lowerKey === 'pin'
        ) {
          sanitized[key] = '[MASKED_SECRET]';
        } else if (
          (lowerKey === 'mobile' || lowerKey === 'phone' || lowerKey === 'phonenumber') &&
          typeof value === 'string'
        ) {
          sanitized[key] = SanitizeLogsInterceptor.maskPhoneNumber(value);
        } else {
          sanitized[key] = SanitizeLogsInterceptor.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const method = req?.method || 'UNKNOWN';
    const url = req?.originalUrl || req?.url || '';
    const sanitizedBody = req?.body ? SanitizeLogsInterceptor.sanitize(req.body) : undefined;

    const startTime = Date.now();

    // Log incoming sanitized request
    if (req) {
      this.logger.log(
        `--> ${method} ${url} ${sanitizedBody ? JSON.stringify(sanitizedBody) : ''}`,
      );
    }

    return next.handle().pipe(
      map((data) => {
        // Sanitize outgoing HTTP response body to enforce DPDP compliance
        return SanitizeLogsInterceptor.sanitize(data);
      }),
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = res?.statusCode || 200;
        const sanitizedResponse = SanitizeLogsInterceptor.sanitize(data);

        // Mask tokens in logged response
        const loggedPreview =
          typeof sanitizedResponse === 'object'
            ? JSON.stringify(sanitizedResponse).slice(0, 300)
            : String(sanitizedResponse);

        this.logger.log(
          `<-- ${method} ${url} ${statusCode} [${duration}ms] ${loggedPreview}`,
        );
      }),
    );
  }
}
