import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../providers/auth_notifier.dart';
import '../providers/auth_state.dart';

class OtpLoginScreen extends ConsumerStatefulWidget {
  final VoidCallback onAuthenticated;

  const OtpLoginScreen({Key? key, required this.onAuthenticated})
      : super(key: key);

  @override
  ConsumerState<OtpLoginScreen> createState() => _OtpLoginScreenState();
}

class _OtpLoginScreenState extends ConsumerState<OtpLoginScreen> {
  final _mobileController = TextEditingController();
  final _otpController = TextEditingController();

  @override
  void dispose() {
    _mobileController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  void _fillReviewerCredentials() {
    _mobileController.text = '9000000001';
    _otpController.text = '123456';
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    // Auto-navigate on successful authentication
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      if (next.isAuthenticated) {
        widget.onAuthenticated();
      }
    });

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 24),
              // Brand Logo & Tagline
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primaryGlow,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.primary, width: 1.5),
                    ),
                    child: const Icon(
                      Icons.confirmation_number_outlined,
                      color: AppColors.primary,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('QueueLess', style: AppTypography.displayMedium),
                      Text(
                        'Line mein nahi, time par',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 40),

              // Title Header
              Text(
                authState.step == AuthStep.enterMobile
                    ? 'Enter Mobile Number'
                    : 'Verify with OTP',
                style: AppTypography.headingLarge,
              ),
              const SizedBox(height: 8),
              Text(
                authState.step == AuthStep.enterMobile
                    ? 'We will send a 6-digit verification code to your phone.'
                    : 'Enter the 6-digit code sent to +91 ${authState.mobile}',
                style: AppTypography.bodyMedium.copyWith(color: AppColors.textSecondary),
              ),

              const SizedBox(height: 32),

              // Step 1: Mobile Input
              if (authState.step == AuthStep.enterMobile) ...[
                TextField(
                  controller: _mobileController,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  style: AppTypography.telemetryValue.copyWith(letterSpacing: 2),
                  decoration: InputDecoration(
                    labelText: 'Mobile Number',
                    counterText: '',
                    prefixIcon: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      child: Text(
                        '+91',
                        style: AppTypography.telemetryValue.copyWith(
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    hintText: '98765 43210',
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: authState.isLoading
                        ? null
                        : () {
                            ref
                                .read(authNotifierProvider.notifier)
                                .requestOtp(_mobileController.text);
                          },
                    child: authState.isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Get OTP (ओटीपी पाएं)'),
                  ),
                ),
              ],

              // Step 2: OTP Input
              if (authState.step == AuthStep.enterOtp) ...[
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  textAlign: TextAlign.center,
                  style: AppTypography.tokenMediumNumber.copyWith(
                    letterSpacing: 8,
                    fontSize: 28,
                  ),
                  decoration: const InputDecoration(
                    labelText: 'Enter 6-Digit OTP',
                    counterText: '',
                    hintText: '••••••',
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: authState.isLoading
                        ? null
                        : () {
                            ref
                                .read(authNotifierProvider.notifier)
                                .verifyOtp(_otpController.text);
                          },
                    child: authState.isLoading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Verify & Continue (आगे बढ़ें)'),
                  ),
                ),
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: () {
                      ref.read(authNotifierProvider.notifier).resetToMobile();
                    },
                    child: Text(
                      'Change Mobile Number',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],

              // Error banner if any
              if (authState.errorMessage != null) ...[
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.alert.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.alert.withOpacity(0.5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline, color: AppColors.alert, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          authState.errorMessage!,
                          style: AppTypography.bodySmall.copyWith(color: AppColors.alert),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 48),

              // Play Store Demo / Reviewer bypass shortcut
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.panel,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.verified_user_outlined,
                          color: AppColors.success,
                          size: 18,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Play Store Reviewer Bypass',
                          style: AppTypography.labelBold.copyWith(
                            color: AppColors.textPrimary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Reviewer credentials: Mobile 9000000001, OTP 123456.',
                      style: AppTypography.bodySmall,
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 34,
                      child: OutlinedButton(
                        onPressed: _fillReviewerCredentials,
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          side: const BorderSide(color: AppColors.primary),
                        ),
                        child: Text(
                          'Fill Reviewer Demo Credentials',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
