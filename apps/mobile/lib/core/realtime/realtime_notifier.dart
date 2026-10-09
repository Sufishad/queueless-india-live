import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'socket_service.dart';

class BranchLiveQueueState {
  final String branchId;
  final int? servingNumber;
  final int waitingCount;
  final int estWaitMin;
  final List<int> nextNumbers;
  final int activeCounters;
  final bool isPaused;
  final SocketConnectionState connectionStatus;
  final DateTime? lastUpdated;

  const BranchLiveQueueState({
    required this.branchId,
    this.servingNumber,
    this.waitingCount = 0,
    this.estWaitMin = 0,
    this.nextNumbers = const [],
    this.activeCounters = 1,
    this.isPaused = false,
    this.connectionStatus = SocketConnectionState.disconnected,
    this.lastUpdated,
  });

  BranchLiveQueueState copyWith({
    int? servingNumber,
    int? waitingCount,
    int? estWaitMin,
    List<int>? nextNumbers,
    int? activeCounters,
    bool? isPaused,
    SocketConnectionState? connectionStatus,
    DateTime? lastUpdated,
  }) {
    return BranchLiveQueueState(
      branchId: branchId,
      servingNumber: servingNumber ?? this.servingNumber,
      waitingCount: waitingCount ?? this.waitingCount,
      estWaitMin: estWaitMin ?? this.estWaitMin,
      nextNumbers: nextNumbers ?? this.nextNumbers,
      activeCounters: activeCounters ?? this.activeCounters,
      isPaused: isPaused ?? this.isPaused,
      connectionStatus: connectionStatus ?? this.connectionStatus,
      lastUpdated: lastUpdated ?? this.lastUpdated,
    );
  }
}

class BranchLiveQueueNotifier extends StateNotifier<BranchLiveQueueState> {
  final SocketService _socketService;
  final String branchId;

  StreamSubscription? _connSub;
  StreamSubscription? _queueSub;
  StreamSubscription? _pauseSub;
  StreamSubscription? _resumeSub;

  BranchLiveQueueNotifier(this._socketService, this.branchId)
      : super(BranchLiveQueueState(branchId: branchId)) {
    _init();
  }

  void _init() {
    _socketService.connect();
    _socketService.subscribeBranch(branchId);

    _connSub = _socketService.connectionStateStream.listen((status) {
      state = state.copyWith(connectionStatus: status);
    });

    _queueSub = _socketService.queueUpdateStream.listen((data) {
      if (data['branchId'] == branchId) {
        state = state.copyWith(
          servingNumber: data['serving'] as int?,
          waitingCount: (data['waiting_count'] as int?) ?? 0,
          estWaitMin: (data['est_wait_min'] as int?) ?? 0,
          nextNumbers: (data['next_numbers'] as List<dynamic>?)
                  ?.map((e) => e as int)
                  .toList() ??
              [],
          activeCounters: (data['active_counters'] as int?) ?? 1,
          lastUpdated: DateTime.now(),
        );
      }
    });

    _pauseSub = _socketService.queuePausedStream.listen((data) {
      if (data['branchId'] == branchId) {
        state = state.copyWith(isPaused: true);
      }
    });

    _resumeSub = _socketService.queueResumedStream.listen((data) {
      if (data['branchId'] == branchId) {
        state = state.copyWith(isPaused: false);
      }
    });
  }

  @override
  void dispose() {
    _socketService.unsubscribeBranch(branchId);
    _connSub?.cancel();
    _queueSub?.cancel();
    _pauseSub?.cancel();
    _resumeSub?.cancel();
    super.dispose();
  }
}

// Global Providers
final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  ref.onDispose(() => service.dispose());
  return service;
});

final branchLiveQueueProvider = StateNotifierProvider.family<
    BranchLiveQueueNotifier, BranchLiveQueueState, String>((ref, branchId) {
  final socket = ref.watch(socketServiceProvider);
  return BranchLiveQueueNotifier(socket, branchId);
});
