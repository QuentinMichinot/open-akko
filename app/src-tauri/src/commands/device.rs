// SPDX-FileCopyrightText: JR Lanteigne <root@dnim.dev>
// SPDX-License-Identifier: GPL-3.0-or-later
//! Device registry and build identification.

/// Returns the build identifier.
#[tauri::command(async)]
pub fn build_id() -> String {
    crate::registry::build_id()
}
