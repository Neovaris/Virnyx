import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth/providers/user_provider.dart';
import '../../sales/offline/offline_sync_service.dart';
import '../../sales/search/clear_search_signal.dart';
import '../../sales/search/scan_event.dart';
import '../../sales/search/search_controller.dart';
import '../help/terminal_troubleshoot_dialog.dart';
import '../notifications/terminal_notification_center.dart';
import '../notifications/terminal_notification_provider.dart';
import 'terminal_profile_menu.dart';

class TerminalTopStrip extends ConsumerStatefulWidget {
  const TerminalTopStrip({super.key});

  @override
  ConsumerState<TerminalTopStrip> createState() => _TerminalTopStripState();
}

class _TerminalTopStripState extends ConsumerState<TerminalTopStrip> {
  late final TextEditingController _searchController;

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showHelpPanel(BuildContext context) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Troubleshoot',
      barrierColor: Colors.black.withOpacity(0.20),
      transitionDuration: const Duration(milliseconds: 180),
      pageBuilder: (context, animation, secondaryAnimation) {
        return const TerminalTroubleshootDialog();
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(opacity: animation, child: child);
      },
    );
  }

  void _showNotificationsPanel(BuildContext context) {
    ref.read(terminalNotificationsProvider.notifier).markAllRead();

    showDialog(
      context: context,
      barrierColor: Colors.transparent,
      barrierDismissible: true,
      builder: (context) => Material(
        color: Colors.transparent,
        child: Stack(
          children: [
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(color: Colors.black.withOpacity(0.10)),
            ),
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 68, right: 12),
                child: const TerminalNotificationCenter(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _fallbackInitials(String? value) {
    if (value == null || value.trim().isEmpty) return 'U';
    final parts = value.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts.first[0].toUpperCase();
    }
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<int>(clearSearchSignalProvider, (prev, next) {
      _searchController.clear();
    });

    final userAsync = ref.watch(userProvider);
    final notifications = ref.watch(terminalNotificationsProvider);
    final unreadCount = notifications.where((item) => !item.read).length;

    return Container(
      height: 60,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF152C6B),
        border: Border(
          bottom: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
      ),
      child: Row(
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.point_of_sale, size: 18, color: Colors.white),
              const SizedBox(width: 8),
              const Text(
                'Virnyx',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white.withOpacity(0.10)),
                ),
                child: const Text(
                  'PERSONAL',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(width: 16),

          Expanded(
            child: Container(
              height: 38,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.10),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.white.withOpacity(0.12)),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.search,
                    color: Colors.white.withOpacity(0.65),
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Search product or scan barcode...',
                        hintStyle: TextStyle(
                          color: Colors.white.withOpacity(0.55),
                          fontSize: 13,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                      onChanged: (value) {
                        ref.read(salesSearchProvider.notifier).setQuery(value);
                      },
                      onSubmitted: (value) {
                        if (value.trim().isEmpty) return;
                        ref
                            .read(scanEventProvider.notifier)
                            .submit(value.trim());
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(width: 16),

          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _TopActionButton(
                icon: Icons.sync,
                tooltip: 'Sync',
                onTap: () {
                  ref.read(offlineSyncProvider.notifier).syncOfflineSales();
                },
              ),
              const SizedBox(width: 6),
              _TopActionButton(
                icon: Icons.settings_outlined,
                tooltip: 'Settings',
                onTap: () {
                  context.go('/settings');
                },
              ),
              const SizedBox(width: 6),
              _TopActionButton(
                icon: Icons.receipt_long,
                tooltip: 'Sales History',
                onTap: () {
                  context.go('/history');
                },
              ),
              const SizedBox(width: 6),
              _TopActionButton(
                icon: Icons.help_outline,
                tooltip: 'Help',
                onTap: () {
                  _showHelpPanel(context);
                },
              ),
              const SizedBox(width: 6),
              _TopActionButton(
                icon: Icons.notifications_outlined,
                tooltip: 'Notifications',
                badgeCount: unreadCount,
                onTap: () {
                  _showNotificationsPanel(context);
                },
              ),
              const SizedBox(width: 8),
              userAsync.when(
                loading: () => Container(
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF59E0B),
                    shape: BoxShape.circle,
                  ),
                  child: const Padding(
                    padding: EdgeInsets.all(10),
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  ),
                ),
                error: (err, st) => Container(
                  width: 38,
                  height: 38,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF59E0B),
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Text(
                      'U',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                data: (user) {
                  if (user == null) {
                    return Container(
                      width: 38,
                      height: 38,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF59E0B),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          'U',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    );
                  }

                  return TerminalProfileMenu(
                    name: user.name,
                    email: user.email,
                    badge: user.roleLabel,
                    initials: user.initials.isNotEmpty
                        ? user.initials
                        : _fallbackInitials(user.name),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TopActionButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;
  final int badgeCount;

  const _TopActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
    this.badgeCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final showBadge = badgeCount > 0;

    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: 36,
          height: 36,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: Colors.white.withOpacity(0.10),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Icon(icon, size: 18, color: Colors.white),
              ),
              if (showBadge)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    constraints: const BoxConstraints(
                      minWidth: 18,
                      minHeight: 18,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(
                        color: const Color(0xFF152C6B),
                        width: 1.5,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        badgeCount > 99 ? '99+' : '$badgeCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w700,
                          height: 1.0,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
