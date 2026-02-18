//
//  RNUSBPrinter.mm
//  react-native-earl-thermal-printer
//
//  USB printers are not supported on iOS. This module provides stub
//  implementations so the TurboModule spec is satisfied.
//
//  Author: Ordovez, Earl Romeo
//

#import "RNUSBPrinter.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNThermalReceiptPrinterSpec.h"
#endif

@implementation RNUSBPrinter

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(init:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"ERR_UNSUPPORTED", @"USB printing is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(getDeviceList:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"ERR_UNSUPPORTED", @"USB printing is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(connectPrinter:(double)vendorId
                  productId:(double)productId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"ERR_UNSUPPORTED", @"USB printing is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(printRawData:(NSString *)base64Data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"ERR_UNSUPPORTED", @"USB printing is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(printImageData:(NSString *)imageUrl
                  imageWidth:(double)imageWidth
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"ERR_UNSUPPORTED", @"USB printing is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(printQrCode:(NSString *)qrCode
                  qrSize:(double)qrSize
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    reject(@"ERR_UNSUPPORTED", @"USB printing is not supported on iOS", nil);
}

RCT_EXPORT_METHOD(closeConn)
{
    // No-op on iOS
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeUSBPrinterSpecJSI>(params);
}
#endif

@end
