// SPDX-License-Identifier: GPL-3.0-or-later
//! Capture backends only produce mono frames. DSP and USB do not depend on OS APIs.
#[cfg(not(any(target_os = "linux", target_os = "windows")))]
use super::Source;
use super::N;
pub trait FrameInput: Send {
    fn read_frame(&mut self) -> Result<[f32; N], String>;
}
pub trait StopCapture: Send {
    fn stop(&mut self);
}
pub struct Capture {
    pub input: Box<dyn FrameInput>,
    pub control: Box<dyn StopCapture>,
}
#[cfg(target_os = "linux")]
#[path = "capture/linux.rs"]
mod linux;
#[cfg(target_os = "windows")]
#[path = "capture/windows.rs"]
mod windows;
#[cfg(target_os = "linux")]
pub use linux::{open, sources};
#[cfg(target_os = "windows")]
pub use windows::{open, sources};
#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub fn sources() -> Result<Vec<Source>, String> {
    Err("La capture audio est disponible sous Windows et Linux.".into())
}
#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub fn open(_source: &Source) -> Result<Capture, String> {
    Err("La capture audio n’est pas disponible sur ce système.".into())
}
