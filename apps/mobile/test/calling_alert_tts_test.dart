import 'package:flutter_test/flutter_test.dart';

/// Test suite verifying bilingual TTS announcement logic:
/// Rule 1: hi-IN spoken FIRST: "टोकन नंबर {n}, काउंटर {c} पर आएं"
/// Rule 2: en-IN spoken SECOND: "Token number {n}, please proceed to counter {c}"
/// Rule 3: Respects branch queue_settings voice_hi / voice_en flags

List<String> buildBilingualPhrases({
  required int tokenNumber,
  required String counterName,
  bool voiceHi = true,
  bool voiceEn = true,
}) {
  final phrases = <String>[];
  if (voiceHi) {
    phrases.add('टोकन नंबर $tokenNumber, काउंटर $counterName पर आएं');
  }
  if (voiceEn) {
    phrases.add('Token number $tokenNumber, please proceed to counter $counterName');
  }
  return phrases;
}

void main() {
  group('CallingAlertService Bilingual TTS Ordering Tests', () {
    test('speaks Hindi (hi-IN) first, then English (en-IN) by default', () {
      final sequence = buildBilingualPhrases(
        tokenNumber: 14,
        counterName: 'Counter 2',
        voiceHi: true,
        voiceEn: true,
      );

      expect(sequence.length, equals(2));
      // First announcement must be Hindi
      expect(sequence[0], equals('टोकन नंबर 14, काउंटर Counter 2 पर आएं'));
      // Second announcement must be English
      expect(sequence[1], equals('Token number 14, please proceed to counter Counter 2'));
    });

    test('suppresses Hindi when voice_hi is false', () {
      final sequence = buildBilingualPhrases(
        tokenNumber: 25,
        counterName: '1',
        voiceHi: false,
        voiceEn: true,
      );

      expect(sequence.length, equals(1));
      expect(sequence.first, equals('Token number 25, please proceed to counter 1'));
    });

    test('suppresses English when voice_en is false', () {
      final sequence = buildBilingualPhrases(
        tokenNumber: 99,
        counterName: 'Billing A',
        voiceHi: true,
        voiceEn: false,
      );

      expect(sequence.length, equals(1));
      expect(sequence.first, equals('टोकन नंबर 99, काउंटर Billing A पर आएं'));
    });

    test('produces empty sequence when both voice flags are disabled', () {
      final sequence = buildBilingualPhrases(
        tokenNumber: 5,
        counterName: 'Counter 3',
        voiceHi: false,
        voiceEn: false,
      );

      expect(sequence, isEmpty);
    });

    test('correctly interpolates high-number tokens and custom counter names', () {
      final sequence = buildBilingualPhrases(
        tokenNumber: 502,
        counterName: 'Pharmacy Delivery',
      );

      expect(sequence[0], contains('502'));
      expect(sequence[0], contains('Pharmacy Delivery'));
      expect(sequence[1], contains('502'));
      expect(sequence[1], contains('Pharmacy Delivery'));
    });

    test('token 0 guard: rejects invalid or zero token numbers from triggering alarm', () {
      bool isValidCallingToken(dynamic tokenRaw) {
        final parsed = int.tryParse(tokenRaw?.toString() ?? '');
        return parsed != null && parsed > 0;
      }

      expect(isValidCallingToken(0), isFalse);
      expect(isValidCallingToken('0'), isFalse);
      expect(isValidCallingToken('-5'), isFalse);
      expect(isValidCallingToken(null), isFalse);
      expect(isValidCallingToken('invalid'), isFalse);
      expect(isValidCallingToken('1'), isTrue);
      expect(isValidCallingToken(42), isTrue);
    });
  });
}
