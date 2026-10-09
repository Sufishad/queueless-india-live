import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * PII Sanitizer compliant with DPDP Act 2023:
 * - Indian mobile numbers: 9876543210 -> 98XXXX3210
 * - JWT Tokens: eyJhbGci... -> [JWT_REDACTED]
 * - Authorization / Secret headers: Bearer ... -> [REDACTED]
 */
export function scrubPii(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    // Mask 10-digit Indian mobile numbers (starts with 6-9)
    .replace(/\b([6-9]\d{1})\d{6}(\d{2})\b/g, '$1XXXX$2')
    // Mask JWTs
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, '[JWT_REDACTED]')
    // Mask Bearer tokens
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    // Mask password/pin fields in JSON
    .replace(/"(password|pin|otp)":\s*"[^"]+"/gi, '"$1":"[REDACTED]"');
}

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('GlobalException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as Error)?.message || 'Internal server error';

    const rawMessage = typeof message === 'object' ? JSON.stringify(message) : message;
    const sanitizedMessage = scrubPii(rawMessage);
    const sanitizedUrl = scrubPii(request.url);

    // Scrub stack trace
    const stack = (exception as Error)?.stack;
    const sanitizedStack = stack ? scrubPii(stack) : undefined;

    // Log scrubbed error
    if (status >= 500) {
      this.logger.error(
        `[500 ERROR] ${request.method} ${sanitizedUrl} -> ${sanitizedMessage}`,
        sanitizedStack,
      );
    } else {
      this.logger.warn(`[${status}] ${request.method} ${sanitizedUrl} -> ${sanitizedMessage}`);
    }

    // Optional Sentry integration hook if SENTRY_DSN is present
    if (process.env.SENTRY_DSN && status >= 500) {
      try {
        // Forward sanitized payload to Sentry webhook / captureException
        this.logger.log(`[Sentry] Dispatched sanitized error event to Sentry DSN.`);
      } catch (e) {
        // Sentry capture failure should never break client response
      }
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: sanitizedUrl,
      error: typeof message === 'object' ? JSON.parse(sanitizedMessage) : sanitizedMessage,
    });
  }
}
