import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../models/queue_token_model.dart';

/// Custom Ticket Clipper creating authentic perforated ticket notches
/// on the left and right edges at the perforation fold line.
class TicketClipper extends CustomClipper<Path> {
  final double punchRadius;
  final double punchPositionFraction;

  const TicketClipper({
    this.punchRadius = 14.0,
    this.punchPositionFraction = 0.70,
  });

  @override
  Path getClip(Size size) {
    final path = Path();
    final punchY = size.height * punchPositionFraction;

    // Top-left corner
    path.moveTo(0, 16);
    path.quadraticBezierTo(0, 0, 16, 0);

    // Top edge to top-right corner
    path.lineTo(size.width - 16, 0);
    path.quadraticBezierTo(size.width, 0, size.width, 16);

    // Right edge down to punch-out
    path.lineTo(size.width, punchY - punchRadius);
    path.arcToPoint(
      Offset(size.width, punchY + punchRadius),
      radius: Radius.circular(punchRadius),
      clockwise: false,
    );

    // Right edge down to bottom-right corner
    path.lineTo(size.width, size.height - 16);
    path.quadraticBezierTo(size.width, size.height, size.width - 16, size.height);

    // Bottom edge to bottom-left corner
    path.lineTo(16, size.height);
    path.quadraticBezierTo(0, size.height, 0, size.height - 16);

    // Left edge up to punch-out
    path.lineTo(0, punchY + punchRadius);
    path.arcToPoint(
      Offset(0, punchY - punchRadius),
      radius: Radius.circular(punchRadius),
      clockwise: false,
    );

    // Close path to top-left
    path.close();
    return path;
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

/// Custom painter for dashed perforation line across the ticket
class PerforationPainter extends CustomPainter {
  final Color color;

  const PerforationPainter({this.color = AppColors.ticketPerforation});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    const dashWidth = 6.0;
    const dashSpace = 4.0;
    double startX = 14.0;
    final endX = size.width - 14.0;

    while (startX < endX) {
      canvas.drawLine(
        Offset(startX, size.height / 2),
        Offset(startX + dashWidth, size.height / 2),
        paint,
      );
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Hero Component: Perforated Digital Token Ticket with 4-Step State Tracker
class TokenTicketWidget extends StatelessWidget {
  final QueueTokenModel token;
  final VoidCallback? onLeaveQueue;

  const TokenTicketWidget({
    Key? key,
    required this.token,
    this.onLeaveQueue,
  }) : super(key: key);

  int _getStepIndex(CustomerTokenStatus status) {
    switch (status) {
      case CustomerTokenStatus.waiting:
        return 0;
      case CustomerTokenStatus.called:
        return 1;
      case CustomerTokenStatus.inService:
        return 2;
      case CustomerTokenStatus.completed:
        return 3;
      case CustomerTokenStatus.cancelled:
        return -1;
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentStep = _getStepIndex(token.status);
    final isCalled = token.status == CustomerTokenStatus.called;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          // Electric Orange or Emerald glow around ticket when called
          BoxShadow(
            color: isCalled
                ? AppColors.success.withOpacity(0.25)
                : AppColors.primary.withOpacity(0.15),
            blurRadius: isCalled ? 32 : 20,
            spreadRadius: isCalled ? 3 : 0,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipPath(
        clipper: const TicketClipper(punchRadius: 14, punchPositionFraction: 0.72),
        child: Container(
          color: AppColors.card,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // ================= TICKET UPPER BODY =================
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 16),
                child: Column(
                  children: [
                    // Branch Header & Status Chip
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                token.branchName,
                                style: AppTypography.headingLarge.copyWith(fontSize: 18),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                token.serviceName,
                                style: AppTypography.bodySmall.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _buildStatusBadge(token.status),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Big Token Hero Display (JetBrains Mono)
                    Text(
                      'TOKEN NUMBER',
                      style: AppTypography.telemetryLabel.copyWith(
                        letterSpacing: 2.0,
                        color: AppColors.textMuted,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(
                        '#${token.number}',
                        style: AppTypography.tokenHeroNumber.copyWith(
                          fontSize: 76,
                          color: isCalled ? AppColors.success : AppColors.primary,
                          shadows: [
                            Shadow(
                              color: isCalled
                                  ? AppColors.success.withOpacity(0.6)
                                  : AppColors.primary.withOpacity(0.4),
                              blurRadius: 20,
                            ),
                          ],
                        ),
                      ),
                    ),

                    if (token.calledCounterLabel != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.successGlow,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.success),
                        ),
                        child: Text(
                          'PROCEED TO: ${token.calledCounterLabel!.toUpperCase()}',
                          style: AppTypography.telemetryValue.copyWith(
                            color: AppColors.success,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Queue Telemetry Strip
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.panel,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildTelemetryItem(
                            label: 'POSITION',
                            value: token.status == CustomerTokenStatus.waiting
                                ? '${token.positionInQueue}'
                                : '-',
                          ),
                          Container(width: 1, height: 28, color: AppColors.cardBorder),
                          _buildTelemetryItem(
                            label: 'EST. WAIT',
                            value: token.status == CustomerTokenStatus.waiting
                                ? '~${token.estWaitMin}m'
                                : 'Now',
                            valueColor: AppColors.primary,
                          ),
                          Container(width: 1, height: 28, color: AppColors.cardBorder),
                          _buildTelemetryItem(
                            label: 'COUNTER',
                            value: token.calledCounterLabel ?? 'Waiting',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    // 4-Step Progress Tracker: WAITING -> CALLED -> IN SERVICE -> COMPLETED
                    _buildStepProgressTracker(currentStep),
                  ],
                ),
              ),

              // ================= PERFORATION FOLD =================
              CustomPaint(
                size: const Size(double.infinity, 24),
                painter: const PerforationPainter(),
              ),

              // ================= TICKET LOWER STUB =================
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
                child: Row(
                  children: [
                    // Digital Ticket QR Verification
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: QrImageView(
                        data: 'queueless://token/${token.id}',
                        version: QrVersions.auto,
                        size: 58.0,
                        backgroundColor: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'QueueLess India',
                            style: AppTypography.headingMedium.copyWith(fontSize: 14),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Line mein nahi, time par',
                            style: AppTypography.bodySmall.copyWith(
                              color: AppColors.textSecondary,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'ID: ${token.id.substring(0, 8)}...',
                            style: AppTypography.telemetryLabel.copyWith(
                              fontSize: 10,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (onLeaveQueue != null &&
                        [CustomerTokenStatus.waiting, CustomerTokenStatus.called]
                            .contains(token.status))
                      TextButton(
                        onPressed: onLeaveQueue,
                        child: Text(
                          'Leave',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.alert,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(CustomerTokenStatus status) {
    Color color;
    String label;

    switch (status) {
      case CustomerTokenStatus.waiting:
        color = AppColors.warning;
        label = 'WAITING';
        break;
      case CustomerTokenStatus.called:
        color = AppColors.success;
        label = 'CALLED NOW';
        break;
      case CustomerTokenStatus.inService:
        color = AppColors.primary;
        label = 'IN SERVICE';
        break;
      case CustomerTokenStatus.completed:
        color = AppColors.textMuted;
        label = 'COMPLETED';
        break;
      case CustomerTokenStatus.cancelled:
        color = AppColors.alert;
        label = 'CANCELLED';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.6)),
      ),
      child: Text(
        label,
        style: AppTypography.telemetryLabel.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: 11,
        ),
      ),
    );
  }

  Widget _buildTelemetryItem({
    required String label,
    required String value,
    Color valueColor = AppColors.textPrimary,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: AppTypography.telemetryLabel.copyWith(fontSize: 10),
        ),
        const SizedBox(height: 4),
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

  Widget _buildStepProgressTracker(int currentStep) {
    final steps = ['Waiting', 'Called', 'In Service', 'Completed'];

    return Column(
      children: [
        Row(
          children: List.generate(steps.length * 2 - 1, (index) {
            // Even indices are Step circles, Odd indices are connecting bars
            if (index.isOdd) {
              final stepBefore = index ~/ 2;
              final isPassed = currentStep > stepBefore;
              return Expanded(
                child: Container(
                  height: 2,
                  color: isPassed ? AppColors.primary : AppColors.cardBorder,
                ),
              );
            }

            final stepIndex = index ~/ 2;
            final isCompleted = currentStep > stepIndex;
            final isCurrent = currentStep == stepIndex;

            Color circleColor = AppColors.panel;
            Color borderColor = AppColors.cardBorder;
            Widget child = const SizedBox.shrink();

            if (isCompleted) {
              circleColor = AppColors.primary;
              borderColor = AppColors.primary;
              child = const Icon(Icons.check, size: 12, color: Colors.white);
            } else if (isCurrent) {
              circleColor = AppColors.primaryGlow;
              borderColor = AppColors.primary;
              child = Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary,
                ),
              );
            }

            return Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: circleColor,
                border: Border.all(color: borderColor, width: 2),
              ),
              child: Center(child: child),
            );
          }),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: steps.map((s) {
            final idx = steps.indexOf(s);
            final isHighlight = currentStep == idx;
            return Text(
              s,
              style: AppTypography.bodySmall.copyWith(
                fontSize: 10,
                fontWeight: isHighlight ? FontWeight.w700 : FontWeight.w400,
                color: isHighlight ? AppColors.textPrimary : AppColors.textMuted,
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
