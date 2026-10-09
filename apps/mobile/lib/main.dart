import 'package:flutter/material.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const QueueLessApp());
}

class QueueLessApp extends StatelessWidget {
  const QueueLessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'QueueLess India',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFF97316), // Electric Orange
          secondary: Color(0xFF10B981), // Emerald
          surface: Color(0xFF131926),
          error: Color(0xFFEF4444),
          onPrimary: Color(0xFFF8FAFC),
          onSurface: Color(0xFFF8FAFC),
        ),
      ),
      home: const Scaffold(
        body: Center(
          child: Text(
            'QueueLess India\n"Line mein nahi, time par"',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: Color(0xFFF8FAFC),
            ),
          ),
        ),
      ),
    );
  }
}
