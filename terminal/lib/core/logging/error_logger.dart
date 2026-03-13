import 'package:flutter/foundation.dart';

/// Simple error logger for debugging and production issues
class ErrorLogger {
  static const String _tag = '🔴 VIRNYX ERROR';

  /// Log an error with context
  static void logError(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    String? context,
  }) {
    final timestamp = DateTime.now().toIso8601String();
    final contextStr = context != null ? '[$context]' : '';
    final fullMessage = '$_tag $contextStr: $message';

    // Always log to console in debug
    debugPrint('$timestamp - $fullMessage');
    if (error != null) {
      debugPrint('  Error: $error');
    }
    if (stackTrace != null) {
      debugPrint('  Stack: $stackTrace');
    }

    // In production, you could send to:
    // - Sentry
    // - Firebase Crashlytics
    // - Custom backend endpoint
    // - Local file storage
  }

  /// Log API errors
  static void logApiError(
    String endpoint,
    int statusCode,
    String responseBody, {
    String? message,
  }) {
    logError(
      'API Error: $statusCode on $endpoint${message != null ? ': $message' : ''}',
      context: 'API',
      error: responseBody,
    );
  }

  /// Log validation errors
  static void logValidationError(
    String fieldName,
    String reason, {
    dynamic value,
  }) {
    logError(
      'Validation failed for $fieldName: $reason',
      context: 'Validation',
      error: value,
    );
  }

  /// Log business logic errors
  static void logBusinessError(
    String operation,
    String reason, {
    Object? details,
  }) {
    logError(
      'Business error in $operation: $reason',
      context: 'Business',
      error: details,
    );
  }
}
