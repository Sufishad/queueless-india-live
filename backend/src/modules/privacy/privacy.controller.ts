import { 
  Controller, 
  Post, 
  Delete, 
  UseGuards, 
  Request, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { PrivacyService } from './privacy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * Play Store / DPDP Compliance Account Deletion Endpoint
   * URL: POST /api/v1/privacy/delete-account
   */
  @Post('delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccountPost(@Request() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.privacyService.deleteAccount(userId);
  }

  /**
   * URL: DELETE /api/v1/privacy/delete-account
   */
  @Delete('delete-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccountDelete(@Request() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.privacyService.deleteAccount(userId);
  }
}
