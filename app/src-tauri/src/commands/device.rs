// SPDX-FileCopyrightText: JR Lanteigne <root@dnim.dev>
// SPDX-License-Identifier: GPL-3.0-or-later
//! Device identification and registry-related commands.

/// Returns the build identifier.
#[tauri::command(async)]
pub fn build_id() -> String {
    crate::registry::build_id()
}
