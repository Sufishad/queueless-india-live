// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Marathi (`mr`).
class AppLocalizationsMr extends AppLocalizations {
  AppLocalizationsMr([String locale = 'mr']) : super(locale);

  @override
  String get appName => 'कतारमुक्त भारत (QueueLess India)';

  @override
  String get tagline => 'रांगेत नाही, वेळेवर';

  @override
  String get tokenNumber => 'टोकन क्रमांक';

  @override
  String proceedTo(String counter) {
    return 'काउंटर $counter कडे जा';
  }

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
  String semanticsTokenNumber(int number) {
    return 'टोकन क्रमांक $number';
  }

  @override
  String semanticsCalledAnnouncement(String counter) {
    return 'बोलावले आहे, काउंटर $counter कडे जा';
  }

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

  @override
  String get merchantConsole => 'व्यापारी कन्सोल';

  @override
  String get callNext => 'पुढील बोलवा';

  @override
  String get recall => 'पुन्हा बोलवा';

  @override
  String get completeAction => 'पूर्ण करा';

  @override
  String get skipAction => 'वगळा / गैरहजर';

  @override
  String get pauseQueue => 'रांग थांबवा';

  @override
  String get resumeQueue => 'रांग सुरू करा';

  @override
  String get walkInButton => 'वॉक-इन';

  @override
  String get tvBoard => 'टीव्ही कॉलिंग बोर्ड';

  @override
  String get qrStandee => 'क्यूआर स्टँडी प्रिंट करा';

  @override
  String get nextUp => 'पुढील टोकन';

  @override
  String get waitingCount => 'प्रतीक्षेत';

  @override
  String get completedToday => 'आज पूर्ण';

  @override
  String get counter => 'काउंटर';

  @override
  String get reconnecting => 'पुन्हा जोडत आहे';

  @override
  String get autostartGuidanceTitle => 'पार्श्वभूमी अलार्म सेटिंग';

  @override
  String get autostartGuidanceDesc =>
      'स्क्रीन लॉक असतानाही टोकन अलार्म वाजण्यासाठी QueueLess साठी ऑटो-स्टार्ट सुरू करा.';

  @override
  String get enableNow => 'आता सुरू करा';

  @override
  String get dismiss => 'नंतर';
}
