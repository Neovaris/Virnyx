import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/api/api_provider.dart';
import '../data/auth_api.dart';
import 'auth_provider.dart';

class UserData {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? phone;
  final String? storeId;
  final String? storeName;

  const UserData({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.phone,
    this.storeId,
    this.storeName,
  });

  String get initials {
    return name
        .split(' ')
        .where((word) => word.isNotEmpty)
        .take(2)
        .map((word) => word[0].toUpperCase())
        .join();
  }

  String get roleLabel {
    return role.replaceFirst(role[0], role[0].toUpperCase());
  }

  factory UserData.fromJson(Map<String, dynamic> json) {
    return UserData(
      id: json['id'] ?? '',
      name: json['fullName'] ?? json['name'] ?? 'User',
      email: json['email'] ?? '',
      role: json['role'] ?? 'cashier',
      phone: json['phone'],
      storeId: json['storeId'],
      storeName: json['storeName'],
    );
  }
}

final userProvider = FutureProvider<UserData?>((ref) async {
  final authState = ref.watch(authProvider);

  // Only fetch if logged in
  if (!authState.loggedIn) {
    return null;
  }

  try {
    final apiClient = ref.read(apiProvider);
    final authApi = AuthApi(apiClient);
    final res = await authApi.me();

    final rawUser = (res['user'] as Map).cast<String, dynamic>();

    return UserData.fromJson(rawUser);
  } catch (e) {
    return null;
  }
});
