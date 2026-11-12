//! Safe wrappers around the C functions in `bluetooth.m`.

use std::ffi::{CStr, CString, c_char, c_int};

use budsbridge_core::{BackendError, DeviceId};

use crate::classify::{self, BluetoothState, NOT_FOUND};

unsafe extern "C" {
    fn bb_free(text: *mut c_char);
    fn bb_paired_devices_json() -> *mut c_char;
    fn bb_bluetooth_state_json() -> *mut c_char;
    fn bb_request_bluetooth_access();
    fn bb_open_connection(address: *const c_char) -> c_int;
    fn bb_close_connection(address: *const c_char) -> c_int;
    fn bb_airplay_receiver_enabled() -> c_int;
}

/// Copies and frees a string returned by `bluetooth.m`.
fn take(text: *mut c_char) -> Option<String> {
    if text.is_null() {
        return None;
    }
    // SAFETY: `bluetooth.m` returns NUL-terminated strings from malloc and
    // hands ownership to the caller; this is the only place that frees them.
    let owned = unsafe { CStr::from_ptr(text) }
        .to_string_lossy()
        .into_owned();
    // SAFETY: as above; `text` is not used after this.
    unsafe { bb_free(text) };
    Some(owned)
}

/// The paired devices as JSON (see `bb_paired_devices_json`).
pub fn paired_devices_json() -> Option<String> {
    // SAFETY: takes no arguments; the result is handled by `take`.
    take(unsafe { bb_paired_devices_json() })
}

pub fn paired_devices() -> Result<Vec<classify::PairedDevice>, BackendError> {
    let json = paired_devices_json()
        .ok_or_else(|| BackendError::Other("macOS returned no list of paired devices".into()))?;
    classify::parse(&json)
        .map_err(|err| BackendError::Other(format!("could not read the paired devices: {err}")))
}

/// Bluetooth power, BudsBridge's access to it, and the macOS version.
pub fn bluetooth_state() -> BluetoothState {
    // SAFETY: takes no arguments; the result is handled by `take`.
    take(unsafe { bb_bluetooth_state_json() })
        .map(|json| classify::parse_state(&json))
        .unwrap_or_default()
}

/// Asks the user for Bluetooth access if they haven't answered yet.
pub fn request_bluetooth_access() {
    // SAFETY: takes no arguments and only creates a CoreBluetooth manager once.
    unsafe { bb_request_bluetooth_access() }
}

/// Whether AirPlay Receiver is on; `None` when the setting was never changed
/// (macOS then has it on) or can't be read.
pub fn airplay_receiver_enabled() -> Option<bool> {
    // SAFETY: takes no arguments and only reads a preference.
    match unsafe { bb_airplay_receiver_enabled() } {
        0 => Some(false),
        1 => Some(true),
        _ => None,
    }
}

fn address(id: &DeviceId) -> Result<CString, BackendError> {
    CString::new(id.as_str()).map_err(|_| BackendError::NotFound(id.clone()))
}

fn check(id: &DeviceId, code: c_int) -> Result<(), BackendError> {
    match code {
        0 => Ok(()),
        NOT_FOUND => Err(BackendError::NotFound(id.clone())),
        code => Err(BackendError::Os {
            code,
            message: classify::error_message(code),
        }),
    }
}

/// Opens the link to the device. Blocks for up to a few seconds.
pub fn open_connection(id: &DeviceId) -> Result<(), BackendError> {
    let address = address(id)?;
    // SAFETY: `address` is a valid NUL-terminated string for the whole call.
    let code = unsafe { bb_open_connection(address.as_ptr()) };
    check(id, code)
}

/// Closes the link to the device.
pub fn close_connection(id: &DeviceId) -> Result<(), BackendError> {
    let address = address(id)?;
    // SAFETY: `address` is a valid NUL-terminated string for the whole call.
    let code = unsafe { bb_close_connection(address.as_ptr()) };
    check(id, code)
}
