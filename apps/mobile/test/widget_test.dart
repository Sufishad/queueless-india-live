import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:queueless_mobile/main.dart';

void main() {
  testWidgets('QueueLessApp smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: QueueLessApp(),
      ),
    );
    expect(find.byType(QueueLessApp), findsOneWidget);
  });
}
