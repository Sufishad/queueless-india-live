// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Hindi (`hi`).
class AppLocalizationsHi extends AppLocalizations {
  AppLocalizationsHi([String locale = 'hi']) : super(locale);

  @override
  String get appName => 'कतारमुक्त भारत (QueueLess India)';

  @override
  String get tagline => 'लाइन में नहीं, टाइम पर';

  @override
  String get tokenNumber => 'टोकन नंबर';

  @override
  String proceedTo(String counter) {
    return 'काउंटर $counter पर जाएं';
  }

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
  String semanticsTokenNumber(int number) {
    return 'टोकन नंबर $number';
  }

  @override
  String semanticsCalledAnnouncement(String counter) {
    return 'बुलाया गया, काउंटर $counter पर जाएं';
  }

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

  @override
  String get merchantConsole => 'व्यापारी कंसोल';

  @override
  String get callNext => 'अगला बुलाएं';

  @override
  String get recall => 'दोबारा बुलाएं';

  @override
  String get completeAction => 'पूर्ण करें';

  @override
  String get skipAction => 'छोड़ें / गैरहजिर';

  @override
  String get pauseQueue => 'कतार रोकें';

  @override
  String get resumeQueue => 'कतार शुरू करें';

  @override
  String get walkInButton => 'वॉक-इन';

  @override
  String get tvBoard => 'टीवी कॉलिंग बोर्ड';

  @override
  String get qrStandee => 'क्यूआर स्टैंडी प्रिंट करें';

  @override
  String get nextUp => 'अगला';

  @override
  String get waitingCount => 'प्रतीक्षारत';

  @override
  String get completedToday => 'आज पूर्ण';

  @override
  String get counter => 'काउंटर';

  @override
  String get reconnecting => 'पुनः कनेक्ट हो रहा है';

  @override
  String get autostartGuidanceTitle => 'बैकग्राउंड अलार्म अनुमति';

  @override
  String get autostartGuidanceDesc =>
      'स्क्रीन लॉक होने पर भी टोकन अलार्म बजने के लिए कृपया कतारमुक्त भारत (QueueLess) को ऑटो-स्टार्ट की अनुमति दें।';

  @override
  String get enableNow => 'अभी अनुमति दें';

  @override
  String get dismiss => 'बाद में';
}
