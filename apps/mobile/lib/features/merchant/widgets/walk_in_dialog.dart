import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../l10n/app_localizations.dart';

class WalkInDialog extends StatefulWidget {
  final Function({
    required String serviceName,
    String? customerName,
    String? mobile,
    bool isSenior,
  }) onConfirm;

  const WalkInDialog({
    super.key,
    required this.onConfirm,
  });

  static Future<void> show(
    BuildContext context, {
    required Function({
      required String serviceName,
      String? customerName,
      String? mobile,
      bool isSenior,
    }) onConfirm,
  }) async {
    await showDialog(
      context: context,
      builder: (ctx) => WalkInDialog(onConfirm: onConfirm),
    );
  }

  @override
  State<WalkInDialog> createState() => _WalkInDialogState();
}

class _WalkInDialogState extends State<WalkInDialog> {
  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  String _selectedService = 'General Billing';
  bool _isSeniorPriority = false;

  final _services = const [
    'General Billing',
    'Returns & Exchange',
    'Account Services',
    'VIP / Senior Citizen',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _mobileController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return AlertDialog(
      backgroundColor: AppColors.panel,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppColors.cardBorder),
      ),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.person_add_alt_1, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Text(
            '1-Tap Walk-In Token',
            style: AppTypography.headingMedium.copyWith(fontSize: 16),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.selectService,
              style: AppTypography.telemetryLabel.copyWith(fontSize: 11),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _services.map((svc) {
                final isSelected = _selectedService == svc;
                return ChoiceChip(
                  label: Text(svc),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  backgroundColor: AppColors.surface,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textSecondary,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (val) {
                    if (val) setState(() => _selectedService = svc);
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: l10n.yourName,
                hintText: 'e.g. Ramesh K.',
                labelStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _mobileController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Mobile (Optional)',
                hintText: 'e.g. 9876543210',
                labelStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: const BorderSide(color: AppColors.cardBorder),
                ),
              ),
            ),
            const SizedBox(height: 14),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(
                'Senior Citizen / Priority Flag',
                style: AppTypography.bodySmall.copyWith(color: Colors.white),
              ),
              subtitle: Text(
                'Jumps ahead in queue automatically',
                style: AppTypography.telemetryLabel.copyWith(fontSize: 10),
              ),
              value: _isSeniorPriority,
              activeColor: AppColors.primary,
              onChanged: (val) => setState(() => _isSeniorPriority = val),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(
            l10n.close,
            style: const TextStyle(color: AppColors.textMuted),
          ),
        ),
        ElevatedButton(
          onPressed: () {
            widget.onConfirm(
              serviceName: _selectedService,
              customerName: _nameController.text.trim().isNotEmpty
                  ? _nameController.text.trim()
                  : null,
              mobile: _mobileController.text.trim().isNotEmpty
                  ? _mobileController.text.trim()
                  : null,
              isSenior: _isSeniorPriority,
            );
            Navigator.of(context).pop();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
          child: const Text('Issue Token', style: TextStyle(color: Colors.white)),
        ),
      ],
    );
  }
}
