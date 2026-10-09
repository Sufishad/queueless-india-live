import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// QueueLess India Typography Hierarchy
/// Display: Bricolage Grotesque
/// Body: Manrope
/// Numbers/Tokens: JetBrains Mono (large, high-contrast)
abstract class AppTypography {
  // Display & Headings (Bricolage Grotesque)
  static TextStyle displayLarge = GoogleFonts.bricolageGrotesque(
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.5,
  );

  static TextStyle displayMedium = GoogleFonts.bricolageGrotesque(
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -0.3,
  );

  static TextStyle headingLarge = GoogleFonts.bricolageGrotesque(
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  static TextStyle headingMedium = GoogleFonts.bricolageGrotesque(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: AppColors.textPrimary,
  );

  // Body Copy (Manrope)
  static TextStyle bodyLarge = GoogleFonts.manrope(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
    height: 1.5,
  );

  static TextStyle bodyMedium = GoogleFonts.manrope(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textPrimary,
    height: 1.4,
  );

  static TextStyle bodySmall = GoogleFonts.manrope(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.textSecondary,
    height: 1.3,
  );

  static TextStyle labelBold = GoogleFonts.manrope(
    fontSize: 13,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: 0.2,
  );

  // High-Contrast Mono Numerals (JetBrains Mono)
  static TextStyle tokenHeroNumber = GoogleFonts.jetBrainsMono(
    fontSize: 72,
    fontWeight: FontWeight.w800,
    color: AppColors.primary,
    letterSpacing: -2,
    height: 1.0,
  );

  static TextStyle heroToken = tokenHeroNumber;
  static TextStyle button = labelBold;

  static TextStyle tokenMediumNumber = GoogleFonts.jetBrainsMono(
    fontSize: 36,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
    letterSpacing: -1,
  );

  static TextStyle telemetryValue = GoogleFonts.jetBrainsMono(
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: AppColors.textPrimary,
  );

  static TextStyle telemetryLabel = GoogleFonts.jetBrainsMono(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: AppColors.textSecondary,
    letterSpacing: 0.5,
  );
}
