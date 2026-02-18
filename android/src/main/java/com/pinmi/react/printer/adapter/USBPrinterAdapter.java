package com.pinmi.react.printer.adapter;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

import com.facebook.common.internal.ImmutableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * USB printer adapter implementation.
 * Migrated to Promise-based API for React Native New Architecture (TurboModules).
 *
 * @author Ordovez, Earl Romeo
 */
public class USBPrinterAdapter implements PrinterAdapter {
    private static USBPrinterAdapter mInstance;

    private String LOG_TAG = "RNUSBPrinter";
    private Context mContext;
    private UsbManager mUSBManager;
    private PendingIntent mPermissionIndent;
    private UsbDevice mUsbDevice;
    private UsbDeviceConnection mUsbDeviceConnection;
    private UsbInterface mUsbInterface;
    private UsbEndpoint mEndPoint;
    private static final String ACTION_USB_PERMISSION = "com.pinmi.react.USBPrinter.USB_PERMISSION";
    private static final String EVENT_USB_DEVICE_ATTACHED = "usbAttached";

    private final static char ESC_CHAR = 0x1B;
    private static byte[] SELECT_BIT_IMAGE_MODE = { 0x1B, 0x2A, 33 };
    private final static byte[] SET_LINE_SPACE_24 = new byte[] { ESC_CHAR, 0x33, 24 };
    private final static byte[] SET_LINE_SPACE_32 = new byte[] { ESC_CHAR, 0x33, 32 };
    private final static byte[] LINE_FEED = new byte[] { 0x0A };
    private static byte[] CENTER_ALIGN = { 0x1B, 0X61, 0X31 };

    private USBPrinterAdapter() {
    }

    public static USBPrinterAdapter getInstance() {
        if (mInstance == null) {
            mInstance = new USBPrinterAdapter();
        }
        return mInstance;
    }

    private final BroadcastReceiver mUsbDeviceReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice usbDevice = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        Log.i(LOG_TAG, "success to grant permission for device " + usbDevice.getDeviceId()
                                + ", vendor_id: " + usbDevice.getVendorId()
                                + " product_id: " + usbDevice.getProductId());
                        mUsbDevice = usbDevice;
                    } else {
                        Toast.makeText(context,
                                "User refuses to obtain USB device permissions" + usbDevice.getDeviceName(),
                                Toast.LENGTH_LONG).show();
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                if (mUsbDevice != null) {
                    Toast.makeText(context, "USB device has been turned off", Toast.LENGTH_LONG).show();
                    closeConnectionIfExists();
                }
            } else if (UsbManager.ACTION_USB_ACCESSORY_ATTACHED.equals(action)
                    || UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                synchronized (this) {
                    if (mContext != null) {
                        ((ReactApplicationContext) mContext)
                                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                                .emit(EVENT_USB_DEVICE_ATTACHED, null);
                    }
                }
            }
        }
    };

    @Override
    public void init(ReactApplicationContext reactContext, Promise promise) {
        this.mContext = reactContext;
        this.mUSBManager = (UsbManager) this.mContext.getSystemService(Context.USB_SERVICE);
        this.mPermissionIndent = PendingIntent.getBroadcast(mContext, 0,
                new Intent(ACTION_USB_PERMISSION), PendingIntent.FLAG_MUTABLE);
        IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        filter.addAction(UsbManager.ACTION_USB_ACCESSORY_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        mContext.registerReceiver(mUsbDeviceReceiver, filter);
        Log.v(LOG_TAG, "RNUSBPrinter initialized");
        promise.resolve("RNUSBPrinter initialized");
    }

    @Override
    public void closeConnectionIfExists() {
        if (mUsbDeviceConnection != null) {
            mUsbDeviceConnection.releaseInterface(mUsbInterface);
            mUsbDeviceConnection.close();
            mUsbInterface = null;
            mEndPoint = null;
            mUsbDeviceConnection = null;
        }
    }

    @Override
    public void getDeviceList(Promise promise) {
        if (mUSBManager == null) {
            promise.reject("ERR_USB_MANAGER", "USBManager is not initialized while get device list");
            return;
        }

        WritableArray array = Arguments.createArray();
        for (UsbDevice usbDevice : mUSBManager.getDeviceList().values()) {
            array.pushMap(new USBPrinterDevice(usbDevice).toRNWritableMap());
        }
        promise.resolve(array);
    }

    @Override
    public void selectDevice(PrinterDeviceId printerDeviceId, Promise promise) {
        if (mUSBManager == null) {
            promise.reject("ERR_USB_MANAGER", "USBManager is not initialized before select device");
            return;
        }

        USBPrinterDeviceId usbPrinterDeviceId = (USBPrinterDeviceId) printerDeviceId;
        if (mUsbDevice != null
                && mUsbDevice.getVendorId() == usbPrinterDeviceId.getVendorId()
                && mUsbDevice.getProductId() == usbPrinterDeviceId.getProductId()) {
            Log.i(LOG_TAG, "already selected device, do not need repeat to connect");
            if (!mUSBManager.hasPermission(mUsbDevice)) {
                closeConnectionIfExists();
                mUSBManager.requestPermission(mUsbDevice, mPermissionIndent);
            }
            promise.resolve(new USBPrinterDevice(mUsbDevice).toRNWritableMap());
            return;
        }
        closeConnectionIfExists();
        if (mUSBManager.getDeviceList().size() == 0) {
            promise.reject("ERR_EMPTY_LIST", "Device list is empty, can not choose device");
            return;
        }
        for (UsbDevice usbDevice : mUSBManager.getDeviceList().values()) {
            if (usbDevice.getVendorId() == usbPrinterDeviceId.getVendorId()
                    && usbDevice.getProductId() == usbPrinterDeviceId.getProductId()) {
                Log.v(LOG_TAG, "request for device: vendor_id: " + usbPrinterDeviceId.getVendorId()
                        + ", product_id: " + usbPrinterDeviceId.getProductId());
                closeConnectionIfExists();
                mUSBManager.requestPermission(usbDevice, mPermissionIndent);
                promise.resolve(new USBPrinterDevice(usbDevice).toRNWritableMap());
                return;
            }
        }

        promise.reject("ERR_NOT_FOUND", "can not find specified device");
    }

    private boolean openConnection() {
        if (mUsbDevice == null) {
            Log.e(LOG_TAG, "USB Device is not initialized");
            return false;
        }
        if (mUSBManager == null) {
            Log.e(LOG_TAG, "USB Manager is not initialized");
            return false;
        }

        if (mUsbDeviceConnection != null) {
            Log.i(LOG_TAG, "USB Connection already connected");
            return true;
        }

        UsbInterface usbInterface = mUsbDevice.getInterface(0);
        for (int i = 0; i < usbInterface.getEndpointCount(); i++) {
            final UsbEndpoint ep = usbInterface.getEndpoint(i);
            if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                if (ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    UsbDeviceConnection usbDeviceConnection = mUSBManager.openDevice(mUsbDevice);
                    if (usbDeviceConnection == null) {
                        Log.e(LOG_TAG, "failed to open USB Connection");
                        return false;
                    }
                    if (usbDeviceConnection.claimInterface(usbInterface, true)) {
                        mEndPoint = ep;
                        mUsbInterface = usbInterface;
                        mUsbDeviceConnection = usbDeviceConnection;
                        Log.i(LOG_TAG, "Device connected");
                        return true;
                    } else {
                        usbDeviceConnection.close();
                        Log.e(LOG_TAG, "failed to claim usb connection");
                        return false;
                    }
                }
            }
        }
        return true;
    }

    @Override
    public void printRawData(String data, Promise promise) {
        final String rawData = data;
        Log.v(LOG_TAG, "start to print raw data " + data);
        boolean isConnected = openConnection();
        if (isConnected) {
            Log.v(LOG_TAG, "Connected to device");
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] bytes = Base64.decode(rawData, Base64.DEFAULT);
                        int b = mUsbDeviceConnection.bulkTransfer(mEndPoint, bytes, bytes.length, 100000);
                        Log.i(LOG_TAG, "Return Status: b-->" + b);
                        promise.resolve(null);
                    } catch (Exception e) {
                        promise.reject("ERR_PRINT", e.getMessage());
                    }
                }
            }).start();
        } else {
            String msg = "failed to connected to device";
            Log.v(LOG_TAG, msg);
            promise.reject("ERR_CONN", msg);
        }
    }

    public static Bitmap getBitmapFromURL(String src) {
        try {
            URL url = new URL(src);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            Bitmap myBitmap = BitmapFactory.decodeStream(input);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            myBitmap.compress(Bitmap.CompressFormat.PNG, 100, baos);

            return myBitmap;
        } catch (IOException e) {
            return null;
        }
    }

    @Override
    public void printImageData(final String imageUrl, Promise promise) {
        final Bitmap bitmapImage = getBitmapFromURL(imageUrl);

        if (bitmapImage == null) {
            promise.reject("ERR_IMAGE", "image not found");
            return;
        }

        Log.v(LOG_TAG, "start to print image data " + bitmapImage);
        boolean isConnected = openConnection();
        if (isConnected) {
            Log.v(LOG_TAG, "Connected to device");
            try {
                int[][] pixels = getPixelsSlow(bitmapImage);

                mUsbDeviceConnection.bulkTransfer(mEndPoint, SET_LINE_SPACE_24, SET_LINE_SPACE_24.length, 100000);
                mUsbDeviceConnection.bulkTransfer(mEndPoint, CENTER_ALIGN, CENTER_ALIGN.length, 100000);

                for (int y = 0; y < pixels.length; y += 24) {
                    mUsbDeviceConnection.bulkTransfer(mEndPoint, SELECT_BIT_IMAGE_MODE,
                            SELECT_BIT_IMAGE_MODE.length, 100000);

                    byte[] row = new byte[] { (byte) (0x00ff & pixels[y].length),
                            (byte) ((0xff00 & pixels[y].length) >> 8) };
                    mUsbDeviceConnection.bulkTransfer(mEndPoint, row, row.length, 100000);

                    for (int x = 0; x < pixels[y].length; x++) {
                        byte[] slice = recollectSlice(y, x, pixels);
                        mUsbDeviceConnection.bulkTransfer(mEndPoint, slice, slice.length, 100000);
                    }

                    mUsbDeviceConnection.bulkTransfer(mEndPoint, LINE_FEED, LINE_FEED.length, 100000);
                }

                mUsbDeviceConnection.bulkTransfer(mEndPoint, SET_LINE_SPACE_32, SET_LINE_SPACE_32.length, 100000);
                mUsbDeviceConnection.bulkTransfer(mEndPoint, LINE_FEED, LINE_FEED.length, 100000);
                promise.resolve(null);
            } catch (Exception e) {
                promise.reject("ERR_PRINT_IMAGE", e.getMessage());
            }
        } else {
            String msg = "failed to connected to device";
            Log.v(LOG_TAG, msg);
            promise.reject("ERR_CONN", msg);
        }
    }

    private Bitmap TextToQrImageEncode(String Value) {
        com.google.zxing.Writer writer = new QRCodeWriter();
        BitMatrix bitMatrix = null;
        try {
            bitMatrix = writer.encode(Value, com.google.zxing.BarcodeFormat.QR_CODE, 250, 250,
                    ImmutableMap.of(EncodeHintType.MARGIN, 1));
            int width = 250;
            int height = 250;
            Bitmap bmp = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);

            for (int i = 0; i < width; i++) {
                for (int j = 0; j < height; j++) {
                    bmp.setPixel(i, j, bitMatrix.get(i, j) ? Color.BLACK : Color.WHITE);
                }
            }
            return bmp;
        } catch (WriterException e) {
            return null;
        }
    }

    @Override
    public void printQrCode(String qrCode, Promise promise) {
        final Bitmap bitmapImage = TextToQrImageEncode(qrCode);

        if (bitmapImage == null) {
            promise.reject("ERR_QR", "QR code generation failed");
            return;
        }

        Log.v(LOG_TAG, "start to print QR code " + qrCode);
        boolean isConnected = openConnection();
        if (isConnected) {
            Log.v(LOG_TAG, "Connected to device");
            try {
                int[][] pixels = getPixelsSlow(bitmapImage);

                mUsbDeviceConnection.bulkTransfer(mEndPoint, SET_LINE_SPACE_24, SET_LINE_SPACE_24.length, 100000);
                mUsbDeviceConnection.bulkTransfer(mEndPoint, CENTER_ALIGN, CENTER_ALIGN.length, 100000);

                for (int y = 0; y < pixels.length; y += 24) {
                    mUsbDeviceConnection.bulkTransfer(mEndPoint, SELECT_BIT_IMAGE_MODE,
                            SELECT_BIT_IMAGE_MODE.length, 100000);

                    byte[] row = new byte[] { (byte) (0x00ff & pixels[y].length),
                            (byte) ((0xff00 & pixels[y].length) >> 8) };
                    mUsbDeviceConnection.bulkTransfer(mEndPoint, row, row.length, 100000);

                    for (int x = 0; x < pixels[y].length; x++) {
                        byte[] slice = recollectSlice(y, x, pixels);
                        mUsbDeviceConnection.bulkTransfer(mEndPoint, slice, slice.length, 100000);
                    }

                    mUsbDeviceConnection.bulkTransfer(mEndPoint, LINE_FEED, LINE_FEED.length, 100000);
                }

                mUsbDeviceConnection.bulkTransfer(mEndPoint, SET_LINE_SPACE_32, SET_LINE_SPACE_32.length, 100000);
                mUsbDeviceConnection.bulkTransfer(mEndPoint, LINE_FEED, LINE_FEED.length, 100000);
                promise.resolve(null);
            } catch (Exception e) {
                promise.reject("ERR_PRINT_QR", e.getMessage());
            }
        } else {
            String msg = "failed to connected to device";
            Log.v(LOG_TAG, msg);
            promise.reject("ERR_CONN", msg);
        }
    }

    public static int[][] getPixelsSlow(Bitmap image2) {
        Bitmap image = resizeTheImageForPrinting(image2);
        int width = image.getWidth();
        int height = image.getHeight();
        int[][] result = new int[height][width];
        for (int row = 0; row < height; row++) {
            for (int col = 0; col < width; col++) {
                result[row][col] = getRGB(image, col, row);
            }
        }
        return result;
    }

    private byte[] recollectSlice(int y, int x, int[][] img) {
        byte[] slices = new byte[] { 0, 0, 0 };
        for (int yy = y, i = 0; yy < y + 24 && i < 3; yy += 8, i++) {
            byte slice = 0;
            for (int b = 0; b < 8; b++) {
                int yyy = yy + b;
                if (yyy >= img.length) {
                    continue;
                }
                int col = img[yyy][x];
                boolean v = shouldPrintColor(col);
                slice |= (byte) ((v ? 1 : 0) << (7 - b));
            }
            slices[i] = slice;
        }
        return slices;
    }

    private boolean shouldPrintColor(int col) {
        final int threshold = 127;
        int a, r, g, b, luminance;
        a = (col >> 24) & 0xff;
        if (a != 0xff) {
            return false;
        }
        r = (col >> 16) & 0xff;
        g = (col >> 8) & 0xff;
        b = col & 0xff;

        luminance = (int) (0.299 * r + 0.587 * g + 0.114 * b);
        return luminance < threshold;
    }

    public static Bitmap resizeTheImageForPrinting(Bitmap image) {
        int width = image.getWidth();
        int height = image.getHeight();
        if (width > 200 || height > 200) {
            if (width > height) {
                float decreaseSizeBy = (200.0f / width);
                return getBitmapResized(image, decreaseSizeBy);
            } else {
                float decreaseSizeBy = (200.0f / height);
                return getBitmapResized(image, decreaseSizeBy);
            }
        }
        return image;
    }

    public static int getRGB(Bitmap bmpOriginal, int col, int row) {
        int pixel = bmpOriginal.getPixel(col, row);
        int R = Color.red(pixel);
        int G = Color.green(pixel);
        int B = Color.blue(pixel);
        return Color.rgb(R, G, B);
    }

    public static Bitmap getBitmapResized(Bitmap image, float decreaseSizeBy) {
        Bitmap resized = Bitmap.createScaledBitmap(image, (int) (image.getWidth() * decreaseSizeBy),
                (int) (image.getHeight() * decreaseSizeBy), true);
        return resized;
    }
}
