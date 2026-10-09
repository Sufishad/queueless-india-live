import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../l10n/app_localizations.dart';
import '../providers/merchant_dashboard_notifier.dart';
import '../widgets/walk_in_dialog.dart';
import '../services/qr_standee_pdf_service.dart';
import 'tv_calling_board_screen.dart';

/// MerchantConsoleScreen
/// Zero-hardware calling console for shopkeepers, clinic receptionists, and bank counters.
/// Designed for 1-hand thumb operation on 5.5" Android smartphones.
class MerchantConsoleScreen extends ConsumerWidget {
  final String branchId;
  final String branchName;

  const MerchantConsoleScreen({
    super.key,
    required this.branchId,
    required this.branchName,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(merchantDashboardProvider(branchId));
    final notifier = ref.read(merchantDashboardProvider(branchId).notifier);
    final l10n = AppLocalizations.of(context)!;
    final currentToken = state.currentToken;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.panel,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.merchantConsole,
              style: AppTypography.headingMedium.copyWith(fontSize: 16),
            ),
            Text(
              branchName,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.textSecondary,
                fontSize: 11,
              ),
            ),
          ],
        ),
        actions: [
          // Offline Pending Action Sync Pill
          if (state.pendingOfflineCount > 0)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ActionChip(
                backgroundColor: AppColors.warning.withValues(alpha: 0.2),
                side: const BorderSide(color: AppColors.warning),
                avatar: const Icon(Icons.cloud_upload_outlined, size: 16, color: AppColors.warning),
                label: Text(
                  '${state.pendingOfflineCount} queued',
                  style: const TextStyle(color: AppColors.warning, fontSize: 11, fontWeight: FontWeight.bold),
                ),
                onPressed: () => notifier.triggerOfflineReplay(),
              ),
            ),

          // Pause / Resume Toggle
          IconButton(
            icon: Icon(
              state.isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
              color: state.isPaused ? AppColors.success : AppColors.warning,
            ),
            tooltip: state.isPaused ? l10n.resumeQueue : l10n.pauseQueue,
            onPressed: () => notifier.togglePause(),
          ),

          // TV Calling Board Button
          IconButton(
            icon: const Icon(Icons.tv_rounded, color: AppColors.textPrimary),
            tooltip: l10n.tvBoard,
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => TvCallingBoardScreen(
                    branchId: branchId,
                    branchName: branchName,
                  ),
                ),
              );
            },
          ),

          // Print QR Standee Button
          IconButton(
            icon: const Icon(Icons.print_rounded, color: AppColors.textPrimary),
            tooltip: l10n.qrStandee,
            onPressed: () {
              QrStandeePdfService.printStandee(
                context,
                branchId: branchId,
                branchName: branchName,
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Error banner if any
              if (state.errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.alert.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.alert),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.alert, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          state.errorMessage!,
                          style: AppTypography.bodySmall.copyWith(color: AppColors.alert),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Queue Paused Warning Banner
              if (state.isPaused) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.warning),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.pause_circle_outline, color: AppColors.warning, size: 20),
                      const SizedBox(width: 10),
                      Text(
                        'QUEUE IS CURRENTLY PAUSED',
                        style: AppTypography.telemetryLabel.copyWith(
                          color: AppColors.warning,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // 1. Counter Selector Chips Row
              _buildCounterSelectorRow(state, notifier, l10n),
              const SizedBox(height: 16),

              // 2. Hero Calling Board Card (Now Serving)
              _buildHeroCallingCard(currentToken, state, l10n),
              const SizedBox(height: 20),

              // 3. Primary Action Grid
              _buildActionGrid(state, notifier, l10n, context),
              const SizedBox(height: 24),

              // 4. Next Up & Telemetry Section
              _buildTelemetryAndQueueSection(state, l10n),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCounterSelectorRow(
    MerchantDashboardState state,
    MerchantDashboardNotifier notifier,
    AppLocalizations l10n,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        children: [
          Text(
            '${l10n.counter}:',
            style: AppTypography.telemetryLabel.copyWith(fontSize: 12),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: state.availableCounters.map((counterNum) {
                  final isSelected = state.activeCounter == counterNum;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text('${l10n.counter} $counterNum'),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.surface,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textSecondary,
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      onSelected: (val) {
                        if (val) notifier.setActiveCounter(counterNum);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroCallingCard(
    dynamic currentToken,
    MerchantDashboardState state,
    AppLocalizations l10n,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: currentToken != null ? AppColors.primary : AppColors.cardBorder,
          width: 2,
        ),
        boxShadow: [
          if (currentToken != null)
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.15),
              blurRadius: 18,
              spreadRadius: 2,
            ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l10n.nowServing,
                style: AppTypography.telemetryLabel.copyWith(
                  color: AppColors.primary,
                  letterSpacing: 1.5,
                  fontSize: 12,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${l10n.counter} ${state.activeCounter}',
                  style: AppTypography.telemetryLabel.copyWith(
                    color: AppColors.textPrimary,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Huge Token Hero Number in JetBrains Mono
          Text(
            currentToken != null ? '#${currentToken.number}' : '--',
            style: AppTypography.heroToken.copyWith(
              fontSize: 64,
              color: currentToken != null ? Colors.white : AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 6),

          Text(
            currentToken != null
                ? (currentToken.customerName ?? 'Customer')
                : 'No token currently called',
            style: AppTypography.headingMedium.copyWith(
              fontSize: 16,
              color: currentToken != null ? AppColors.textSecondary : AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionGrid(
    MerchantDashboardState state,
    MerchantDashboardNotifier notifier,
    AppLocalizations l10n,
    BuildContext context,
  ) {
    final hasCurrent = state.currentToken != null;

    return Column(
      children: [
        // Primary Call Next Button
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: state.isPerformingAction ? null : () => notifier.callNext(),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              elevation: 4,
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.campaign_rounded, color: Colors.white, size: 24),
                const SizedBox(width: 10),
                Text(
                  l10n.callNext.toUpperCase(),
                  style: AppTypography.button.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Action Buttons Row: Recall | Complete | Skip
        Row(
          children: [
            // RECALL
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: hasCurrent ? () => notifier.recall() : null,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.warning),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    l10n.recall,
                    style: const TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),

            // COMPLETE
            Expanded(
              child: SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: hasCurrent ? () => notifier.complete() : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.success,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    l10n.completeAction,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),

            // SKIP / NO-SHOW
            Expanded(
              child: SizedBox(
                height: 48,
                child: OutlinedButton(
                  onPressed: hasCurrent ? () => notifier.skip() : null,
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.alert),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    l10n.skipAction,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppColors.alert, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // 1-Tap Walk-In Button
        SizedBox(
          width: double.infinity,
          height: 46,
          child: OutlinedButton.icon(
            onPressed: () {
              WalkInDialog.show(
                context,
                onConfirm: ({
                  required serviceName,
                  customerName,
                  mobile,
                  isSenior = false,
                }) {
                  notifier.createWalkIn(
                    serviceName: serviceName,
                    customerName: customerName,
                    mobile: mobile,
                    isSenior: isSenior,
                  );
                },
              );
            },
            icon: const Icon(Icons.person_add_alt, color: AppColors.primary, size: 18),
            label: Text(
              l10n.walkInButton,
              style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AppColors.primary),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTelemetryAndQueueSection(MerchantDashboardState state, AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary telemetry counters
        Row(
          children: [
            Expanded(
              child: _buildMetricTile(
                title: l10n.waitingCount,
                value: '${state.waitingCount}',
                color: AppColors.warning,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMetricTile(
                title: l10n.completedToday,
                value: '${state.completedTodayCount}',
                color: AppColors.success,
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),

        // Next Up Queue List
        Text(
          l10n.nextUp.toUpperCase(),
          style: AppTypography.headingMedium.copyWith(fontSize: 14, color: AppColors.textSecondary),
        ),
        const SizedBox(height: 10),

        if (state.nextTokens.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.panel,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: Center(
              child: Text(
                'Queue is empty. No customers waiting.',
                style: AppTypography.bodySmall.copyWith(color: AppColors.textMuted),
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: state.nextTokens.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, idx) {
              final tok = state.nextTokens[idx];
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.panel,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Row(
                  children: [
                    Text(
                      '#${tok.number}',
                      style: AppTypography.telemetryValue.copyWith(
                        fontSize: 18,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            tok.customerName ?? 'Customer',
                            style: AppTypography.bodyMedium.copyWith(color: Colors.white),
                          ),
                          Text(
                            'Joined: ${tok.createdAt.hour}:${tok.createdAt.minute.toString().padLeft(2, '0')}',
                            style: AppTypography.telemetryLabel.copyWith(fontSize: 10),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        '~${tok.estimatedWaitMinutes} min',
                        style: AppTypography.telemetryLabel.copyWith(fontSize: 11),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _buildMetricTile({
    required String title,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.telemetryLabel.copyWith(fontSize: 11)),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTypography.telemetryValue.copyWith(
              color: color,
              fontSize: 24,
            ),
          ),
        ],
      ),
    );
  }
}
