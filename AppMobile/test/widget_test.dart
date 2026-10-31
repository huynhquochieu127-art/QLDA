import 'package:flutter_test/flutter_test.dart';
import 'package:appmobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const CoffeeApp());
    expect(find.byType(CoffeeApp), findsOneWidget);
  });
}
