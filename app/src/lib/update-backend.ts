// SPDX-License-Identifier: GPL-3.0-or-later
import { Channel, invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { UpdateApi, UpdateProgress } from "./update-session";
export const updateApi: UpdateApi = {
  status: () => invoke("update_status"),
  check: () => invoke("update_check"),
  install: async notify => { const onProgress = new Channel<UpdateProgress>(); onProgress.onmessage = notify; await invoke("update_install", { onProgress }); },
  openReleases: url => openUrl(url),
};
