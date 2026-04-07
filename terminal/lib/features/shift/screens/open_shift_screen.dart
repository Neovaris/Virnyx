import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/shift_controller.dart';
import '../data/shift_api.dart';
import '../../auth/providers/auth_provider.dart';

class OpenShiftScreen extends ConsumerStatefulWidget {
  const OpenShiftScreen({super.key});

  @override
  ConsumerState<OpenShiftScreen> createState() => _OpenShiftScreenState();
}

class _OpenShiftScreenState extends ConsumerState<OpenShiftScreen> {
  final cashCtrl = TextEditingController(text: '0');
  bool _submitting = false;
  bool _checkingActiveShift = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _restoreActiveShiftIfAny();
    });
  }

  @override
  void dispose() {
    cashCtrl.dispose();
    super.dispose();
  }

  Future<void> _restoreActiveShiftIfAny() async {
    try {
      final active = await ref.read(shiftApiProvider).getActiveShift();

      if (active != null) {
        final auth = ref.read(authProvider);
        await ref
            .read(shiftProvider.notifier)
            .setOpenedShift(
              shiftId: active.id,
              cashierId: active.cashierId ?? auth.userId ?? 'unknown',
              openingCash: active.openingCash,
              openedAt: active.openedAt,
            );

        if (!mounted) return;
        context.go('/sales');
        return;
      }
    } catch (_) {
      // Silent fallback for now. Router still keeps user here.
    } finally {
      if (mounted) {
        setState(() => _checkingActiveShift = false);
      }
    }
  }

  Future<void> openShift() async {
    FocusScope.of(context).unfocus();

    final openingCash = double.tryParse(cashCtrl.text.trim());
    if (openingCash == null || openingCash < 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid opening cash amount')),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final auth = ref.read(authProvider);
      final opened = await ref
          .read(shiftApiProvider)
          .openShift(openingCash: openingCash);

      await ref
          .read(shiftProvider.notifier)
          .setOpenedShift(
            shiftId: opened.id,
            cashierId: opened.cashierId ?? auth.userId ?? 'unknown',
            openingCash: opened.openingCash,
            openedAt: opened.openedAt,
          );

      if (!mounted) return;
      context.go('/sales');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Open shift failed: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    final who = auth.userId ?? 'Unknown';
    final role = auth.role ?? 'cashier';
    final roleLabel = role.isEmpty
        ? 'Cashier'
        : role[0].toUpperCase() + role.substring(1);

    if (_checkingActiveShift) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Logged in as: $who ($roleLabel)',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Start Shift',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Enter the cash currently in the drawer before sales begin.',
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: cashCtrl,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                    ),
                    decoration: const InputDecoration(
                      labelText: 'Opening Cash',
                      prefixText: '₵ ',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 44,
                    child: FilledButton(
                      onPressed: _submitting ? null : openShift,
                      child: _submitting
                          ? const SizedBox(
                              height: 18,
                              width: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Open Shift'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 44,
                    child: OutlinedButton(
                      onPressed: _submitting
                          ? null
                          : () async {
                              await ref
                                  .read(shiftProvider.notifier)
                                  .closeShift();
                              await ref.read(authProvider.notifier).logout();
                              if (!mounted) return;
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
