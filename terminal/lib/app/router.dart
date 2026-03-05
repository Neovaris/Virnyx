import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/shift/shift_controller.dart';
import '../features/shift/shift_gate_screen.dart';
import '../features/sales/sales_screen.dart';
import '../features/sales/payment/payment_screen.dart';
import '../features/sales/sales/sales_history_screen.dart';
import '../features/sales/sales/sale_details_screen.dart';
import '../features/auth/auth_provider.dart';
import '../features/auth/login_screen.dart';
import '../features/shift/open_shift_screen.dart';

GoRouter appRouter(WidgetRef ref) {
  return GoRouter(
    initialLocation: '/sales',
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/open-shift',
        builder: (context, state) => const OpenShiftScreen(),
      ),
      GoRoute(
        path: '/shift',
        builder: (context, state) => const ShiftGateScreen(),
      ),
      GoRoute(path: '/sales', builder: (context, state) => const SalesScreen()),
      GoRoute(path: '/history', builder: (_, __) => const SalesHistoryScreen()),
      GoRoute(
        path: '/history/:id',
        builder: (_, state) =>
            SaleDetailsScreen(saleId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/pay', builder: (_, __) => const PaymentScreen()),
    ],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final shift = ref.read(shiftProvider);

      final loc = state.matchedLocation;
      final loggingIn = loc == '/login';
      final openingShift = loc == '/open-shift';

      if (!auth.loggedIn && !loggingIn) return '/login';

      if (auth.loggedIn && !shift.active && !openingShift) return '/open-shift';

      if (auth.loggedIn && shift.active && (loggingIn || openingShift))
        return '/sales';

      return null;
    },
  );
}
