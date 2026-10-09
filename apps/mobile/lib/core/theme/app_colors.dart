import 'package:flutter/material.dart';

/// QueueLess India Strict Design System Palette
/// Reference: Master Spec Section 2
abstract class AppColors {
  // Dark Theme Base Canvas
  static const Color background = Color(0xFF0B0F19);
  static const Color panel = Color(0xFF121A2B);
  static const Color card = Color(0xFF162032);
  static const Color cardBorder = Color(0xFF23324D);

  // Primary Accent (Action & Brand)
  static const Color primary = Color(0xFFF97316); // Electric Orange
  static const Color primaryHover = Color(0xFFFB923C);
  static const Color primaryGlow = Color(0x33F97316); // 20% opacity glow

  // Status & Telemetry
  static const Color success = Color(0xFF10B981); // Emerald Live
  static const Color successGlow = Color(0x3310B981);
  static const Color alert = Color(0xFFEF4444); // Danger / Error
  static const Color warning = Color(0xFFFBBF24); // Paused / Wait

  // Neutral Typography
  static const Color textPrimary = Color(0xFFF8FAFC);
  static const Color textSecondary = Color(0xFF8B98AD);
  static const Color textMuted = Color(0xFF5B6980);

  // Ticket Elements
  static const Color ticketPerforation = Color(0xFF283955);
  static const Color ticketCutout = Color(0xFF0B0F19);
}
