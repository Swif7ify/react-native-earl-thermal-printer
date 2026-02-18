//
//  RNBLEPrinter.mm
//  react-native-earl-thermal-printer
//
//  BLE (Bluetooth) printer module for iOS using PrinterSDK.
//  Migrated to Promise-based API for React Native New Architecture (TurboModules).
//
//  Author: Ordovez, Earl Romeo
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#import "RNBLEPrinter.h"
#import "PrinterSDK.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNThermalReceiptPrinterSpec.h"
#endif

@implementation RNBLEPrinter

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents
{
    return @[];
}

RCT_EXPORT_METHOD(init:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        _printerArray = [NSMutableArray new];
        m_printer = [[NSObject alloc] init];
        [[NSNotificationCenter defaultCenter] addObserver:self
                                                 selector:@selector(handleNetPrinterConnectedNotification:)
                                                     name:@"NetPrinterConnected"
                                                   object:nil];
        [[PrinterSDK defaultPrinterSDK] scanPrintersWithCompletion:^(Printer* printer){}];
        resolve(@"RNBLEPrinter initialized");
    } @catch (NSException *exception) {
        reject(@"ERR_BT_ADAPTER", exception.reason ?: @"No bluetooth adapter available", nil);
    }
}

- (void)handleNetPrinterConnectedNotification:(NSNotification *)notification
{
    m_printer = nil;
}

RCT_EXPORT_METHOD(getDeviceList:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!_printerArray) {
            reject(@"ERR_NOT_INIT", @"Must call init function first", nil);
            return;
        }
        [[PrinterSDK defaultPrinterSDK] scanPrintersWithCompletion:^(Printer* printer){
            [self->_printerArray addObject:printer];
            NSMutableArray *mapped = [NSMutableArray arrayWithCapacity:[self->_printerArray count]];
            [self->_printerArray enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
                NSDictionary *dict = @{
                    @"device_name" : printer.name ?: @"",
                    @"inner_mac_address" : printer.UUIDString ?: @""
                };
                [mapped addObject:dict];
            }];
            NSArray *uniqueArray = [[NSSet setWithArray:mapped] allObjects];
            resolve(uniqueArray);
        }];
    } @catch (NSException *exception) {
        reject(@"ERR_SCAN", exception.reason ?: @"Failed to scan devices", nil);
    }
}

RCT_EXPORT_METHOD(connectPrinter:(NSString *)innerAddress
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        __block BOOL found = NO;
        __block Printer *selectedPrinter = nil;
        [_printerArray enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
            selectedPrinter = (Printer *)obj;
            if ([innerAddress isEqualToString:(selectedPrinter.UUIDString)]) {
                found = YES;
                *stop = YES;
            }
        }];

        if (found) {
            [[PrinterSDK defaultPrinterSDK] connectBT:selectedPrinter];
            [[NSNotificationCenter defaultCenter] postNotificationName:@"BLEPrinterConnected" object:nil];
            m_printer = selectedPrinter;
            NSDictionary *result = @{
                @"device_name" : selectedPrinter.name ?: @"",
                @"inner_mac_address" : selectedPrinter.UUIDString ?: @""
            };
            resolve(result);
        } else {
            reject(@"ERR_NOT_FOUND",
                   [NSString stringWithFormat:@"Can't find printer %@, please pair it in system settings first", innerAddress],
                   nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_CONNECT", exception.reason ?: @"Failed to connect", nil);
    }
}

RCT_EXPORT_METHOD(printRawData:(NSString *)base64Data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!m_printer) {
            reject(@"ERR_NO_CONN", @"Not connected to a printer", nil);
            return;
        }
        [[PrinterSDK defaultPrinterSDK] printText:base64Data];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"ERR_PRINT", exception.reason ?: @"Failed to print raw data", nil);
    }
}

RCT_EXPORT_METHOD(printImageData:(NSString *)imageUrl
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!m_printer) {
            reject(@"ERR_NO_CONN", @"Not connected to a printer", nil);
            return;
        }
        NSURL *url = [NSURL URLWithString:imageUrl];
        NSData *imageData = [NSData dataWithContentsOfURL:url];
        if (imageData != nil) {
            UIImage *image = [UIImage imageWithData:imageData];
            UIImage *printImage = [self getPrintImage:image width:150 paddingX:250];
            [[PrinterSDK defaultPrinterSDK] setPrintWidth:576];
            [[PrinterSDK defaultPrinterSDK] printImage:printImage];
            resolve(nil);
        } else {
            reject(@"ERR_IMAGE", @"Image not found", nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_PRINT_IMAGE", exception.reason ?: @"Failed to print image", nil);
    }
}

RCT_EXPORT_METHOD(printQrCode:(NSString *)qrCode
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!m_printer) {
            reject(@"ERR_NO_CONN", @"Not connected to a printer", nil);
            return;
        }
        if (qrCode != nil) {
            [[PrinterSDK defaultPrinterSDK] setPrintWidth:576];
            [[PrinterSDK defaultPrinterSDK] printQrCode:qrCode];
            resolve(nil);
        } else {
            reject(@"ERR_QR", @"QR code data is nil", nil);
        }
    } @catch (NSException *exception) {
        reject(@"ERR_PRINT_QR", exception.reason ?: @"Failed to print QR code", nil);
    }
}

RCT_EXPORT_METHOD(closeConn)
{
    @try {
        if (m_printer) {
            [[PrinterSDK defaultPrinterSDK] disconnect];
            m_printer = nil;
        }
    } @catch (NSException *exception) {
        NSLog(@"%@", exception.reason);
    }
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName)
{
    // Required by RCTEventEmitter — no-op for BLE
}

RCT_EXPORT_METHOD(removeListeners:(double)count)
{
    // Required by RCTEventEmitter — no-op for BLE
}

#pragma mark - Image Helpers

- (UIImage *)getPrintImage:(UIImage *)image width:(CGFloat)newWidth paddingX:(CGFloat)paddingX
{
    CGFloat newHeight = (newWidth / image.size.width) * image.size.height;
    CGSize newSize = CGSizeMake(newWidth, newHeight);
    UIGraphicsBeginImageContextWithOptions(newSize, false, 0.0);
    CGContextRef context = UIGraphicsGetCurrentContext();
    CGContextSetInterpolationQuality(context, kCGInterpolationHigh);
    CGImageRef imageRef = image.CGImage;
    CGContextDrawImage(context, CGRectMake(0, 0, newWidth, newHeight), imageRef);
    CGImageRef newImageRef = CGBitmapContextCreateImage(context);
    UIImage *newImage = [UIImage imageWithCGImage:newImageRef];
    CGImageRelease(newImageRef);
    UIGraphicsEndImageContext();

    UIImage *paddedImage = [self addImagePadding:newImage paddingX:paddingX paddingY:0];
    return paddedImage;
}

- (UIImage *)addImagePadding:(UIImage *)image paddingX:(CGFloat)paddingX paddingY:(CGFloat)paddingY
{
    CGFloat width = image.size.width + paddingX;
    CGFloat height = image.size.height + paddingY;

    UIGraphicsBeginImageContextWithOptions(CGSizeMake(width, height), true, 0.0);
    CGContextRef context = UIGraphicsGetCurrentContext();
    CGContextSetFillColorWithColor(context, [UIColor whiteColor].CGColor);
    CGContextSetInterpolationQuality(context, kCGInterpolationHigh);
    CGContextFillRect(context, CGRectMake(0, 0, width, height));
    CGFloat originX = (width - image.size.width) / 2;
    CGFloat originY = (height - image.size.height) / 2;
    CGImageRef imageRef = image.CGImage;
    CGContextDrawImage(context, CGRectMake(originX, originY, image.size.width, image.size.height), imageRef);
    CGImageRef newImageRef = CGBitmapContextCreateImage(context);
    UIImage *paddedImage = [UIImage imageWithCGImage:newImageRef];
    CGImageRelease(newImageRef);
    UIGraphicsEndImageContext();

    return paddedImage;
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeBLEPrinterSpecJSI>(params);
}
#endif

@end
