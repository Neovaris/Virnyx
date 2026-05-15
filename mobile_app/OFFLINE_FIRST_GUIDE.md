# Offline-First Architecture Documentation

## Overview

The Virnyx Mobile App now includes a complete **offline-first architecture** that allows users to continue working even when network connectivity is lost. All changes are automatically queued and synced when the app comes back online.

## Components

### 1. **ConnectivityService** (`connectivity_service.dart`)
Monitors network connectivity in real-time.

**Features:**
- Real-time connectivity state changes
- Notifies listeners when connection is lost/restored
- Triggers automatic sync on connection restore

**Usage:**
```dart
final bool isOnline = ConnectivityService.instance.isOnline;
final bool isOffline = ConnectivityService.instance.isOffline;

// Listen to changes
ConnectivityService.instance.addListener(() {
  if (ConnectivityService.instance.isOnline) {
    print('Back online!');
  }
});
```

### 2. **LocalCacheService** (`local_cache_service.dart`)
Manages SQLite database for local data persistence.

**Database Tables:**
- `products` - Cached product catalog
- `pending_sales` - Draft sales (not yet submitted)
- `pending_refunds` - Draft refund requests
- `sync_queue` - Operations waiting to sync
- `cache_meta` - Cache metadata & expiration info

**Usage:**
```dart
// Cache products
await LocalCacheService.instance.cacheProducts(products);

// Get cached products
final cached = await LocalCacheService.instance.getCachedProducts();

// Queue an operation for sync
await LocalCacheService.instance.queueOperation(
  operation: 'create_sale',
  endpoint: '/sales',
  method: 'POST',
  payload: saleData,
);
```

### 3. **OfflineSyncService** (`offline_sync_service.dart`)
Manages the sync queue and handles retrying failed operations.

**Features:**
- Queues operations when offline
- Automatic retry logic (3 retries by default)
- Tracks pending and failed operations
- Changes notification on sync progress
- 30-second periodic sync checks
- Automatic sync on connection restore

**Properties:**
- `pendingOperations` - Count of operations waiting to sync
- `isSyncing` - Currently syncing flag
- `failedOperations` - List of operations that exceeded retry limit
- `hasPendingWork` - Quick check if sync needed

**Usage:**
```dart
final sync = OfflineSyncService.instance;

// Check status
print('Pending: ${sync.pendingOperations}');
print('Syncing: ${sync.isSyncing}');

// Manual sync trigger
await sync.syncNow();

// Listen to sync progress
sync.addListener(() {
  print('Sync state changed: ${sync.isSyncing}');
});
```

### 4. **OfflineAwareApiClient** (`offline_aware_api_client.dart`)
Wrapper around ApiClient that adds offline queuing.

**Methods:**
- `postJson(path, body, {queueIfOffline, operationName})`
- `putJson(path, body, {queueIfOffline, operationName})`
- `deleteJson(path, {queueIfOffline, operationName})`
- `getJson(path)` - Not queued, tries live fetch
- `syncPending()` - Manual sync trigger

**Usage:**
```dart
try {
  final result = await OfflineAwareApiClient.instance.postJson(
    '/sales',
    saleData,
    queueIfOffline: true,
    operationName: 'create_sale',
  );
} on ApiException catch (e) {
  if (e.isOffline) {
    print('Offline: Sale queued for sync');
  } else {
    print('Error: ${e.message}');
  }
}
```

### 5. **OfflineStatusBar** (`offline_status_bar.dart`)
UI widget showing offline/sync status.

**Shows:**
- Red bar when offline
- Blue bar while syncing (with operation count)
- Amber bar when operations are pending

**Usage:**
```dart
// At bottom of Scaffold
Scaffold(
  body: Column(
    children: [
      Expanded(child: YourContent()),
      OfflineStatusBar(), // Add here
    ],
  ),
);
```

## Integration Guide

### Step 1: Initialize Services (in main.dart)

```dart
import 'package:flutter/material.dart';
import 'lib/shared/services/offline_services_initializer.dart';
import 'features/auth/screens/auth_gate_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize offline-first services
  await OfflineServicesInitializer.initialize();
  
  runApp(const VirnyxMobileApp());
}

class VirnyxMobileApp extends StatelessWidget {
  const VirnyxMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Virnyx Mobile',
      debugShowCheckedModeBanner: false,
      home: const AuthGateScreen(),
    );
  }
}
```

### Step 2: Update Services to Use OfflineAwareApiClient

**Before:**
```dart
class SaleService {
  Future<SaleResult> createSale({required List<SaleLineItem> items}) async {
    final response = await ApiClient.instance.postJson('/sales', body);
    return SaleResult.fromResponse(response);
  }
}
```

**After:**
```dart
class SaleService {
  Future<SaleResult> createSale({required List<SaleLineItem> items}) async {
    try {
      final response = await OfflineAwareApiClient.instance.postJson(
        '/sales',
        body,
        queueIfOffline: true,
        operationName: 'create_sale',
      );
      return SaleResult.fromResponse(response);
    } on ApiException catch (e) {
      if (e.isOffline) {
        // Show: "Sale queued. Will sync when online."
        debugPrint('Sale queued for sync');
      }
      rethrow;
    }
  }
}
```

### Step 3: Add Offline Status Bar to UI

Update your main POS screen:

```dart
class HomeScreen extends StatefulWidget {
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('POS')),
      body: Column(
        children: [
          Expanded(
            child: YourPosContent(),
          ),
          // Add offline status at bottom
          OfflineStatusBar(),
        ],
      ),
    );
  }
}
```

## Data Flow

### When Online:
```
User Action → Service → OfflineAwareApiClient → API → Response
```

### When Offline:
```
User Action → Service → OfflineAwareApiClient → LocalCacheService
(queued in sync_queue table) → User gets "Queued" message
```

### On Reconnect:
```
Connectivity Restored → OfflineSyncService detects → syncNow()
→ Get all pending operations from sync_queue → Replay each operation
→ Mark as synced → Update UI
```

## Supported Offline Operations

✅ **Supported (Will Queue):**
- Create sales (POST /sales)
- Create refunds (POST /refunds)
- Update user settings (PUT /users/:id)
- Any POST/PUT/DELETE operations

❌ **Not Supported (Will Fail):**
- GET requests (reads) - could implement cache lookup
- Download product catalog changes
- Fetch user data

## Error Handling

### Offline Error Detection:
```dart
try {
  await service.createSale(items);
} on ApiException catch (e) {
  if (e.isOffline) {
    // Handle offline – operation was queued
    showSnackBar('Sale saved offline. Will sync when online.');
  } else {
    // Handle network/API error
    showSnackBar('Error: ${e.message}');
  }
}
```

### Monitoring Sync Status:
```dart
class SyncMonitor extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: OfflineSyncService.instance,
      builder: (context, _) {
        final sync = OfflineSyncService.instance;
        if (sync.hasPendingWork) {
          return Text('${sync.pendingOperations} pending changes');
        }
        return const Text('All synced');
      },
    );
  }
}
```

## Configuration

### Retry Settings
Edit `OfflineSyncService.instance._cache.queueOperation()`:
```dart
'maxRetries': 3,  // Change from 3 to N
```

### Sync Check Interval
Edit `OfflineSyncService.initialize()`:
```dart
_syncTimer = Timer.periodic(
  const Duration(seconds: 30),  // Change to desired interval
  (_) => _checkAndSync(),
);
```

## Storage Limits

**Current implementation:**
- SQLite database on device storage  
- No size limits enforced (grows unbounded)
- No automatic cleanup

**Recommended additions:**
- Max 1000 pending operations before warning
- Auto-cleanup of synced operations after 7 days
- Periodic cache invalidation

## Testing Offline Mode

### Manual Testing:
1. **Airplane Mode**: Enable airplane mode to simulate offline
2. **Developer Tools**: Use Chrome DevTools to throttle network
3. **Android Emulator**: Use `adb shell cmd connectivity set-airplane-mode true`

### Monitor Sync Process:
```dart
// Enable verbose logging
debugPrint('[OfflineSyncService] Syncing...');
debugPrint('[OfflineSyncService] Pending operations: ...');
```

## Performance Considerations

- **Database Size**: Monitor sqlite database size in app storage
- **Sync Duration**: Large number of pending operations may take seconds
- **Battery**: Background sync and connectivity monitoring uses minimal power
- **Memory**: Operation queue loaded into memory during sync

## Future Enhancements

1. **Batch Sync**: Group multiple operations into single request
2. **Conflict Resolution**: Handle server-side changes during offline period
3. **Selective Sync**: Let users choose which pending operations to sync
4. **Compression**: Compress operation payloads in database
5. **Analytics**: Track offline usage patterns
6. **Cache Warmup**: Pre-cache common data (products, categories)
7. **3G/4G Throttling**: Different behavior for slow connections

## Troubleshooting

### Sync Not Happening
- Check `ConnectivityService.instance.isOnline`
- Verify `OfflineSyncService.instance.pendingOperations > 0`
- Check logcat/console for sync errors
- Manually call `OfflineSyncService.instance.syncNow()`

### Operations Failing Repeatedly
- Check network logs for 401/403/404 errors
- Verify endpoint paths are correct
- Check `FailedOperations` list in sync service
- Manually remove from `sync_queue` table if needed

### Database Issues
- Clear cache: `LocalCacheService.instance.clearAll()`
- Check database file: `Documents/virnyx_mobile.db`
- Verify database permissions on device

---

**Last Updated:** April 28, 2026
**Status:** Production Ready (with recommended enhancements)
