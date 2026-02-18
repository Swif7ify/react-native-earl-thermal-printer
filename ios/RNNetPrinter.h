//
//  RNNetPrinter.h
//  react-native-earl-thermal-printer
//
//  Author: Ordovez, Earl Romeo
//

#pragma once

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNThermalReceiptPrinterSpec/RNThermalReceiptPrinterSpec.h>
@interface RNNetPrinter : RCTEventEmitter <NativeNetPrinterSpec>
#else
@interface RNNetPrinter : RCTEventEmitter <RCTBridgeModule>
#endif
{
    NSString *connected_ip;
    NSString *current_scan_ip;
    NSMutableArray *_printerArray;
    bool is_scanning;
}
@end
