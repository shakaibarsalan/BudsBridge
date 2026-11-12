//! macOS backend for BudsBridge.
//!
//! * Lists paired Bluetooth audio devices from IOBluetooth, and connects or
//!   disconnects them by opening or closing the device's link; macOS then
//!   brings the audio up (or drops it) and moves the sound to the buds itself.
//! * Watches for changes by polling the paired list, which is cheap.
//! * Phones: macOS can't act as a Bluetooth speaker for a phone, so bridge
//!   mode has no sources here. Paired phones are listed as unavailable with
//!   that reason; an iPhone can play through the Mac with AirPlay instead.
//!
//! Only [`classify`] is compiled on other platforms, so its logic is tested
//! everywhere. The IOBluetooth calls live in `bluetooth.m`.

pub mod classify;

#[cfg(target_os = "macos")]
mod backend;
#[cfg(target_os = "macos")]
mod ffi;
#[cfg(target_os = "macos")]
mod phone;

#[cfg(target_os = "macos")]
pub use backend::MacBackend;
#[cfg(target_os = "macos")]
pub use ffi::{airplay_receiver_enabled, bluetooth_state};
#[cfg(target_os = "macos")]
pub use phone::MacPhoneBackend;
