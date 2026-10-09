import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:uuid/uuid.dart';
import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/queued_action_model.dart';

/// Type definition for the HTTP executor callback (supports dependency injection for unit tests)
typedef ActionHttpExecutor = Future<Response> Function(
  String endpoint,
  String method,
  Map<String, dynamic> payload,
  String idempotencyKey,
);

/// OfflineActionQueueService
/// Manages merchant actions created during 2G/3G network drops or offline store operations.
/// Guarantees:
/// 1. Persistent DPDP-compliant encrypted storage in Hive box `offline_merchant_actions` (AES-256)
/// 2. Strict FIFO execution order (oldest `createdAt` first)
/// 3. Concurrency lock: Replay runs sequentially and NEVER double-replays
/// 4. Idempotency protection: Server rejects or safely deduplicates identical keys
/// 5. Auto-replay: Listens to connectivity_plus and triggers replay on network restore
class OfflineActionQueueService {
  static const String boxName = 'offline_merchant_actions';
  static const String cipherKeyStorageKey = 'hive_offline_actions_cipher_key';

  static final OfflineActionQueueService _instance =
      OfflineActionQueueService._internal();

  factory OfflineActionQueueService() => _instance;
  OfflineActionQueueService._internal();

  Box<String>? _box;
  bool _isReplaying = false;
  final _uuid = const Uuid();
  final SecureStorageService _secureStorage = SecureStorageService();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  final StreamController<int> _pendingCountController =
      StreamController<int>.broadcast();
  Stream<int> get pendingCountStream => _pendingCountController.stream;

  /// Custom executor hook (used in unit tests to mock network without Dio)
  ActionHttpExecutor? customExecutor;

  /// Initialize encrypted Hive box and auto-replay connectivity listener
  Future<void> initialize({Box<String>? injectedBox, bool listenConnectivity = true}) async {
    if (injectedBox != null) {
      _box = injectedBox;
    } else if (_box == null || !_box!.isOpen) {
      // DPDP Act 2023 compliance: Retrieve or generate 256-bit AES key from FlutterSecureStorage
      List<int> cipherKey;
      try {
        final storedKey = await _secureStorage.read(cipherKeyStorageKey);
        if (storedKey != null && storedKey.isNotEmpty) {
          cipherKey = base64Decode(storedKey);
        } else {
          cipherKey = Hive.generateSecureKey();
          await _secureStorage.write(cipherKeyStorageKey, base64Encode(cipherKey));
        }
      } catch (e) {
        debugPrint('[OfflineQueue] Secure storage fallback for key: $e');
        cipherKey = Hive.generateSecureKey();
      }

      _box = await Hive.openBox<String>(
        boxName,
        encryptionCipher: HiveAesCipher(cipherKey),
      );
    }

    if (listenConnectivity) {
      _setupConnectivityListener();
    }

    _notifyCount();
  }

  void _setupConnectivityListener() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOnline = results.any((r) => r != ConnectivityResult.none);
      if (isOnline && pendingCount > 0 && !_isReplaying) {
        debugPrint('[OfflineQueue] Network restored ($results). Triggering auto-replay...');
        replayPendingActions();
      }
    });
  }

  Box<String> get _activeBox {
    if (_box == null || !_box!.isOpen) {
      throw StateError(
          'OfflineActionQueueService has not been initialized. Call initialize() first.');
    }
    return _box!;
  }

  /// Number of actions currently queued offline
  int get pendingCount => _box?.isOpen == true ? _box!.length : 0;

  /// Enqueue an action into the offline storage
  Future<QueuedMerchantAction> enqueueAction({
    required String endpoint,
    String method = 'POST',
    required Map<String, dynamic> payload,
    String? idempotencyKey,
  }) async {
    final action = QueuedMerchantAction(
      id: _uuid.v4(),
      endpoint: endpoint,
      method: method.toUpperCase(),
      payload: payload,
      idempotencyKey: idempotencyKey ?? _uuid.v4(),
      createdAt: DateTime.now(),
    );

    await _activeBox.put(action.id, action.toJson());
    debugPrint(
      '[OfflineQueue] Enqueued action ${action.id} ($method $endpoint) - total pending: ${_activeBox.length}',
    );
    _notifyCount();
    return action;
  }

  /// Replay pending actions strictly in FIFO order.
  /// Uses a mutex lock to guarantee no concurrent or double replays.
  Future<ReplayResult> replayPendingActions() async {
    if (_isReplaying) {
      debugPrint('[OfflineQueue] Replay already in progress. Skipping concurrent pass.');
      return ReplayResult(replayedCount: 0, status: ReplayStatus.alreadyInProgress);
    }

    if (_activeBox.isEmpty) {
      return ReplayResult(replayedCount: 0, status: ReplayStatus.queueEmpty);
    }

    _isReplaying = true;
    int replayedSuccess = 0;

    try {
      // 1. Load all pending actions and sort strictly by createdAt ASC (FIFO)
      final allEntries = _activeBox.toMap().entries.map((entry) {
        return QueuedMerchantAction.fromJson(entry.value);
      }).toList();

      allEntries.sort((a, b) => a.createdAt.compareTo(b.createdAt));

      debugPrint('[OfflineQueue] Starting FIFO replay of ${allEntries.length} actions');

      // 2. Sequentially process each action
      for (final action in allEntries) {
        // Double check that item was not deleted by an external reset
        if (!_activeBox.containsKey(action.id)) continue;

        try {
          debugPrint(
            '[OfflineQueue] Replaying action ${action.id} -> ${action.method} ${action.endpoint} (key: ${action.idempotencyKey})',
          );

          final response = await _executeHttp(
            endpoint: action.endpoint,
            method: action.method,
            payload: action.payload,
            idempotencyKey: action.idempotencyKey,
          );

          final statusCode = response.statusCode ?? 200;

          // 2xx Success OR 409 Conflict (idempotent duplicate already committed on server)
          if ((statusCode >= 200 && statusCode < 300) || statusCode == 409) {
            await _activeBox.delete(action.id);
            replayedSuccess++;
            debugPrint('[OfflineQueue] Action ${action.id} successfully processed and removed.');
          } else if (statusCode >= 400 && statusCode < 500) {
            // Unrecoverable client error (e.g., token already cancelled).
            // Discard so it does not permanently poison the queue.
            debugPrint(
              '[OfflineQueue] Action ${action.id} rejected with $statusCode. Removing poison pill.',
            );
            await _activeBox.delete(action.id);
          } else {
            // 5xx Server error -> Stop replay to maintain ordering
            debugPrint('[OfflineQueue] Server error $statusCode. Halting replay.');
            break;
          }
        } on DioException catch (dioErr) {
          // Check for network unreachable / socket drop
          if (_isNetworkConnectivityError(dioErr)) {
            debugPrint('[OfflineQueue] Network still offline during replay. Pausing queue.');
            break; // Stop and retry on next connectivity event
          } else if (dioErr.response?.statusCode == 409) {
            // Idempotency conflict already applied
            await _activeBox.delete(action.id);
            replayedSuccess++;
          } else if (dioErr.response != null &&
              dioErr.response!.statusCode! >= 400 &&
              dioErr.response!.statusCode! < 500) {
            // Discard invalid request
            await _activeBox.delete(action.id);
          } else {
            break;
          }
        } catch (e) {
          debugPrint('[OfflineQueue] Execution error on ${action.id}: $e');
          break;
        }
      }
    } finally {
      _isReplaying = false;
      _notifyCount();
    }

    return ReplayResult(
      replayedCount: replayedSuccess,
      status: ReplayStatus.completed,
    );
  }

  /// Internal HTTP executor router
  Future<Response> _executeHttp({
    required String endpoint,
    required String method,
    required Map<String, dynamic> payload,
    required String idempotencyKey,
  }) async {
    if (customExecutor != null) {
      return await customExecutor!(endpoint, method, payload, idempotencyKey);
    }

    final dio = DioClient().dio;
    final options = Options(
      method: method,
      headers: {
        'Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
    );

    return await dio.request(
      endpoint,
      data: payload,
      options: options,
    );
  }

  bool _isNetworkConnectivityError(DioException error) {
    return error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.sendTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError;
  }

  void _notifyCount() {
    if (_pendingCountController.hasListener) {
      _pendingCountController.add(pendingCount);
    }
  }

  /// Clear all stored actions (useful for test isolation)
  Future<void> clearAll() async {
    await _activeBox.clear();
    _notifyCount();
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _pendingCountController.close();
  }
}

enum ReplayStatus { completed, alreadyInProgress, queueEmpty, error }

class ReplayResult {
  final int replayedCount;
  final ReplayStatus status;

  ReplayResult({required this.replayedCount, required this.status});
}
