import 'package:flutter/material.dart';
import 'features/auth/screens/auth_gate_screen.dart';
import 'shared/services/offline_services_initializer.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize offline-first system
  await OfflineServicesInitializer.initialize();

  // Optional: global error handling (recommended)
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    // You can later send this to logging service (Sentry, etc)
  };

  runApp(const VirnyxMobileApp());
}

class VirnyxMobileApp extends StatelessWidget {
  const VirnyxMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Virnyx Mobile',
      debugShowCheckedModeBanner: false,

      // 🔥 Add this
      theme: appTheme,

      // 🔥 Future-ready navigation
      home: const AuthGateScreen(),
    );
  }
}