package com.pinmi.react.printer;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.TurboReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

/**
 * TurboReactPackage that registers all printer TurboModules.
 *
 * @author Ordovez, Earl Romeo
 */
public class RNPrinterPackage extends TurboReactPackage {

    @Nullable
    @Override
    public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactContext) {
        switch (name) {
            case RNUSBPrinterModule.NAME:
                return new RNUSBPrinterModule(reactContext);
            case RNBLEPrinterModule.NAME:
                return new RNBLEPrinterModule(reactContext);
            case RNNetPrinterModule.NAME:
                return new RNNetPrinterModule(reactContext);
            default:
                return null;
        }
    }

    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        return () -> {
            final Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
            boolean isTurboModule = true;
            moduleInfos.put(RNUSBPrinterModule.NAME, new ReactModuleInfo(
                    RNUSBPrinterModule.NAME,
                    RNUSBPrinterModule.class.getName(),
                    false, false, false, false, isTurboModule));
            moduleInfos.put(RNBLEPrinterModule.NAME, new ReactModuleInfo(
                    RNBLEPrinterModule.NAME,
                    RNBLEPrinterModule.class.getName(),
                    false, false, false, false, isTurboModule));
            moduleInfos.put(RNNetPrinterModule.NAME, new ReactModuleInfo(
                    RNNetPrinterModule.NAME,
                    RNNetPrinterModule.class.getName(),
                    false, false, false, false, isTurboModule));
            return moduleInfos;
        };
    }
}
