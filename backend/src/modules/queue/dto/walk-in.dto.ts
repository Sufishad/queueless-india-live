import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class WalkInDto {
  @IsNotEmpty({ message: 'Service ID is required for walk-in token' })
  @IsString()
  serviceId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
