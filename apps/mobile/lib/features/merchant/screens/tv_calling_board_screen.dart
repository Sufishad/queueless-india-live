import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:wakelock_plus/wakelock_plus.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../core/realtime/socket_service.dart';
import '../../../l10n/app_localizations.dart';
import '../providers/merchant_dashboard_notifier.dart';

/// TvCallingBoardScreen
/// Fullscreen high-contrast landscape board engineered for cheap Android TV boxes,
/// tablets, and HDMI dongles mounted behind shop counters.
/// Specifications:
/// - Fullscreen landscape lock with WakelockPlus.enable()
/// - Hero calling token ≥ 96sp in JetBrains Mono font (crisp and legible from 5+ meters)
/// - Realtime connectivity monitoring with LIVE / RECONNECTING pill badge
/// - Auto-reconnect listeners on Socket.IO
class TvCallingBoardScreen extends ConsumerStatefulWidget {
  final String branchId;
  final String branchName;

  const TvCallingBoardScreen({
    super.key,
    required this.branchId,
    required this.branchName,
  });

  @override
  ConsumerState<TvCallingBoardScreen> createState() => _TvCallingBoardScreenState();
}

class _TvCallingBoardScreenState extends ConsumerState<TvCallingBoardScreen> {
  final SocketService _socketService = SocketService();
  StreamSubscription? _socketEventSub;
  bool _isConnected = true;
  Timer? _reconnectCheckTimer;

  @override
  void initState() {
    super.initState();
    // 1. Force landscape orientation & immersive sticky mode
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    // 2. Keep TV display on continuously
    WakelockPlus.enable();

    // 3. Subscribe to Realtime room
    _socketService.subscribeToBranch(widget.branchId);
    _socketEventSub = _socketService.events.listen((event) {
      if (!_isConnected) {
        setState(() => _isConnected = true);
      }
    });

    // Heartbeat check for TV connection drop
    _reconnectCheckTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      final active = _socketService.isConnected;
      if (active != _isConnected && mounted) {
        setState(() => _isConnected = active);
      }
    });
  }

  @override
  void dispose() {
    // Restore orientation and system overlays
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    WakelockPlus.disable();
    _socketEventSub?.cancel();
    _reconnectCheckTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(merchantDashboardProvider(widget.branchId));
    final l10n = AppLocalizations.of(context)!;
    final currentToken = state.currentToken;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            children: [
              // ================= TV TOP BAR =================
              _buildTvHeader(l10n),
              const SizedBox(height: 16),

              // ================= MAIN TV BOARD CONTENT =================
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // HERO NOW SERVING BOARD (Left 65%)
                    Expanded(
                      flex: 65,
                      child: _buildHeroCallingPanel(currentToken, l10n),
                    ),
                    const SizedBox(width: 20),

                    // NEXT IN LINE / UPCOMING QUEUE (Right 35%)
                    Expanded(
                      flex: 35,
                      child: _buildUpcomingQueuePanel(state, l10n),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),
              // ================= TV BOTTOM TICKER =================
              _buildBottomTicker(state, l10n),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTvHeader(AppLocalizations l10n) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                l10n.appName.toUpperCase(),
                style: AppTypography.headingMedium.copyWith(
                  fontSize: 16,
                  color: Colors.white,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Text(
              widget.branchName,
              style: AppTypography.headingLarge.copyWith(
                fontSize: 22,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
        Row(
          children: [
            // Exit Fullscreen Button
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.fullscreen_exit, color: AppColors.textMuted, size: 28),
              tooltip: 'Exit TV Mode',
            ),
            const SizedBox(width: 8),
            // LIVE / RECONNECTING Pill Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: _isConnected
                    ? AppColors.success.withValues(alpha: 0.2)
                    : AppColors.alert.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: _isConnected ? AppColors.success : AppColors.alert,
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _isConnected ? AppColors.success : AppColors.alert,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _isConnected ? l10n.live : l10n.reconnecting,
                    style: AppTypography.telemetryLabel.copyWith(
                      color: _isConnected ? AppColors.success : AppColors.alert,
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                      letterSpacing: 1.1,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeroCallingPanel(dynamic currentToken, AppLocalizations l10n) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: currentToken != null ? AppColors.primary : AppColors.cardBorder,
          width: 2.5,
        ),
        boxShadow: [
          if (currentToken != null)
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.25),
              blurRadius: 30,
              spreadRadius: 2,
            ),
        ],
      ),
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            l10n.nowServing,
            style: AppTypography.telemetryLabel.copyWith(
              color: AppColors.primary,
              fontSize: 22,
              letterSpacing: 3.0,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          // Hero Token Number >= 96sp in JetBrains Mono
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              currentToken != null ? '#${currentToken.number}' : '--',
              style: AppTypography.heroToken.copyWith(
                fontSize: 120, // Huge font legible from 5+ meters away
                color: currentToken != null ? Colors.white : AppColors.textMuted,
                letterSpacing: 2.0,
                shadows: [
                  if (currentToken != null)
                    Shadow(
                      color: AppColors.primary.withValues(alpha: 0.8),
                      blurRadius: 24,
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Counter Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
            decoration: BoxDecoration(
              color: AppColors.success.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.success, width: 2),
            ),
            child: Text(
              currentToken != null
                  ? l10n.proceedTo(currentToken.counterAssigned ?? '1').toUpperCase()
                  : 'PLEASE WAIT FOR NEXT CALL',
              style: AppTypography.headingLarge.copyWith(
                fontSize: 28,
                color: AppColors.success,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingQueuePanel(MerchantDashboardState state, AppLocalizations l10n) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.cardBorder, width: 1.5),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l10n.nextUp.toUpperCase(),
                style: AppTypography.headingMedium.copyWith(
                  fontSize: 16,
                  color: AppColors.textSecondary,
                  letterSpacing: 1.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.panel,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cardBorder),
                ),
                child: Text(
                  '${state.waitingCount} ${l10n.waitingCount}',
                  style: AppTypography.telemetryLabel.copyWith(
                    color: AppColors.primary,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: state.nextTokens.isEmpty
                ? Center(
                    child: Text(
                      'No upcoming tokens',
                      style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted),
                    ),
                  )
                : ListView.separated(
                    itemCount: state.nextTokens.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (ctx, idx) {
                      final item = state.nextTokens[idx];
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.panel,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: idx == 0 ? AppColors.primary : AppColors.cardBorder,
                            width: idx == 0 ? 1.5 : 1.0,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '#${item.number}',
                              style: AppTypography.telemetryValue.copyWith(
                                fontSize: 22,
                                color: idx == 0 ? AppColors.primary : Colors.white,
                              ),
                            ),
                            Text(
                              item.customerName ?? 'Token ${item.number}',
                              style: AppTypography.bodyMedium.copyWith(
                                color: AppColors.textSecondary,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              '${item.estimatedWaitMinutes} min',
                              style: AppTypography.telemetryLabel.copyWith(
                                color: AppColors.textMuted,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomTicker(MerchantDashboardState state, AppLocalizations l10n) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.panel,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '⚡ ${l10n.tagline} • Scan QR at desk to join queue',
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.textSecondary,
              fontSize: 12,
            ),
          ),
          Text(
            '${l10n.completedToday}: ${state.completedTodayCount}',
            style: AppTypography.telemetryLabel.copyWith(
              color: AppColors.success,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
