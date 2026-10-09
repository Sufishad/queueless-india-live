import 'dart:convert';

/// Represents a merchant mutation action queued while offline or during 2G/3G link drops.
class QueuedMerchantAction {
  final String id;
  final String endpoint;
  final String method; // POST, PUT, DELETE, etc.
  final Map<String, dynamic> payload;
  final String idempotencyKey;
  final DateTime createdAt;
  final int retryCount;

  QueuedMerchantAction({
    required this.id,
    required this.endpoint,
    required this.method,
    required this.payload,
    required this.idempotencyKey,
    required this.createdAt,
    this.retryCount = 0,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'endpoint': endpoint,
      'method': method,
      'payload': payload,
      'idempotencyKey': idempotencyKey,
      'createdAt': createdAt.toIso8601String(),
      'retryCount': retryCount,
    };
  }

  factory QueuedMerchantAction.fromMap(Map<String, dynamic> map) {
    return QueuedMerchantAction(
      id: map['id'] as String,
      endpoint: map['endpoint'] as String,
      method: (map['method'] as String?) ?? 'POST',
      payload: Map<String, dynamic>.from(map['payload'] as Map),
      idempotencyKey: map['idempotencyKey'] as String,
      createdAt: DateTime.parse(map['createdAt'] as String),
      retryCount: (map['retryCount'] as int?) ?? 0,
    );
  }

  String toJson() => jsonEncode(toMap());

  factory QueuedMerchantAction.fromJson(String source) =>
      QueuedMerchantAction.fromMap(jsonDecode(source) as Map<String, dynamic>);

  QueuedMerchantAction copyWith({
    int? retryCount,
  }) {
    return QueuedMerchantAction(
      id: id,
      endpoint: endpoint,
      method: method,
      payload: payload,
      idempotencyKey: idempotencyKey,
      createdAt: createdAt,
      retryCount: retryCount ?? this.retryCount,
    );
  }
}
