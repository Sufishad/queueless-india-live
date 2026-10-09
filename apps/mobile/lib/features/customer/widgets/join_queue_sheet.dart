import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../models/branch_model.dart';
import '../models/queue_token_model.dart';
import '../providers/customer_queue_notifier.dart';

class JoinQueueSheet extends ConsumerStatefulWidget {
  final BranchModel branch;
  final Function(QueueTokenModel token) onTokenIssued;

  const JoinQueueSheet({
    Key? key,
    required this.branch,
    required this.onTokenIssued,
  }) : super(key: key);

  @override
  ConsumerState<JoinQueueSheet> createState() => _JoinQueueSheetState();
}

class _JoinQueueSheetState extends ConsumerState<JoinQueueSheet> {
  late String _selectedServiceId;
  final _nameController = TextEditingController(text: 'Citizen');
  bool _isSeniorCitizen = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _selectedServiceId = widget.branch.services.isNotEmpty
        ? widget.branch.services.first.id
        : 'srv-default';
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _handleGetToken() async {
    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final token = await ref.read(customerQueueNotifierProvider.notifier).joinQueue(
            branch: widget.branch,
            serviceId: _selectedServiceId,
            customerName: _nameController.text.trim(),
            isSenior: _isSeniorCitizen,
          );

      if (mounted) {
        Navigator.pop(context); // Close bottom sheet
        widget.onTokenIssued(token);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _errorMessage = e.toString().contains('409')
              ? 'You already have an active token at this branch today.'
              : 'Failed to join queue. Please check connection and try again.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.cardBorder,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Title & Branch
          Text('Join Live Queue', style: AppTypography.headingLarge),
          const SizedBox(height: 4),
          Text(
            widget.branch.name,
            style: AppTypography.bodySmall.copyWith(color: AppColors.primary),
          ),

          const SizedBox(height: 20),

          // Select Service
          Text(
            'SELECT SERVICE (सेवा चुनें)',
            style: AppTypography.telemetryLabel,
          ),
          const SizedBox(height: 8),

          if (widget.branch.services.isEmpty)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.primary),
              ),
              child: Row(
                children: [
                  const Icon(Icons.check_circle, color: AppColors.primary, size: 20),
                  const SizedBox(width: 10),
                  Text('Standard Consultation', style: AppTypography.bodyMedium),
                ],
              ),
            )
          else
            ...widget.branch.services.map((service) {
              final isSelected = _selectedServiceId == service.id;
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.primaryGlow : AppColors.card,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? AppColors.primary : AppColors.cardBorder,
                  ),
                ),
                child: ListTile(
                  dense: true,
                  onTap: () => setState(() => _selectedServiceId = service.id),
                  leading: Icon(
                    isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                    color: isSelected ? AppColors.primary : AppColors.textSecondary,
                  ),
                  title: Text(service.name, style: AppTypography.bodyMedium),
                  subtitle: Text(
                    '~${service.avgDurationMin} min duration',
                    style: AppTypography.bodySmall,
                  ),
                  trailing: service.price > 0
                      ? Text(
                          '₹${service.price.toInt()}',
                          style: AppTypography.telemetryValue.copyWith(fontSize: 14),
                        )
                      : Text(
                          'FREE',
                          style: AppTypography.telemetryLabel.copyWith(
                            color: AppColors.success,
                          ),
                        ),
                ),
              );
            }),

          const SizedBox(height: 16),

          // Customer Name Field
          TextField(
            controller: _nameController,
            style: AppTypography.bodyMedium,
            decoration: const InputDecoration(
              labelText: 'Your Name (नाम)',
              hintText: 'Enter your name',
            ),
          ),

          const SizedBox(height: 12),

          // Senior Citizen Priority checkbox
          CheckboxListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            activeColor: AppColors.primary,
            title: Text(
              'Senior Citizen / Pregnant / Specially Abled',
              style: AppTypography.bodySmall.copyWith(color: AppColors.textPrimary),
            ),
            subtitle: Text(
              'Priority queue token will be assigned',
              style: AppTypography.bodySmall.copyWith(fontSize: 11),
            ),
            value: _isSeniorCitizen,
            onChanged: (val) => setState(() => _isSeniorCitizen = val ?? false),
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 10),
            Text(
              _errorMessage!,
              style: AppTypography.bodySmall.copyWith(color: AppColors.alert),
            ),
          ],

          const SizedBox(height: 20),

          // "Get Token" Action Button
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton(
              onPressed: _isSubmitting ? null : _handleGetToken,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Text(
                      'Get Token (टोकन लें)',
                      style: AppTypography.labelBold.copyWith(fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}
