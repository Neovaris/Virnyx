import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../sales/offline/offline_sync_service.dart';
import '../../../app/theme/theme_controller.dart';
import '../../auth/providers/auth_provider.dart';

import 'terminal_search_field.dart';
import 'terminal_action_button.dart';

class TerminalCommandBar extends ConsumerWidget {
  const TerminalCommandBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        border: Border(
          bottom: BorderSide(
            color: Colors.white.withOpacity(0.05),
          ),
        ),
      ),
      child: Row(
        children: [
          const Expanded(
            child: TerminalSearchField(),
          ),
          const SizedBox(width: 16),
          Row(
            children: [
              TerminalActionButton(
                icon: Icons.sync,
                tooltip: "Sync",
                onPressed: () {
                  ref.read(offlineSyncProvider.notifier).syncOfflineSales();
                },
              ),
              TerminalActionButton(
                icon: Icons.settings,
                tooltip: "Settings",
                onPressed: () {
                  // TODO: Navigate to settings
                },
              ),
              TerminalActionButton(
                icon: Icons.logout,
                tooltip: "Close Shift",
                onPressed: () {
                  context.go('/close-shift');
                },
              ),
              TerminalActionButton(
                icon: Icons.receipt_long,
                tooltip: "Sales History",
                onPressed: () {
                  context.go('/history');
                },
              ),
            ],
          )
        ],
      ),
    );
  }
}