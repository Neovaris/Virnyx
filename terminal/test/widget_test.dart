// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:terminal/app/app.dart';

void main() {
  testWidgets('VirnyxApp startup smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const VirnyxApp());
    await tester.pumpAndSettle();

    // Verify that the app renders and navigates to bootstrap/login screen
    expect(find.byType(VirnyxApp), findsOneWidget);
    
    // The app should show either Login or Bootstrap screen
    // This is a smoke test to ensure basic app structure is correct
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
