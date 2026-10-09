import '../models/auth_user.dart';

enum AuthStep { enterMobile, enterOtp, authenticated }

class AuthState {
  final AuthStep step;
  final String mobile;
  final bool isLoading;
  final String? errorMessage;
  final AuthUser? user;

  const AuthState({
    this.step = AuthStep.enterMobile,
    this.mobile = '',
    this.isLoading = false,
    this.errorMessage,
    this.user,
  });

  bool get isAuthenticated => step == AuthStep.authenticated && user != null;

  AuthState copyWith({
    AuthStep? step,
    String? mobile,
    bool? isLoading,
    String? errorMessage,
    AuthUser? user,
  }) {
    return AuthState(
      step: step ?? this.step,
      mobile: mobile ?? this.mobile,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      user: user ?? this.user,
    );
  }
}
