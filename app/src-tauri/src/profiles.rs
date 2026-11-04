// SPDX-License-Identifier: GPL-3.0-or-later
//! Model-specific additions. USB product IDs alone do not identify a board.
use crate::registry::DeviceSpec;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Evidence {
    pub kind: String,
    pub reference: String,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct AudioProfile {
    pub protocol: String,
    pub mode: u8,
    pub option: u8,
    pub columns: Vec<u8>,
    pub microphone_columns: Vec<u8>,
    pub microphone_keys: Vec<String>,
    pub evidence: Evidence,
}
impl AudioProfile {
    pub fn valid(&self) -> bool {
        let columns: std::collections::HashSet<_> = self.columns.iter().collect();
        let mic: std::collections::HashSet<_> = self.microphone_columns.iter().collect();
        self.protocol == "yc500-music32"
            && self.mode == 22
            && self.option == 0
            && (2..=32).contains(&self.columns.len())
            && columns.len() == self.columns.len()
            && self.columns.iter().all(|c| *c < 32)
            && !mic.is_empty()
            && mic.len() == self.microphone_columns.len()
            && mic.len() < columns.len()
            && mic.iter().all(|c| columns.contains(c))
            && !self.microphone_keys.is_empty()
            && matches!(self.evidence.kind.as_str(), "hardware" | "firmware")
            && !self.evidence.reference.trim().is_empty()
    }
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct KeyboardProfile {
    pub device_id: u32,
    pub vendor_id: u16,
    pub product_id: u16,
    pub family: String,
    pub model: String,
    pub unavailable_lighting_modes: Vec<u8>,
    pub full_macro_upload: bool,
    pub audio: Option<AudioProfile>,
    pub evidence: Evidence,
}
impl KeyboardProfile {
    fn valid(&self) -> bool {
        !self.model.trim().is_empty()
            && matches!(
                self.evidence.kind.as_str(),
                "hardware" | "firmware" | "registry"
            )
            && (!(self.full_macro_upload || !self.unavailable_lighting_modes.is_empty())
                || matches!(self.evidence.kind.as_str(), "hardware" | "firmware"))
            && !self.evidence.reference.trim().is_empty()
            && matches!(self.family.as_str(), "yc500" | "gen2")
            && self
                .audio
                .as_ref()
                .is_none_or(|a| self.family == "yc500" && a.valid())
    }
    fn matches(&self, spec: &DeviceSpec) -> bool {
        (
            self.device_id,
            self.vendor_id,
            self.product_id,
            self.family.as_str(),
        ) == (
            spec.id,
            spec.vendor_id,
            spec.product_id,
            spec.family.as_str(),
        )
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Catalog {
    #[serde(default, rename = "$schema")]
    _schema: Option<String>,
    version: u8,
    profiles: Vec<KeyboardProfile>,
}
fn parse(json: &str) -> Result<Vec<KeyboardProfile>, String> {
    let catalog: Catalog = serde_json::from_str(json).map_err(|e| e.to_string())?;
    if catalog.version != 1 {
        return Err("Unsupported keyboard profile version".into());
    }
    let mut ids = std::collections::HashSet::new();
    for p in &catalog.profiles {
        if !p.valid() || !ids.insert((p.device_id, p.vendor_id, p.product_id)) {
            return Err(format!(
                "Invalid or duplicate keyboard profile {}",
                p.device_id
            ));
        }
    }
    Ok(catalog.profiles)
}
pub fn for_spec(spec: &DeviceSpec) -> Option<&'static KeyboardProfile> {
    static PROFILES: OnceLock<Vec<KeyboardProfile>> = OnceLock::new();
    PROFILES
        .get_or_init(|| {
            parse(include_str!("../data/studio-profiles.json")).unwrap_or_else(|e| {
                log::error!("Keyboard profiles disabled: {e}");
                Vec::new()
            })
        })
        .iter()
        .find(|p| p.matches(spec))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_profile_matches_the_registered_identity() {
        for p in parse(include_str!("../data/studio-profiles.json")).unwrap() {
            let s = crate::registry::by_id(p.device_id).unwrap();
            assert!(p.matches(&s));
        }
    }
    #[test]
    fn equal_usb_ids_do_not_grant_the_same_audio_support() {
        let own = crate::registry::by_id(1165).unwrap();
        let sibling = crate::registry::by_id(1042).unwrap();
        assert_eq!(own.product_id, sibling.product_id);
        assert!(for_spec(&own).unwrap().audio.is_some());
        assert!(for_spec(&sibling).unwrap().audio.is_none());
    }
    #[test]
    fn unknown_family_and_wrong_usb_identity_are_refused() {
        let mut s = crate::registry::by_id(1165).unwrap().clone();
        s.family = "gen2".into();
        assert!(for_spec(&s).is_none());
        s.family = "yc500".into();
        s.product_id = 0x4011;
        assert!(for_spec(&s).is_none());
    }
    #[test]
    fn audio_geometry_rejects_overlaps_missing_zones_and_unknown_protocols() {
        let mut a = for_spec(&crate::registry::by_id(1165).unwrap())
            .unwrap()
            .audio
            .clone()
            .unwrap();
        assert!(a.valid());
        a.columns.push(16);
        assert!(!a.valid());
        a.columns.pop();
        a.microphone_columns = vec![31];
        assert!(!a.valid());
        a.microphone_columns = a.columns.clone();
        assert!(!a.valid());
        a.microphone_columns = vec![16];
        a.protocol = "gen2-guess".into();
        assert!(!a.valid());
    }
    #[test]
    fn future_or_malformed_catalogs_fail_closed() {
        assert!(parse("{\"version\":2,\"profiles\":[]}").is_err());
        assert!(parse("{}").is_err());
    }
}
