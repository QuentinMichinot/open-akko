// SPDX-FileCopyrightText: JR Lanteigne <root@dnim.dev>
// SPDX-FileCopyrightText: Shiroki Satsuki <me@shirok1.dev>
// SPDX-License-Identifier: GPL-3.0-or-later
mod audio;
mod commands;
pub mod derive;
pub mod dev;
pub mod hid;
pub mod ops;
mod permissions;
mod profiles;
pub mod protocol;
pub mod registry;
pub mod session;
mod updates;
pub mod wire;

use commands::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Two copies on one keyboard stall the endpoint. A second launch
        // raises the first window.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(w) = app.webview_windows().values().next() {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .manage(AppState::default())
        .manage(updates::UpdateState::default())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if state.update_active() {
                    api.prevent_close();
                } else {
                    state.stop_audio();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            updates::update_status,
            updates::update_check,
            updates::update_install,
            commands::scan,
            commands::audio_sources,
            commands::audio_start,
            commands::audio_status,
            commands::audio_stop,
            permissions::request_input_monitoring,
            permissions::open_input_monitoring_settings,
            permissions::reveal_current_app,
            commands::allow_unregistered,
            commands::apply_owner_record,
            commands::set_switch_trial,
            commands::get_switches,
            commands::travel_stream,
            commands::travel_read,
            commands::set_switch_key,
            commands::set_switch_keys,
            commands::set_switches_all,
            commands::get_switch_preset,
            commands::set_switch_preset,
            commands::set_switches_global,
            commands::read_keymap_layer,
            commands::set_key_layer,
            commands::build_id,
            commands::get_led_param,
            commands::set_led_param,
            commands::set_led_flags_swapped,
            commands::get_profile,
            commands::get_screen_version,
            commands::set_profile,
            commands::read_keymap,
            commands::read_fn_keymap,
            commands::set_key,
            commands::get_settings,
            commands::set_debounce,
            commands::set_sleep,
            commands::set_options,
            commands::set_side_light,
            commands::set_auto_os,
            commands::factory_reset,
            commands::set_clock,
            commands::write_per_key,
            commands::write_screen_image,
            commands::read_macro,
            commands::write_macro,
            commands::contribution_bundle,
            commands::export_config,
            commands::import_config,
            commands::raw_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod packaging_tests {
    fn merge(base: &mut serde_json::Value, overlay: serde_json::Value) {
        if let (Some(base), Some(overlay)) = (base.as_object_mut(), overlay.as_object()) {
            for (k, v) in overlay {
                merge(
                    base.entry(k.clone()).or_insert(serde_json::Value::Null),
                    v.clone(),
                );
            }
        } else {
            *base = overlay;
        }
    }
    #[test]
    fn platform_bundles_match_the_tauri_configuration_schema() {
        for (overlay, target) in [
            (include_str!("../tauri.windows.conf.json"), "nsis"),
            (include_str!("../tauri.fedora.conf.json"), "rpm"),
        ] {
            let mut value: serde_json::Value =
                serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
            merge(&mut value, serde_json::from_str(overlay).unwrap());
            assert!(value["bundle"]["targets"]
                .as_array()
                .unwrap()
                .iter()
                .any(|v| v == target));
            let parsed: tauri::Config = serde_json::from_value(value).unwrap();
            assert!(parsed.bundle.active);
        }
    }
}
