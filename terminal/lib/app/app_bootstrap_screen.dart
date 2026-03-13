import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/providers/auth_provider.dart';
import '../features/shift/providers/shift_controller.dart';
import 'widgets/virnyx_boot_loader.dart';

class AppBootstrapScreen extends ConsumerStatefulWidget {
  const AppBootstrapScreen({super.key});

  @override
  ConsumerState<AppBootstrapScreen> createState() => _AppBootstrapScreenState();
}

class _AppBootstrapScreenState extends ConsumerState<AppBootstrapScreen> {
  bool _started = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _bootstrap();
    });
  }

  Future<void> _bootstrap() async {
    if (_started) return;
    _started = true;

    try {
      final startedAt = DateTime.now();

      await ref.read(authProvider.notifier).restoreSession();
      await ref.read(shiftProvider.notifier).initialize();

      const minimumBrandTime = Duration(milliseconds: 4200);
      final elapsed = DateTime.now().difference(startedAt);

      if (elapsed < minimumBrandTime) {
        await Future.delayed(minimumBrandTime - elapsed);
      }

      if (!mounted) return;

      final auth = ref.read(authProvider);
      final shift = ref.read(shiftProvider);

      if (!auth.loggedIn) {
        context.go('/login');
        return;
      }

      if (!shift.active) {
        context.go('/open-shift');
        return;
      }

      context.go('/sales');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'App startup failed',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () {
                        setState(() {
                          _started = false;
                          _error = null;
                        });
                        _bootstrap();
                      },
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 0.95,
            colors: [
              theme.colorScheme.surface,
              theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.28),
            ],
          ),
        ),
        child: const Center(
          child: VirnyxBootLoader(),
        ),
      ),
    );
  }
}