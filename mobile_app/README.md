# Virnyx Mobile App

This app uses Flutter so one codebase can target both Android and iOS.

## Requirements

- Flutter SDK (stable channel)
- Android Studio (Android SDK + emulator)
- Xcode (for iOS simulator/device builds on macOS)

## Run On Android

1. Start an Android emulator or connect an Android device.
2. From this directory, run:

```bash
flutter pub get
flutter run -d android
```

## Run On iOS

1. On macOS, start an iOS simulator or connect an iPhone.
2. Install dependencies and run:

```bash
flutter pub get
cd ios && pod install && cd ..
flutter run -d ios
```

## Build Releases

Android APK:

```bash
flutter build apk --release
```

Android App Bundle:

```bash
flutter build appbundle --release
```

iOS:

```bash
flutter build ios --release
```

## Useful Commands

List connected devices:

```bash
flutter devices
```

Analyze project:

```bash
flutter analyze
```
