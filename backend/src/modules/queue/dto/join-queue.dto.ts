import { IsNotEmpty, IsOptional, IsString, IsEnum } from 'class-validator';
import { TokenPriority } from '@prisma/client';

export class JoinQueueDto {
  @IsNotEmpty({ message: 'Service ID is required' })
  @IsString()
  serviceId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsEnum(TokenPriority, {
    message: 'Priority must be NORMAL, SENIOR, or EMERGENCY',
  })
  priority?: TokenPriority;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
