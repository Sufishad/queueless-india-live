class AuthUser {
  final String id;
  final String mobile;
  final String? name;
  final String role;

  const AuthUser({
    required this.id,
    required this.mobile,
    this.name,
    this.role = 'CUSTOMER',
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      mobile: json['mobile'] as String,
      name: json['name'] as String?,
      role: (json['role'] as String?) ?? 'CUSTOMER',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'mobile': mobile,
      'name': name,
      'role': role,
    };
  }
}
