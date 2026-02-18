# react-native-earl-thermal-printer

![GitHub stars](https://img.shields.io/github/stars/Swif7ify/react-native-earl-thermal-printer?style=social)
![npm](https://img.shields.io/npm/v/react-native-earl-thermal-printer)
![downloads](https://img.shields.io/npm/dm/react-native-earl-thermal-printer)
![license](https://img.shields.io/npm/l/react-native-earl-thermal-printer)

A React Native library for USB, Bluetooth (BLE), and Network (TCP/IP) thermal receipt printers. Modern, high-performance thermal printer library for React Native. Built with the New Architecture (TurboModules) for synchronous communication, zero legacy bridge overhead, and Android 12+ Bluetooth compliance.

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
await USBPrinter.printImage("https://example.com/logo.png", 300);
await USBPrinter.printQrCode("https://example.com", 200);
USBPrinter.closeConn();
```

### BLE Printer

```tsx
await BLEPrinter.init();
const devices = await BLEPrinter.getDeviceList();
await BLEPrinter.connectPrinter(devices[0].inner_mac_address);
await BLEPrinter.printText("Hello from BLE!\n");
await BLEPrinter.printBill("Receipt line\n");
await BLEPrinter.printImage("https://example.com/logo.png", 300);
await BLEPrinter.printQrCode("https://example.com", 200);
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
await NetPrinter.printImage("https://example.com/logo.png", 300);
await NetPrinter.printQrCode("https://example.com", 200);
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

### `printImage(imageUrl: string, imageWidth?: number): Promise<void>`

Print an image from a URL. The optional `imageWidth` parameter controls the maximum width in pixels for the printed image (default: `200` on Android, `150` on iOS).

### `printQrCode(qrCode: string, qrSize?: number): Promise<void>`

Print a QR code. The optional `qrSize` parameter controls the size in pixels of the generated QR code (default: `250`).

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

## Example

```tsx
import React, { useEffect, useState } from "react";
import {
	Alert,
	Button,
	FlatList,
	PermissionsAndroid,
	Platform,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { BLEPrinter, IBLEPrinter } from "react-native-earl-thermal-printer";

export default function ThermalPrinterTest() {
	const [printers, setPrinters] = useState<IBLEPrinter[]>([]);
	const [currentPrinter, setCurrentPrinter] = useState<IBLEPrinter | null>(
		null,
	);

	useEffect(() => {
		BLEPrinter.init()
			.then(() => {
				console.log("Printer initialized");
			})
			.catch((err) => {
				console.warn("Init failed:", err);
			});
	}, []);

	const requestPermissions = async () => {
		if (Platform.OS === "android") {
			try {
				const granted = await PermissionsAndroid.requestMultiple([
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
					PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
					PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
				]);
				if (
					granted["android.permission.BLUETOOTH_CONNECT"] ===
					PermissionsAndroid.RESULTS.GRANTED
				) {
					scanDevices();
				} else {
					Alert.alert("Permission denied");
				}
			} catch (err) {
				console.warn(err);
			}
		} else {
			scanDevices();
		}
	};

	const scanDevices = () => {
		BLEPrinter.getDeviceList()
			.then(setPrinters)
			.catch((err) => Alert.alert("Scan Failed", String(err)));
	};

	const connectPrinter = (printer: IBLEPrinter) => {
		BLEPrinter.connectPrinter(printer.inner_mac_address)
			.then((connected) => {
				setCurrentPrinter(connected);
				Alert.alert(
					"Connected",
					`Connected to ${connected.device_name}`,
				);
			})
			.catch((err) => Alert.alert("Connection Failed", String(err)));
	};

	const printTicket = async () => {
		if (!currentPrinter) {
			Alert.alert("No Printer", "Please connect to a printer first.");
			return;
		}

		try {
			// To print a QR code:
			await BLEPrinter.printQrCode("ZAM-OC-0001", 100); // qrSize
			// Print formatted receipt text (beeps + cuts automatically)
			const bill =
				"--------------------------------\n" +
				"Item 1               $10.00\n" +
				"Item 2               $20.00\n" +
				"--------------------------------\n" +
				"<B>TOTAL              $30.00</B>\n\n\n";

			await BLEPrinter.printBill(bill);

			// To print an image from URL:
			// await BLEPrinter.printImage(
				"https://images.unsplash.com/photo-1771258052747-52e19364185f?q=80&w=765&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
				300, // imageWidth
			);
		} catch (err) {
			console.warn("Print error:", err);
			Alert.alert("Print Error", String(err));
		}
	};

	return (
		<View style={styles.container}>
			<Button title="Scan for Printers" onPress={requestPermissions} />

			<FlatList
				data={printers}
				keyExtractor={(item) => item.inner_mac_address}
				renderItem={({ item }) => (
					<TouchableOpacity
						style={styles.deviceItem}
						onPress={() => connectPrinter(item)}
					>
						<Text>{item.device_name || "Unknown Device"}</Text>
						<Text style={styles.subText}>
							{item.inner_mac_address}
						</Text>
					</TouchableOpacity>
				)}
				style={{ maxHeight: 200, marginVertical: 20 }}
			/>

			<View style={styles.printArea}>
				<Text style={{ marginBottom: 10 }}>
					Status:{" "}
					{currentPrinter
						? `Connected to ${currentPrinter.device_name}`
						: "Disconnected"}
				</Text>
				<Button
					title="Print Test Receipt"
					onPress={printTicket}
					disabled={!currentPrinter}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, padding: 40, paddingTop: 60 },
	deviceItem: { padding: 10, borderBottomWidth: 1, borderColor: "#ccc" },
	subText: { fontSize: 10, color: "#666" },
	printArea: { marginTop: 20, alignItems: "center" },
});
```

---

## Running the Example

A working example app lives in the `example/` directory.

### Prerequisites

- [Node.js](https://nodejs.org/) (>= 18)
- [Yarn](https://classic.yarnpkg.com/) (v1) — required because the example uses `link:..`
- Android Studio with an emulator or a physical device (USB debugging enabled)
- For iOS: Xcode with CocoaPods

### Setup & Run

```bash
# 1. Install root dependencies
yarn install

# 2. Install example dependencies
cd example
yarn install

# 3. Run on Android
yarn android

# 4. (iOS) Install pods, then run
cd ios && pod install && cd ..
yarn ios
```

> **Windows users:** If the build fails with a `mkdir` / path error, the project path is too long for CMake. Use `subst` to shorten it:
>
> ```powershell
> subst P: "C:\path\to\react-native-thermal-receipt-printer"
> cd P:\example\android
> .\gradlew.bat app:assembleDebug
> ```

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
