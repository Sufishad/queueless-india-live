import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_typography.dart';
import '../../l10n/app_localizations.dart';
import 'calling_alert_service.dart';

/// AutostartGuidanceDialog
/// Shows a one-time dialog on aggressive battery-killing Android skins
/// (Xiaomi/MIUI, OPPO/Realme/ColorOS, Vivo/Funtouch) guiding the customer
/// to whitelist QueueLess India so alarms ring reliably over silent/DND.
class AutostartGuidanceDialog extends StatelessWidget {
  final VoidCallback onDismissed;

  const AutostartGuidanceDialog({
    super.key,
    required this.onDismissed,
  });

  static Future<void> showIfRequired(BuildContext context) async {
    final alertService = CallingAlertService();
    final shouldShow = await alertService.shouldShowAutostartGuidance();
    if (!shouldShow || !context.mounted) return;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AutostartGuidanceDialog(
        onDismissed: () => Navigator.of(ctx).pop(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return AlertDialog(
      backgroundColor: AppColors.panel,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.primary, width: 1.5),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.battery_alert_rounded,
              color: AppColors.primary,
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              l10n.autostartGuidanceTitle,
              style: AppTypography.headingMedium.copyWith(fontSize: 16),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.autostartGuidanceDesc,
            style: AppTypography.bodyMedium.copyWith(
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildVendorTip('Xiaomi / MIUI / HyperOS', 'Security > Autostart > Allow QueueLess'),
                const SizedBox(height: 6),
                _buildVendorTip('OPPO / Realme / ColorOS', 'Battery > Background Activities > Allow'),
                const SizedBox(height: 6),
                _buildVendorTip('Vivo / Funtouch OS', 'Settings > Battery > High Background Power'),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () async {
            await CallingAlertService().markAutostartGuidanceShown();
            onDismissed();
          },
          child: Text(
            l10n.dismiss,
            style: AppTypography.button.copyWith(color: AppColors.textMuted),
          ),
        ),
        ElevatedButton(
          onPressed: () async {
            await CallingAlertService().markAutostartGuidanceShown();
            // In Android native this triggers Intent(ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            onDismissed();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: Text(
            l10n.enableNow,
            style: AppTypography.button.copyWith(color: Colors.white),
          ),
        ),
      ],
    );
  }

  Widget _buildVendorTip(String os, String path) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.check_circle_outline, color: AppColors.success, size: 14),
        const SizedBox(width: 6),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: AppTypography.telemetryLabel.copyWith(fontSize: 11),
              children: [
                TextSpan(text: '$os: ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                TextSpan(text: path, style: const TextStyle(color: AppColors.textSecondary)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
