//
//  RNNetPrinter.mm
//  react-native-earl-thermal-printer
//
//  Network (TCP/IP) printer module for iOS using PrinterSDK.
//  Migrated to Promise-based API for React Native New Architecture (TurboModules).
//
//  Author: Ordovez, Earl Romeo
//

#import "RNNetPrinter.h"
#import "PrinterSDK.h"
#include <ifaddrs.h>
#include <arpa/inet.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import "RNThermalReceiptPrinterSpec.h"
#endif

NSString *const EVENT_SCANNER_RESOLVED = @"scannerResolved";
NSString *const EVENT_SCANNER_RUNNING = @"scannerRunning";

#pragma mark - PrivateIP Helper

@interface PrivateIP : NSObject
- (NSString *)getIPAddress;
@end

@implementation PrivateIP

- (NSString *)getIPAddress
{
    NSString *address = @"error";
    struct ifaddrs *interfaces = NULL;
    struct ifaddrs *temp_addr = NULL;
    int success = getifaddrs(&interfaces);
    if (success == 0) {
        temp_addr = interfaces;
        while (temp_addr != NULL) {
            if (temp_addr->ifa_addr->sa_family == AF_INET) {
                if ([[NSString stringWithUTF8String:temp_addr->ifa_name] isEqualToString:@"en0"]) {
                    address = [NSString stringWithUTF8String:inet_ntoa(((struct sockaddr_in *)temp_addr->ifa_addr)->sin_addr)];
                }
            }
            temp_addr = temp_addr->ifa_next;
        }
    }
    freeifaddrs(interfaces);
    return address;
}

@end

#pragma mark - RNNetPrinter

@implementation RNNetPrinter

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents
{
    return @[EVENT_SCANNER_RESOLVED, EVENT_SCANNER_RUNNING];
}

RCT_EXPORT_METHOD(init:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    connected_ip = nil;
    is_scanning = NO;
    _printerArray = [NSMutableArray new];
    resolve(@"RNNetPrinter initialized");
}

RCT_EXPORT_METHOD(getDeviceList:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handlePrinterConnectedNotification:)
                                                 name:PrinterConnectedNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleBLEPrinterConnectedNotification:)
                                                 name:@"BLEPrinterConnected"
                                               object:nil];
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self scan];
    });

    // Resolve immediately with empty array; discovered printers arrive via events
    resolve(@[]);
}

- (void)scan
{
    @try {
        PrivateIP *privateIP = [[PrivateIP alloc] init];
        NSString *localIP = [privateIP getIPAddress];
        is_scanning = YES;
        [self sendEventWithName:EVENT_SCANNER_RUNNING body:@YES];
        _printerArray = [NSMutableArray new];

        NSString *prefix = [localIP substringToIndex:([localIP rangeOfString:@"." options:NSBackwardsSearch].location)];
        NSInteger suffix = [[localIP substringFromIndex:([localIP rangeOfString:@"." options:NSBackwardsSearch].location)] intValue];

        for (NSInteger i = 1; i < 255; i++) {
            if (i == suffix) continue;
            NSString *testIP = [NSString stringWithFormat:@"%@.%ld", prefix, (long)i];
            current_scan_ip = testIP;
            [[PrinterSDK defaultPrinterSDK] connectIP:testIP];
            [NSThread sleepForTimeInterval:0.5];
        }

        NSOrderedSet *orderedSet = [NSOrderedSet orderedSetWithArray:_printerArray];
        NSArray *arrayWithoutDuplicates = [orderedSet array];
        _printerArray = [arrayWithoutDuplicates mutableCopy];

        [self sendEventWithName:EVENT_SCANNER_RESOLVED body:_printerArray];
    } @catch (NSException *exception) {
        NSLog(@"No connection");
    }
    [[PrinterSDK defaultPrinterSDK] disconnect];
    is_scanning = NO;
    [self sendEventWithName:EVENT_SCANNER_RUNNING body:@NO];
}

- (void)handlePrinterConnectedNotification:(NSNotification *)notification
{
    if (is_scanning) {
        [_printerArray addObject:@{@"host": current_scan_ip, @"port": @9100}];
    }
}

- (void)handleBLEPrinterConnectedNotification:(NSNotification *)notification
{
    connected_ip = nil;
}

RCT_EXPORT_METHOD(connectPrinter:(NSString *)host
                  port:(double)port
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        BOOL isConnectSuccess = [[PrinterSDK defaultPrinterSDK] connectIP:host];
        if (!isConnectSuccess) {
            reject(@"ERR_CONNECT",
                   [NSString stringWithFormat:@"Can't connect to printer %@:%d", host, (int)port],
                   nil);
            return;
        }

        connected_ip = host;
        [[NSNotificationCenter defaultCenter] postNotificationName:@"NetPrinterConnected" object:nil];
        NSDictionary *result = @{
            @"device_name" : [NSString stringWithFormat:@"%@:%d", host, (int)port],
            @"host" : host,
            @"port" : @((int)port)
        };
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"ERR_CONNECT", exception.reason ?: @"Failed to connect", nil);
    }
}

RCT_EXPORT_METHOD(printRawData:(NSString *)base64Data
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!connected_ip) {
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
                  imageWidth:(double)imageWidth
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!connected_ip) {
            reject(@"ERR_NO_CONN", @"Not connected to a printer", nil);
            return;
        }
        CGFloat width = imageWidth > 0 ? (CGFloat)imageWidth : 150;
        NSURL *url = [NSURL URLWithString:imageUrl];
        NSData *imageData = [NSData dataWithContentsOfURL:url];
        if (imageData != nil) {
            UIImage *image = [UIImage imageWithData:imageData];
            UIImage *printImage = [self getPrintImage:image width:width paddingX:250];
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
                  qrSize:(double)qrSize
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        if (!connected_ip) {
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
        if (connected_ip) {
            [[PrinterSDK defaultPrinterSDK] disconnect];
            connected_ip = nil;
        }
    } @catch (NSException *exception) {
        NSLog(@"%@", exception.reason);
    }
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName)
{
    // Required by RCTEventEmitter
}

RCT_EXPORT_METHOD(removeListeners:(double)count)
{
    // Required by RCTEventEmitter
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
    return std::make_shared<facebook::react::NativeNetPrinterSpecJSI>(params);
}
#endif

@end
