import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/realtime/socket_service.dart';
import '../../customer/models/queue_token_model.dart';
import '../services/offline_action_queue_service.dart';

class MerchantDashboardState {
  final String branchId;
  final String branchName;
  final String activeCounter;
  final List<String> availableCounters;
  final QueueTokenModel? currentToken;
  final List<QueueTokenModel> nextTokens;
  final int waitingCount;
  final int completedTodayCount;
  final bool isPaused;
  final bool isOffline;
  final int pendingOfflineCount;
  final bool isPerformingAction;
  final String? errorMessage;

  MerchantDashboardState({
    required this.branchId,
    required this.branchName,
    required this.activeCounter,
    required this.availableCounters,
    this.currentToken,
    this.nextTokens = const [],
    this.waitingCount = 0,
    this.completedTodayCount = 0,
    this.isPaused = false,
    this.isOffline = false,
    this.pendingOfflineCount = 0,
    this.isPerformingAction = false,
    this.errorMessage,
  });

  MerchantDashboardState copyWith({
    String? branchId,
    String? branchName,
    String? activeCounter,
    List<String>? availableCounters,
    QueueTokenModel? currentToken,
    bool clearCurrentToken = false,
    List<QueueTokenModel>? nextTokens,
    int? waitingCount,
    int? completedTodayCount,
    bool? isPaused,
    bool? isOffline,
    int? pendingOfflineCount,
    bool? isPerformingAction,
    String? errorMessage,
    bool clearErrorMessage = false,
  }) {
    return MerchantDashboardState(
      branchId: branchId ?? this.branchId,
      branchName: branchName ?? this.branchName,
      activeCounter: activeCounter ?? this.activeCounter,
      availableCounters: availableCounters ?? this.availableCounters,
      currentToken: clearCurrentToken ? null : (currentToken ?? this.currentToken),
      nextTokens: nextTokens ?? this.nextTokens,
      waitingCount: waitingCount ?? this.waitingCount,
      completedTodayCount: completedTodayCount ?? this.completedTodayCount,
      isPaused: isPaused ?? this.isPaused,
      isOffline: isOffline ?? this.isOffline,
      pendingOfflineCount: pendingOfflineCount ?? this.pendingOfflineCount,
      isPerformingAction: isPerformingAction ?? this.isPerformingAction,
      errorMessage: clearErrorMessage ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class MerchantDashboardNotifier extends StateNotifier<MerchantDashboardState> {
  final DioClient _dioClient = DioClient();
  final SocketService _socketService = SocketService();
  final OfflineActionQueueService _offlineQueue = OfflineActionQueueService();

  StreamSubscription? _socketSubscription;
  StreamSubscription? _offlineQueueSubscription;

  MerchantDashboardNotifier({
    required String branchId,
    required String branchName,
  }) : super(MerchantDashboardState(
          branchId: branchId,
          branchName: branchName,
          activeCounter: '1',
          availableCounters: const ['1', '2', '3', '4'],
          waitingCount: 5,
          completedTodayCount: 18,
          nextTokens: [
            QueueTokenModel(
              id: 'tok-101',
              branchId: branchId,
              number: 15,
              status: CustomerTokenStatus.waiting,
              date: '2026-10-10',
              estimatedWaitSeconds: 180,
              customerName: 'Rahul S.',
              createdAt: DateTime.now().subtract(const Duration(minutes: 8)),
            ),
            QueueTokenModel(
              id: 'tok-102',
              branchId: branchId,
              number: 16,
              status: CustomerTokenStatus.waiting,
              date: '2026-10-10',
              estimatedWaitSeconds: 360,
              customerName: 'Priya K.',
              createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
            ),
            QueueTokenModel(
              id: 'tok-103',
              branchId: branchId,
              number: 17,
              status: CustomerTokenStatus.waiting,
              date: '2026-10-10',
              estimatedWaitSeconds: 540,
              customerName: 'Amit V.',
              createdAt: DateTime.now().subtract(const Duration(minutes: 2)),
            ),
          ],
          currentToken: QueueTokenModel(
            id: 'tok-100',
            branchId: branchId,
            number: 14,
            status: CustomerTokenStatus.called,
            counterAssigned: '1',
            date: '2026-10-10',
            customerName: 'Vikram Mehta',
            calledAt: DateTime.now().subtract(const Duration(seconds: 45)),
            createdAt: DateTime.now().subtract(const Duration(minutes: 12)),
          ),
        )) {
    _initListeners();
  }

  void _initListeners() {
    // 1. Subscribe to Offline Action Queue count
    _offlineQueueSubscription = _offlineQueue.pendingCountStream.listen((count) {
      state = state.copyWith(pendingOfflineCount: count);
    });

    // 2. Subscribe to Realtime Branch Room
    _socketService.subscribeToBranch(state.branchId);
    _socketSubscription = _socketService.events.listen((event) {
      _handleRealtimeEvent(event);
    });
  }

  void setActiveCounter(String counter) {
    state = state.copyWith(activeCounter: counter);
  }

  void _handleRealtimeEvent(SocketEvent event) {
    switch (event.type) {
      case SocketEventType.queueUpdate:
        final waiting = event.data['waiting_count'] as int?;
        if (waiting != null) {
          state = state.copyWith(waitingCount: waiting);
        }
        break;
      case SocketEventType.tokenCalled:
        final tokenData = event.data['token'];
        if (tokenData != null) {
          final token = QueueTokenModel.fromJson(tokenData);
          if (token.counterAssigned == state.activeCounter) {
            state = state.copyWith(currentToken: token);
          }
        }
        break;
      case SocketEventType.queuePaused:
        state = state.copyWith(isPaused: true);
        break;
      case SocketEventType.queueResumed:
        state = state.copyWith(isPaused: false);
        break;
      default:
        break;
    }
  }

  /// Action: Call Next token
  /// Optimistic UI: Pops first token from nextTokens, sets currentToken to it, decrements waiting count.
  /// If REST call fails with network error, enqueues to OfflineActionQueueService.
  Future<void> callNext() async {
    final previousState = state;
    if (state.nextTokens.isEmpty && state.waitingCount == 0) return;

    // Optimistic Update
    QueueTokenModel? optimisticNext;
    List<QueueTokenModel> remaining = List.from(state.nextTokens);
    if (remaining.isNotEmpty) {
      optimisticNext = remaining.removeAt(0).copyWith(
            status: CustomerTokenStatus.called,
            counterAssigned: state.activeCounter,
          );
    } else {
      optimisticNext = QueueTokenModel(
        id: 'tok-opt-${DateTime.now().millisecondsSinceEpoch}',
        branchId: state.branchId,
        number: (state.currentToken?.number ?? 0) + 1,
        status: CustomerTokenStatus.called,
        counterAssigned: state.activeCounter,
        date: '2026-10-10',
        calledAt: DateTime.now(),
        createdAt: DateTime.now(),
      );
    }

    state = state.copyWith(
      currentToken: optimisticNext,
      nextTokens: remaining,
      waitingCount: (state.waitingCount > 0) ? state.waitingCount - 1 : 0,
      isPerformingAction: true,
      clearErrorMessage: true,
    );

    final endpoint = '/api/v1/branches/${state.branchId}/call-next';
    final payload = {'counter': state.activeCounter};

    try {
      final response = await _dioClient.dio.post(endpoint, data: payload);
      final calledToken = QueueTokenModel.fromJson(response.data);
      state = state.copyWith(
        currentToken: calledToken,
        isPerformingAction: false,
      );
    } on DioException catch (dioErr) {
      if (_isNetworkDown(dioErr)) {
        // Enqueue offline action
        await _offlineQueue.enqueueAction(endpoint: endpoint, payload: payload);
        state = state.copyWith(
          isPerformingAction: false,
          isOffline: true,
          pendingOfflineCount: _offlineQueue.pendingCount,
        );
      } else {
        // Hard failure: Rollback optimistic UI
        state = previousState.copyWith(
          isPerformingAction: false,
          errorMessage: 'Failed to call next token: ${dioErr.message}',
        );
      }
    } catch (e) {
      state = previousState.copyWith(
        isPerformingAction: false,
        errorMessage: 'Unexpected error: $e',
      );
    }
  }

  /// Action: Recall current token
  /// Triggers bell/alert chime on merchant side and sends REST /recall
  Future<void> recall() async {
    if (state.currentToken == null) return;
    final token = state.currentToken!;
    final endpoint = '/api/v1/branches/${state.branchId}/recall';
    final payload = {'token_id': token.id, 'counter': state.activeCounter};

    try {
      await _dioClient.dio.post(endpoint, data: payload);
    } on DioException catch (dioErr) {
      if (_isNetworkDown(dioErr)) {
        await _offlineQueue.enqueueAction(endpoint: endpoint, payload: payload);
      } else {
        state = state.copyWith(errorMessage: 'Recall failed: ${dioErr.message}');
      }
    }
  }

  /// Action: Complete current token
  /// Optimistic UI: Clears currentToken, increments completedTodayCount
  Future<void> complete() async {
    if (state.currentToken == null) return;
    final previousState = state;
    final token = state.currentToken!;

    // Optimistic UI
    state = state.copyWith(
      clearCurrentToken: true,
      completedTodayCount: state.completedTodayCount + 1,
      isPerformingAction: true,
      clearErrorMessage: true,
    );

    final endpoint = '/api/v1/branches/${state.branchId}/complete';
    final payload = {'token_id': token.id};

    try {
      await _dioClient.dio.post(endpoint, data: payload);
      state = state.copyWith(isPerformingAction: false);
    } on DioException catch (dioErr) {
      if (_isNetworkDown(dioErr)) {
        await _offlineQueue.enqueueAction(endpoint: endpoint, payload: payload);
        state = state.copyWith(isPerformingAction: false, isOffline: true);
      } else {
        // Rollback
        state = previousState.copyWith(
          isPerformingAction: false,
          errorMessage: 'Complete action failed: ${dioErr.message}',
        );
      }
    }
  }

  /// Action: Skip / No-Show
  /// Optimistic UI: Clears current token
  Future<void> skip() async {
    if (state.currentToken == null) return;
    final previousState = state;
    final token = state.currentToken!;

    state = state.copyWith(
      clearCurrentToken: true,
      isPerformingAction: true,
      clearErrorMessage: true,
    );

    final endpoint = '/api/v1/branches/${state.branchId}/skip';
    final payload = {'token_id': token.id};

    try {
      await _dioClient.dio.post(endpoint, data: payload);
      state = state.copyWith(isPerformingAction: false);
    } on DioException catch (dioErr) {
      if (_isNetworkDown(dioErr)) {
        await _offlineQueue.enqueueAction(endpoint: endpoint, payload: payload);
        state = state.copyWith(isPerformingAction: false, isOffline: true);
      } else {
        state = previousState.copyWith(
          isPerformingAction: false,
          errorMessage: 'Skip action failed: ${dioErr.message}',
        );
      }
    }
  }

  /// Action: Pause / Resume Queue
  Future<void> togglePause() async {
    final nextState = !state.isPaused;
    final previousState = state;
    state = state.copyWith(isPaused: nextState);

    final endpoint = nextState
        ? '/api/v1/branches/${state.branchId}/pause'
        : '/api/v1/branches/${state.branchId}/resume';

    try {
      await _dioClient.dio.post(endpoint);
    } on DioException catch (dioErr) {
      if (_isNetworkDown(dioErr)) {
        await _offlineQueue.enqueueAction(endpoint: endpoint, payload: {});
      } else {
        state = previousState.copyWith(
          errorMessage: 'Failed to update queue state: ${dioErr.message}',
        );
      }
    }
  }

  /// Action: 1-Tap Walk-In Token Generation
  Future<void> createWalkIn({
    required String serviceName,
    String? customerName,
    String? mobile,
    bool isSenior = false,
  }) async {
    final endpoint = '/api/v1/branches/${state.branchId}/walk-in';
    final payload = {
      'service_name': serviceName,
      'customer_name': customerName ?? (isSenior ? 'Senior Citizen' : 'Walk-In'),
      'mobile': mobile,
      'is_priority': isSenior,
    };

    try {
      final response = await _dioClient.dio.post(endpoint, data: payload);
      final newToken = QueueTokenModel.fromJson(response.data);
      // Append to nextTokens or update waiting count
      final updatedList = List<QueueTokenModel>.from(state.nextTokens)..add(newToken);
      state = state.copyWith(
        nextTokens: updatedList,
        waitingCount: state.waitingCount + 1,
      );
    } on DioException catch (dioErr) {
      if (_isNetworkDown(dioErr)) {
        await _offlineQueue.enqueueAction(endpoint: endpoint, payload: payload);
        state = state.copyWith(
          waitingCount: state.waitingCount + 1,
          isOffline: true,
        );
      } else {
        state = state.copyWith(errorMessage: 'Walk-in failed: ${dioErr.message}');
      }
    }
  }

  /// Trigger manual replay of offline queue
  Future<void> triggerOfflineReplay() async {
    final result = await _offlineQueue.replayPendingActions();
    if (result.status == ReplayStatus.completed) {
      state = state.copyWith(
        isOffline: false,
        pendingOfflineCount: _offlineQueue.pendingCount,
      );
    }
  }

  bool _isNetworkDown(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError;
  }

  @override
  void dispose() {
    _socketSubscription?.cancel();
    _offlineQueueSubscription?.cancel();
    super.dispose();
  }
}

final merchantDashboardProvider = StateNotifierProvider.family<
    MerchantDashboardNotifier, MerchantDashboardState, String>(
  (ref, branchId) => MerchantDashboardNotifier(
    branchId: branchId,
    branchName: 'Koramangala Express Branch',
  ),
);
