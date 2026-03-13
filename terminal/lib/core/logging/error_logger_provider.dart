import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'error_logger.dart';

/// Provider for error logging throughout the app
final errorLoggerProvider = Provider((ref) => ErrorLogger());

extension ErrorLogging on WidgetRef {
  /// Log an error with context
  void logError(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    String? context,
  }) {
    ErrorLogger.logError(
      message,
      error: error,
      stackTrace: stackTrace,
      context: context,
    );
  }

  /// Log API errors
  void logApiError(
    String endpoint,
    int statusCode,
    String responseBody, {
    String? message,
  }) {
    ErrorLogger.logApiError(
      endpoint,
      statusCode,
      responseBody,
      message: message,
    );
  }
}
