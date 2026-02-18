//
//  RNBLEPrinter.h
//  react-native-earl-thermal-printer
//
//  Author: Ordovez, Earl Romeo
//

#pragma once

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <CoreBluetooth/CoreBluetooth.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNThermalReceiptPrinterSpec/RNThermalReceiptPrinterSpec.h>
@interface RNBLEPrinter : RCTEventEmitter <NativeBLEPrinterSpec>
#else
@interface RNBLEPrinter : RCTEventEmitter <RCTBridgeModule>
#endif
{
    NSMutableArray *_printerArray;
    NSObject *m_printer;
}
@end
