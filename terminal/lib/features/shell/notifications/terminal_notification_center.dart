import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'terminal_notification_models.dart';
import 'terminal_notification_provider.dart';

class TerminalNotificationCenter extends ConsumerWidget {
  const TerminalNotificationCenter({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(terminalNotificationsProvider);

    return Container(
      width: 360,
      height: 900,
      decoration: BoxDecoration(
        color: const Color(0xFF08111F),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: Colors.white.withOpacity(0.06),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.32),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 14, 14),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    'Notifications',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white70),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                onPressed: notifications.isEmpty
                    ? null
                    : () {
                        ref.read(terminalNotificationsProvider.notifier).dismissAll();
                      },
                child: const Text('Dismiss all'),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: notifications.isEmpty
                ? const Center(
                    child: Text(
                      'No notifications',
                      style: TextStyle(
                        color: Colors.white54,
                        fontSize: 14,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(18, 8, 18, 18),
                    itemCount: notifications.length,
                    separatorBuilder: (_, __) => Divider(
                      color: Colors.white.withOpacity(0.06),
                      height: 22,
                    ),
                    itemBuilder: (context, index) {
                      final item = notifications[index];
                      return _NotificationTile(item: item);
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _NotificationTile extends ConsumerWidget {
  final TerminalNotificationItem item;

  const _NotificationTile({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(
            _iconForType(item.type),
            size: 18,
            color: _colorForType(item.type),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  height: 1.4,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (item.actionLabel != null) ...[
                const SizedBox(height: 6),
                GestureDetector(
                  onTap: () {},
                  child: Text(
                    item.actionLabel!,
                    style: const TextStyle(
                      color: Color(0xFF4EA1FF),
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 4),
              Text(
                _timeAgo(item.createdAt),
                style: TextStyle(
                  color: Colors.white.withOpacity(0.45),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  IconData _iconForType(TerminalNotificationType type) {
    switch (type) {
      case TerminalNotificationType.info:
        return Icons.system_update_alt;
      case TerminalNotificationType.success:
        return Icons.check_circle_outline;
      case TerminalNotificationType.warning:
        return Icons.warning_amber_rounded;
      case TerminalNotificationType.error:
        return Icons.error_outline;
    }
  }

  Color _colorForType(TerminalNotificationType type) {
    switch (type) {
      case TerminalNotificationType.info:
        return const Color(0xFF4EA1FF);
      case TerminalNotificationType.success:
        return const Color(0xFF22C55E);
      case TerminalNotificationType.warning:
        return const Color(0xFFF59E0B);
      case TerminalNotificationType.error:
        return const Color(0xFFEF4444);
    }
  }

  String _timeAgo(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);

    if (diff.inDays > 0) {
      return '${diff.inDays} day${diff.inDays == 1 ? '' : 's'} ago';
    }
    if (diff.inHours > 0) {
      return '${diff.inHours} hour${diff.inHours == 1 ? '' : 's'} ago';
    }
    if (diff.inMinutes > 0) {
      return '${diff.inMinutes} minute${diff.inMinutes == 1 ? '' : 's'} ago';
    }
    return 'Just now';
  }
}