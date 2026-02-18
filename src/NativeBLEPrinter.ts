import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
	init(): Promise<string>;
	getDeviceList(): Promise<Object[]>;
	connectPrinter(innerAddress: string): Promise<Object>;
	closeConn(): void;
	printRawData(base64Data: string): Promise<void>;
	printImageData(imageUrl: string, imageWidth: number): Promise<void>;
	printQrCode(qrCode: string, qrSize: number): Promise<void>;
	addListener(eventName: string): void;
	removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("RNBLEPrinter");
