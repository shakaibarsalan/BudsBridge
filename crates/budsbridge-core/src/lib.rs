//! Platform-independent core of BudsBridge.

pub mod device;
pub mod reconnect;

pub use device::{AudioDevice, AudioProfile, ConnectionState, DeviceId};
pub use reconnect::ReconnectPolicy;
