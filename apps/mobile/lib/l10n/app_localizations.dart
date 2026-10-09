import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

abstract class AppLocalizations {
  AppLocalizations(this.locale);

  final Locale locale;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations) ??
        AppLocalizationsEn();
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  static const List<Locale> supportedLocales = [
    Locale('en'),
    Locale('hi'),
    Locale('mr'),
  ];

  String get appName;
  String get tagline;
  String get tokenNumber;
  String proceedTo(String counter);
  String get leave;
  String get positionLabel;
  String get estWaitLabel;
  String get counterLabel;
  String get waiting;
  String get called;
  String get inService;
  String get completed;
  String get statusWaiting;
  String get statusCalled;
  String get statusInService;
  String get statusCompleted;
  String get statusCancelled;
  String semanticsTokenNumber(int number);
  String semanticsCalledAnnouncement(String counter);
  String get semanticsWaitingStep;
  String get semanticsCalledStep;
  String get semanticsInServiceStep;
  String get semanticsCompletedStep;
  String get selectService;
  String get yourName;
  String get getToken;
  String get joinLiveQueue;
  String get nowServing;
  String get live;
  String get offline;
  String get close;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) =>
      ['en', 'hi', 'mr'].contains(locale.languageCode);

  @override
  Future<AppLocalizations> load(Locale locale) {
    switch (locale.languageCode) {
      case 'hi':
        return SynchronousFuture<AppLocalizations>(AppLocalizationsHi());
      case 'mr':
        return SynchronousFuture<AppLocalizations>(AppLocalizationsMr());
      case 'en':
      default:
        return SynchronousFuture<AppLocalizations>(AppLocalizationsEn());
    }
  }

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn() : super(const Locale('en'));

  @override
  String get appName => 'QueueLess India';
  @override
  String get tagline => 'Line mein nahi, time par';
  @override
  String get tokenNumber => 'TOKEN NUMBER';
  @override
  String proceedTo(String counter) => 'PROCEED TO: $counter';
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
  String semanticsTokenNumber(int number) => 'Token number $number';
  @override
  String semanticsCalledAnnouncement(String counter) =>
      'Called, proceed to counter $counter';
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
}

class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi() : super(const Locale('hi'));

  @override
  String get appName => 'कतारमुक्त भारत (QueueLess India)';
  @override
  String get tagline => 'लाइन में नहीं, टाइम पर';
  @override
  String get tokenNumber => 'टोकन नंबर';
  @override
  String proceedTo(String counter) => 'काउंटर $counter पर जाएं';
  @override
  String get leave => 'कतार छोड़ें';
  @override
  String get positionLabel => 'स्थान';
  @override
  String get estWaitLabel => 'अनुमानित समय';
  @override
  String get counterLabel => 'काउंटर';
  @override
  String get waiting => 'प्रतीक्षा';
  @override
  String get called => 'बुलाया';
  @override
  String get inService => 'सेवा में';
  @override
  String get completed => 'सम्पन्न';
  @override
  String get statusWaiting => 'प्रतीक्षारत';
  @override
  String get statusCalled => 'अभी बुलाया गया';
  @override
  String get statusInService => 'सेवा जारी';
  @override
  String get statusCompleted => 'सम्पन्न';
  @override
  String get statusCancelled => 'रद्द';
  @override
  String semanticsTokenNumber(int number) => 'टोकन नंबर $number';
  @override
  String semanticsCalledAnnouncement(String counter) =>
      'बुलाया गया, काउंटर $counter पर जाएं';
  @override
  String get semanticsWaitingStep => 'चरण 1 / 4: प्रतीक्षा';
  @override
  String get semanticsCalledStep => 'चरण 2 / 4: बुलाया गया';
  @override
  String get semanticsInServiceStep => 'चरण 3 / 4: सेवा जारी';
  @override
  String get semanticsCompletedStep => 'चरण 4 / 4: सम्पन्न';
  @override
  String get selectService => 'सेवा चुनें';
  @override
  String get yourName => 'आपका नाम';
  @override
  String get getToken => 'टोकन लें';
  @override
  String get joinLiveQueue => 'लाइव कतार में जुड़ें';
  @override
  String get nowServing => 'वर्तमान सेवा';
  @override
  String get live => 'लाइव';
  @override
  String get offline => 'ऑफ़लाइन';
  @override
  String get close => 'बंद करें';
}

class AppLocalizationsMr extends AppLocalizations {
  AppLocalizationsMr() : super(const Locale('mr'));

  @override
  String get appName => 'कतारमुक्त भारत (QueueLess India)';
  @override
  String get tagline => 'रांगेत नाही, वेळेवर';
  @override
  String get tokenNumber => 'टोकन क्रमांक';
  @override
  String proceedTo(String counter) => 'काउंटर $counter कडे जा';
  @override
  String get leave => 'रांग सोडा';
  @override
  String get positionLabel => 'क्रमांक स्थान';
  @override
  String get estWaitLabel => 'अंदाजे वेळ';
  @override
  String get counterLabel => 'काउंटर';
  @override
  String get waiting => 'प्रतीक्षा';
  @override
  String get called => 'बोलावले';
  @override
  String get inService => 'सेवेमध्ये';
  @override
  String get completed => 'पूर्ण';
  @override
  String get statusWaiting => 'प्रतीक्षेत';
  @override
  String get statusCalled => 'आत्ताच बोलावले आहे';
  @override
  String get statusInService => 'सेवा सुरू आहे';
  @override
  String get statusCompleted => 'पूर्ण झाले';
  @override
  String get statusCancelled => 'रद्द केले';
  @override
  String semanticsTokenNumber(int number) => 'टोकन क्रमांक $number';
  @override
  String semanticsCalledAnnouncement(String counter) =>
      'बोलावले आहे, काउंटर $counter कडे जा';
  @override
  String get semanticsWaitingStep => 'टप्पा 1 / 4: प्रतीक्षा';
  @override
  String get semanticsCalledStep => 'टप्पा 2 / 4: बोलावले आहे';
  @override
  String get semanticsInServiceStep => 'टप्पा 3 / 4: सेवा सुरू आहे';
  @override
  String get semanticsCompletedStep => 'टप्पा 4 / 4: पूर्ण झाले';
  @override
  String get selectService => 'सेवा निवडा';
  @override
  String get yourName => 'तुमचे नाव';
  @override
  String get getToken => 'टोकन मिळवा';
  @override
  String get joinLiveQueue => 'थेट रांगेत सहभागी व्हा';
  @override
  String get nowServing => 'सध्या सुरू असलेला टोकन';
  @override
  String get live => 'थेट (Live)';
  @override
  String get offline => 'ऑफलाईन';
  @override
  String get close => 'बंद करा';
}
