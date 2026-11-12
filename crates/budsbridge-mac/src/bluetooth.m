// The Objective-C side of the macOS backend: plain C functions over
// IOBluetooth and CoreBluetooth that Rust calls through FFI (see ffi.rs).
//
// Every string returned is malloc'd, NUL-terminated UTF-8 JSON owned by the
// caller, who frees it with bb_free. Nothing here keeps state except the
// CoreBluetooth manager that asks for Bluetooth access once.

#import <CoreBluetooth/CoreBluetooth.h>
#import <Foundation/Foundation.h>
#import <IOBluetooth/IOBluetooth.h>

// Returned by bb_open_connection / bb_close_connection when no paired device
// has the address. IOReturn codes are never -1.
#define BB_NOT_FOUND (-1)

void bb_free(char *text) { free(text); }

static char *bb_json(id object) {
    NSError *error = nil;
    NSData *data = [NSJSONSerialization dataWithJSONObject:object options:0 error:&error];
    if (data == nil) {
        return NULL;
    }
    char *text = malloc(data.length + 1);
    if (text == NULL) {
        return NULL;
    }
    memcpy(text, data.bytes, data.length);
    text[data.length] = '\0';
    return text;
}

// The 16-bit service classes BudsBridge cares about, from the SDP records
// macOS cached when the device was paired.
static NSArray<NSNumber *> *bb_services(IOBluetoothDevice *device) {
    static const BluetoothSDPUUID16 wanted[] = {
        0x1108,  // Headset
        0x110A,  // Audio Source (A2DP, a phone)
        0x110B,  // Audio Sink (A2DP, buds and speakers)
        0x1112,  // Headset Audio Gateway
        0x111E,  // Hands-Free
        0x111F,  // Hands-Free Audio Gateway (a phone)
    };
    NSMutableArray<NSNumber *> *found = [NSMutableArray array];
    for (size_t i = 0; i < sizeof wanted / sizeof wanted[0]; i++) {
        IOBluetoothSDPUUID *uuid = [IOBluetoothSDPUUID uuid16:wanted[i]];
        if ([device getServiceRecordForUUID:uuid] != nil) {
            [found addObject:@(wanted[i])];
        }
    }
    return found;
}

// [{"address", "name", "connected", "classOfDevice", "services"}, ...]
char *bb_paired_devices_json(void) {
    @autoreleasepool {
        NSMutableArray *list = [NSMutableArray array];
        for (IOBluetoothDevice *device in [IOBluetoothDevice pairedDevices] ?: @[]) {
            NSString *address = device.addressString ?: @"";
            if (address.length == 0) {
                continue;
            }
            NSString *name = device.name ?: device.nameOrAddress ?: address;
            [list addObject:@{
                @"address" : address,
                @"name" : name,
                @"connected" : @([device isConnected]),
                @"classOfDevice" : @(device.classOfDevice),
                @"services" : bb_services(device),
            }];
        }
        return bb_json(list);
    }
}

// {"power": "on|off|unavailable", "access": "allowed|denied|restricted|notDetermined|unknown",
//  "os": "Version 15.1 (Build 24B83)"}
char *bb_bluetooth_state_json(void) {
    @autoreleasepool {
        NSString *power = @"unavailable";
        IOBluetoothHostController *host = [IOBluetoothHostController defaultController];
        if (host != nil) {
            power = host.powerState == kBluetoothHCIPowerStateON ? @"on" : @"off";
        }
        NSString *access = @"unknown";
        if (@available(macOS 10.15, *)) {
            switch (CBManager.authorization) {
                case CBManagerAuthorizationAllowedAlways:
                    access = @"allowed";
                    break;
                case CBManagerAuthorizationDenied:
                    access = @"denied";
                    break;
                case CBManagerAuthorizationRestricted:
                    access = @"restricted";
                    break;
                case CBManagerAuthorizationNotDetermined:
                    access = @"notDetermined";
                    break;
            }
        }
        NSString *os = [[NSProcessInfo processInfo] operatingSystemVersionString] ?: @"";
        return bb_json(@{@"power" : power, @"access" : access, @"os" : os});
    }
}

// Shows macOS' "BudsBridge would like to use Bluetooth" prompt if the user
// hasn't answered it yet. Creating a CoreBluetooth manager is what asks.
void bb_request_bluetooth_access(void) {
    static CBCentralManager *manager;
    static dispatch_once_t once;
    dispatch_once(&once, ^{
      manager = [[CBCentralManager alloc]
          initWithDelegate:nil
                     queue:nil
                   options:@{CBCentralManagerOptionShowPowerAlertKey : @NO}];
    });
}

static IOBluetoothDevice *bb_find(const char *address) {
    NSString *wanted = [NSString stringWithUTF8String:address];
    if (wanted == nil) {
        return nil;
    }
    for (IOBluetoothDevice *device in [IOBluetoothDevice pairedDevices] ?: @[]) {
        NSString *candidate = device.addressString;
        if (candidate != nil && [candidate caseInsensitiveCompare:wanted] == NSOrderedSame) {
            return device;
        }
    }
    return nil;
}

// Opens the baseband link; macOS then brings up the audio profiles itself.
// Blocks until the link is up or the attempt failed (a few seconds at most).
int bb_open_connection(const char *address) {
    @autoreleasepool {
        IOBluetoothDevice *device = bb_find(address);
        if (device == nil) {
            return BB_NOT_FOUND;
        }
        if ([device isConnected]) {
            return kIOReturnSuccess;
        }
        return (int)[device openConnection];
    }
}

// Closes the link, which releases the buds for another device.
int bb_close_connection(const char *address) {
    @autoreleasepool {
        IOBluetoothDevice *device = bb_find(address);
        if (device == nil) {
            return BB_NOT_FOUND;
        }
        if (![device isConnected]) {
            return kIOReturnSuccess;
        }
        return (int)[device closeConnection];
    }
}

static int bb_bool_value(CFPropertyListRef value) {
    int result = -1;
    if (value == NULL) {
        return result;
    }
    if (CFGetTypeID(value) == CFBooleanGetTypeID()) {
        result = CFBooleanGetValue((CFBooleanRef)value) ? 1 : 0;
    } else if (CFGetTypeID(value) == CFNumberGetTypeID()) {
        int number = 0;
        if (CFNumberGetValue((CFNumberRef)value, kCFNumberIntType, &number)) {
            result = number != 0 ? 1 : 0;
        }
    }
    CFRelease(value);
    return result;
}

// Whether AirPlay Receiver is on (System Settings > General > AirDrop &
// Handoff): 1 on, 0 off, -1 not set (macOS then uses its default, on).
// The key's spelling is Apple's.
int bb_airplay_receiver_enabled(void) {
    CFStringRef key = CFSTR("AirplayRecieverEnabled");
    CFStringRef domain = CFSTR("com.apple.controlcenter");
    int value = bb_bool_value(
        CFPreferencesCopyValue(key, domain, kCFPreferencesCurrentUser, kCFPreferencesCurrentHost));
    if (value < 0) {
        value = bb_bool_value(CFPreferencesCopyAppValue(key, domain));
    }
    return value;
}
