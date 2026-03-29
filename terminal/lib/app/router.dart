import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'app_bootstrap_screen.dart';
import '../features/shift/providers/shift_controller.dart';
import '../features/sales/sales_screen.dart';
import '../features/sales/payment/payment_screen.dart';
import '../features/sales/history/sales_history_screen.dart';
import '../features/sales/history/sale_details_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/shift/screens/open_shift_screen.dart';
import '../features/shift/screens/shift_close_summary_screen.dart';

GoRouter appRouter(WidgetRef ref) {
  return GoRouter(
    initialLocation: '/bootstrap',
    routes: [
      GoRoute(
        path: '/bootstrap',
        builder: (_, _) => const AppBootstrapScreen(),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/open-shift',
        builder: (context, state) => const OpenShiftScreen(),
      ),
      GoRoute(
        path: '/shift',
        builder: (context, state) => const OpenShiftScreen(),
      ),
      GoRoute(path: '/sales', builder: (context, state) => const SalesScreen()),
      GoRoute(path: '/history', builder: (_, _) => const SalesHistoryScreen()),
      GoRoute(
        path: '/history/:id',
        builder: (_, state) =>
            SaleDetailsScreen(saleId: state.pathParameters['id']!),
      ),
      GoRoute(path: '/pay', builder: (_, _) => const PaymentScreen()),
      GoRoute(
        path: '/close-shift',
        builder: (context, state) => const ShiftCloseSummaryScreen(),
      ),
    ],
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final shift = ref.read(shiftProvider);

      final loc = state.matchedLocation;
      final atBootstrap = loc == '/bootstrap';
      final atLogin = loc == '/login';
      final atOpenShift = loc == '/open-shift' || loc == '/shift';

      // Let bootstrap screen fully control startup.
      if (atBootstrap) return null;

      // Don't redirect anywhere until bootstrap has finished.
      final appReady = auth.initialized && shift.initialized;
      if (!appReady) return '/bootstrap';

      if (!auth.loggedIn) {
        return atLogin ? null : '/login';
      }

      if (!shift.active) {
        return atOpenShift ? null : '/open-shift';
      }

      if (atLogin || atOpenShift) {
        return '/sales';
      }

      return null;
    },
  );
}
