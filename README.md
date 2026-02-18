# react-native-earl-thermal-printer

A React Native library for USB, Bluetooth (BLE), and Network (TCP/IP) thermal receipt printers.

Built for the **React Native New Architecture** (TurboModules / Codegen). Supports Android and iOS.

---

## Requirements

| Platform     | Minimum Version    |
| ------------ | ------------------ |
| React Native | >= 0.73            |
| React        | >= 18              |
| Android SDK  | 23 (compileSdk 34) |
| iOS          | 13.4+              |

## Installation

```bash
npm install react-native-earl-thermal-printer
# or
yarn add react-native-earl-thermal-printer
```

### iOS

```bash
cd ios && pod install
```

### Android

No additional steps — the library auto-links via the React Native Gradle plugin.

---

## Printer Support Matrix

| Feature              | Android |              iOS               |
| -------------------- | :-----: | :----------------------------: |
| USB Printer          |   Yes   | No (returns `ERR_UNSUPPORTED`) |
| BLE Printer          |   Yes   |              Yes               |
| Net Printer          |   Yes   |              Yes               |
| Print Text (ESC/POS) |   Yes   |              Yes               |
| Print Image          |   Yes   |              Yes               |
| Print QR Code        |   Yes   |              Yes               |

---

## Quick Start

```tsx
import {
	USBPrinter,
	BLEPrinter,
	NetPrinter,
	NetPrinterEventEmitter,
	RN_THERMAL_RECEIPT_PRINTER_EVENTS,
} from "react-native-earl-thermal-printer";
```

### USB Printer (Android only)

```tsx
await USBPrinter.init();
const devices = await USBPrinter.getDeviceList();
await USBPrinter.connectPrinter(devices[0].vendor_id, devices[0].product_id);
await USBPrinter.printText("Hello from USB!\n");
await USBPrinter.printBill("Receipt line\n");
USBPrinter.closeConn();
```

### BLE Printer

```tsx
await BLEPrinter.init();
const devices = await BLEPrinter.getDeviceList();
await BLEPrinter.connectPrinter(devices[0].inner_mac_address);
await BLEPrinter.printText("Hello from BLE!\n");
await BLEPrinter.printBill("Receipt line\n");
BLEPrinter.closeConn();
```

### Net Printer

```tsx
await NetPrinter.init();

// Listen for discovered printers on the local subnet
NetPrinterEventEmitter.addListener(
	RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNED_SUCCESS,
	(printers) => console.log("Found:", printers),
);

const devices = await NetPrinter.getDeviceList();
await NetPrinter.connectPrinter("192.168.1.100", 9100);
await NetPrinter.printText("Hello from Network!\n");
await NetPrinter.printBill("Receipt line\n");
NetPrinter.closeConn();
```

---

## API Reference

All three printer objects (`USBPrinter`, `BLEPrinter`, `NetPrinter`) share the same high-level interface:

### `init(): Promise<string>`

Initialize the printer module. **Must be called before any other method.**

### `getDeviceList(): Promise<IUSBPrinter[] | IBLEPrinter[] | INetPrinter[]>`

Scan for available printers and return a list of discovered devices.

### `connectPrinter(...): Promise<object>`

Connect to a printer.

| Printer | Parameters                            |
| ------- | ------------------------------------- |
| USB     | `vendorId: number, productId: number` |
| BLE     | `innerMacAddress: string`             |
| Net     | `host: string, port: number`          |

### `printText(text: string, opts?: PrinterOptions): Promise<void>`

Print a text string using ESC/POS encoding. Supports formatting tags (see below).

### `printBill(text: string, opts?: PrinterOptions): Promise<void>`

Same as `printText` but defaults `beep`, `cut`, and `tailingLine` to `true`.

### `printImage(imageUrl: string): Promise<void>`

Print an image from a URL.

### `printQrCode(qrCode: string): Promise<void>`

Print a QR code.

### `closeConn(): void`

Disconnect from the printer.

---

## PrinterOptions

```ts
interface PrinterOptions {
	beep?: boolean; // Beep after printing (default: false)
	cut?: boolean; // Cut paper after printing (default: false)
	tailingLine?: boolean; // Add trailing blank lines (default: false)
	encoding?: string; // Text encoding (default: "UTF8")
}
```

---

## ESC/POS Formatting Tags

The text helpers (`printText`, `printBill`) support inline formatting tags:

| Tag            | Description            |
| -------------- | ---------------------- |
| `<B>...</B>`   | **Bold**               |
| `<C>...</C>`   | Center-aligned         |
| `<D>...</D>`   | Double-width           |
| `<DB>...</DB>` | Double-width bold      |
| `<M>...</M>`   | Medium (double-height) |

Example:

```tsx
await NetPrinter.printBill(
	"<C><B>MY STORE</B></C>\n" +
		"================================\n" +
		"Item 1            $5.00\n" +
		"Item 2            $3.50\n" +
		"================================\n" +
		"<B>TOTAL             $8.50</B>\n",
);
```

---

## Interfaces

```ts
interface IUSBPrinter {
	device_name: string;
	device_id: number;
	vendor_id: number;
	product_id: number;
}

interface IBLEPrinter {
	device_name: string;
	inner_mac_address: string;
}

interface INetPrinter {
	device_name: string;
	host: string;
	port: number;
}
```

---

## Events

Net printer scanning emits events via `NetPrinterEventEmitter`:

| Event             | Enum                                | Payload         |
| ----------------- | ----------------------------------- | --------------- |
| `scannerResolved` | `EVENT_NET_PRINTER_SCANNED_SUCCESS` | `INetPrinter[]` |
| `scannerRunning`  | `EVENT_NET_PRINTER_SCANNING`        | `boolean`       |

```tsx
import {
	NetPrinterEventEmitter,
	RN_THERMAL_RECEIPT_PRINTER_EVENTS,
} from "react-native-earl-thermal-printer";

NetPrinterEventEmitter.addListener(
	RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNED_SUCCESS,
	(printers) => {
		console.log("Discovered printers:", printers);
	},
);

NetPrinterEventEmitter.addListener(
	RN_THERMAL_RECEIPT_PRINTER_EVENTS.EVENT_NET_PRINTER_SCANNING,
	(isScanning) => {
		console.log("Scanning:", isScanning);
	},
);
```

---

## Android Permissions

Add these permissions to your `AndroidManifest.xml`:

```xml
<!-- USB -->
<uses-feature android:name="android.hardware.usb.host" android:required="false" />

<!-- Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Network -->
<uses-permission android:name="android.permission.INTERNET" />
```

---

## New Architecture

This library is built for the React Native **New Architecture** using TurboModules and Codegen. It requires:

- React Native **>= 0.73**
- New Architecture **enabled** in your app

The library ships codegen specs in `src/Native*.ts`. The native code is generated automatically during the build.

---

## Author

**Ordovez, Earl Romeo**

## License

ISC

## Funding

If you find this library useful, consider [sponsoring on GitHub](https://github.com/sponsors/Swif7ify).
