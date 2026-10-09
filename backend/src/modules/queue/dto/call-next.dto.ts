import { IsOptional, IsString } from 'class-validator';

export class CallNextDto {
  @IsOptional()
  @IsString()
  counterId?: string;
}
