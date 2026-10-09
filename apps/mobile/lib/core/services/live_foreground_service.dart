import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// LiveForegroundService
/// Genuine Android Foreground Service running in a background isolate to prevent
/// aggressive OEM battery managers (MIUI / ColorOS / FuntouchOS) from killing the socket
/// connection or active ticket telemetry while the user is queued.
class LiveForegroundService {
  static final LiveForegroundService _instance = LiveForegroundService._internal();
  factory LiveForegroundService() => _instance;
  LiveForegroundService._internal();

  static const String notificationChannelId = 'queueless_foreground_live_service';
  static const int notificationId = 1001;

  final FlutterBackgroundService _service = FlutterBackgroundService();
  bool _isServiceConfigured = false;

  /// Initialize background service configuration
  Future<void> initialize() async {
    if (_isServiceConfigured) return;

    if (!Platform.isAndroid && !Platform.isIOS) return;

    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onBackgroundServiceStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: notificationChannelId,
        initialNotificationTitle: 'QueueLess Live Tracker',
        initialNotificationContent: 'Waiting in queue...',
        foregroundServiceNotificationId: notificationId,
        foregroundServiceTypes: [AndroidForegroundType.dataSync],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: onBackgroundServiceStart,
        onBackground: onIosBackground,
      ),
    );

    _isServiceConfigured = true;
    debugPrint('[LiveForegroundService] Initialized Android ForegroundService');
  }

  /// Start genuine Android foreground service for active token tracking
  Future<void> startActiveTracking({
    required int tokenNumber,
    required int aheadCount,
  }) async {
    await initialize();
    final isRunning = await _service.isRunning();
    if (!isRunning) {
      await _service.startService();
    }

    _service.invoke('update_telemetry', {
      'token_number': tokenNumber,
      'ahead_count': aheadCount,
    });
    debugPrint('[LiveForegroundService] Started foreground tracking: #$tokenNumber ($aheadCount ahead)');
  }

  /// Update live queue telemetry
  void updateTelemetry({
    required int tokenNumber,
    required int aheadCount,
  }) {
    _service.invoke('update_telemetry', {
      'token_number': tokenNumber,
      'ahead_count': aheadCount,
    });
  }

  /// Stop foreground service when token is completed, called, or cancelled
  void stopTracking() {
    _service.invoke('stop_service');
    debugPrint('[LiveForegroundService] Stopped foreground service');
  }
}

/// Top-level background isolate entry point required by flutter_background_service
@pragma('vm:entry-point')
void onBackgroundServiceStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  service.on('update_telemetry').listen((event) {
    if (event == null) return;
    final tokenNumber = event['token_number'] ?? 0;
    final aheadCount = event['ahead_count'] ?? 0;

    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: 'QueueLess Live Tracker',
        content: 'QueueLess live — you are #$tokenNumber, $aheadCount ahead',
      );
    }
  });

  service.on('stop_service').listen((event) {
    service.stopSelf();
  });
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  return true;
}
