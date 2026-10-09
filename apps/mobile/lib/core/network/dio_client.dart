import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../storage/secure_storage_service.dart';

class DioClient {
  late final Dio dio;
  final SecureStorageService storageService;
  final String baseUrl;

  DioClient({
    SecureStorageService? storageService,
    this.baseUrl = 'http://10.0.2.2:3000/api/v1', // Android emulator default localhost
  }) : storageService = storageService ?? SecureStorageService() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Attach Authorization token if present
          final token = await storageService!.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          // Generate automatic Idempotency-Key for write operations if not set
          if (['POST', 'PUT', 'PATCH'].contains(options.method.toUpperCase()) &&
              !options.headers.containsKey('Idempotency-Key')) {
            options.headers['Idempotency-Key'] = const Uuid().v4();
          }

          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // 401 Unauthorized handling: attempt refresh token
          if (error.response?.statusCode == 401 &&
              !error.requestOptions.path.contains('/auth/token/refresh') &&
              !error.requestOptions.path.contains('/auth/otp/')) {
            final refreshed = await _refreshToken();
            if (refreshed) {
              final token = await storageService!.getAccessToken();
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              try {
                final retryResponse = await dio.fetch(error.requestOptions);
                return handler.resolve(retryResponse);
              } catch (e) {
                return handler.next(error);
              }
            } else {
              await storageService!.clearAuth();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<bool> _refreshToken() async {
    final refreshToken = await storageService.getRefreshToken();
    if (refreshToken == null) return false;

    try {
      final refreshDio = Dio(BaseOptions(baseUrl: baseUrl));
      final response = await refreshDio.post('/auth/token/refresh', data: {
        'refreshToken': refreshToken,
      });

      if (response.statusCode == 200 && response.data != null) {
        final newAccess = response.data['accessToken'] as String;
        final newRefresh = response.data['refreshToken'] as String;
        await storageService.saveTokens(
          accessToken: newAccess,
          refreshToken: newRefresh,
        );
        return true;
      }
    } catch (_) {
      // Refresh token expired or revoked
    }
    return false;
  }
}
