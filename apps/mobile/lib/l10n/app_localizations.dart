import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_mr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('hi'),
    Locale('mr')
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'QueueLess India'**
  String get appName;

  /// No description provided for @tagline.
  ///
  /// In en, this message translates to:
  /// **'Line mein nahi, time par'**
  String get tagline;

  /// No description provided for @tokenNumber.
  ///
  /// In en, this message translates to:
  /// **'TOKEN NUMBER'**
  String get tokenNumber;

  /// No description provided for @proceedTo.
  ///
  /// In en, this message translates to:
  /// **'PROCEED TO: {counter}'**
  String proceedTo(String counter);

  /// No description provided for @leave.
  ///
  /// In en, this message translates to:
  /// **'Leave'**
  String get leave;

  /// No description provided for @positionLabel.
  ///
  /// In en, this message translates to:
  /// **'POSITION'**
  String get positionLabel;

  /// No description provided for @estWaitLabel.
  ///
  /// In en, this message translates to:
  /// **'EST. WAIT'**
  String get estWaitLabel;

  /// No description provided for @counterLabel.
  ///
  /// In en, this message translates to:
  /// **'COUNTER'**
  String get counterLabel;

  /// No description provided for @waiting.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get waiting;

  /// No description provided for @called.
  ///
  /// In en, this message translates to:
  /// **'Called'**
  String get called;

  /// No description provided for @inService.
  ///
  /// In en, this message translates to:
  /// **'In Service'**
  String get inService;

  /// No description provided for @completed.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get completed;

  /// No description provided for @statusWaiting.
  ///
  /// In en, this message translates to:
  /// **'WAITING'**
  String get statusWaiting;

  /// No description provided for @statusCalled.
  ///
  /// In en, this message translates to:
  /// **'CALLED NOW'**
  String get statusCalled;

  /// No description provided for @statusInService.
  ///
  /// In en, this message translates to:
  /// **'IN SERVICE'**
  String get statusInService;

  /// No description provided for @statusCompleted.
  ///
  /// In en, this message translates to:
  /// **'COMPLETED'**
  String get statusCompleted;

  /// No description provided for @statusCancelled.
  ///
  /// In en, this message translates to:
  /// **'CANCELLED'**
  String get statusCancelled;

  /// No description provided for @semanticsTokenNumber.
  ///
  /// In en, this message translates to:
  /// **'Token number {number}'**
  String semanticsTokenNumber(int number);

  /// No description provided for @semanticsCalledAnnouncement.
  ///
  /// In en, this message translates to:
  /// **'Called, proceed to counter {counter}'**
  String semanticsCalledAnnouncement(String counter);

  /// No description provided for @semanticsWaitingStep.
  ///
  /// In en, this message translates to:
  /// **'Step 1 of 4: Waiting'**
  String get semanticsWaitingStep;

  /// No description provided for @semanticsCalledStep.
  ///
  /// In en, this message translates to:
  /// **'Step 2 of 4: Called'**
  String get semanticsCalledStep;

  /// No description provided for @semanticsInServiceStep.
  ///
  /// In en, this message translates to:
  /// **'Step 3 of 4: In Service'**
  String get semanticsInServiceStep;

  /// No description provided for @semanticsCompletedStep.
  ///
  /// In en, this message translates to:
  /// **'Step 4 of 4: Completed'**
  String get semanticsCompletedStep;

  /// No description provided for @selectService.
  ///
  /// In en, this message translates to:
  /// **'SELECT SERVICE'**
  String get selectService;

  /// No description provided for @yourName.
  ///
  /// In en, this message translates to:
  /// **'Your Name'**
  String get yourName;

  /// No description provided for @getToken.
  ///
  /// In en, this message translates to:
  /// **'Get Token'**
  String get getToken;

  /// No description provided for @joinLiveQueue.
  ///
  /// In en, this message translates to:
  /// **'Join Live Queue'**
  String get joinLiveQueue;

  /// No description provided for @nowServing.
  ///
  /// In en, this message translates to:
  /// **'NOW SERVING'**
  String get nowServing;

  /// No description provided for @live.
  ///
  /// In en, this message translates to:
  /// **'LIVE'**
  String get live;

  /// No description provided for @offline.
  ///
  /// In en, this message translates to:
  /// **'OFFLINE'**
  String get offline;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @merchantConsole.
  ///
  /// In en, this message translates to:
  /// **'Merchant Console'**
  String get merchantConsole;

  /// No description provided for @callNext.
  ///
  /// In en, this message translates to:
  /// **'Call Next'**
  String get callNext;

  /// No description provided for @recall.
  ///
  /// In en, this message translates to:
  /// **'Recall'**
  String get recall;

  /// No description provided for @completeAction.
  ///
  /// In en, this message translates to:
  /// **'Complete'**
  String get completeAction;

  /// No description provided for @skipAction.
  ///
  /// In en, this message translates to:
  /// **'Skip / No-Show'**
  String get skipAction;

  /// No description provided for @pauseQueue.
  ///
  /// In en, this message translates to:
  /// **'Pause Queue'**
  String get pauseQueue;

  /// No description provided for @resumeQueue.
  ///
  /// In en, this message translates to:
  /// **'Resume Queue'**
  String get resumeQueue;

  /// No description provided for @walkInButton.
  ///
  /// In en, this message translates to:
  /// **'Walk-in'**
  String get walkInButton;

  /// No description provided for @tvBoard.
  ///
  /// In en, this message translates to:
  /// **'TV Calling Board'**
  String get tvBoard;

  /// No description provided for @qrStandee.
  ///
  /// In en, this message translates to:
  /// **'Print QR Standee'**
  String get qrStandee;

  /// No description provided for @nextUp.
  ///
  /// In en, this message translates to:
  /// **'Next Up'**
  String get nextUp;

  /// No description provided for @waitingCount.
  ///
  /// In en, this message translates to:
  /// **'Waiting'**
  String get waitingCount;

  /// No description provided for @completedToday.
  ///
  /// In en, this message translates to:
  /// **'Completed Today'**
  String get completedToday;

  /// No description provided for @counter.
  ///
  /// In en, this message translates to:
  /// **'Counter'**
  String get counter;

  /// No description provided for @reconnecting.
  ///
  /// In en, this message translates to:
  /// **'RECONNECTING'**
  String get reconnecting;

  /// No description provided for @autostartGuidanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Background Alarm Setup'**
  String get autostartGuidanceTitle;

  /// No description provided for @autostartGuidanceDesc.
  ///
  /// In en, this message translates to:
  /// **'To ensure token alerts ring over silent/DND when phone is locked, please allow Auto-start for QueueLess.'**
  String get autostartGuidanceDesc;

  /// No description provided for @enableNow.
  ///
  /// In en, this message translates to:
  /// **'Enable Now'**
  String get enableNow;

  /// No description provided for @dismiss.
  ///
  /// In en, this message translates to:
  /// **'Dismiss'**
  String get dismiss;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'hi', 'mr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'hi':
      return AppLocalizationsHi();
    case 'mr':
      return AppLocalizationsMr();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
