//! [`DeviceBackend`] for macOS: IOBluetooth's paired devices, connected by
//! opening the device's link.

use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, PoisonError};
use std::thread;
use std::time::Duration;

use budsbridge_core::{AudioDevice, BackendError, ChangeNotifier, DeviceBackend, DeviceId, Watch};

use crate::{classify, ffi};

/// How often the paired list is compared for changes. IOBluetooth answers
/// from memory, so this costs next to nothing.
const POLL: Duration = Duration::from_millis(1500);

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(PoisonError::into_inner)
}

/// Talks to paired Bluetooth audio devices through IOBluetooth.
pub struct MacBackend {
    /// Devices with a connection attempt running on its own thread.
    connecting: Arc<Mutex<HashSet<DeviceId>>>,
}

impl Default for MacBackend {
    fn default() -> Self {
        Self::new()
    }
}

impl MacBackend {
    /// Also asks for Bluetooth access the first time BudsBridge runs.
    pub fn new() -> Self {
        let state = ffi::bluetooth_state();
        log::info!(
            "macOS {}, Bluetooth power {}, access {}",
            state.version().unwrap_or("unknown"),
            state.power,
            state.access
        );
        if state.access == "notDetermined" {
            ffi::request_bluetooth_access();
        }
        Self {
            connecting: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    fn ready() -> Result<(), BackendError> {
        match ffi::bluetooth_state().problem() {
            Some(problem) => Err(problem),
            None => Ok(()),
        }
    }

    fn ensure_paired(id: &DeviceId) -> Result<(), BackendError> {
        if ffi::paired_devices()?
            .iter()
            .any(|device| device.is(id.as_str()))
        {
            Ok(())
        } else {
            Err(BackendError::NotFound(id.clone()))
        }
    }
}

impl DeviceBackend for MacBackend {
    fn name(&self) -> &'static str {
        "macos"
    }

    fn list_devices(&self) -> Result<Vec<AudioDevice>, BackendError> {
        Ok(classify::audio_devices(&ffi::paired_devices()?))
    }

    /// Opening a link blocks for a few seconds, so it runs on its own thread
    /// and this returns at once, like a request to the Windows driver. The
    /// poller sees the buds come up; a failure is logged and the controller's
    /// timeout reports it.
    fn connect(&self, id: &DeviceId) -> Result<(), BackendError> {
        Self::ready()?;
        Self::ensure_paired(id)?;
        if !lock(&self.connecting).insert(id.clone()) {
            return Ok(()); // already on its way
        }
        let connecting = Arc::clone(&self.connecting);
        let device = id.clone();
        let spawned = thread::Builder::new()
            .name("budsbridge-connect".into())
            .spawn(move || {
                match ffi::open_connection(&device) {
                    Ok(()) => log::info!("link to {device} is open"),
                    Err(err) => log::warn!("connecting {device} failed: {err}"),
                }
                lock(&connecting).remove(&device);
            });
        if let Err(err) = spawned {
            lock(&self.connecting).remove(id);
            return Err(BackendError::Other(format!(
                "could not start connecting: {err}"
            )));
        }
        Ok(())
    }

    fn disconnect(&self, id: &DeviceId) -> Result<(), BackendError> {
        ffi::close_connection(id)
    }

    fn watch(&self, notify: ChangeNotifier) -> Result<Watch, BackendError> {
        Ok(Watch::new(Poller::start(notify)?))
    }
}

/// Polls the paired list and Bluetooth state, and fires the notifier when
/// either changes. Dropping it stops the thread.
struct Poller {
    stop: Arc<AtomicBool>,
}

impl Poller {
    fn start(notify: ChangeNotifier) -> Result<Self, BackendError> {
        let stop = Arc::new(AtomicBool::new(false));
        let stopped = Arc::clone(&stop);
        thread::Builder::new()
            .name("budsbridge-bluetooth-watch".into())
            .spawn(move || {
                let snapshot = || (ffi::paired_devices_json(), ffi::bluetooth_state());
                let mut last = snapshot();
                while !stopped.load(Ordering::Relaxed) {
                    thread::sleep(POLL);
                    let now = snapshot();
                    if now != last {
                        last = now;
                        notify();
                    }
                }
            })
            .map_err(|err| BackendError::Other(format!("could not watch Bluetooth: {err}")))?;
        Ok(Self { stop })
    }
}

impl Drop for Poller {
    fn drop(&mut self) {
        // The thread notices within one poll; nothing waits for it.
        self.stop.store(true, Ordering::Relaxed);
    }
}
