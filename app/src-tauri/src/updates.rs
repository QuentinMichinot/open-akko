// SPDX-License-Identifier: GPL-3.0-or-later
//! Only signed release artifacts are installed. Checking never writes to a keyboard.
use parking_lot::Mutex;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{ipc::Channel, AppHandle, Manager, State};
use tauri_plugin_updater::{Update, UpdaterExt};

const RELEASES: &str = "https://github.com/kayzidev/open-akko/releases/latest";

#[derive(Default)]
pub struct UpdateState {
    pending: Mutex<Option<Update>>,
    busy: AtomicBool,
}

struct Operation<'a>(&'a AtomicBool);
impl<'a> Operation<'a> {
    fn start(busy: &'a AtomicBool) -> Result<Self, String> {
        busy.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .map_err(|_| "Une opération de mise à jour est déjà en cours.")?;
        Ok(Self(busy))
    }
}
impl Drop for Operation<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    notes: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    current_version: String,
    install_kind: &'static str,
    releases_url: &'static str,
    available: Option<UpdateInfo>,
}

fn metadata(update: &Update) -> UpdateInfo {
    UpdateInfo {
        version: update.version.clone(),
        notes: update.body.clone().unwrap_or_default(),
    }
}

fn install_kind(_app: &AppHandle) -> &'static str {
    #[cfg(target_os = "windows")]
    {
        match tauri::utils::platform::bundle_type() {
            Some(
                tauri::utils::config::BundleType::Nsis | tauri::utils::config::BundleType::Msi,
            ) => "windows",
            _ => "manual",
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        #[cfg(target_os = "linux")]
        if _app.env().appimage.is_some() {
            return "appimage";
        }
        // Unmanaged executables and package-managed files need an explicit first install.
        "manual"
    }
}

#[tauri::command]
pub fn update_status(app: AppHandle, state: State<UpdateState>) -> UpdateStatus {
    UpdateStatus {
        current_version: app.package_info().version.to_string(),
        install_kind: install_kind(&app),
        releases_url: RELEASES,
        available: state.pending.lock().as_ref().map(metadata),
    }
}

#[tauri::command]
pub async fn update_check(
    app: AppHandle,
    state: State<'_, UpdateState>,
) -> Result<Option<UpdateInfo>, String> {
    let _operation = Operation::start(&state.busy)?;
    let updater = app
        .updater_builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let update = match updater.check().await {
        Ok(update) => update,
        Err(tauri_plugin_updater::Error::ReleaseNotFound) => {
            return Err("Aucune version publiée n’est disponible pour le moment.".into());
        }
        Err(e) => return Err(format!("Impossible de vérifier les mises à jour : {e}")),
    };
    let info = update.as_ref().map(metadata);
    *state.pending.lock() = update;
    Ok(info)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgress {
    phase: &'static str,
    downloaded: u64,
    total: Option<u64>,
}

#[tauri::command]
pub async fn update_install(
    app: AppHandle,
    state: State<'_, UpdateState>,
    on_progress: Channel<UpdateProgress>,
) -> Result<(), String> {
    let _operation = Operation::start(&state.busy)?;
    if install_kind(&app) == "manual" {
        return Err(
            "Installez d’abord la version .exe ou AppImage pour utiliser la mise à jour intégrée."
                .into(),
        );
    }
    let mut update = state
        .pending
        .lock()
        .clone()
        .ok_or("Vérifiez d’abord si une mise à jour est disponible.")?;
    let _ = on_progress.send(UpdateProgress {
        phase: "download",
        downloaded: 0,
        total: None,
    });
    update.timeout = Some(Duration::from_secs(15 * 60));
    let mut downloaded = 0;
    // download() verifies the signature before returning any installable bytes.
    let bytes = update
        .download(
            |chunk, total| {
                downloaded += chunk as u64;
                let _ = on_progress.send(UpdateProgress {
                    phase: "download",
                    downloaded,
                    total,
                });
            },
            || {},
        )
        .await
        .map_err(|e| format!("Mise à jour non installée : {e}"))?;
    let _ = on_progress.send(UpdateProgress {
        phase: "install",
        downloaded: bytes.len() as u64,
        total: Some(bytes.len() as u64),
    });
    // Wait for in-flight USB operations and restore lighting before the Windows
    // installer exits this process, or before the AppImage is replaced.
    tauri::async_runtime::spawn_blocking(move || {
        let keyboard = app.state::<crate::commands::AppState>();
        keyboard.prepare_update()?;
        if let Err(e) = update.install(bytes) {
            keyboard.resume_after_failed_update();
            return Err(format!("Installation impossible : {e}"));
        }
        #[cfg(not(target_os = "windows"))]
        app.restart();
        #[cfg(target_os = "windows")]
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn operations_cannot_overlap_and_failures_release_the_lock() {
        let busy = AtomicBool::new(false);
        {
            let _operation = Operation::start(&busy).unwrap();
            assert!(Operation::start(&busy).is_err());
        }
        assert!(Operation::start(&busy).is_ok());
    }
    #[test]
    fn update_preparation_quiesces_and_can_resume_without_a_keyboard() {
        let keyboard = crate::commands::AppState::default();
        keyboard.prepare_update().unwrap();
        assert!(keyboard.update_active());
        keyboard.resume_after_failed_update();
        assert!(!keyboard.update_active());
    }
    #[test]
    fn channel_is_the_open_akko_release_feed() {
        let config: serde_json::Value =
            serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
        assert_eq!(
            config["plugins"]["updater"]["endpoints"][0],
            format!("{RELEASES}/download/latest.json")
        );
        assert!(!config["plugins"]["updater"]["pubkey"]
            .as_str()
            .unwrap()
            .is_empty());
        assert_ne!(config["plugins"]["updater"]["allowDowngrades"], true);
        assert_ne!(
            config["plugins"]["updater"]["dangerousInsecureTransportProtocol"],
            true
        );
    }
}
