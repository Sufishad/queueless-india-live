// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appName => 'QueueLess India';

  @override
  String get tagline => 'Line mein nahi, time par';

  @override
  String get tokenNumber => 'TOKEN NUMBER';

  @override
  String proceedTo(String counter) {
    return 'PROCEED TO: $counter';
  }

  @override
  String get leave => 'Leave';

  @override
  String get positionLabel => 'POSITION';

  @override
  String get estWaitLabel => 'EST. WAIT';

  @override
  String get counterLabel => 'COUNTER';

  @override
  String get waiting => 'Waiting';

  @override
  String get called => 'Called';

  @override
  String get inService => 'In Service';

  @override
  String get completed => 'Completed';

  @override
  String get statusWaiting => 'WAITING';

  @override
  String get statusCalled => 'CALLED NOW';

  @override
  String get statusInService => 'IN SERVICE';

  @override
  String get statusCompleted => 'COMPLETED';

  @override
  String get statusCancelled => 'CANCELLED';

  @override
  String semanticsTokenNumber(int number) {
    return 'Token number $number';
  }

  @override
  String semanticsCalledAnnouncement(String counter) {
    return 'Called, proceed to counter $counter';
  }

  @override
  String get semanticsWaitingStep => 'Step 1 of 4: Waiting';

  @override
  String get semanticsCalledStep => 'Step 2 of 4: Called';

  @override
  String get semanticsInServiceStep => 'Step 3 of 4: In Service';

  @override
  String get semanticsCompletedStep => 'Step 4 of 4: Completed';

  @override
  String get selectService => 'SELECT SERVICE';

  @override
  String get yourName => 'Your Name';

  @override
  String get getToken => 'Get Token';

  @override
  String get joinLiveQueue => 'Join Live Queue';

  @override
  String get nowServing => 'NOW SERVING';

  @override
  String get live => 'LIVE';

  @override
  String get offline => 'OFFLINE';

  @override
  String get close => 'Close';

  @override
  String get merchantConsole => 'Merchant Console';

  @override
  String get callNext => 'Call Next';

  @override
  String get recall => 'Recall';

  @override
  String get completeAction => 'Complete';

  @override
  String get skipAction => 'Skip / No-Show';

  @override
  String get pauseQueue => 'Pause Queue';

  @override
  String get resumeQueue => 'Resume Queue';

  @override
  String get walkInButton => 'Walk-in';

  @override
  String get tvBoard => 'TV Calling Board';

  @override
  String get qrStandee => 'Print QR Standee';

  @override
  String get nextUp => 'Next Up';

  @override
  String get waitingCount => 'Waiting';

  @override
  String get completedToday => 'Completed Today';

  @override
  String get counter => 'Counter';

  @override
  String get reconnecting => 'RECONNECTING';

  @override
  String get autostartGuidanceTitle => 'Background Alarm Setup';

  @override
  String get autostartGuidanceDesc =>
      'To ensure token alerts ring over silent/DND when phone is locked, please allow Auto-start for QueueLess.';

  @override
  String get enableNow => 'Enable Now';

  @override
  String get dismiss => 'Dismiss';
}
