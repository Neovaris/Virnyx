import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:go_router/go_router.dart';

import './../../../core/api/api_config.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/shift_controller.dart';
import '../data/shift_api.dart';

final closeShiftSummaryProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final auth = ref.read(authProvider);
  final token = auth.token;
  if (token == null || token.isEmpty) {
    throw Exception('Missing auth token');
  }

  final today = DateTime.now().toIso8601String().split('T').first;

  final res = await http.get(
    Uri.parse('${ApiConfig.baseUrl}/reports/daily?date=$today'),
    headers: {
      'Authorization': 'Bearer $token',
      'Content-Type': 'application/json',
    },
  );

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw Exception(
      'Failed to load shift summary: ${res.statusCode} ${res.body}',
    );
  }

  return Map<String, dynamic>.from(jsonDecode(res.body) as Map);
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
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              'Failed to load summary:\n$e',
              textAlign: TextAlign.center,
            ),
          ),
        ),
        data: (data) {
          final sales = Map<String, dynamic>.from(data['sales'] as Map? ?? {});
          final payments = Map<String, dynamic>.from(
            data['payments'] as Map? ?? {},
          );

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
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          _row('Completed Sales', '$completedCount'),
                          _row('Voided Sales', '$voidedCount'),
                          _row(
                            'Gross Total',
                            '₵ ${grossTotal.toStringAsFixed(2)}',
                          ),
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
                  ),
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
                                    await ref.read(shiftApiProvider).closeShift(
                                          sessionId: sessionId,
                                          closingCash: closingCash,
                                        );

                                    await ref
                                        .read(shiftProvider.notifier)
                                        .closeShift();

                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Shift closed'),
                                      ),
                                    );
                                    context.go('/open-shift');
                                  } catch (e) {
                                    if (!context.mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Close shift failed: $e',
                                        ),
                                      ),
                                    );
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
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
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
        },
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