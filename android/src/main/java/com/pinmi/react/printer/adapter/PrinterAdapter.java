package com.pinmi.react.printer.adapter;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;

import java.util.List;

/**
 * Adapter interface for thermal receipt printers.
 * Migrated to Promise-based API for React Native New Architecture (TurboModules).
 *
 * @author Ordovez, Earl Romeo
 */
public interface PrinterAdapter {

    void init(ReactApplicationContext reactContext, Promise promise);

    void getDeviceList(Promise promise);

    void selectDevice(PrinterDeviceId printerDeviceId, Promise promise);

    void closeConnectionIfExists();

    void printRawData(String rawBase64Data, Promise promise);

    void printImageData(String imageUrl, double imageWidth, Promise promise);

    void printQrCode(String qrCode, double qrSize, Promise promise);
}
