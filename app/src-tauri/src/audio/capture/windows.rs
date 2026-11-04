// SPDX-License-Identifier: GPL-3.0-or-later
//! WASAPI loopback for output endpoints; ordinary WASAPI capture for microphones.
//! The stream and its COM objects stay on their owning capture thread.
use super::super::{pcm::Converter, Source, N};
use super::{Capture, FrameInput, StopCapture};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{FromSample, SampleFormat, SizedSample};
use parking_lot::{Condvar, Mutex};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    mpsc, Arc,
};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

pub fn sources() -> Result<Vec<Source>, String> {
    let host = cpal::host_from_id(cpal::HostId::Wasapi)
        .map_err(|e| format!("WASAPI indisponible : {e}"))?;
    let mut result = Vec::new();
    for kind in ["system", "microphone"] {
        let default = if kind == "system" {
            host.default_output_device()
        } else {
            host.default_input_device()
        }
        .and_then(|d| d.id().ok())
        .map(|id| id.to_string());
        let devices = if kind == "system" {
            host.output_devices()
        } else {
            host.input_devices()
        }
        .map_err(|e| e.to_string())?;
        let mut list = Vec::new();
        for device in devices {
            let target = device.id().map_err(|e| e.to_string())?.to_string();
            let name = device
                .description()
                .map(|d| d.name().to_owned())
                .unwrap_or_else(|_| "Périphérique audio Windows".into());
            list.push(Source {
                id: format!("{kind}:{target}"),
                name,
                kind: kind.into(),
                target,
            });
        }
        list.sort_by_key(|s| default.as_deref() != Some(s.target.as_str()));
        result.extend(list);
    }
    Ok(result)
}
struct State {
    frame: Option<[f32; N]>,
    closed: bool,
    error: Option<String>,
    last_callback: Instant,
}
struct Queue {
    state: Mutex<State>,
    changed: Condvar,
}
impl Queue {
    fn new() -> Self {
        Self {
            state: Mutex::new(State {
                frame: None,
                closed: false,
                error: None,
                last_callback: Instant::now(),
            }),
            changed: Condvar::new(),
        }
    }
    fn push(&self, frame: [f32; N]) {
        let mut s = self.state.lock();
        if !s.closed {
            s.frame = Some(frame);
            self.changed.notify_one();
        }
    }
    fn fail(&self, error: Option<String>) {
        let mut s = self.state.lock();
        s.error = error;
        s.closed = true;
        self.changed.notify_all();
    }
}
struct Reader(Arc<Queue>);
impl FrameInput for Reader {
    fn read_frame(&mut self) -> Result<[f32; N], String> {
        let mut s = self.0.state.lock();
        loop {
            if s.closed {
                return Err(s
                    .error
                    .clone()
                    .unwrap_or_else(|| "Capture WASAPI arrêtée.".into()));
            }
            if let Some(frame) = s.frame.take() {
                return Ok(frame);
            }
            self.0.changed.wait(&mut s);
        }
    }
}
struct Control {
    stop: Arc<AtomicBool>,
    queue: Arc<Queue>,
    worker: Option<JoinHandle<()>>,
}
impl StopCapture for Control {
    fn stop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        self.queue.fail(None);
        if let Some(worker) = self.worker.take() {
            let _ = worker.join();
        }
    }
}
impl Drop for Control {
    fn drop(&mut self) {
        self.stop();
    }
}
fn build<T>(
    device: &cpal::Device,
    config: cpal::StreamConfig,
    queue: Arc<Queue>,
) -> Result<cpal::Stream, String>
where
    T: SizedSample,
    f32: FromSample<T>,
{
    let channels = usize::from(config.channels);
    if channels == 0 || channels > 32 {
        return Err("Nombre de canaux audio non pris en charge.".into());
    }
    let mut converter = Converter::new(config.sample_rate)?;
    let errors = queue.clone();
    device.build_input_stream(config,move |data:&[T],_| {
        queue.state.lock().last_callback=Instant::now();
        for frame in data.chunks_exact(channels) {
            let mono=frame.iter().map(|v|v.to_sample::<f32>()).sum::<f32>()/channels as f32;
            converter.push(mono,&mut |frame|queue.push(frame));
        }
    },move |error| {
        match error.kind() {
            cpal::ErrorKind::Xrun|cpal::ErrorKind::RealtimeDenied=>log::warn!("WASAPI: {error}"),
            _=>errors.fail(Some(format!("Capture Windows interrompue : {error}. Vérifiez le périphérique et les autorisations du microphone."))),
        }
    },Some(Duration::from_secs(3))).map_err(|e|format!("Impossible d’ouvrir WASAPI : {e}. Vérifiez les autorisations audio Windows."))
}
pub fn open(source: &Source) -> Result<Capture, String> {
    let queue = Arc::new(Queue::new());
    let stop = Arc::new(AtomicBool::new(false));
    let worker_queue = queue.clone();
    let worker_stop = stop.clone();
    let source = source.clone();
    let (ready, initialized) = mpsc::sync_channel(1);
    let worker = std::thread::spawn(move || {
        let create = || -> Result<cpal::Stream, String> {
            let host = cpal::host_from_id(cpal::HostId::Wasapi).map_err(|e| e.to_string())?;
            let id = source
                .target
                .parse::<cpal::DeviceId>()
                .map_err(|e| e.to_string())?;
            let device = host
                .device_by_id(&id)
                .ok_or("Le périphérique audio Windows n’est plus disponible.")?;
            // An input stream on a render endpoint enables WASAPI loopback in CPAL.
            let supported = if source.kind == "system" {
                device.default_output_config()
            } else {
                device.default_input_config()
            }
            .map_err(|e| e.to_string())?;
            let config = supported.config();
            let stream = match supported.sample_format() {
                SampleFormat::F32 => build::<f32>(&device, config, worker_queue.clone()),
                SampleFormat::F64 => build::<f64>(&device, config, worker_queue.clone()),
                SampleFormat::I16 => build::<i16>(&device, config, worker_queue.clone()),
                SampleFormat::I32 => build::<i32>(&device, config, worker_queue.clone()),
                SampleFormat::U16 => build::<u16>(&device, config, worker_queue.clone()),
                SampleFormat::U8 => build::<u8>(&device, config, worker_queue.clone()),
                format => Err(format!(
                    "Format audio Windows non pris en charge : {format}"
                )),
            }?;
            stream.play().map_err(|e| e.to_string())?;
            Ok(stream)
        };
        match create() {
            Ok(stream) => {
                let _ = ready.send(Ok(()));
                while !worker_stop.load(Ordering::Relaxed) {
                    {
                        let s = worker_queue.state.lock();
                        if s.closed {
                            break;
                        }
                        if s.last_callback.elapsed() > Duration::from_millis(50) {
                            drop(s);
                            worker_queue.push([0.0; N]);
                        }
                    }
                    std::thread::sleep(Duration::from_millis(20));
                }
                drop(stream);
            }
            Err(error) => {
                worker_queue.fail(Some(error.clone()));
                let _ = ready.send(Err(error));
            }
        }
    });
    let control = Control {
        stop,
        queue: queue.clone(),
        worker: Some(worker),
    };
    initialized
        .recv_timeout(Duration::from_secs(5))
        .map_err(|_| "Windows ne répond pas à l’ouverture de la capture audio.".to_string())??;
    Ok(Capture {
        input: Box::new(Reader(queue)),
        control: Box::new(control),
    })
}
