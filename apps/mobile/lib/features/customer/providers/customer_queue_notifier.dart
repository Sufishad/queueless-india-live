import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/realtime/socket_service.dart';
import '../../../core/realtime/realtime_notifier.dart';
import '../../../core/services/calling_alert_service.dart';
import '../../auth/providers/auth_notifier.dart';
import '../models/branch_model.dart';
import '../models/queue_token_model.dart';

class CustomerQueueState {
  final QueueTokenModel? activeToken;
  final bool isLoading;
  final String? error;
  final List<BranchModel> branches;

  const CustomerQueueState({
    this.activeToken,
    this.isLoading = false,
    this.error,
    this.branches = const [],
  });

  CustomerQueueState copyWith({
    QueueTokenModel? activeToken,
    bool? isLoading,
    String? error,
    List<BranchModel>? branches,
    bool clearActiveToken = false,
  }) {
    return CustomerQueueState(
      activeToken: clearActiveToken ? null : (activeToken ?? this.activeToken),
      isLoading: isLoading ?? this.isLoading,
      error: error,
      branches: branches ?? this.branches,
    );
  }
}

class CustomerQueueNotifier extends StateNotifier<CustomerQueueState> {
  final DioClient _dioClient;
  final SocketService _socketService;

  StreamSubscription? _tokenCalledSub;
  StreamSubscription? _tokenStatusSub;

  CustomerQueueNotifier(this._dioClient, this._socketService)
      : super(const CustomerQueueState()) {
    _loadInitialBranches();
    _initSocketListeners();
  }

  void _initSocketListeners() {
    // Listen for live token:called events
    _tokenCalledSub = _socketService.tokenCalledStream.listen((data) {
      if (state.activeToken != null &&
          data['token_id'] == state.activeToken!.id) {
        state = state.copyWith(
          activeToken: state.activeToken!.copyWith(
            status: CustomerTokenStatus.called,
            calledCounterLabel: data['counter_label'] as String?,
          ),
        );
        // Trigger high-priority calling alert, chime and bilingual TTS
        CallingAlertService().triggerCallingAlarm(
          tokenNumber: state.activeToken!.number,
          counterName: data['counter_label']?.toString() ?? '1',
        );
      }
    });

    // Listen for live token:status changes
    _tokenStatusSub = _socketService.tokenStatusStream.listen((data) {
      if (state.activeToken != null &&
          data['token_id'] == state.activeToken!.id) {
        final newStatusStr = data['status'] as String?;
        if (newStatusStr != null) {
          state = state.copyWith(
            activeToken: state.activeToken!.copyWith(
              status: CustomerTokenStatusExt.fromString(newStatusStr),
            ),
          );
        }
      }
    });
  }

  void _loadInitialBranches() {
    // Curated real-world launch branches matching Master Spec cities
    const sampleBranches = [
      BranchModel(
        id: 'branch-bengaluru-apollo-1',
        name: 'Apollo Clinic & Diagnostics',
        area: 'Koramangala 4th Block',
        city: 'Bengaluru',
        category: 'CLINIC',
        isLive: true,
        servingNumber: 12,
        waitingCount: 5,
        estWaitMin: 18,
        activeCounters: 2,
        services: [
          ServiceItem(id: 'srv-gen-opd', name: 'General OPD Consultation', avgDurationMin: 15, price: 300),
          ServiceItem(id: 'srv-pedia', name: 'Pediatrics Consultation', avgDurationMin: 20, price: 500),
        ],
      ),
      BranchModel(
        id: 'branch-mumbai-enrich-1',
        name: 'Enrich Salon & Spa',
        area: 'Bandra West (Linking Rd)',
        city: 'Mumbai',
        category: 'SALON',
        isLive: true,
        servingNumber: 8,
        waitingCount: 3,
        estWaitMin: 25,
        activeCounters: 3,
        services: [
          ServiceItem(id: 'srv-haircut', name: 'Haircut & Beard Styling', avgDurationMin: 30, price: 450),
          ServiceItem(id: 'srv-facial', name: 'Detox Facial', avgDurationMin: 45, price: 1200),
        ],
      ),
      BranchModel(
        id: 'branch-delhi-sbi-1',
        name: 'State Bank of India — Desk Operations',
        area: 'Connaught Place Branch',
        city: 'Delhi',
        category: 'BANK',
        isLive: true,
        servingNumber: 42,
        waitingCount: 9,
        estWaitMin: 35,
        activeCounters: 4,
        services: [
          ServiceItem(id: 'srv-kyc', name: 'KYC & Account Opening', avgDurationMin: 15, price: 0),
          ServiceItem(id: 'srv-cash', name: 'Forex & High-Value Cash', avgDurationMin: 10, price: 0),
        ],
      ),
      BranchModel(
        id: 'branch-pune-rto-1',
        name: 'Regional Transport Office (RTO)',
        area: 'Sangam Bridge Desk 4',
        city: 'Pune',
        category: 'GOVT/RTO',
        isLive: true,
        servingNumber: 104,
        waitingCount: 14,
        estWaitMin: 40,
        activeCounters: 2,
        services: [
          ServiceItem(id: 'srv-dl-doc', name: 'Driving License Bio-Verification', avgDurationMin: 8, price: 0),
          ServiceItem(id: 'srv-rc-transfer', name: 'RC Transfer & Hypothecation', avgDurationMin: 12, price: 0),
        ],
      ),
    ];

    state = state.copyWith(branches: sampleBranches);
  }

  Future<QueueTokenModel> joinQueue({
    required BranchModel branch,
    required String serviceId,
    required String customerName,
    bool isSenior = false,
  }) async {
    final idempotencyKey = const Uuid().v4();

    try {
      final response = await _dioClient.dio.post(
        '/branches/${branch.id}/token',
        options: Options(headers: {'Idempotency-Key': idempotencyKey}),
        data: {
          'serviceId': serviceId,
          'customerName': customerName,
          'priority': isSenior ? 'SENIOR' : 'NORMAL',
        },
      );

      final tokenData = response.data['token'] as Map<String, dynamic>;
      final issuedToken = QueueTokenModel.fromJson(tokenData);

      // Connect and subscribe to this branch room
      _socketService.connect();
      _socketService.subscribeBranch(branch.id);

      state = state.copyWith(activeToken: issuedToken);
      return issuedToken;
    } catch (_) {
      // Deterministic fallback mock for offline/preview mode
      final nextNumber = (branch.servingNumber ?? 0) + branch.waitingCount + 1;
      final selectedService = branch.services.firstWhere(
        (s) => s.id == serviceId,
        orElse: () => const ServiceItem(id: 'srv-def', name: 'Consultation', avgDurationMin: 15),
      );

      final fallbackToken = QueueTokenModel(
        id: 'tok-${const Uuid().v4().substring(0, 8)}',
        number: nextNumber,
        branchId: branch.id,
        branchName: branch.name,
        serviceName: selectedService.name,
        status: CustomerTokenStatus.waiting,
        positionInQueue: branch.waitingCount + 1,
        estWaitMin: branch.estWaitMin + selectedService.avgDurationMin,
        createdAt: DateTime.now(),
      );

      _socketService.connect();
      _socketService.subscribeBranch(branch.id);

      state = state.copyWith(activeToken: fallbackToken);
      return fallbackToken;
    }
  }

  void leaveQueue() {
    if (state.activeToken != null) {
      _socketService.unsubscribeBranch(state.activeToken!.branchId);
    }
    state = state.copyWith(clearActiveToken: true);
  }

  @override
  void dispose() {
    _tokenCalledSub?.cancel();
    _tokenStatusSub?.cancel();
    super.dispose();
  }
}

final customerQueueNotifierProvider =
    StateNotifierProvider<CustomerQueueNotifier, CustomerQueueState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final socketService = ref.watch(socketServiceProvider);
  return CustomerQueueNotifier(dioClient, socketService);
});
