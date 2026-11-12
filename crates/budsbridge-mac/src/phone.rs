//! Bridge mode on macOS: there is none over Bluetooth. macOS can send audio
//! to buds and speakers but never receives it from a phone (it has no A2DP
//! sink), so this backend offers no sources. It still lists the paired phones
//! with that reason, so they don't just go missing, and reports what macOS
//! sees for "Copy diagnostics". An iPhone can play through the Mac with
//! AirPlay instead; the UI explains that.

use budsbridge_core::{
    AudioSource, BackendError, ChangeNotifier, DeviceId, SourceBackend, UnavailableSource, Watch,
};

use crate::classify::{self, NO_PHONE_AUDIO};
use crate::ffi;

#[derive(Debug, Default)]
pub struct MacPhoneBackend;

impl MacPhoneBackend {
    pub fn new() -> Self {
        Self
    }
}

impl SourceBackend for MacPhoneBackend {
    fn name(&self) -> &'static str {
        "macos"
    }

    fn list_sources(&self) -> Result<Vec<AudioSource>, BackendError> {
        Ok(Vec::new())
    }

    fn unavailable(&self) -> Vec<UnavailableSource> {
        match ffi::paired_devices() {
            Ok(paired) => classify::unavailable_phones(&paired),
            Err(err) => {
                log::warn!("listing paired phones failed: {err}");
                Vec::new()
            }
        }
    }

    fn diagnostics(&self) -> String {
        let paired = ffi::paired_devices();
        classify::diagnostics(
            &ffi::bluetooth_state(),
            paired.as_deref().ok(),
            ffi::airplay_receiver_enabled(),
        )
    }

    fn open(&self, _id: &DeviceId) -> Result<(), BackendError> {
        Err(BackendError::NotSupported(NO_PHONE_AUDIO.into()))
    }

    fn close(&self, _id: &DeviceId) -> Result<(), BackendError> {
        Ok(())
    }

    fn watch(&self, _notify: ChangeNotifier) -> Result<Watch, BackendError> {
        Ok(Watch::none())
    }
}
