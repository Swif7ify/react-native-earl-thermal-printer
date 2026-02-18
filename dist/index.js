import { NativeEventEmitter } from "react-native";
import NativeUSBPrinterModule from "./NativeUSBPrinter";
import NativeBLEPrinterModule from "./NativeBLEPrinter";
import NativeNetPrinterModule from "./NativeNetPrinter";
import * as EPToolkit from "./utils/EPToolkit";
// ── Helpers ─────────────────────────────────────────────────────────────────
const textTo64Buffer = (text, opts) => {
    const options = Object.assign({ beep: false, cut: false, tailingLine: false, encoding: "UTF8" }, opts);
    const buffer = EPToolkit.exchange_text(text, options);
    return buffer.toString("base64");
};
const billTo64Buffer = (text, opts) => {
    const options = Object.assign({ beep: true, cut: true, tailingLine: true, encoding: "UTF8" }, opts);
    const buffer = EPToolkit.exchange_text(text, options);
    return buffer.toString("base64");
};
// ── USB Printer ─────────────────────────────────────────────────────────────
export const USBPrinter = {
    init: () => NativeUSBPrinterModule.init(),
    getDeviceList: () => NativeUSBPrinterModule.getDeviceList(),
    connectPrinter: (vendorId, productId) => NativeUSBPrinterModule.connectPrinter(vendorId, productId),
    closeConn: () => NativeUSBPrinterModule.closeConn(),
    printText: (text, opts = {}) => NativeUSBPrinterModule.printRawData(textTo64Buffer(text, opts)),
    printBill: (text, opts = {}) => NativeUSBPrinterModule.printRawData(billTo64Buffer(text, opts)),
    printImage: (imageUrl) => NativeUSBPrinterModule.printImageData(imageUrl),
    printQrCode: (qrCode) => NativeUSBPrinterModule.printQrCode(qrCode),
};
// ── BLE Printer ─────────────────────────────────────────────────────────────
export const BLEPrinter = {
    init: () => NativeBLEPrinterModule.init(),
    getDeviceList: () => NativeBLEPrinterModule.getDeviceList(),
    connectPrinter: (innerMacAddress) => NativeBLEPrinterModule.connectPrinter(innerMacAddress),
    closeConn: () => NativeBLEPrinterModule.closeConn(),
    printText: (text, opts = {}) => NativeBLEPrinterModule.printRawData(textTo64Buffer(text, opts)),
    printBill: (text, opts = {}) => NativeBLEPrinterModule.printRawData(billTo64Buffer(text, opts)),
    printImage: (imageUrl) => NativeBLEPrinterModule.printImageData(imageUrl),
    printQrCode: (qrCode) => NativeBLEPrinterModule.printQrCode(qrCode),
};
// ── Net Printer ─────────────────────────────────────────────────────────────
export const NetPrinter = {
    init: () => NativeNetPrinterModule.init(),
    getDeviceList: () => NativeNetPrinterModule.getDeviceList(),
    connectPrinter: (host, port) => NativeNetPrinterModule.connectPrinter(host, port),
    closeConn: () => NativeNetPrinterModule.closeConn(),
    printText: (text, opts = {}) => NativeNetPrinterModule.printRawData(textTo64Buffer(text, opts)),
    printBill: (text, opts = {}) => NativeNetPrinterModule.printRawData(billTo64Buffer(text, opts)),
    printImage: (imageUrl) => NativeNetPrinterModule.printImageData(imageUrl),
    printQrCode: (qrCode) => NativeNetPrinterModule.printQrCode(qrCode),
};
// ── Events ──────────────────────────────────────────────────────────────────
export const NetPrinterEventEmitter = new NativeEventEmitter(NativeNetPrinterModule);
export var RN_THERMAL_RECEIPT_PRINTER_EVENTS;
(function (RN_THERMAL_RECEIPT_PRINTER_EVENTS) {
    RN_THERMAL_RECEIPT_PRINTER_EVENTS["EVENT_NET_PRINTER_SCANNED_SUCCESS"] = "scannerResolved";
    RN_THERMAL_RECEIPT_PRINTER_EVENTS["EVENT_NET_PRINTER_SCANNING"] = "scannerRunning";
    RN_THERMAL_RECEIPT_PRINTER_EVENTS["EVENT_NET_PRINTER_SCANNED_ERROR"] = "registerError";
})(RN_THERMAL_RECEIPT_PRINTER_EVENTS || (RN_THERMAL_RECEIPT_PRINTER_EVENTS = {}));
//# sourceMappingURL=index.js.map