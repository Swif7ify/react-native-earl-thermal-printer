import { NativeEventEmitter } from "react-native";

import NativeUSBPrinterModule from "./NativeUSBPrinter";
import NativeBLEPrinterModule from "./NativeBLEPrinter";
import NativeNetPrinterModule from "./NativeNetPrinter";
import * as EPToolkit from "./utils/EPToolkit";

// ── Types ───────────────────────────────────────────────────────────────────

export interface PrinterOptions {
	beep?: boolean;
	cut?: boolean;
	tailingLine?: boolean;
	encoding?: string;
}

export interface IUSBPrinter {
	device_name: string;
	device_id: number;
	vendor_id: number;
	product_id: number;
}

export interface IBLEPrinter {
	device_name: string;
	inner_mac_address: string;
}

export interface INetPrinter {
	device_name: string;
	host: string;
	port: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const textTo64Buffer = (text: string, opts: PrinterOptions): string => {
	const options = {
		beep: false,
		cut: false,
		tailingLine: false,
		encoding: "UTF8",
		...opts,
	};
	const buffer = EPToolkit.exchange_text(text, options);
	return buffer.toString("base64");
};

const billTo64Buffer = (text: string, opts: PrinterOptions): string => {
	const options = {
		beep: true,
		cut: true,
		tailingLine: true,
		encoding: "UTF8",
		...opts,
	};
	const buffer = EPToolkit.exchange_text(text, options);
	return buffer.toString("base64");
};

// ── USB Printer ─────────────────────────────────────────────────────────────

export const USBPrinter = {
	init: (): Promise<string> => NativeUSBPrinterModule.init(),

	getDeviceList: (): Promise<IUSBPrinter[]> =>
		NativeUSBPrinterModule.getDeviceList() as Promise<IUSBPrinter[]>,

	connectPrinter: (
		vendorId: number,
		productId: number,
	): Promise<IUSBPrinter> =>
		NativeUSBPrinterModule.connectPrinter(
			vendorId,
			productId,
		) as Promise<IUSBPrinter>,

	closeConn: (): void => NativeUSBPrinterModule.closeConn(),

	printText: (text: string, opts: PrinterOptions = {}): Promise<void> =>
		NativeUSBPrinterModule.printRawData(textTo64Buffer(text, opts)),

	printBill: (text: string, opts: PrinterOptions = {}): Promise<void> =>
		NativeUSBPrinterModule.printRawData(billTo64Buffer(text, opts)),

	printImage: (imageUrl: string, imageWidth: number = 200): Promise<void> =>
		NativeUSBPrinterModule.printImageData(imageUrl, imageWidth),

	printQrCode: (qrCode: string, qrSize: number = 250): Promise<void> =>
		NativeUSBPrinterModule.printQrCode(qrCode, qrSize),
};

// ── BLE Printer ─────────────────────────────────────────────────────────────

export const BLEPrinter = {
	init: (): Promise<string> => NativeBLEPrinterModule.init(),

	getDeviceList: (): Promise<IBLEPrinter[]> =>
		NativeBLEPrinterModule.getDeviceList() as Promise<IBLEPrinter[]>,

	connectPrinter: (innerMacAddress: string): Promise<IBLEPrinter> =>
		NativeBLEPrinterModule.connectPrinter(
			innerMacAddress,
		) as Promise<IBLEPrinter>,

	closeConn: (): void => NativeBLEPrinterModule.closeConn(),

	printText: (text: string, opts: PrinterOptions = {}): Promise<void> =>
		NativeBLEPrinterModule.printRawData(textTo64Buffer(text, opts)),

	printBill: (text: string, opts: PrinterOptions = {}): Promise<void> =>
		NativeBLEPrinterModule.printRawData(billTo64Buffer(text, opts)),

	printImage: (imageUrl: string, imageWidth: number = 200): Promise<void> =>
		NativeBLEPrinterModule.printImageData(imageUrl, imageWidth),

	printQrCode: (qrCode: string, qrSize: number = 250): Promise<void> =>
		NativeBLEPrinterModule.printQrCode(qrCode, qrSize),
};

// ── Net Printer ─────────────────────────────────────────────────────────────

export const NetPrinter = {
	init: (): Promise<string> => NativeNetPrinterModule.init(),

	getDeviceList: (): Promise<INetPrinter[]> =>
		NativeNetPrinterModule.getDeviceList() as Promise<INetPrinter[]>,

	connectPrinter: (host: string, port: number): Promise<INetPrinter> =>
		NativeNetPrinterModule.connectPrinter(
			host,
			port,
		) as Promise<INetPrinter>,

	closeConn: (): void => NativeNetPrinterModule.closeConn(),

	printText: (text: string, opts: PrinterOptions = {}): Promise<void> =>
		NativeNetPrinterModule.printRawData(textTo64Buffer(text, opts)),

	printBill: (text: string, opts: PrinterOptions = {}): Promise<void> =>
		NativeNetPrinterModule.printRawData(billTo64Buffer(text, opts)),

	printImage: (imageUrl: string, imageWidth: number = 200): Promise<void> =>
		NativeNetPrinterModule.printImageData(imageUrl, imageWidth),

	printQrCode: (qrCode: string, qrSize: number = 250): Promise<void> =>
		NativeNetPrinterModule.printQrCode(qrCode, qrSize),
};

// ── Events ──────────────────────────────────────────────────────────────────

export const NetPrinterEventEmitter = new NativeEventEmitter(
	NativeNetPrinterModule,
);

export enum RN_THERMAL_RECEIPT_PRINTER_EVENTS {
	EVENT_NET_PRINTER_SCANNED_SUCCESS = "scannerResolved",
	EVENT_NET_PRINTER_SCANNING = "scannerRunning",
	EVENT_NET_PRINTER_SCANNED_ERROR = "registerError",
}
