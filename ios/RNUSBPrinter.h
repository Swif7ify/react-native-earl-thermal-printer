//
//  RNUSBPrinter.h
//  react-native-earl-thermal-printer
//
//  Author: Ordovez, Earl Romeo
//

#pragma once

#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNThermalReceiptPrinterSpec/RNThermalReceiptPrinterSpec.h>
@interface RNUSBPrinter : NSObject <NativeUSBPrinterSpec>
#else
@interface RNUSBPrinter : NSObject <RCTBridgeModule>
#endif

@end
