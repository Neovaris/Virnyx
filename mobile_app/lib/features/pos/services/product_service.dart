import '../../../shared/services/api_client.dart';
import '../models/pos_product.dart';

class ProductService {
  ProductService._();

  static final ProductService instance = ProductService._();

  static const int _pageSize = 100;

  /// Fetches all products (all pages) and merges with inventory stock.
  /// Uses GET /products for full product data (includes category, imageUrl)
  /// and GET /inventory for per-store stock quantities, then merges.
  Future<List<PosProduct>> fetchCatalog() async {
    final List<PosProduct> products = await _fetchAllProducts();
    final Map<String, int> stockMap = await _fetchStockMap();

    return products.map((PosProduct p) {
      final int stock = stockMap[p.id] ?? 0;
      return p.copyWith(stockQty: stock);
    }).toList();
  }

  Future<List<PosProduct>> _fetchAllProducts() async {
    final List<PosProduct> all = <PosProduct>[];
    int page = 1;

    while (true) {
      final Map<String, dynamic> response = await ApiClient.instance.getJson(
        '/products?page=$page&limit=$_pageSize&sort=name&order=asc',
      );

      final List<dynamic> items =
          (response['items'] as List<dynamic>?) ?? <dynamic>[];
      for (final dynamic item in items) {
        if (item is Map<String, dynamic>) {
          all.add(PosProduct.fromProductJson(item));
        }
      }

      final int pages = (response['pages'] as num?)?.toInt() ?? 1;
      if (page >= pages) {
        break;
      }
      page++;
    }

    return all;
  }

  Future<Map<String, int>> _fetchStockMap() async {
    final Map<String, int> stockMap = <String, int>{};
    int page = 1;

    while (true) {
      final Map<String, dynamic> response = await ApiClient.instance.getJson(
        '/inventory?page=$page&limit=$_pageSize',
      );

      final List<dynamic> items =
          (response['items'] as List<dynamic>?) ?? <dynamic>[];
      for (final dynamic item in items) {
        if (item is Map<String, dynamic>) {
          final String? productId = item['productId']?.toString();
          final int available = (item['available'] as num?)?.toInt() ?? 0;
          if (productId != null && productId.isNotEmpty) {
            stockMap[productId] = available;
          }
        }
      }

      final int pages = (response['pages'] as num?)?.toInt() ?? 1;
      if (page >= pages) {
        break;
      }
      page++;
    }

    return stockMap;
  }
}
