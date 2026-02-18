import type { TurboModule } from "react-native";
export interface Spec extends TurboModule {
    init(): Promise<string>;
    getDeviceList(): Promise<Object[]>;
    connectPrinter(innerAddress: string): Promise<Object>;
    closeConn(): void;
    printRawData(base64Data: string): Promise<void>;
    printImageData(imageUrl: string): Promise<void>;
    printQrCode(qrCode: string): Promise<void>;
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}
declare const _default: Spec;
export default _default;
//# sourceMappingURL=NativeBLEPrinter.d.ts.map