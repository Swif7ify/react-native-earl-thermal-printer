package com.pinmi.react.printer.adapter;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

import com.facebook.common.internal.ImmutableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Set;
import java.util.UUID;

/**
 * BLE (Bluetooth) printer adapter implementation.
 * Migrated to Promise-based API for React Native New Architecture (TurboModules).
 * Enhanced with Android 12+ permission guards, reflection socket fallback, and Floyd-Steinberg dithering.
 *
 * @author Ordovez, Earl Romeo
 */
public class BLEPrinterAdapter implements PrinterAdapter {
    private static BLEPrinterAdapter mInstance;

    private String LOG_TAG = "RNBLEPrinter";

    private BluetoothDevice mBluetoothDevice;
    private BluetoothSocket mBluetoothSocket;

    private ReactApplicationContext mContext;

    private final static char ESC_CHAR = 0x1B;
    private static byte[] SELECT_BIT_IMAGE_MODE = { 0x1B, 0x2A, 33 };
    private final static byte[] SET_LINE_SPACE_24 = new byte[] { ESC_CHAR, 0x33, 24 };
    private final static byte[] SET_LINE_SPACE_32 = new byte[] { ESC_CHAR, 0x33, 32 };
    private final static byte[] LINE_FEED = new byte[] { 0x0A };
    private static byte[] CENTER_ALIGN = { 0x1B, 0X61, 0X31 };

    private BLEPrinterAdapter() {
    }

    public static BLEPrinterAdapter getInstance() {
        if (mInstance == null) {
            mInstance = new BLEPrinterAdapter();
        }
        return mInstance;
    }

    @Override
    public void init(ReactApplicationContext reactContext, Promise promise) {
        this.mContext = reactContext;
        BluetoothAdapter bluetoothAdapter = getBTAdapter();
        if (bluetoothAdapter == null) {
            promise.reject("ERR_BT_ADAPTER", "No bluetooth adapter available on this device");
            return;
        }
        try {
            if (!bluetoothAdapter.isEnabled()) {
                promise.reject("ERR_BT_DISABLED", "Bluetooth is disabled, please turn on Bluetooth");
                return;
            }
        } catch (SecurityException se) {
            Log.w(LOG_TAG, "BLUETOOTH_CONNECT permission not yet requested during init");
        }
        promise.resolve("RNBLEPrinter initialized");
    }

    private static BluetoothAdapter getBTAdapter() {
        return BluetoothAdapter.getDefaultAdapter();
    }

    @Override
    public void getDeviceList(Promise promise) {
        BluetoothAdapter bluetoothAdapter = getBTAdapter();
        if (bluetoothAdapter == null) {
            promise.reject("ERR_BT_ADAPTER", "No bluetooth adapter available");
            return;
        }
        try {
            if (!bluetoothAdapter.isEnabled()) {
                promise.reject("ERR_BT_DISABLED", "Bluetooth is disabled, please turn on Bluetooth");
                return;
            }
            WritableArray array = Arguments.createArray();
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    array.pushMap(new BLEPrinterDevice(device).toRNWritableMap());
                }
            }
            promise.resolve(array);
        } catch (SecurityException se) {
            promise.reject("ERR_BT_PERMISSION", "Bluetooth permission BLUETOOTH_CONNECT missing on Android 12+ (API 31+): " + se.getMessage());
        } catch (Exception e) {
            promise.reject("ERR_BT_DEVICES", e.getMessage());
        }
    }

    @Override
    public void selectDevice(PrinterDeviceId printerDeviceId, Promise promise) {
        BluetoothAdapter bluetoothAdapter = getBTAdapter();
        if (bluetoothAdapter == null) {
            promise.reject("ERR_BT_ADAPTER", "No bluetooth adapter available");
            return;
        }
        if (!bluetoothAdapter.isEnabled()) {
            promise.reject("ERR_BT_DISABLED", "Bluetooth is not enabled");
            return;
        }
        BLEPrinterDeviceId blePrinterDeviceId = (BLEPrinterDeviceId) printerDeviceId;
        if (this.mBluetoothDevice != null) {
            try {
                if (this.mBluetoothDevice.getAddress().equals(blePrinterDeviceId.getInnerMacAddress())
                        && this.mBluetoothSocket != null && this.mBluetoothSocket.isConnected()) {
                    Log.v(LOG_TAG, "do not need to reconnect");
                    promise.resolve(new BLEPrinterDevice(this.mBluetoothDevice).toRNWritableMap());
                    return;
                } else {
                    closeConnectionIfExists();
                }
            } catch (SecurityException se) {
                promise.reject("ERR_BT_PERMISSION", se.getMessage());
                return;
            }
        }

        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    if (device.getAddress().equals(blePrinterDeviceId.getInnerMacAddress())) {
                        try {
                            connectBluetoothDevice(device);
                            promise.resolve(new BLEPrinterDevice(this.mBluetoothDevice).toRNWritableMap());
                            return;
                        } catch (IOException e) {
                            e.printStackTrace();
                            promise.reject("ERR_BT_CONNECT", e.getMessage());
                            return;
                        }
                    }
                }
            }
        } catch (SecurityException se) {
            promise.reject("ERR_BT_PERMISSION", "Bluetooth permission BLUETOOTH_CONNECT missing on Android 12+: " + se.getMessage());
            return;
        }

        String errorText = "Can not find the specified printing device, please perform Bluetooth pairing in the system settings first.";
        if (this.mContext != null) {
            Toast.makeText(this.mContext, errorText, Toast.LENGTH_LONG).show();
        }
        promise.reject("ERR_NOT_FOUND", errorText);
    }

    private void connectBluetoothDevice(BluetoothDevice device) throws IOException {
        UUID uuid = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb");
        try {
            this.mBluetoothSocket = device.createRfcommSocketToServiceRecord(uuid);
            this.mBluetoothSocket.connect();
            this.mBluetoothDevice = device;
        } catch (IOException originalException) {
            Log.w(LOG_TAG, "Standard RFCOMM connection failed, attempting fallback reflection socket...", originalException);
            try {
                java.lang.reflect.Method m = device.getClass().getMethod("createRfcommSocket", new Class[] { int.class });
                this.mBluetoothSocket = (BluetoothSocket) m.invoke(device, 1);
                this.mBluetoothSocket.connect();
                this.mBluetoothDevice = device;
            } catch (Exception fallbackException) {
                Log.e(LOG_TAG, "Fallback RFCOMM connection also failed", fallbackException);
                throw originalException;
            }
        }
    }

    @Override
    public void closeConnectionIfExists() {
        try {
            if (this.mBluetoothSocket != null) {
                this.mBluetoothSocket.close();
                this.mBluetoothSocket = null;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        if (this.mBluetoothDevice != null) {
            this.mBluetoothDevice = null;
        }
    }

    @Override
    public void printRawData(String rawBase64Data, Promise promise) {
        if (this.mBluetoothSocket == null) {
            promise.reject("ERR_NO_CONN", "Bluetooth connection is not built, may be you forgot to connectPrinter");
            return;
        }
        final String rawData = rawBase64Data;
        final BluetoothSocket socket = this.mBluetoothSocket;
        Log.v(LOG_TAG, "start to print raw data " + rawBase64Data);
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    byte[] bytes = Base64.decode(rawData, Base64.DEFAULT);
                    OutputStream printerOutputStream = socket.getOutputStream();
                    printerOutputStream.write(bytes, 0, bytes.length);
                    printerOutputStream.flush();
                    promise.resolve(null);
                } catch (IOException e) {
                    Log.e(LOG_TAG, "failed to print data" + rawData);
                    e.printStackTrace();
                    promise.reject("ERR_PRINT", e.getMessage());
                }
            }
        }).start();
    }

    public static Bitmap getBitmapFromURL(String src) {
        try {
            if (src.startsWith("file://") || src.startsWith("/")) {
                String filePath = src.startsWith("file://") ? src.substring(7) : src;
                return BitmapFactory.decodeFile(filePath);
            }
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
    public void printImageData(String imageUrl, double imageWidth, Promise promise) {
        final Bitmap bitmapImage = getBitmapFromURL(imageUrl);

        if (bitmapImage == null) {
            promise.reject("ERR_IMAGE", "image not found");
            return;
        }
        if (this.mBluetoothSocket == null) {
            promise.reject("ERR_NO_CONN", "Bluetooth connection is not built, may be you forgot to connectPrinter");
            return;
        }

        final BluetoothSocket socket = this.mBluetoothSocket;
        final int maxSize = imageWidth > 0 ? (int) imageWidth : 200;

        try {
            int[][] pixels = getPixelsSlow(bitmapImage, maxSize);
            OutputStream printerOutputStream = socket.getOutputStream();

            printerOutputStream.write(SET_LINE_SPACE_24);
            printerOutputStream.write(CENTER_ALIGN);

            for (int y = 0; y < pixels.length; y += 24) {
                printerOutputStream.write(SELECT_BIT_IMAGE_MODE);
                printerOutputStream.write(
                        new byte[] { (byte) (0x00ff & pixels[y].length), (byte) ((0xff00 & pixels[y].length) >> 8) });
                for (int x = 0; x < pixels[y].length; x++) {
                    printerOutputStream.write(recollectSlice(y, x, pixels));
                }
                printerOutputStream.write(LINE_FEED);
            }
            printerOutputStream.write(SET_LINE_SPACE_32);
            printerOutputStream.write(LINE_FEED);
            printerOutputStream.flush();
            promise.resolve(null);
        } catch (IOException e) {
            Log.e(LOG_TAG, "failed to print data");
            e.printStackTrace();
            promise.reject("ERR_PRINT_IMAGE", e.getMessage());
        }
    }

    @Override
    public void printQrCode(String qrCode, double qrSize, Promise promise) {
        final int size = qrSize > 0 ? (int) qrSize : 250;
        final Bitmap bitmapImage = TextToQrImageEncode(qrCode, size);

        if (bitmapImage == null) {
            promise.reject("ERR_QR", "failed to generate qr image");
            return;
        }

        if (this.mBluetoothSocket == null) {
            promise.reject("ERR_NO_CONN", "Bluetooth connection is not built, may be you forgot to connectPrinter");
            return;
        }

        final BluetoothSocket socket = this.mBluetoothSocket;

        try {
            int[][] pixels = getPixelsSlow(bitmapImage, size);
            OutputStream printerOutputStream = socket.getOutputStream();

            printerOutputStream.write(SET_LINE_SPACE_24);
            printerOutputStream.write(CENTER_ALIGN);

            for (int y = 0; y < pixels.length; y += 24) {
                printerOutputStream.write(SELECT_BIT_IMAGE_MODE);
                printerOutputStream.write(
                        new byte[] { (byte) (0x00ff & pixels[y].length), (byte) ((0xff00 & pixels[y].length) >> 8) });
                for (int x = 0; x < pixels[y].length; x++) {
                    printerOutputStream.write(recollectSlice(y, x, pixels));
                }
                printerOutputStream.write(LINE_FEED);
            }
            printerOutputStream.write(SET_LINE_SPACE_32);
            printerOutputStream.write(LINE_FEED);
            printerOutputStream.flush();
            promise.resolve(null);
        } catch (IOException e) {
            Log.e(LOG_TAG, "failed to print data");
            e.printStackTrace();
            promise.reject("ERR_PRINT_QR", e.getMessage());
        }
    }

    private Bitmap TextToQrImageEncode(String Value, int size) {
        com.google.zxing.Writer writer = new QRCodeWriter();
        BitMatrix bitMatrix = null;
        try {
            bitMatrix = writer.encode(Value, com.google.zxing.BarcodeFormat.QR_CODE, size, size,
                    ImmutableMap.of(EncodeHintType.MARGIN, 1));
            int width = size;
            int height = size;
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

    /**
     * Enhanced Floyd-Steinberg error diffusion dithering for crystal clear thermal printing.
     */
    public static int[][] getPixelsSlow(Bitmap image2, int maxSize) {
        Bitmap image = resizeTheImageForPrinting(image2, maxSize);
        int width = image.getWidth();
        int height = image.getHeight();
        int[][] result = new int[height][width];
        int[][] gray = new int[height][width];

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int pixel = image.getPixel(x, y);
                int a = (pixel >> 24) & 0xff;
                if (a < 128) {
                    gray[y][x] = 255;
                } else {
                    int r = (pixel >> 16) & 0xff;
                    int g = (pixel >> 8) & 0xff;
                    int b = pixel & 0xff;
                    gray[y][x] = (int) (0.299 * r + 0.587 * g + 0.114 * b);
                }
            }
        }

        // Floyd-Steinberg Error Diffusion
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int oldVal = gray[y][x];
                int newVal = oldVal < 128 ? 0 : 255;
                result[y][x] = (newVal == 0) ? 0xFF000000 : 0xFFFFFFFF;
                int error = oldVal - newVal;

                if (x + 1 < width) {
                    gray[y][x + 1] += (error * 7) / 16;
                }
                if (y + 1 < height) {
                    if (x > 0) {
                        gray[y + 1][x - 1] += (error * 3) / 16;
                    }
                    gray[y + 1][x] += (error * 5) / 16;
                    if (x + 1 < width) {
                        gray[y + 1][x + 1] += (error * 1) / 16;
                    }
                }
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
        int a = (col >> 24) & 0xff;
        if (a != 0xff) {
            return false;
        }
        int r = (col >> 16) & 0xff;
        int g = (col >> 8) & 0xff;
        int b = col & 0xff;
        int luminance = (int) (0.299 * r + 0.587 * g + 0.114 * b);
        return luminance < 128;
    }

    public static Bitmap resizeTheImageForPrinting(Bitmap image, int maxSize) {
        int width = image.getWidth();
        int height = image.getHeight();
        if (width > maxSize || height > maxSize) {
            if (width > height) {
                float decreaseSizeBy = ((float) maxSize / width);
                return getBitmapResized(image, decreaseSizeBy);
            } else {
                float decreaseSizeBy = ((float) maxSize / height);
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
