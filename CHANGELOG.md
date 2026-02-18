# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-01

### Added

- Initial release of `react-native-earl-thermal-printer`.
- React Native **New Architecture** (TurboModules / Codegen) support for both Android and iOS.
- **USBPrinter** module — connect and print via USB (Android only; iOS returns `ERR_UNSUPPORTED`).
- **BLEPrinter** module — scan, connect, and print via Bluetooth Low Energy (Android & iOS).
- **NetPrinter** module — discover, connect, and print via TCP/IP network (Android & iOS).
- Promise-based API across all printer modules (`init`, `getDeviceList`, `connectPrinter`, `printRawData`, `printImageData`, `printQrCode`, `closeConn`).
- ESC/POS text formatting helpers (`textTo64Buffer`, `billTo64Buffer`) with support for bold, center, small text, and more.
- Event emitter for network printer discovery (`scannerResolved`, `scannerRunning`).
- TypeScript definitions and full type safety.
- Minimum requirements: React Native >= 0.73, React >= 18, Android SDK 23+, iOS 13.4+.

### Changed

- Migrated all native modules from legacy Bridge architecture to TurboModules.
- Replaced callback-based API with Promises throughout.
- Updated Android `build.gradle` to use the `com.facebook.react` Gradle plugin and `compileSdkVersion 34`.
- Updated iOS podspec to use `install_modules_dependencies` and `.mm` (Objective-C++) source files.
- Renamed package to `react-native-earl-thermal-printer`.
