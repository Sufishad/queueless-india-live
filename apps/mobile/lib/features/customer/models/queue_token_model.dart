enum CustomerTokenStatus {
  waiting,
  called,
  inService,
  completed,
  cancelled,
}

extension CustomerTokenStatusExt on CustomerTokenStatus {
  String get displayName {
    switch (this) {
      case CustomerTokenStatus.waiting:
        return 'WAITING (प्रतीक्षा)';
      case CustomerTokenStatus.called:
        return 'CALLED (बुलाया गया)';
      case CustomerTokenStatus.inService:
        return 'IN SERVICE (सेवा में)';
      case CustomerTokenStatus.completed:
        return 'COMPLETED (सम्पन्न)';
      case CustomerTokenStatus.cancelled:
        return 'CANCELLED (रद्द)';
    }
  }

  static CustomerTokenStatus fromString(String status) {
    switch (status.toUpperCase()) {
      case 'CALLED':
        return CustomerTokenStatus.called;
      case 'IN_SERVICE':
        return CustomerTokenStatus.inService;
      case 'COMPLETED':
        return CustomerTokenStatus.completed;
      case 'CANCELLED':
        return CustomerTokenStatus.cancelled;
      case 'WAITING':
      default:
        return CustomerTokenStatus.waiting;
    }
  }
}

class QueueTokenModel {
  final String id;
  final int number;
  final String branchId;
  final String branchName;
  final String serviceName;
  final CustomerTokenStatus status;
  final String? calledCounterLabel;
  final int positionInQueue;
  final int estWaitMin;
  final DateTime createdAt;
  final String? customerName;
  final String? date;
  final DateTime? calledAt;
  final int? estimatedWaitSeconds;

  String? get counterAssigned => calledCounterLabel;
  int get estimatedWaitMinutes => estWaitMin;

  QueueTokenModel({
    required this.id,
    required this.number,
    required this.branchId,
    this.branchName = 'Clinic',
    this.serviceName = 'Standard Service',
    this.status = CustomerTokenStatus.waiting,
    this.calledCounterLabel,
    this.positionInQueue = 1,
    this.estWaitMin = 0,
    DateTime? createdAt,
    this.customerName,
    this.date,
    this.calledAt,
    this.estimatedWaitSeconds,
    String? counterAssigned,
  }) : createdAt = createdAt ?? DateTime.now();

  factory QueueTokenModel.fromJson(Map<String, dynamic> json) {
    return QueueTokenModel(
      id: json['id'] as String,
      number: json['number'] as int,
      branchId: json['branchId'] as String,
      branchName: (json['branchName'] as String?) ?? 'Branch',
      serviceName: (json['serviceName'] as String?) ?? 'Standard Service',
      status: CustomerTokenStatusExt.fromString(
        (json['status'] as String?) ?? 'WAITING',
      ),
      calledCounterLabel: json['calledCounterLabel'] as String?,
      positionInQueue: (json['positionInQueue'] as int?) ?? 1,
      estWaitMin: (json['estWaitMin'] as int?) ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : DateTime.now(),
    );
  }

  QueueTokenModel copyWith({
    CustomerTokenStatus? status,
    String? calledCounterLabel,
    String? counterAssigned,
    int? positionInQueue,
    int? estWaitMin,
    int? estimatedWaitMinutes,
    String? customerName,
    String? date,
    DateTime? calledAt,
    int? estimatedWaitSeconds,
  }) {
    return QueueTokenModel(
      id: id,
      number: number,
      branchId: branchId,
      branchName: branchName,
      serviceName: serviceName,
      status: status ?? this.status,
      calledCounterLabel: counterAssigned ?? calledCounterLabel ?? this.calledCounterLabel,
      positionInQueue: positionInQueue ?? this.positionInQueue,
      estWaitMin: estimatedWaitMinutes ?? estWaitMin ?? this.estWaitMin,
      createdAt: createdAt,
      customerName: customerName ?? this.customerName,
      date: date ?? this.date,
      calledAt: calledAt ?? this.calledAt,
      estimatedWaitSeconds: estimatedWaitSeconds ?? this.estimatedWaitSeconds,
    );
  }
}
