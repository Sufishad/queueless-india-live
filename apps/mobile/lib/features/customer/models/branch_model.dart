class ServiceItem {
  final String id;
  final String name;
  final int avgDurationMin;
  final double price;

  const ServiceItem({
    required this.id,
    required this.name,
    required this.avgDurationMin,
    this.price = 0.0,
  });

  factory ServiceItem.fromJson(Map<String, dynamic> json) {
    return ServiceItem(
      id: json['id'] as String,
      name: json['name'] as String,
      avgDurationMin: (json['avgDurationMin'] as int?) ?? 15,
      price: ((json['price'] as num?) ?? 0.0).toDouble(),
    );
  }
}

class BranchModel {
  final String id;
  final String name;
  final String area;
  final String city;
  final String category;
  final bool isLive;
  final bool isVerified;
  final int? servingNumber;
  final int waitingCount;
  final int estWaitMin;
  final int activeCounters;
  final List<ServiceItem> services;

  const BranchModel({
    required this.id,
    required this.name,
    required this.area,
    required this.city,
    required this.category,
    this.isLive = true,
    this.isVerified = true,
    this.servingNumber,
    this.waitingCount = 0,
    this.estWaitMin = 0,
    this.activeCounters = 1,
    this.services = const [],
  });

  factory BranchModel.fromJson(Map<String, dynamic> json) {
    return BranchModel(
      id: json['id'] as String,
      name: json['name'] as String,
      area: json['area'] as String? ?? 'City Center',
      city: json['city'] as String? ?? 'Bengaluru',
      category: json['category'] as String? ?? 'CLINIC',
      isLive: (json['isLive'] as bool?) ?? true,
      isVerified: (json['isVerified'] as bool?) ?? true,
      servingNumber: json['servingNumber'] as int?,
      waitingCount: (json['waitingCount'] as int?) ?? 0,
      estWaitMin: (json['estWaitMin'] as int?) ?? 0,
      activeCounters: (json['activeCounters'] as int?) ?? 1,
      services: (json['services'] as List<dynamic>?)
              ?.map((s) => ServiceItem.fromJson(s as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
