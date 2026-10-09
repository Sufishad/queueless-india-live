import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../storage/secure_storage_service.dart';
import 'live_foreground_service.dart';

/// CallingAlertService
/// Critical path notification & audio alert pipeline for QueueLess India:
/// 1. Android Notification Channel with USAGE_ALARM to pierce silent/DND where OS permits
/// 2. Active token genuine Android ForegroundService keeping Socket.IO connection alive with live telemetry
/// 3. Full-screen intent alert + audio chime on `token:called`
/// 4. Sequential bilingual TTS (hi-IN first, then en-IN) respecting branch voice flags
/// 5. Notification tap routing directly to the ticket view
/// 6. Strict validation: Never allows tokenNumber <= 0 to trigger calling alarm
class CallingAlertService {
  static final CallingAlertService _instance = CallingAlertService._internal();
  factory CallingAlertService() => _instance;
  CallingAlertService._internal();

  static const String highPriorityChannelId = 'queueless_token_alarm_high_priority';
  static const String highPriorityChannelName = 'QueueLess Token Alarm (High Priority)';
  static const String highPriorityChannelDesc =
      'High-priority calling alarm for queued tokens. Rings over silent mode.';

  static const String foregroundChannelId = 'queueless_foreground_live_service';
  static const String foregroundChannelName = 'QueueLess Live Tracking';

  static const int foregroundNotificationId = 1001;
  static const int callAlertNotificationId = 2002;

  /// Global navigator key for notification tap routing
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Notification tap callback handler
  static void Function(String? payload)? onNotificationNavigate;

  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final FlutterTts _flutterTts = FlutterTts();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final SecureStorageService _storage = SecureStorageService();
  final LiveForegroundService _foregroundService = LiveForegroundService();

  bool _isInitialized = false;

  /// Stream controller for in-app full-screen alert dialogs
  final StreamController<Map<String, dynamic>> _callAlertStreamController =
      StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get onCallAlert => _callAlertStreamController.stream;

  /// Stream controller for notification navigation events
  final StreamController<String> _notificationNavigationController =
      StreamController<String>.broadcast();
  Stream<String> get onNotificationTapRoute => _notificationNavigationController.stream;

  /// Initialize local notification channels & TTS engine
  Future<void> initialize() async {
    if (_isInitialized) return;

    // 1. Android Notification Channel Setup
    const androidInitSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinInitSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidInitSettings,
      iOS: darwinInitSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        debugPrint('[CallingAlertService] Notification clicked with payload: ${response.payload}');
        final payload = response.payload;
        if (payload != null && payload.isNotEmpty) {
          _notificationNavigationController.add(payload);
          if (onNotificationNavigate != null) {
            onNotificationNavigate!(payload);
          }
        }
      },
    );

    // Create High-Priority Alarm Channel with USAGE_ALARM
    final androidAlarmChannel = AndroidNotificationChannel(
      highPriorityChannelId,
      highPriorityChannelName,
      description: highPriorityChannelDesc,
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 500, 250, 500, 250, 500]),
      audioAttributesUsage: AudioAttributesUsage.alarm,
    );

    final androidForegroundChannel = AndroidNotificationChannel(
      foregroundChannelId,
      foregroundChannelName,
      description: 'Maintains live queue sync on low-end devices',
      importance: Importance.low,
      playSound: false,
      enableVibration: false,
    );

    final androidPlugin = _localNotifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      await androidPlugin.createNotificationChannel(androidAlarmChannel);
      await androidPlugin.createNotificationChannel(androidForegroundChannel);
    }

    // 2. Initialize genuine Android Foreground Service
    await _foregroundService.initialize();

    // 3. Configure TTS
    await _configureTts();

    _isInitialized = true;
    debugPrint('[CallingAlertService] Initialized with USAGE_ALARM channel & ForegroundService');
  }

  Future<void> _configureTts() async {
    try {
      await _flutterTts.setSpeechRate(0.48); // Slightly slower for crisp clarity on phone speakers
      await _flutterTts.setVolume(1.0);
      await _flutterTts.setPitch(1.0);
      await _flutterTts.awaitSynthCompletion(true);
    } catch (e) {
      debugPrint('[CallingAlertService] TTS init error: $e');
    }
  }

  /// Handle incoming Firebase Cloud Messaging high-priority data messages
  Future<void> handleFcmRemoteMessage(RemoteMessage message) async {
    debugPrint('[CallingAlertService] Incoming FCM data: ${message.data}');
    final eventType = message.data['type'];

    if (eventType == 'token:called') {
      final tokenRaw = message.data['token_number'];
      final tokenNumber = int.tryParse(tokenRaw?.toString() ?? '');

      // CRITICAL FIX: Reject token_number <= 0 or unparseable. Never allow tokenNumber=0 to trigger alarm.
      if (tokenNumber == null || tokenNumber <= 0) {
        debugPrint(
          '[CallingAlertService] P1 GUARD: Received invalid token_number ($tokenRaw). Ignoring calling alert.',
        );
        return;
      }

      final counterName = message.data['counter_name']?.toString() ?? '1';
      final voiceHi = message.data['voice_hi']?.toString() != 'false';
      final voiceEn = message.data['voice_en']?.toString() != 'false';

      await triggerCallingAlarm(
        tokenNumber: tokenNumber,
        counterName: counterName,
        voiceHi: voiceHi,
        voiceEn: voiceEn,
      );
    } else if (eventType == 'queue:ahead_update') {
      final tokenRaw = message.data['token_number'];
      final tokenNumber = int.tryParse(tokenRaw?.toString() ?? '');
      if (tokenNumber == null || tokenNumber <= 0) {
        debugPrint(
          '[CallingAlertService] P1 GUARD: Received invalid token_number ($tokenRaw) for ahead_update. Ignoring.',
        );
        return;
      }
      final aheadCount = int.tryParse(message.data['ahead_count']?.toString() ?? '') ?? 0;
      await updateActiveTokenForeground(
        tokenNumber: tokenNumber,
        aheadCount: aheadCount,
      );
    }
  }

  /// Start genuine Android foreground service while user has an active token
  Future<void> startActiveTokenForeground({
    required int tokenNumber,
    required int aheadCount,
  }) async {
    if (tokenNumber <= 0) {
      debugPrint('[CallingAlertService] Cannot start foreground service with tokenNumber <= 0');
      return;
    }
    await _foregroundService.startActiveTracking(
      tokenNumber: tokenNumber,
      aheadCount: aheadCount,
    );
  }

  /// Update telemetry on existing foreground service
  Future<void> updateActiveTokenForeground({
    required int tokenNumber,
    required int aheadCount,
  }) async {
    if (tokenNumber <= 0) return;
    _foregroundService.updateTelemetry(
      tokenNumber: tokenNumber,
      aheadCount: aheadCount,
    );
  }

  /// Stop foreground service once token is in service or completed
  Future<void> stopActiveTokenForeground() async {
    _foregroundService.stopTracking();
    await _localNotifications.cancel(foregroundNotificationId);
    debugPrint('[CallingAlertService] Stopped foreground service');
  }

  /// Trigger calling alarm pipeline on `token:called`:
  /// 1. Broadcasts to in-app stream for immediate full-screen modal
  /// 2. Fires fullScreenIntent Android Alarm Notification
  /// 3. Plays attention chime
  /// 4. Speaks bilingual announcement: hi-IN first, then en-IN
  Future<void> triggerCallingAlarm({
    required int tokenNumber,
    required String counterName,
    bool voiceHi = true,
    bool voiceEn = true,
  }) async {
    // P1 GUARD: Never allow tokenNumber <= 0 to trigger alarm
    if (tokenNumber <= 0) {
      debugPrint('[CallingAlertService] Refused to trigger calling alarm: tokenNumber=$tokenNumber <= 0');
      return;
    }
    debugPrint(
      '[CallingAlertService] TRIGGER CALLING ALARM: Token #$tokenNumber at Counter $counterName',
    );

    // 1. Broadcast to in-app alert overlay
    _callAlertStreamController.add({
      'tokenNumber': tokenNumber,
      'counterName': counterName,
      'timestamp': DateTime.now().toIso8601String(),
    });

    // 2. High-priority notification with FullScreenIntent
    final androidDetails = AndroidNotificationDetails(
      highPriorityChannelId,
      highPriorityChannelName,
      channelDescription: highPriorityChannelDesc,
      importance: Importance.max,
      priority: Priority.max,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      playSound: true,
      enableVibration: true,
      vibrationPattern: Int64List.fromList([0, 600, 300, 600, 300, 600]),
    );

    await _localNotifications.show(
      callAlertNotificationId,
      '🚨 YOUR TURN: TOKEN #$tokenNumber',
      'Please proceed immediately to Counter $counterName',
      NotificationDetails(android: androidDetails),
      payload: 'token_called_$tokenNumber',
    );

    // 3. Play chime audio
    try {
      await _audioPlayer.play(AssetSource('audio/call_chime.mp3'));
    } catch (e) {
      // Fallback if local asset is not bundled
      debugPrint('[CallingAlertService] Chime audio playback error: $e');
    }

    // Brief pause before speech so chime completes
    await Future.delayed(const Duration(milliseconds: 900));

    // 4. Sequential Bilingual TTS
    await speakBilingualCallSequence(
      tokenNumber: tokenNumber,
      counterName: counterName,
      voiceHi: voiceHi,
      voiceEn: voiceEn,
    );
  }

  /// Executes sequential bilingual speech synthesis:
  /// STEP 1: Hindi (hi-IN) - "टोकन नंबर {n}, काउंटर {c} पर आएं"
  /// STEP 2: English (en-IN) - "Token number {n}, please proceed to counter {c}"
  /// Returns the ordered list of spoken phrases for verification/testing.
  Future<List<String>> speakBilingualCallSequence({
    required int tokenNumber,
    required String counterName,
    bool voiceHi = true,
    bool voiceEn = true,
  }) async {
    final spokenPhrases = <String>[];

    // Part 1: Hindi TTS first
    if (voiceHi) {
      final hindiPhrase = 'टोकन नंबर $tokenNumber, काउंटर $counterName पर आएं';
      spokenPhrases.add(hindiPhrase);
      try {
        await _flutterTts.setLanguage('hi-IN');
        await _flutterTts.speak(hindiPhrase);
        // Wait for utterance to finish
        final completer = Completer<void>();
        _flutterTts.setCompletionHandler(() {
          if (!completer.isCompleted) completer.complete();
        });
        await completer.future.timeout(
          const Duration(seconds: 4),
          onTimeout: () => debugPrint('[CallingAlertService] Hindi TTS timeout'),
        );
      } catch (e) {
        debugPrint('[CallingAlertService] Hindi TTS error: $e');
      }

      // Natural pause between languages
      await Future.delayed(const Duration(milliseconds: 500));
    }

    // Part 2: English TTS second
    if (voiceEn) {
      final englishPhrase = 'Token number $tokenNumber, please proceed to counter $counterName';
      spokenPhrases.add(englishPhrase);
      try {
        await _flutterTts.setLanguage('en-IN');
        await _flutterTts.speak(englishPhrase);
        final completer = Completer<void>();
        _flutterTts.setCompletionHandler(() {
          if (!completer.isCompleted) completer.complete();
        });
        await completer.future.timeout(
          const Duration(seconds: 4),
          onTimeout: () => debugPrint('[CallingAlertService] English TTS timeout'),
        );
      } catch (e) {
        debugPrint('[CallingAlertService] English TTS error: $e');
      }
    }

    return spokenPhrases;
  }

  /// Autostart / Battery Optimization check for aggressive OEMs (MIUI, ColorOS)
  Future<bool> shouldShowAutostartGuidance() async {
    if (!Platform.isAndroid) return false;
    final shown = await _storage.read('has_shown_autostart_guidance');
    return shown != 'true';
  }

  Future<void> markAutostartGuidanceShown() async {
    await _storage.write('has_shown_autostart_guidance', 'true');
  }

  void dispose() {
    _callAlertStreamController.close();
    _notificationNavigationController.close();
    _audioPlayer.dispose();
    _flutterTts.stop();
  }
}
