import { Injectable, Logger } from '@nestjs/common';
import { SanitizeLogsInterceptor } from '../../common/interceptors/sanitize-logs.interceptor';

export interface PushNotificationPayload {
  userId?: string;
  mobile?: string;
  title: string;
  body: string;
  channelId?: string;
  priority?: 'high' | 'normal';
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  /**
   * Mock implementation of Firebase Cloud Messaging (FCM) high-priority push notifications.
   * Masks recipient mobile and log payloads adhering to DPDP Act 2023.
   */
  async sendPushNotification(payload: PushNotificationPayload): Promise<{ success: boolean; messageId: string }> {
    const maskedRecipient = payload.mobile
      ? SanitizeLogsInterceptor.maskPhoneNumber(payload.mobile)
      : payload.userId || 'broadcast';

    const messageId = `msg_fcm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    this.logger.log(
      `[FCM PUSH] Channel: ${payload.channelId || 'default'} | Priority: ${payload.priority || 'high'} | To: ${maskedRecipient} | Title: "${payload.title}" | Body: "${payload.body}" | ID: ${messageId}`,
    );

    return {
      success: true,
      messageId,
    };
  }

  /**
   * High-priority alarm notification when a customer's token is called.
   * Triggers device alarm channel sound and bilingual TTS preview.
   */
  async notifyTokenCalled(token: {
    id: string;
    number: number;
    customerUserId?: string | null;
    counterLabel?: string;
    branchName?: string;
  }): Promise<void> {
    const counterText = token.counterLabel || 'Counter 1';
    const branchText = token.branchName || 'QueueLess Partner';

    await this.sendPushNotification({
      userId: token.customerUserId || undefined,
      title: `🔔 Token #${token.number} CALLED!`,
      body: `टोकन नंबर ${token.number}, ${counterText} पर आएं | Token #${token.number}, please proceed to ${counterText} at ${branchText}`,
      channelId: 'queueless_token_alarm_high_priority',
      priority: 'high',
      data: {
        tokenId: token.id,
        tokenNumber: token.number.toString(),
        counterLabel: counterText,
        type: 'TOKEN_CALLED',
        sound: 'alarm_chime',
      },
    });
  }
}
