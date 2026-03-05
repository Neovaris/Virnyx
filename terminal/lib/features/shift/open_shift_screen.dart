import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'shift_controller.dart';
import '../auth/auth_provider.dart';

class OpenShiftScreen extends ConsumerStatefulWidget {
  const OpenShiftScreen({super.key});

  @override
  ConsumerState<OpenShiftScreen> createState() => _OpenShiftScreenState();
}

class _OpenShiftScreenState extends ConsumerState<OpenShiftScreen> {
  final cashCtrl = TextEditingController(text: '0');

  @override
  void dispose() {
    cashCtrl.dispose();
    super.dispose();
  }

  void openShift() {
    final openingCash = double.tryParse(cashCtrl.text.trim()) ?? 0;

    ref.read(shiftProvider.notifier).openShift(openingCash: openingCash);

    context.go('/sales');
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    final who = auth.userId ?? 'Unknown';
    final role = (auth.role ?? 'cashier');
    final roleLabel = role.isEmpty
    ? 'Cashier'
    : role[0].toUpperCase() + role.substring(1);
    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 380,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Logged in as: $who ($roleLabel)',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const Text(
                    'Start Shift',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: cashCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Opening Cash',
                      prefixText: '₵ ',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: FilledButton(
                      onPressed: openShift,
                      child: const Text('Open Shift'),
                    ),
                  ),
                  const SizedBox(height: 12),

                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton(
                      onPressed: () {
                        ref.read(authProvider.notifier).logout();
                        context.go('/login');
                      },
                      child: const Text('Logout'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
