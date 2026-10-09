import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../models/branch_model.dart';

class BranchCard extends StatelessWidget {
  final BranchModel branch;
  final VoidCallback onJoinQueue;

  const BranchCard({
    super.key,
    required this.branch,
    required this.onJoinQueue,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onJoinQueue,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top row: Category tag + Live Status Dot
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.panel,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Text(
                        branch.category.toUpperCase(),
                        style: AppTypography.telemetryLabel.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (branch.isVerified)
                      const Icon(
                        Icons.verified,
                        size: 16,
                        color: AppColors.success,
                      ),
                    const Spacer(),
                    // Live Status Dot
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: branch.isLive ? AppColors.successGlow : AppColors.panel,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: branch.isLive ? AppColors.success : AppColors.cardBorder,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: branch.isLive ? AppColors.success : AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            branch.isLive ? 'LIVE' : 'OFFLINE',
                            style: AppTypography.telemetryLabel.copyWith(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: branch.isLive ? AppColors.success : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Branch Name & Location
                Text(
                  branch.name,
                  style: AppTypography.headingLarge.copyWith(fontSize: 18),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(
                      Icons.location_on_outlined,
                      size: 14,
                      color: AppColors.textSecondary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${branch.area}, ${branch.city}',
                      style: AppTypography.bodySmall,
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Live Stats Strip (Now Serving, Waiting, Est. Wait)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppColors.panel,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      // Now Serving #
                      _buildMetric(
                        label: 'NOW SERVING',
                        value: branch.servingNumber != null ? '#${branch.servingNumber}' : 'None',
                        valueColor: branch.servingNumber != null
                            ? AppColors.success
                            : AppColors.textMuted,
                      ),
                      Container(width: 1, height: 26, color: AppColors.cardBorder),
                      // Waiting
                      _buildMetric(
                        label: 'WAITING',
                        value: '${branch.waitingCount}',
                        valueColor: AppColors.textPrimary,
                      ),
                      Container(width: 1, height: 26, color: AppColors.cardBorder),
                      // Est Wait
                      _buildMetric(
                        label: 'EST. WAIT',
                        value: '~${branch.estWaitMin}m',
                        valueColor: AppColors.primary,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // Join Queue Action Button
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: branch.isLive ? onJoinQueue : null,
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      backgroundColor: AppColors.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.confirmation_number_outlined, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          'Join Live Queue (टोकन लें)',
                          style: AppTypography.labelBold.copyWith(fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetric({
    required String label,
    required String value,
    required Color valueColor,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: AppTypography.telemetryLabel.copyWith(fontSize: 10),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: AppTypography.telemetryValue.copyWith(
            color: valueColor,
            fontSize: 16,
          ),
        ),
      ],
    );
  }
}
