package com.pinmi.react.printer;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.pinmi.react.printer.adapter.NetPrinterAdapter;
import com.pinmi.react.printer.adapter.NetPrinterDeviceId;
import com.pinmi.react.printer.adapter.PrinterAdapter;

/**
 * TurboModule implementation for network (TCP/IP) thermal receipt printers.
 *
 * @author Ordovez, Earl Romeo
 */
public class RNNetPrinterModule extends NativeNetPrinterSpec implements RNPrinterModule {

    public static final String NAME = "RNNetPrinter";

    private PrinterAdapter adapter;

    public RNNetPrinterModule(ReactApplicationContext reactContext) {
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
        this.adapter = NetPrinterAdapter.getInstance();
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
        try {
            adapter.getDeviceList(promise);
        } catch (Exception ex) {
            promise.reject("ERR_DEVICE_LIST", ex.getMessage());
        }
    }

    @Override
    @ReactMethod
    public void connectPrinter(String host, double port, Promise promise) {
        adapter.selectDevice(
                NetPrinterDeviceId.valueOf(host, (int) port),
                promise);
    }

    @Override
    @ReactMethod
    public void printRawData(String base64Data, Promise promise) {
        adapter.printRawData(base64Data, promise);
    }

    @Override
    @ReactMethod
    public void printImageData(String imageUrl, double imageWidth, Promise promise) {
        adapter.printImageData(imageUrl, imageWidth, promise);
    }

    @Override
    @ReactMethod
    public void printQrCode(String qrCode, double qrSize, Promise promise) {
        adapter.printQrCode(qrCode, qrSize, promise);
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
