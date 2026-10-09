import { Injectable } from '@nestjs/common';
import {
  RealtimeGateway,
  QueueUpdatePayload,
  TokenCalledPayload,
  TokenStatusPayload,
} from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitQueueUpdate(branchId: string, payload: QueueUpdatePayload) {
    this.gateway.broadcastQueueUpdate(branchId, payload);
  }

  emitTokenCalled(branchId: string, payload: TokenCalledPayload) {
    this.gateway.broadcastTokenCalled(branchId, payload);
  }

  emitTokenStatus(branchId: string, payload: TokenStatusPayload) {
    this.gateway.broadcastTokenStatus(branchId, payload);
  }

  emitQueuePaused(branchId: string, reason?: string) {
    this.gateway.broadcastQueuePaused(branchId, reason);
  }

  emitQueueResumed(branchId: string) {
    this.gateway.broadcastQueueResumed(branchId);
  }
}
