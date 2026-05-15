import 'dart:convert';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

/// Service for managing local SQLite cache.
/// Stores products, sales, refunds, and other frequently-accessed data.
class LocalCacheService {
  LocalCacheService._();

  static final LocalCacheService instance = LocalCacheService._();

  static const String _dbName = 'virnyx_mobile.db';
  static const int _dbVersion = 1;

  Database? _db;

  Future<Database> get db async {
    _db ??= await _initDb();
    return _db!;
  }

  /// Initialize the local database with schema
  Future<Database> _initDb() async {
    final String dbPath = join(await getDatabasesPath(), _dbName);
    return openDatabase(
      dbPath,
      version: _dbVersion,
      onCreate: (Database database, int version) async {
        await _createSchema(database);
      },
    );
  }

  /// Create database schema
  Future<void> _createSchema(Database database) async {
    // Products table
    await database.execute('''
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        category TEXT,
        sku TEXT,
        barcode TEXT,
        imageUrl TEXT,
        stockQty INTEGER DEFAULT 0,
        cachedAt INTEGER
      )
    ''');

    // Sales table (for local draft sales)
    await database.execute('''
      CREATE TABLE IF NOT EXISTS pending_sales (
        id TEXT PRIMARY KEY,
        items TEXT NOT NULL,
        payments TEXT NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        discountPromoCode TEXT,
        clientTxnId TEXT UNIQUE,
        status TEXT DEFAULT 'PENDING',
        createdAt INTEGER,
        syncedAt INTEGER
      )
    ''');

    // Refunds table (for tracking local refund requests)
    await database.execute('''
      CREATE TABLE IF NOT EXISTS pending_refunds (
        id TEXT PRIMARY KEY,
        saleId TEXT NOT NULL,
        amount REAL NOT NULL,
        reason TEXT,
        status TEXT DEFAULT 'PENDING',
        createdAt INTEGER,
        syncedAt INTEGER
      )
    ''');

    // Sync queue table
    await database.execute('''
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        operation TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payload TEXT NOT NULL,
        retries INTEGER DEFAULT 0,
        maxRetries INTEGER DEFAULT 3,
        createdAt INTEGER,
        lastAttemptAt INTEGER
      )
    ''');

    // Cache metadata
    await database.execute('''
      CREATE TABLE IF NOT EXISTS cache_meta (
        key TEXT PRIMARY KEY,
        value TEXT,
        expiresAt INTEGER
      )
    ''');
  }

  /// Cache products
  Future<void> cacheProducts(List<Map<String, dynamic>> products) async {
    final Database database = await db;
    await database.transaction((txn) async {
      // Clear old products
      await txn.delete('products');
      // Insert new products
      for (final Map<String, dynamic> product in products) {
        await txn.insert('products', {
          ...product,
          'cachedAt': DateTime.now().millisecondsSinceEpoch,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }

  /// Get cached products
  Future<List<Map<String, dynamic>>> getCachedProducts() async {
    final Database database = await db;
    return database.query('products');
  }

  /// Get a single cached product by ID
  Future<Map<String, dynamic>?> getCachedProduct(String id) async {
    final Database database = await db;
    final List<Map<String, dynamic>> results = await database.query(
      'products',
      where: 'id = ?',
      whereArgs: [id],
    );
    return results.isNotEmpty ? results.first : null;
  }

  /// Queue an operation for sync
  Future<void> queueOperation({
    required String operation,
    required String endpoint,
    required String method,
    required Map<String, dynamic> payload,
  }) async {
    final Database database = await db;
    final String id =
        'op-${DateTime.now().millisecondsSinceEpoch}-${payload.hashCode}';
    await database.insert('sync_queue', {
      'id': id,
      'operation': operation,
      'endpoint': endpoint,
      'method': method,
      'payload': jsonEncode(payload),
      'createdAt': DateTime.now().millisecondsSinceEpoch,
      'retries': 0,
      'maxRetries': 3,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
    debugLog('Queued operation: $operation -> $endpoint');
  }

  /// Get all pending operations
  Future<List<Map<String, dynamic>>> getPendingOperations() async {
    final Database database = await db;
    return database.query(
      'sync_queue',
      where: 'retries < maxRetries',
      orderBy: 'createdAt ASC',
    );
  }

  /// Mark operation as synced (remove from queue)
  Future<void> markOperationSynced(String operationId) async {
    final Database database = await db;
    await database.delete(
      'sync_queue',
      where: 'id = ?',
      whereArgs: [operationId],
    );
    debugLog('Marked operation synced: $operationId');
  }

  /// Increment retry count for operation
  Future<void> incrementOperationRetry(String operationId) async {
    final Database database = await db;
    await database.rawUpdate(
      'UPDATE sync_queue SET retries = retries + 1, lastAttemptAt = ? WHERE id = ?',
      [DateTime.now().millisecondsSinceEpoch, operationId],
    );
  }

  /// Cache sale (pending sync)
  Future<void> cachePendingSale({
    required String saleId,
    required List<Map<String, dynamic>> items,
    required List<Map<String, dynamic>> payments,
    required double discount,
    required String? promoCode,
  }) async {
    final Database database = await db;
    await database.insert('pending_sales', {
      'id': saleId,
      'items': jsonEncode(items),
      'payments': jsonEncode(payments),
      'discount': discount,
      'discountPromoCode': promoCode,
      'status': 'PENDING',
      'createdAt': DateTime.now().millisecondsSinceEpoch,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  /// Get pending sales
  Future<List<Map<String, dynamic>>> getPendingSales() async {
    final Database database = await db;
    return database.query('pending_sales', where: "status = 'PENDING'");
  }

  /// Clear cache (useful on logout)
  Future<void> clearAll() async {
    final Database database = await db;
    await database.transaction((txn) async {
      await txn.delete('products');
      await txn.delete('pending_sales');
      await txn.delete('pending_refunds');
      await txn.delete('cache_meta');
    });
    debugLog('Local cache cleared');
  }

  /// Debug logging
  static void debugLog(String message) {
    // ignore: avoid_print
    print('[LocalCacheService] $message');
  }
}
