//! Platform-independent core of BudsBridge.

pub mod backend;
pub mod controller;
pub mod device;
pub mod reconnect;

pub use backend::{BackendError, ChangeNotifier, DeviceBackend, Watch};
pub use controller::{Action, Command, Controller, ControllerConfig, ControllerError, DeviceView};
pub use device::{AudioDevice, AudioProfile, ConnectionState, DeviceId};
pub use reconnect::ReconnectPolicy;
