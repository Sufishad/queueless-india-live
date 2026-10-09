import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../models/auth_user.dart';
import 'auth_state.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

final dioClientProvider = Provider<DioClient>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return DioClient(storageService: storage);
});

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final dioClient = ref.watch(dioClientProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(dioClient, storage);
});

class AuthNotifier extends StateNotifier<AuthState> {
  final DioClient _dioClient;
  final SecureStorageService _storage;

  AuthNotifier(this._dioClient, this._storage) : super(const AuthState()) {
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    final token = await _storage.getAccessToken();
    final mobile = await _storage.getUserMobile();
    if (token != null && mobile != null) {
      state = state.copyWith(
        step: AuthStep.authenticated,
        mobile: mobile,
        user: AuthUser(
          id: 'user-cached',
          mobile: mobile,
          name: 'Customer',
        ),
      );
    }
  }

  Future<bool> requestOtp(String mobileDigits) async {
    final cleanMobile = mobileDigits.replaceAll(RegExp(r'\D'), '');
    if (cleanMobile.length != 10) {
      state = state.copyWith(errorMessage: 'Please enter a valid 10-digit mobile number');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      await _dioClient.dio.post('/auth/otp/request', data: {
        'mobile': cleanMobile,
      });

      state = state.copyWith(
        step: AuthStep.enterOtp,
        mobile: cleanMobile,
        isLoading: false,
      );
      return true;
    } catch (e) {
      // In offline/demo mode or reviewer account bypass, allow proceeding to OTP step
      state = state.copyWith(
        step: AuthStep.enterOtp,
        mobile: cleanMobile,
        isLoading: false,
      );
      return true;
    }
  }

  Future<bool> verifyOtp(String otp) async {
    if (otp.length != 6) {
      state = state.copyWith(errorMessage: 'Please enter the 6-digit OTP');
      return false;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final response = await _dioClient.dio.post('/auth/otp/verify', data: {
        'mobile': state.mobile,
        'otp': otp,
      });

      final data = response.data as Map<String, dynamic>;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final userData = data['user'] as Map<String, dynamic>;

      await _storage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
        mobile: state.mobile,
      );

      final user = AuthUser.fromJson(userData);
      state = state.copyWith(
        step: AuthStep.authenticated,
        isLoading: false,
        user: user,
      );
      return true;
    } catch (e) {
      // Reviewer account fallback / demo mode
      if (state.mobile == '9000000001' && otp == '123456') {
        const dummyToken = 'demo-jwt-reviewer-token';
        await _storage.saveTokens(
          accessToken: dummyToken,
          refreshToken: dummyToken,
          mobile: state.mobile,
        );
        state = state.copyWith(
          step: AuthStep.authenticated,
          isLoading: false,
          user: const AuthUser(
            id: 'demo-reviewer-uuid',
            mobile: '9000000001',
            name: 'Demo Reviewer',
          ),
        );
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Invalid OTP. For reviewer demo, use 9000000001 with 123456.',
      );
      return false;
    }
  }

  void resetToMobile() {
    state = state.copyWith(
      step: AuthStep.enterMobile,
      errorMessage: null,
      isLoading: false,
    );
  }

  Future<void> logout() async {
    await _storage.clearAuth();
    state = const AuthState();
  }
}
