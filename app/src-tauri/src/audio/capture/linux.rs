// SPDX-License-Identifier: GPL-3.0-or-later
use super::super::{Source, N};
use super::{Capture, FrameInput, StopCapture};
use std::io::Read;
use std::process::{Child, Command, Stdio};
pub fn sources() -> Result<Vec<Source>, String> {
    let mut result = Vec::new();
    for (kind, list) in [("system", "sinks"), ("microphone", "sources")] {
        let out = Command::new("pactl")
            .args(["--format=json", "list", list])
            .output()
            .map_err(|e| format!("Impossible de lire les sources audio : {e}"))?;
        if !out.status.success() {
            return Err(
                "Le service audio ne répond pas. Vérifiez les réglages audio du système.".into(),
            );
        }
        let values: Vec<serde_json::Value> =
            serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())?;
        result.extend(parse_sources(&values, kind));
    }
    for (kind, command) in [
        ("system", "get-default-sink"),
        ("microphone", "get-default-source"),
    ] {
        if let Ok(out) = Command::new("pactl").arg(command).output() {
            if out.status.success() {
                let default = String::from_utf8_lossy(&out.stdout).trim().to_owned();
                if let Some(index) = result
                    .iter()
                    .position(|s| s.kind == kind && s.target == default)
                {
                    let source = result.remove(index);
                    let first = result
                        .iter()
                        .position(|s| s.kind == kind)
                        .unwrap_or(result.len());
                    result.insert(first, source);
                }
            }
        }
    }
    Ok(result)
}

fn parse_sources(values: &[serde_json::Value], kind: &str) -> Vec<Source> {
    values
        .iter()
        .filter_map(|v| {
            let target = v.get("name")?.as_str()?;
            if target.len() > 1024
                || target.contains('\0')
                || (kind == "microphone"
                    && (target.ends_with(".monitor")
                        || v.get("monitor_of_sink").is_some_and(|x| {
                            !x.is_null()
                                && x.as_str() != Some("n/a")
                                && x.as_u64() != Some(u32::MAX as u64)
                        })))
            {
                return None;
            }
            Some(Source {
                id: format!("{kind}:{target}"),
                name: source_name(v, target).into(),
                kind: kind.into(),
                target: target.into(),
            })
        })
        .collect()
}

// Some pactl versions return the literal "(null)" for descriptions containing
// accented characters. PipeWire still supplies the device name in properties.
fn source_name<'a>(value: &'a serde_json::Value, target: &'a str) -> &'a str {
    let properties = &value["properties"];
    [
        value.get("description"),
        properties.get("node.description"),
        properties.get("node.nick"),
        properties.get("device.description"),
        properties.get("alsa.card_name"),
    ]
    .into_iter()
    .flatten()
    .filter_map(|v| v.as_str())
    .map(str::trim)
    .find(|name| !name.is_empty() && !name.eq_ignore_ascii_case("(null)"))
    .unwrap_or(target)
}

struct Reader(std::process::ChildStdout);
impl FrameInput for Reader {
    fn read_frame(&mut self) -> Result<[f32; N], String> {
        let mut pcm = [0u8; N * 2];
        self.0
            .read_exact(&mut pcm)
            .map_err(|e| format!("Le flux PipeWire s’est interrompu : {e}"))?;
        Ok(std::array::from_fn(|i| {
            i16::from_le_bytes([pcm[2 * i], pcm[2 * i + 1]]) as f32 / 32768.0
        }))
    }
}
struct Control(Option<Child>);
impl StopCapture for Control {
    fn stop(&mut self) {
        if let Some(mut child) = self.0.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}
impl Drop for Control {
    fn drop(&mut self) {
        self.stop();
    }
}
pub fn open(source: &Source) -> Result<Capture, String> {
    let mut command = Command::new("pw-cat");
    command.args([
        "--record",
        "--raw",
        "--format",
        "s16",
        "--rate",
        "24000",
        "--channels",
        "1",
        "--latency",
        "10ms",
        "--target",
        &source.target,
    ]);
    if source.kind == "system" {
        command.args(["--properties", "{ stream.capture.sink = true }"]);
    }
    let child = command
        .arg("-")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Impossible d’ouvrir PipeWire : {e}"))?;
    let mut control = Control(Some(child));
    let input = control
        .0
        .as_mut()
        .and_then(|c| c.stdout.take())
        .ok_or("Le flux audio ne s’est pas ouvert.")?;
    Ok(Capture {
        input: Box::new(Reader(input)),
        control: Box::new(control),
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn headset_with_null_description_uses_hardware_name() {
        let values = serde_json::json!([
            {"name":"hdmi", "description":"(null)",
             "properties":{"node.nick":"HDMI Audio"}},
            {"name":"headset", "description":"(null)",
             "properties":{"node.nick":"HyperX Cloud Flight Wireless"}}
        ]);
        let sources = parse_sources(values.as_array().unwrap(), "system");
        assert_eq!(sources.len(), 2);
        assert_eq!(sources[0].name, "HDMI Audio");
        assert_eq!(sources[1].name, "HyperX Cloud Flight Wireless");
        assert_eq!(sources[1].id, "system:headset");
        assert_eq!(sources[1].target, "headset");
    }
    #[test]
    fn source_names_preserve_distinct_outputs_and_accents() {
        let values = serde_json::json!([
            {"name":"front", "description":"Casque Stéréo"},
            {"name":"speaker", "description": " ",
             "properties":{"node.nick":"(null)", "device.description":"Enceintes"}},
            {"name":"usb", "description":null,
             "properties":{"alsa.card_name":"USB Audio"}},
            {"name":"fallback", "description":"(NULL)"}
        ]);
        let sources = parse_sources(values.as_array().unwrap(), "system");
        assert_eq!(
            sources.iter().map(|s| s.name.as_str()).collect::<Vec<_>>(),
            ["Casque Stéréo", "Enceintes", "USB Audio", "fallback"]
        );
    }
    #[test]
    fn microphone_list_excludes_monitors() {
        let values =
            serde_json::json!([{"name":"output.monitor"},{"name":"mic","monitor_of_sink":null}]);
        let sources = parse_sources(values.as_array().unwrap(), "microphone");
        assert_eq!(sources.len(), 1);
        assert_eq!(sources[0].target, "mic");
    }
}
