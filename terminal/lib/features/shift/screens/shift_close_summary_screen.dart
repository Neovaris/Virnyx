import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/providers/auth_provider.dart';
import '../providers/shift_controller.dart';
import '../data/shift_api.dart';

final closeShiftSummaryProvider = FutureProvider<Map<String, dynamic>>((
  ref,
) async {
  final auth = ref.read(authProvider);
  if (auth.token == null || auth.token!.isEmpty) {
    throw Exception('Missing auth token');
  }

  // Cashiers can close shifts but often lack reports:read permission.
  // Skip the summary API call to avoid guaranteed 403 noise/timeouts.
  final role = (auth.role ?? '').toUpperCase();
  if (role == 'CASHIER') {
    return {
      'sales': {
        'completedCount': 0,
        'voidedCount': 0,
        'grossTotal': 0,
        'refunds': 0,
        'netTotal': 0,
      },
      'payments': {},
      '_error': true,
      '_errorMessage': 'Summary unavailable for cashier role.',
    };
  }

  final today = DateTime.now().toIso8601String().split('T').first;

  try {
    final summary = await ref.read(shiftApiProvider).getShiftSummary(today);
    return {'sales': summary.sales, 'payments': summary.payments};
  } catch (e) {
    // Return empty summary if it fails - still allow closing shift
    return {
      'sales': {
        'completedCount': 0,
        'voidedCount': 0,
        'grossTotal': 0,
        'refunds': 0,
        'netTotal': 0,
      },
      'payments': {},
      '_error': true,
      '_errorMessage': e.toString(),
    };
  }
});

class ShiftCloseSummaryScreen extends ConsumerStatefulWidget {
  const ShiftCloseSummaryScreen({super.key});

  @override
  ConsumerState<ShiftCloseSummaryScreen> createState() =>
      _ShiftCloseSummaryScreenState();
}

class _ShiftCloseSummaryScreenState
    extends ConsumerState<ShiftCloseSummaryScreen> {
  final closingCashCtrl = TextEditingController(text: '0');
  bool _closing = false;

  @override
  void dispose() {
    closingCashCtrl.dispose();
    super.dispose();
  }

  double _parseMoney(String s) => double.tryParse(s.trim()) ?? 0;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(closeShiftSummaryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Close Shift'),
        leading: IconButton(
          onPressed: () => context.go('/sales'),
          icon: const Icon(Icons.arrow_back),
        ),
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _buildCloseForm({
          'sales': {
            'completedCount': 0,
            'voidedCount': 0,
            'grossTotal': 0,
            'refunds': 0,
            'netTotal': 0,
          },
          'payments': {},
          '_error': true,
          '_errorMessage': e.toString(),
        }),
        data: (data) => _buildCloseForm(data),
      ),
    );
  }

  Widget _buildCloseForm(Map<String, dynamic> data) {
    final sales = Map<String, dynamic>.from(data['sales'] as Map? ?? {});
    final payments = Map<String, dynamic>.from(data['payments'] as Map? ?? {});
    final hasError = data['_error'] as bool? ?? false;
    final errorMsg = data['_errorMessage'] as String?;

    final completedCount = sales['completedCount'] ?? 0;
    final voidedCount = sales['voidedCount'] ?? 0;
    final grossTotal = ((sales['grossTotal'] ?? 0) as num).toDouble();
    final refunds = ((sales['refunds'] ?? 0) as num).toDouble();
    final netTotal = ((sales['netTotal'] ?? 0) as num).toDouble();

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (hasError)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.orange.withOpacity(0.1),
                  border: Border.all(color: Colors.orange),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '⚠️ Could not load summary',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      errorMsg ?? 'Summary data unavailable',
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'You can still close the shift below.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              )
            else
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      _row('Completed Sales', '$completedCount'),
                      _row('Voided Sales', '$voidedCount'),
                      _row('Gross Total', '₵ ${grossTotal.toStringAsFixed(2)}'),
                      _row('Refunds', '₵ ${refunds.toStringAsFixed(2)}'),
                      _row(
                        'Net Total',
                        '₵ ${netTotal.toStringAsFixed(2)}',
                        bold: true,
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            if (!hasError)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Payments',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      if (payments.isEmpty)
                        const Text('No payments found')
                      else
                        ...payments.entries.map(
                          (e) => _row(
                            e.key,
                            '₵ ${((e.value as num?)?.toDouble() ?? 0).toStringAsFixed(2)}',
                          ),
                        ),
                    ],
                  ),
                ),
              )
            else
              const SizedBox.shrink(),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Closing Cash',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: closingCashCtrl,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(
                        labelText: 'Closing Cash',
                        prefixText: '₵ ',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _closing ? null : () => context.go('/sales'),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: _closing
                        ? null
                        : () async {
                            final shift = ref.read(shiftProvider);
                            final sessionId = shift.shiftId;
                            final closingCash = _parseMoney(
                              closingCashCtrl.text,
                            );

                            if (sessionId == null || sessionId.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'No active shift found locally',
                                  ),
                                ),
                              );
                              return;
                            }

                            setState(() => _closing = true);

                            try {
                              await ref
                                  .read(shiftApiProvider)
                                  .closeShift(
                                    sessionId: sessionId,
                                    closingCash: closingCash,
                                  );

                              await ref
                                  .read(shiftProvider.notifier)
                                  .closeShift();

                              if (!context.mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Shift closed')),
                              );
                              context.go('/open-shift');
                            } catch (e) {
                              if (!context.mounted) return;

                              // If close fails, offer to force logout
                              final forceLogout = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: const Text('Close Shift Failed'),
                                  content: Text(
                                    '$e\n\nThe session may have been closed elsewhere. Force clear local data and logout?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(ctx, false),
                                      child: const Text('Cancel'),
                                    ),
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx, true),
                                      child: const Text('Force Logout'),
                                    ),
                                  ],
                                ),
                              );

                              if (forceLogout == true) {
                                // Clear local shift state even if backend failed
                                await ref
                                    .read(shiftProvider.notifier)
                                    .closeShift();
                                // Logout
                                await ref.read(authProvider.notifier).logout();
                                if (context.mounted) {
                                  context.go('/login');
                                }
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Close shift failed: $e'),
                                  ),
                                );
                              }
                            } finally {
                              if (mounted) {
                                setState(() => _closing = false);
                              }
                            }
                          },
                    child: _closing
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Confirm Close Shift'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  static Widget _row(String k, String v, {bool bold = false}) {
    final style = bold
        ? const TextStyle(fontWeight: FontWeight.w900)
        : const TextStyle();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(k, style: style),
          const Spacer(),
          Text(v, style: style),
        ],
      ),
    );
  }
}
