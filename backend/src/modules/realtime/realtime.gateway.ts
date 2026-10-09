import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface QueueUpdatePayload {
  branchId: string;
  serving: number | null;
  waiting_count: number;
  est_wait_min: number;
  next_numbers: number[];
  active_counters: number;
  updated_at: string;
}

export interface TokenCalledPayload {
  token_id: string;
  number: number;
  counter_label: string;
  branch_name: string;
  called_at: string;
  customer_user_id?: string | null;
}

export interface TokenStatusPayload {
  token_id: string;
  status: string;
  updated_at: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  pingInterval: 25000,
  pingTimeout: 10000,
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('branch:subscribe')
  handleSubscribeBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (!data?.branchId) return;
    const room = `branch:${data.branchId}`;
    client.join(room);
    this.logger.log(`Socket ${client.id} joined room ${room}`);
    return { event: 'subscribed', room };
  }

  @SubscribeMessage('branch:unsubscribe')
  handleUnsubscribeBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    if (!data?.branchId) return;
    const room = `branch:${data.branchId}`;
    client.leave(room);
    this.logger.log(`Socket ${client.id} left room ${room}`);
    return { event: 'unsubscribed', room };
  }

  /**
   * Broadcast methods to room branch:{id}
   */
  broadcastQueueUpdate(branchId: string, payload: QueueUpdatePayload) {
    if (this.server) {
      this.server.to(`branch:${branchId}`).emit('queue:update', payload);
    }
  }

  broadcastTokenCalled(branchId: string, payload: TokenCalledPayload) {
    if (this.server) {
      this.server.to(`branch:${branchId}`).emit('token:called', payload);
    }
  }

  broadcastTokenStatus(branchId: string, payload: TokenStatusPayload) {
    if (this.server) {
      this.server.to(`branch:${branchId}`).emit('token:status', payload);
    }
  }

  broadcastQueuePaused(branchId: string, reason?: string) {
    if (this.server) {
      this.server.to(`branch:${branchId}`).emit('queue:paused', {
        branchId,
        reason: reason || 'Merchant paused queue temporarily',
        paused_at: new Date().toISOString(),
      });
    }
  }

  broadcastQueueResumed(branchId: string) {
    if (this.server) {
      this.server.to(`branch:${branchId}`).emit('queue:resumed', {
        branchId,
        resumed_at: new Date().toISOString(),
      });
    }
  }
}
