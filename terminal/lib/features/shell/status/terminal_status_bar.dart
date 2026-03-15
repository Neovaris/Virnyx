import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'terminal_status_models.dart';
import 'terminal_status_provider.dart';

class TerminalStatusBar extends ConsumerWidget {
  const TerminalStatusBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(terminalStatusProvider);
    final theme = Theme.of(context);

    return Container(
      height: 34,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        border: Border(
          top: BorderSide(
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Row(
              children: [
                _StatusPill(
                  icon: Icons.circle,
                  label: _connectionLabel(status),
                  color: _connectionColor(status.connectionStatus),
                ),
                const SizedBox(width: 8),
                _StatusPill(
                  icon: Icons.sync,
                  label: _syncLabel(status),
                  color: _syncColor(status.syncStatus),
                ),
                const SizedBox(width: 8),
                _StatusPill(
                  icon: Icons.system_update_alt,
                  label: _updateLabel(status.updateStatus),
                  color: _updateColor(status.updateStatus),
                ),
              ],
            ),
          ),
          Expanded(
            child: Center(
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _InfoText(
                    text: 'Shift: ${status.shiftStatus == ShiftStatus.open ? "Open" : "Closed"}',
                  ),
                  const SizedBox(width: 14),
                  _InfoText(text: 'Cashier: ${status.cashierName ?? "—"}'),
                  const SizedBox(width: 14),
                  _InfoText(text: '${status.storeName} • ${status.terminalName}'),
                ],
              ),
            ),
          ),
          Expanded(
            child: Align(
              alignment: Alignment.centerRight,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _InfoText(text: _formatTime(status.now)),
                  const SizedBox(width: 14),
                  _InfoText(
                    text: status.appVersion,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.72),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _connectionLabel(TerminalStatusState status) {
    switch (status.connectionStatus) {
      case TerminalConnectionStatus.online:
        return 'Online';
      case TerminalConnectionStatus.offline:
        return 'Offline';
      case TerminalConnectionStatus.reconnecting:
        return 'Reconnecting';
    }
  }

  String _syncLabel(TerminalStatusState status) {
    switch (status.syncStatus) {
      case SyncHealthStatus.synced:
        return 'All synced';
      case SyncHealthStatus.pending:
        return '${status.pendingSyncCount} pending';
      case SyncHealthStatus.syncing:
        return 'Syncing...';
      case SyncHealthStatus.failed:
        return 'Sync failed';
    }
  }

  String _updateLabel(AppUpdateStatus status) {
    switch (status) {
      case AppUpdateStatus.upToDate:
        return 'Up to date';
      case AppUpdateStatus.available:
        return 'Update available';
      case AppUpdateStatus.downloading:
        return 'Downloading update';
      case AppUpdateStatus.restartRequired:
        return 'Restart required';
    }
  }

  Color _connectionColor(TerminalConnectionStatus status) {
    switch (status) {
      case TerminalConnectionStatus.online:
        return Colors.green;
      case TerminalConnectionStatus.offline:
        return Colors.red;
      case TerminalConnectionStatus.reconnecting:
        return Colors.orange;
    }
  }

  Color _syncColor(SyncHealthStatus status) {
    switch (status) {
      case SyncHealthStatus.synced:
        return Colors.green;
      case SyncHealthStatus.pending:
        return Colors.orange;
      case SyncHealthStatus.syncing:
        return Colors.blue;
      case SyncHealthStatus.failed:
        return Colors.red;
    }
  }

  Color _updateColor(AppUpdateStatus status) {
    switch (status) {
      case AppUpdateStatus.upToDate:
        return Colors.blueGrey;
      case AppUpdateStatus.available:
        return Colors.orange;
      case AppUpdateStatus.downloading:
        return Colors.blue;
      case AppUpdateStatus.restartRequired:
        return Colors.red;
    }
  }

  String _formatTime(DateTime dt) {
    final hour = dt.hour > 12 ? dt.hour - 12 : (dt.hour == 0 ? 12 : dt.hour);
    final minute = dt.minute.toString().padLeft(2, '0');
    final period = dt.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }
}

class _StatusPill extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatusPill({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoText extends StatelessWidget {
  final String text;
  final Color? color;

  const _InfoText({
    required this.text,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      overflow: TextOverflow.ellipsis,
      style: TextStyle(
        color: color ?? Colors.white.withValues(alpha: 0.88),
        fontSize: 11,
        fontWeight: FontWeight.w500,
      ),
    );
  }
}