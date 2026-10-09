import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
              ),
            );

  static const _keyAccessToken = 'ql_access_token';
  static const _keyRefreshToken = 'ql_refresh_token';
  static const _keyUserMobile = 'ql_user_mobile';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    String? mobile,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
    if (mobile != null) {
      await _storage.write(key: _keyUserMobile, value: mobile);
    }
  }

  Future<String?> getAccessToken() async {
    return _storage.read(key: _keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    return _storage.read(key: _keyRefreshToken);
  }

  Future<String?> getUserMobile() async {
    return _storage.read(key: _keyUserMobile);
  }

  Future<void> clearAuth() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyUserMobile);
  }
}
