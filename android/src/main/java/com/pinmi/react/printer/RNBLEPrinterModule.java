package com.pinmi.react.printer;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.pinmi.react.printer.adapter.BLEPrinterAdapter;
import com.pinmi.react.printer.adapter.BLEPrinterDeviceId;
import com.pinmi.react.printer.adapter.PrinterAdapter;

/**
 * TurboModule implementation for BLE thermal receipt printers.
 *
 * @author Ordovez, Earl Romeo
 */
public class RNBLEPrinterModule extends NativeBLEPrinterSpec implements RNPrinterModule {

    public static final String NAME = "RNBLEPrinter";

    private PrinterAdapter adapter;

    public RNBLEPrinterModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @Override
    @ReactMethod
    public void init(Promise promise) {
        this.adapter = BLEPrinterAdapter.getInstance();
        this.adapter.init(getReactApplicationContext(), promise);
    }

    @Override
    @ReactMethod
    public void closeConn() {
        if (adapter != null) {
            adapter.closeConnectionIfExists();
        }
    }

    @Override
    @ReactMethod
    public void getDeviceList(Promise promise) {
        adapter.getDeviceList(promise);
    }

    @Override
    @ReactMethod
    public void connectPrinter(String innerAddress, Promise promise) {
        adapter.selectDevice(BLEPrinterDeviceId.valueOf(innerAddress), promise);
    }

    @Override
    @ReactMethod
    public void printRawData(String base64Data, Promise promise) {
        adapter.printRawData(base64Data, promise);
    }

    @Override
    @ReactMethod
    public void printImageData(String imageUrl, Promise promise) {
        adapter.printImageData(imageUrl, promise);
    }

    @Override
    @ReactMethod
    public void printQrCode(String qrCode, Promise promise) {
        adapter.printQrCode(qrCode, promise);
    }

    @Override
    @ReactMethod
    public void addListener(String eventName) {
        // Required for EventEmitter
    }

    @Override
    @ReactMethod
    public void removeListeners(double count) {
        // Required for EventEmitter
    }
}


