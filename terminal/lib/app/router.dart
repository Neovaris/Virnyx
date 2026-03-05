import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/shift/shift_controller.dart';
import '../features/shift/shift_gate_screen.dart';
import '../features/sales/sales_screen.dart';
import '../features/sales/payment/payment_screen.dart';
import '../features/sales/sales/sales_history_screen.dart';
import '../features/sales/sales/sale_details_screen.dart';

GoRouter appRouter(WidgetRef ref) {
  return GoRouter(
    initialLocation: '/sales',
    routes: [
      GoRoute(
        path: '/shift',
        builder: (context, state) => const ShiftGateScreen(),
      ),
      GoRoute(path: '/sales', builder: (context, state) => const SalesScreen()),
      GoRoute(path: '/pay', builder: (context, state) => const PaymentScreen()),
      GoRoute(
        path: '/history',
        builder: (context, state) => const SalesHistoryScreen(),
      ),
      GoRoute(
        path: '/history/:id',
        builder: (context, state) =>
            SaleDetailsScreen(saleId: state.pathParameters['id']!),
      ),
    ],
    redirect: (context, state) {
      // Watching forces GoRouter to reevaluate redirects when shift changes
      final shift = ref.watch(shiftProvider);

      final goingToShift = state.matchedLocation == '/shift';
      if (!shift.active && !goingToShift) return '/shift';
      if (shift.active && goingToShift) return '/sales';
      return null;
    },
  );
}
