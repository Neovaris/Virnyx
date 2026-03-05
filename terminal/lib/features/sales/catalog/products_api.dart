import '../../../core/api/api_client.dart';

class ProductsApi {
  final ApiClient api;
  ProductsApi(this.api);

  Future<Map<String, dynamic>> list({
    String q = '',
    int page = 1,
    int limit = 200, // POS usually wants a decent local cache
    String sort = 'createdAt',
    String order = 'desc',
  }) {
    return api.getJson('/products', query: {
      'q': q,
      'page': page.toString(),
      'limit': limit.toString(),
      'sort': sort,
      'order': order,
    });
  }
}