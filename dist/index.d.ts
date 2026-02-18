import { NativeEventEmitter } from "react-native";
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
export declare const USBPrinter: {
    init: () => Promise<string>;
    getDeviceList: () => Promise<IUSBPrinter[]>;
    connectPrinter: (vendorId: number, productId: number) => Promise<IUSBPrinter>;
    closeConn: () => void;
    printText: (text: string, opts?: PrinterOptions) => Promise<void>;
    printBill: (text: string, opts?: PrinterOptions) => Promise<void>;
    printImage: (imageUrl: string) => Promise<void>;
    printQrCode: (qrCode: string) => Promise<void>;
};
export declare const BLEPrinter: {
    init: () => Promise<string>;
    getDeviceList: () => Promise<IBLEPrinter[]>;
    connectPrinter: (innerMacAddress: string) => Promise<IBLEPrinter>;
    closeConn: () => void;
    printText: (text: string, opts?: PrinterOptions) => Promise<void>;
    printBill: (text: string, opts?: PrinterOptions) => Promise<void>;
    printImage: (imageUrl: string) => Promise<void>;
    printQrCode: (qrCode: string) => Promise<void>;
};
export declare const NetPrinter: {
    init: () => Promise<string>;
    getDeviceList: () => Promise<INetPrinter[]>;
    connectPrinter: (host: string, port: number) => Promise<INetPrinter>;
    closeConn: () => void;
    printText: (text: string, opts?: PrinterOptions) => Promise<void>;
    printBill: (text: string, opts?: PrinterOptions) => Promise<void>;
    printImage: (imageUrl: string) => Promise<void>;
    printQrCode: (qrCode: string) => Promise<void>;
};
export declare const NetPrinterEventEmitter: NativeEventEmitter;
export declare enum RN_THERMAL_RECEIPT_PRINTER_EVENTS {
    EVENT_NET_PRINTER_SCANNED_SUCCESS = "scannerResolved",
    EVENT_NET_PRINTER_SCANNING = "scannerRunning",
    EVENT_NET_PRINTER_SCANNED_ERROR = "registerError"
}
//# sourceMappingURL=index.d.ts.map