import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../shift/shift_controller.dart';

class ShiftGateScreen extends ConsumerStatefulWidget {
  const ShiftGateScreen({super.key});

  @override
  ConsumerState<ShiftGateScreen> createState() => _ShiftGateScreenState();
}

class _ShiftGateScreenState extends ConsumerState<ShiftGateScreen> {
  final openingCashCtrl = TextEditingController(text: '0');

  @override
  void dispose() {
    openingCashCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final shift = ref.watch(shiftProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Open Shift')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    shift.active
                        ? 'Shift already active.'
                        : 'No active shift.\nOpen a shift to start selling.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: openingCashCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Opening cash',
                      prefixText: '₵ ',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: FilledButton(
                      onPressed: () async {
                        final raw = openingCashCtrl.text.trim();
                        final cash = double.tryParse(raw) ?? 0;
                        await ref.read(shiftProvider.notifier).openShift(openingCash: cash);
                        // router redirect will take you to /sales automatically
                      },
                      child: const Text('Open Shift'),
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