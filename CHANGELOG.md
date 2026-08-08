# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-08-08 — **Major Release**

### ⚠️ Breaking Changes & Migration Guide

- **TurboModules & React Native New Architecture**: Migrated all printer interfaces (`USBPrinter`, `BLEPrinter`, `NetPrinter`) to React Native TurboModules. Native methods now return synchronous/Promise-based values without legacy bridge latency.
- **Android 14+ (API 34 / U+) Security Overhaul**: `PendingIntent` creation in `USBPrinterAdapter` is now strictly explicit (`intent.setPackage(...)`) and applies `FLAG_MUTABLE` conditionally on API 31+. The USB broadcast receiver requires `Context.RECEIVER_EXPORTED` on API 33+.
- **Universal ESC/POS QR Codes**: Replaced fragile hardware `GS ( k` with universal `GS v 0` raster bitmap generation. All QR codes now print reliably on 100% of thermal receipt printers (including low-cost 58mm/80mm models) without printing stray `'2'` characters.
- **Line Reset & Clean Buffer**: Removed obsolete Chinese-mode `FS ! 0` and `ESC 2` sequences from line reset routines, preventing parameter byte leakage (`2 == ...`) across receipt rows.
- **1D Barcode Width Clamping**: Default module widths for wide barcodes (e.g. `CODE39`) now automatically adjust to fit 58mm (384 dots) and 80mm rolls without triggering printer `"wide error!"` warnings.

### Added

- **Fluent `ReceiptBuilder` API**: Built-in chainable, type-safe receipt composer supporting `.textLine()`, `.table()`, `.keyValue()`, `.barcode()`, `.qrCode()`, `.divider()`, `.openDrawer()`, `.beep()`, `.cut()`, `.feed()`, and `.build()`.
- **Native 1D Hardware Barcodes**: Vector barcode generation for `CODE128`, `CODE39`, `EAN13`, `EAN8`, `UPC-A`, `UPC-E`, `ITF`, `CODABAR`, and `CODE93` with configurable HRI position, height, and width.
- **Multi-Column Table Layout Engine**: Built-in `formatColumns` / `printColumns` with automatic word wrapping and column alignments (`left`, `center`, `right`) for 58mm (32 cols) and 80mm (42/48 cols) thermal rolls.
- **Floyd-Steinberg Error Diffusion Dithering**: Replaced binary thresholding across Android printer adapters (`BLEPrinterAdapter`, `NetPrinterAdapter`, `USBPrinterAdapter`) for photorealistic logos and image gradients.
- **Cash Drawer & Cutter Controls**: Added `openCashDrawer(pin)` (Pin 2 and Pin 5 support) and `cutPaper(partial, feedLines)`.
- **Direct Helper Methods**: Added `printColumns()`, `printBarcode()`, `printNativeQRCode()`, `openCashDrawer()`, and `cutPaper()` directly to `USBPrinter`, `BLEPrinter`, and `NetPrinter`.
- **Automatic Typography Sanitizer**: Added `sanitizePrinterText` to convert multi-byte Unicode typography (`•` $\to$ `*`, smart quotes $\to$ `'`/`"`, em-dashes $\to$ `-`) so that text never corrupts into Chinese double-byte characters on single-byte firmware.

### Improved

- **Android 12+ (API 31+) Bluetooth Resilience**: Added `BLUETOOTH_CONNECT` and `BLUETOOTH_SCAN` permission guards and automatic manifest permission merging in `BLEPrinterAdapter`.
- **Bluetooth RFCOMM Socket Fallback**: Added reflection-based RFCOMM socket creation (`createRfcommSocket`) as a fallback for Bluetooth printer firmwares that fail standard UUID matching.
- **Network Socket Timeouts**: Added connection timeout (4000ms) and `SO_TIMEOUT` (5000ms) in `NetPrinterAdapter` to prevent thread hangs when network printers lose power or drop offline.
- **AGP 8.0+ Build Support**: Removed deprecated `package` attribute from `AndroidManifest.xml` for full compatibility with compileSdk 34 and modern Gradle tools.

---

## [1.4.1] - 2026-06-04

### Fixed

- Support local `file://` URIs and absolute paths in `printImage()` on Android by utilizing `BitmapFactory.decodeFile` rather than failing on `HttpURLConnection`. This enables offline image printing of locally stored assets (e.g. cached logos).

---

## [1.4.0] - 2026-05-12

### Added

- `tailingLine` now accepts a **number** (1–255) to control the exact number of trailing blank lines after printing. Previously only `true` (5 lines) or `false` (none) was supported.
