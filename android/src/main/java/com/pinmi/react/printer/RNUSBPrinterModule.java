package com.pinmi.react.printer;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.pinmi.react.printer.adapter.PrinterAdapter;
import com.pinmi.react.printer.adapter.USBPrinterAdapter;
import com.pinmi.react.printer.adapter.USBPrinterDeviceId;

/**
 * TurboModule implementation for USB thermal receipt printers.
 *
 * @author Ordovez, Earl Romeo
 */
public class RNUSBPrinterModule extends NativeUSBPrinterSpec implements RNPrinterModule {

    public static final String NAME = "RNUSBPrinter";

    private PrinterAdapter adapter;

    public RNUSBPrinterModule(ReactApplicationContext reactContext) {
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
        this.adapter = USBPrinterAdapter.getInstance();
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
    public void connectPrinter(double vendorId, double productId, Promise promise) {
        adapter.selectDevice(
                USBPrinterDeviceId.valueOf((int) vendorId, (int) productId),
                promise);
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
}
