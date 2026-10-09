import { IsOptional, IsString } from 'class-validator';

export class CompleteTokenDto {
  @IsOptional()
  @IsString()
  tokenId?: string;
}
