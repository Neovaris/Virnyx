import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/offline/offline_db.dart';
import '../../sales/cart/cart_controller.dart';
import '../../sales/offline/offline_sync_service.dart';
import '../../shift/providers/shift_controller.dart';
import '../../../core/logging/error_logger.dart';

// Provider for OfflineDb singleton
final offlineDbProvider = Provider<OfflineDb>((ref) => OfflineDb());

class TerminalTroubleshootDialog extends ConsumerWidget {
  const TerminalTroubleshootDialog({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Material(
      color: const Color(0xFF08111F),
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Container(
              height: 64,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(color: Colors.white.withOpacity(0.06)),
                ),
              ),
              child: Row(
                children: [
                  const Text(
                    'Troubleshoot',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(width: 16),
                  TextButton(
                    onPressed: () async {
                      final uri = Uri(
                        scheme: 'mailto',
                        path: 'hello@neovaristechnologies.com',
                        queryParameters: {
                          'subject': 'Virnyx Terminal Feedback',
                        },
                      );
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri);
                      }
                    },
                    child: const Text('Give feedback'),
                  ),
                  const Spacer(),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Color(0xFF4EA1FF)),
                  ),
                ],
              ),
            ),

            // Body
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 32,
                  vertical: 28,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 760),
                    child: Column(
                      children: [
                        // 🔁 Restart
                        _TroubleshootRow(
                          title: 'Restart Virnyx Terminal',
                          subtitle:
                              'Restart the terminal UI without losing local data.',
                          buttonLabel: 'Restart',
                          onPressed: () {
                            Navigator.of(
                              context,
                            ).pop(); // Close troubleshoot dialog
                            context.go('/bootstrap'); // Restart from bootstrap
                          },
                        ),

                        // 🆘 Support
                        _TroubleshootRow(
                          title: 'Support',
                          subtitle:
                              'Open support resources for help with Virnyx.',
                          buttonLabel: 'Get support',
                          onPressed: () async {
                            final uri = Uri.parse(
                              'https://docs.virnyx.com/support',
                            );
                            if (await canLaunchUrl(uri)) {
                              await launchUrl(
                                uri,
                                mode: LaunchMode.externalApplication,
                              );
                            } else {
                              // Fallback to GitHub issues if docs not available
                              final fallbackUri = Uri.parse(
                                'https://github.com/Neovaris/Virnyx/issues',
                              );
                              if (await canLaunchUrl(fallbackUri)) {
                                await launchUrl(
                                  fallbackUri,
                                  mode: LaunchMode.externalApplication,
                                );
                              }
                            }
                          },
                        ),

                        // 🔄 Retry Sync
                        _TroubleshootRow(
                          title: 'Retry Offline Sync',
                          subtitle:
                              'Retry syncing pending offline sales and queued actions.',
                          buttonLabel: 'Retry sync',
                          onPressed: () async {
                            try {
                              await ref
                                  .read(offlineSyncProvider.notifier)
                                  .syncOfflineSales();

                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text("Sync completed"),
                                  ),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text("Sync failed: $e")),
                                );
                              }
                            }
                          },
                        ),

                        // 🧹 Clear Queued Sales
                        _TroubleshootRow(
                          title: 'Clear Queued Sales',
                          subtitle:
                              'Delete all unsynced pending offline sales. Use carefully!',
                          buttonLabel: 'Clear queue',
                          danger: true,
                          onPressed: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (_) => AlertDialog(
                                title: const Text("Clear Queued Sales"),
                                content: const Text(
                                  "This will permanently delete all unsynced sales. Continue?",
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, false),
                                    child: const Text("Cancel"),
                                  ),
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, true),
                                    child: const Text("Delete"),
                                  ),
                                ],
                              ),
                            );

                            if (confirm != true) return;

                            try {
                              final db = ref.read(offlineDbProvider);
                              await db.clearSyncedSales();

                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text("Queued sales cleared"),
                                  ),
                                );
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text("Clear failed: $e")),
                                );
                              }
                            }
                          },
                        ),

                        // 💥 RESET TERMINAL (MOST IMPORTANT)
                        _TroubleshootRow(
                          title: 'Reset Local Terminal Data',
                          subtitle:
                              'Clear cart, offline queue, and local app state. This restarts the terminal.',
                          buttonLabel: 'Reset local data',
                          danger: true,
                          onPressed: () async {
                            final confirm = await showDialog<bool>(
                              context: context,
                              builder: (_) => AlertDialog(
                                title: const Text("Reset Terminal"),
                                content: const Text(
                                  "This will clear cart, offline queue, and all local data. Continue?",
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, false),
                                    child: const Text("Cancel"),
                                  ),
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(context, true),
                                    child: const Text("Reset"),
                                  ),
                                ],
                              ),
                            );

                            if (confirm != true) return;

                            try {
                              // Clear everything
                              final db = ref.read(offlineDbProvider);
                              await db.clearSyncedSales();

                              ref.read(cartProvider.notifier).clear();

                              if (context.mounted) {
                                Navigator.of(context).pop();

                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text("Terminal reset successful"),
                                  ),
                                );
                              }
                            } catch (e) {
                              ErrorLogger.logBusinessError(
                                'Troubleshoot',
                                'Reset failed: $e',
                              );
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text("Reset failed: $e")),
                                );
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TroubleshootRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final String buttonLabel;
  final VoidCallback onPressed;
  final bool danger;

  const _TroubleshootRow({
    required this.title,
    required this.subtitle,
    required this.buttonLabel,
    required this.onPressed,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final buttonColor = danger
        ? const Color(0xFFEF4444)
        : const Color(0xFF2563EB);

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 22),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.60),
                      fontSize: 14,
                      height: 1.45,
                    ),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            width: 180,
            child: Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(
                onPressed: onPressed,
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: buttonColor.withOpacity(0.85)),
                  foregroundColor: buttonColor,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 16,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(buttonLabel),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
