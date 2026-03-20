enum TerminalNotificationType {
  info,
  success,
  warning,
  error,
}

class TerminalNotificationItem {
  final String id;
  final String title;
  final String? actionLabel;
  final TerminalNotificationType type;
  final DateTime createdAt;
  final bool read;

  const TerminalNotificationItem({
    required this.id,
    required this.title,
    required this.type,
    required this.createdAt,
    this.actionLabel,
    this.read = false,
  });

  TerminalNotificationItem copyWith({
    String? id,
    String? title,
    String? actionLabel,
    TerminalNotificationType? type,
    DateTime? createdAt,
    bool? read,
  }) {
    return TerminalNotificationItem(
      id: id ?? this.id,
      title: title ?? this.title,
      actionLabel: actionLabel ?? this.actionLabel,
      type: type ?? this.type,
      createdAt: createdAt ?? this.createdAt,
      read: read ?? this.read,
    );
  }
}