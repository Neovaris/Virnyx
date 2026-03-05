import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'api_config.dart';
import '../session/session_store.dart';

final sessionStoreProvider = Provider((ref) => SessionStore());

final apiProvider = Provider<ApiClient>((ref) {
  // token will be set by auth controller after login
  return ApiClient(baseUrl: ApiConfig.baseUrl);
});