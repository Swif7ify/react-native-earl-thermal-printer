package com.pinmi.react.printer;

import com.facebook.react.bridge.Promise;

/**
 * Common contract for all printer modules in the New Architecture.
 *
 * @author Ordovez, Earl Romeo
 */
public interface RNPrinterModule {

    void init(Promise promise);

    void closeConn();

    void getDeviceList(Promise promise);

    void printRawData(String base64Data, Promise promise);

    void printImageData(String imageUrl, Promise promise);

    void printQrCode(String qrCode, Promise promise);
}

