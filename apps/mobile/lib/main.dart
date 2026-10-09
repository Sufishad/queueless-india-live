import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_notifier.dart';
import 'features/auth/screens/otp_login_screen.dart';
import 'features/customer/screens/discovery_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: QueueLessApp(),
    ),
  );
}

class QueueLessApp extends ConsumerWidget {
  const QueueLessApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authNotifierProvider);

    return MaterialApp(
      title: 'QueueLess India',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: authState.isAuthenticated
          ? const DiscoveryScreen()
          : OtpLoginScreen(
              onAuthenticated: () {},
            ),
    );
  }
}
