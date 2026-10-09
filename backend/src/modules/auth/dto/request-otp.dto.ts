import { IsNotEmpty, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian mobile number',
  })
  mobile!: string;
}
