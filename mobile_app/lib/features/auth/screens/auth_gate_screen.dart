import 'package:flutter/material.dart';

import '../../pos/screens/home_screen.dart';
import '../../shift/models/shift_session.dart';
import '../../shift/screens/shift_open_screen.dart';
import '../../shift/services/shift_service.dart';
import '../services/auth_service.dart';
import 'welcome_screen.dart';

class AuthGateScreen extends StatefulWidget {
  const AuthGateScreen({super.key});

  @override
  State<AuthGateScreen> createState() => _AuthGateScreenState();
}

class _AuthGateScreenState extends State<AuthGateScreen> {
  late final Future<void> _bootstrapFuture;
  bool _isAuthenticated = false;
  ShiftSession? _activeShift;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _bootstrap();
  }

  Future<void> _bootstrap() async {
    final session = await AuthService.instance.restoreSession();
    _isAuthenticated = session != null;

    if (!_isAuthenticated) {
      _activeShift = null;
      return;
    }

    _activeShift = await ShiftService.instance.getActiveShift();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _bootstrapFuture,
      builder: (BuildContext context, AsyncSnapshot<void> snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final session = AuthService.instance.currentSession;
        if (!_isAuthenticated || session == null) {
          return const WelcomeScreen();
        }

        if (_activeShift != null) {
          return HomeScreen(shiftSession: _activeShift!);
        }

        return ShiftOpenScreen(cashierName: session.displayName);
      },
    );
  }
}
