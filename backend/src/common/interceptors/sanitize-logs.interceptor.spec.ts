import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { SanitizeLogsInterceptor } from './sanitize-logs.interceptor';

describe('SanitizeLogsInterceptor (DPDP Act Compliance)', () => {
  let interceptor: SanitizeLogsInterceptor;

  beforeEach(() => {
    interceptor = new SanitizeLogsInterceptor();
  });

  describe('Static maskPhoneNumber', () => {
    it('should mask 10-digit Indian phone numbers (e.g. 9876543210 -> 98XXXX3210)', () => {
      const raw = '9876543210';
      const masked = SanitizeLogsInterceptor.maskPhoneNumber(raw);
      expect(masked).toBe('98XXXX3210');
    });

    it('should mask +91 prefixed phone numbers correctly', () => {
      const raw = '+919876543210';
      const masked = SanitizeLogsInterceptor.maskPhoneNumber(raw);
      expect(masked).toBe('+9198XXXX3210');
    });

    it('should mask multiple phone numbers embedded within text logs', () => {
      const log = 'User 9876543210 transferred token to user 8765432109 at branch B1';
      const masked = SanitizeLogsInterceptor.maskPhoneNumber(log);
      expect(masked).toBe('User 98XXXX3210 transferred token to user 87XXXX2109 at branch B1');
    });
  });

  describe('Static maskJwtToken', () => {
    it('should mask Bearer tokens in Authorization headers', () => {
      const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abcdef';
      const masked = SanitizeLogsInterceptor.maskJwtToken(header);
      expect(masked).toBe('Bearer [MASKED_JWT]');
    });

    it('should mask raw JWT strings in log statements', () => {
      const rawJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.abcdef';
      const masked = SanitizeLogsInterceptor.maskJwtToken(`Generated token: ${rawJwt}`);
      expect(masked).toBe('Generated token: [MASKED_JWT]');
    });
  });

  describe('Static sanitize (Recursive Data Scrubber)', () => {
    it('should recursively mask sensitive keys in nested payloads', () => {
      const payload = {
        user: {
          name: 'Pooja Patil',
          mobile: '9812345678',
        },
        auth: {
          accessToken: 'eyJhbGciOiJIUzI1Ni...signature',
          refreshToken: 'eyJhbGciOiJIUzI1Ni...refresh',
          pin: '1234',
        },
        activeTokens: ['Token for 9876543210'],
      };

      const sanitized = SanitizeLogsInterceptor.sanitize(payload);

      expect(sanitized.user.name).toBe('Pooja Patil');
      expect(sanitized.user.mobile).toBe('98XXXX5678');
      expect(sanitized.auth.accessToken).toBe('[MASKED_SECRET]');
      expect(sanitized.auth.refreshToken).toBe('[MASKED_SECRET]');
      expect(sanitized.auth.pin).toBe('[MASKED_SECRET]');
      expect(sanitized.activeTokens[0]).toBe('Token for 98XXXX3210');
    });
  });

  describe('Interceptor Lifecycle', () => {
    it('should sanitize both incoming request logging and outgoing HTTP response', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/api/v1/auth/otp/verify',
        body: {
          mobile: '9876543210',
          otp: '123456',
        },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
      } as unknown as ExecutionContext;

      const mockHandler: CallHandler = {
        handle: () =>
          of({
            accessToken: 'eyJhbGciOiJIUzI1Ni...sample',
            user: {
              id: 'uuid-1',
              mobile: '9876543210',
            },
          }),
      };

      interceptor.intercept(mockContext, mockHandler).subscribe({
        next: (result) => {
          // Outgoing HTTP response should have phone masked and token protected
          expect(result.user.mobile).toBe('98XXXX3210');
          expect(result.accessToken).toBe('[MASKED_SECRET]');
          done();
        },
        error: (err) => done(err),
      });
    });
  });
});
