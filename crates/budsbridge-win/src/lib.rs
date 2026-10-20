//! Windows backend for BudsBridge.
//!
//! * Lists paired Bluetooth audio devices from Core Audio render endpoints,
//!   grouped by device container.
//! * Connects/disconnects them with `KSPROPSETID_BtAudio` one-shot requests.
//! * Watches endpoint state changes with `IMMNotificationClient`.
//!
//! Only [`classify`] is compiled on other platforms, so its logic is tested
//! everywhere.

pub mod classify;

#[cfg(windows)]
mod backend;
#[cfg(windows)]
mod com;
#[cfg(windows)]
mod endpoints;
#[cfg(windows)]
mod ks;
#[cfg(windows)]
mod notify;

#[cfg(windows)]
pub use backend::WindowsBackend;
