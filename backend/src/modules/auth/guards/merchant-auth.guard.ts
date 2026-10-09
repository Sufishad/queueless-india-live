import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  private readonly logger = new Logger(MerchantAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    // 1. Check API Key authentication
    if (apiKey) {
      const keyHash = crypto.createHash('sha256').update(apiKey.trim()).digest('hex');
      try {
        const apiKeyRecord = await this.prisma.merchantApiKey.findUnique({
          where: { keyHash },
          include: { branch: true },
        });

        if (apiKeyRecord && apiKeyRecord.isActive) {
          // Verify branch match if path includes branch id parameter
          const branchIdParam = request.params?.id || request.params?.branchId;
          if (branchIdParam && apiKeyRecord.branchId !== branchIdParam) {
            throw new UnauthorizedException('API key is not authorized for this specific branch');
          }

          // Asynchronously update lastUsedAt
          this.prisma.merchantApiKey
            .update({
              where: { id: apiKeyRecord.id },
              data: { lastUsedAt: new Date() },
            })
            .catch(() => {});

          request.merchant = {
            branchId: apiKeyRecord.branchId,
            authType: 'api_key',
            label: apiKeyRecord.label,
          };
          return true;
        }
      } catch (e: any) {
        if (e instanceof UnauthorizedException) throw e;
        this.logger.error(`API key verification error: ${e.message}`);
      }
      throw new UnauthorizedException('Invalid or deactivated merchant API key');
    }

    // 2. Fallback to JWT Bearer Authentication
    const authHeader = request.headers['authorization'] as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_SECRET || 'queueless_jwt_dev_secret_key_10x',
        });

        // Verify merchant/admin role
        const role = payload.role || payload.roles;
        const isMerchant =
          role === 'MERCHANT' ||
          role === 'ADMIN' ||
          (Array.isArray(role) && (role.includes('MERCHANT') || role.includes('ADMIN')));

        if (!isMerchant) {
          throw new UnauthorizedException('User does not have merchant privileges');
        }

        request.user = payload;
        request.merchant = {
          userId: payload.sub,
          role: payload.role,
          authType: 'jwt',
        };
        return true;
      } catch (err: any) {
        throw new UnauthorizedException(`Invalid or expired JWT: ${err.message}`);
      }
    }

    throw new UnauthorizedException(
      'Merchant authentication required: provide valid Authorization Bearer token or x-api-key',
    );
  }
}
