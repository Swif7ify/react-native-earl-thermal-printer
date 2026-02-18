import type { TurboModule } from "react-native";
export interface Spec extends TurboModule {
    init(): Promise<string>;
    getDeviceList(): Promise<Object[]>;
    connectPrinter(vendorId: number, productId: number): Promise<Object>;
    closeConn(): void;
    printRawData(base64Data: string): Promise<void>;
    printImageData(imageUrl: string): Promise<void>;
    printQrCode(qrCode: string): Promise<void>;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeUSBPrinter.d.ts.map