import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:hive/hive.dart';
import 'package:queueless_mobile/features/merchant/models/queued_action_model.dart';
import 'package:queueless_mobile/features/merchant/services/offline_action_queue_service.dart';

/// Simple in-memory Hive Box mock for unit testing
class MockHiveBox implements Box<String> {
  final Map<dynamic, String> _store = {};

  @override
  bool get isOpen => true;

  @override
  int get length => _store.length;

  @override
  bool get isEmpty => _store.isEmpty;

  @override
  bool get isNotEmpty => _store.isNotEmpty;

  @override
  Map<dynamic, String> toMap() => Map.from(_store);

  @override
  bool containsKey(dynamic key) => _store.containsKey(key);

  @override
  String? get(dynamic key, {String? defaultValue}) => _store[key] ?? defaultValue;

  @override
  Future<void> put(dynamic key, String value) async {
    _store[key] = value;
  }

  @override
  Future<void> delete(dynamic key) async {
    _store.remove(key);
  }

  @override
  Future<int> clear() async {
    final count = _store.length;
    _store.clear();
    return count;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  group('OfflineActionQueueService Tests', () {
    late OfflineActionQueueService service;
    late MockHiveBox mockBox;

    setUp(() async {
      service = OfflineActionQueueService();
      mockBox = MockHiveBox();
      await service.initialize(injectedBox: mockBox, listenConnectivity: false);
    });

    test('enqueued actions are stored with unique idempotencyKey and timestamps', () async {
      final action1 = await service.enqueueAction(
        endpoint: '/api/v1/branches/b1/call-next',
        payload: {'counter': '1'},
      );

      final action2 = await service.enqueueAction(
        endpoint: '/api/v1/branches/b1/complete',
        payload: {'token_id': 'tok-1'},
      );

      expect(mockBox.length, equals(2));
      expect(action1.idempotencyKey, isNotEmpty);
      expect(action2.idempotencyKey, isNotEmpty);
      expect(action1.idempotencyKey, isNot(equals(action2.idempotencyKey)));
    });

    test('replays actions in strict FIFO order and deletes completed items', () async {
      final executionLog = <String>[];

      // Add actions with staggered timestamps
      final firstAction = QueuedMerchantAction(
        id: 'action-1',
        endpoint: '/api/v1/branches/b1/call-next',
        method: 'POST',
        payload: {'counter': '1'},
        idempotencyKey: 'key-1',
        createdAt: DateTime.now().subtract(const Duration(minutes: 5)),
      );

      final secondAction = QueuedMerchantAction(
        id: 'action-2',
        endpoint: '/api/v1/branches/b1/complete',
        method: 'POST',
        payload: {'token_id': 'tok-14'},
        idempotencyKey: 'key-2',
        createdAt: DateTime.now().subtract(const Duration(minutes: 1)),
      );

      await mockBox.put(secondAction.id, secondAction.toJson());
      await mockBox.put(firstAction.id, firstAction.toJson());

      // Mock HTTP Executor
      service.customExecutor = (endpoint, method, payload, idempotencyKey) async {
        executionLog.add('$method $endpoint with key $idempotencyKey');
        return Response(
          requestOptions: RequestOptions(path: endpoint),
          statusCode: 200,
        );
      };

      final result = await service.replayPendingActions();

      expect(result.status, equals(ReplayStatus.completed));
      expect(result.replayedCount, equals(2));

      // Verify FIFO ordering: firstAction was executed BEFORE secondAction
      expect(executionLog.length, equals(2));
      expect(executionLog[0], contains('key-1'));
      expect(executionLog[1], contains('key-2'));

      // Verify box is now completely drained — items deleted, never double-replayed
      expect(mockBox.length, equals(0));
    });

    test('concurrent replay calls are rejected and NEVER double-replay', () async {
      int serverCallCount = 0;

      final action = QueuedMerchantAction(
        id: 'action-single',
        endpoint: '/api/v1/branches/b1/call-next',
        method: 'POST',
        payload: {'counter': '1'},
        idempotencyKey: 'key-concurrent',
        createdAt: DateTime.now(),
      );
      await mockBox.put(action.id, action.toJson());

      // Slow executor simulating network latency
      service.customExecutor = (endpoint, method, payload, idempotencyKey) async {
        serverCallCount++;
        await Future.delayed(const Duration(milliseconds: 50));
        return Response(
          requestOptions: RequestOptions(path: endpoint),
          statusCode: 200,
        );
      };

      // Trigger two simultaneous replays
      final future1 = service.replayPendingActions();
      final future2 = service.replayPendingActions();

      final results = await Future.wait([future1, future2]);

      // Exactly one replay handled the queue, the other was skipped
      final completedOne = results.where((r) => r.status == ReplayStatus.completed);
      final skippedOne = results.where((r) => r.status == ReplayStatus.alreadyInProgress);

      expect(completedOne.length, equals(1));
      expect(skippedOne.length, equals(1));
      expect(serverCallCount, equals(1)); // Server received action exactly ONCE
      expect(mockBox.length, equals(0));
    });

    test('handles 409 idempotency conflict by safely removing item without retrying', () async {
      final action = QueuedMerchantAction(
        id: 'action-dup',
        endpoint: '/api/v1/branches/b1/call-next',
        method: 'POST',
        payload: {'counter': '1'},
        idempotencyKey: 'key-dup',
        createdAt: DateTime.now(),
      );
      await mockBox.put(action.id, action.toJson());

      // Return 409 Conflict
      service.customExecutor = (endpoint, method, payload, idempotencyKey) async {
        return Response(
          requestOptions: RequestOptions(path: endpoint),
          statusCode: 409,
        );
      };

      final result = await service.replayPendingActions();

      expect(result.status, equals(ReplayStatus.completed));
      expect(result.replayedCount, equals(1));
      expect(mockBox.length, equals(0)); // Removed safely
    });
  });
}
