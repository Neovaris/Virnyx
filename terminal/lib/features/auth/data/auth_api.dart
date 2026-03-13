import '../../../core/api/api_client.dart';

class AuthApi {
  final ApiClient api;
  AuthApi(this.api);

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) {
    return api.postJson('/auth/login', body: {
      'email': email,
      'password': password,
    });
  }

  Future<Map<String, dynamic>> me() {
    return api.getJson('/auth/me');
  }
}