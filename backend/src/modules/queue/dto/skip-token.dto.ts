import { IsOptional, IsString } from 'class-validator';

export class SkipTokenDto {
  @IsOptional()
  @IsString()
  tokenId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
