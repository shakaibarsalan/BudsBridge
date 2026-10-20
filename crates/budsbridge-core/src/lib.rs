//! Platform-independent core of BudsBridge.
//!
//! * [`device`]: what a paired Bluetooth audio device looks like.
//! * [`controller`]: the pure connection state machine and reconnect logic.
//! * [`runtime`]: runs the controller against a [`backend::DeviceBackend`].
//! * [`settings`]: persisted user preferences.

pub mod backend;
pub mod controller;
pub mod device;
#[cfg(feature = "fake")]
pub mod fake;
pub mod reconnect;
pub mod runtime;
pub mod settings;

pub use backend::{BackendError, ChangeNotifier, DeviceBackend, Watch};
pub use controller::{Action, Command, Controller, ControllerConfig, ControllerError, DeviceView};
pub use device::{AudioDevice, AudioProfile, ConnectionState, DeviceId};
pub use reconnect::ReconnectPolicy;
pub use runtime::{Runtime, RuntimeHandle, UpdateListener};
pub use settings::{Settings, SettingsError};
