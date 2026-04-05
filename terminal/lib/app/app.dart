import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'router.dart';
import 'theme/theme_controller.dart';
import 'theme/theme_data.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/providers/merchant_settings_provider.dart';

class VirnyxApp extends ConsumerStatefulWidget {
  const VirnyxApp({super.key});

  @override
  ConsumerState<VirnyxApp> createState() => _VirnyxAppState();
}

class _VirnyxAppState extends ConsumerState<VirnyxApp>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  /// Refresh settings whenever the app returns to the foreground, but only
  /// when a user is actively logged in.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      final auth = ref.read(authProvider);
      if (auth.loggedIn) {
        ref.read(merchantSettingsProvider.notifier).refresh();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final mode = ref.watch(themeControllerProvider);

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'Virnyx Terminal',
      theme: lightTheme(),
      darkTheme: darkTheme(),
      themeMode: mode,
      routerConfig: appRouter(ref),
    );
  }
}
