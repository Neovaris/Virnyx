class AuthSession {
  const AuthSession({
    required this.token,
    required this.userId,
    required this.email,
    required this.fullName,
    required this.merchantId,
    this.storeName,
  });

  final String token;
  final String userId;
  final String email;
  final String fullName;
  final String merchantId;
  final String? storeName;

  String get displayName => fullName.trim().isEmpty ? email : fullName;

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'token': token,
      'userId': userId,
      'email': email,
      'fullName': fullName,
      'merchantId': merchantId,
      'storeName': storeName,
    };
  }

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      token: (json['token'] ?? '').toString(),
      userId: (json['userId'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      fullName: (json['fullName'] ?? '').toString(),
      merchantId: (json['merchantId'] ?? '').toString(),
      storeName: json['storeName']?.toString(),
    );
  }

  AuthSession copyWith({
    String? token,
    String? userId,
    String? email,
    String? fullName,
    String? merchantId,
    String? storeName,
  }) {
    return AuthSession(
      token: token ?? this.token,
      userId: userId ?? this.userId,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      merchantId: merchantId ?? this.merchantId,
      storeName: storeName ?? this.storeName,
    );
  }
}
