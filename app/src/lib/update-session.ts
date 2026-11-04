// SPDX-License-Identifier: GPL-3.0-or-later
export interface UpdateInfo { version: string; notes: string }
export interface UpdateStatus { currentVersion: string; installKind: "windows" | "appimage" | "manual"; releasesUrl: string; available: UpdateInfo | null }
export interface UpdateProgress { phase: "download" | "install"; downloaded: number; total: number | null }
export interface UpdateApi {
  status(): Promise<UpdateStatus>;
  check(): Promise<UpdateInfo | null>;
  install(progress: (value: UpdateProgress) => void): Promise<void>;
  openReleases(url: string): Promise<void>;
}
export interface UpdateSnapshot extends UpdateStatus {
  phase: "idle" | "checking" | "available" | "downloading" | "installing";
  open: boolean; error: string | null; checked: boolean; progress: UpdateProgress | null;
}
export const INITIAL_UPDATE: UpdateSnapshot = { currentVersion: "", installKind: "manual", releasesUrl: "", available: null, phase: "idle", open: false, error: null, checked: false, progress: null };
export const REMINDER_KEY = "akko-update-reminder-v1";
const DAY = 24 * 60 * 60 * 1000;
export class UpdateSession {
  value: UpdateSnapshot = { ...INITIAL_UPDATE };
  private busy = false;
  constructor(private api: UpdateApi, private notify: (value: UpdateSnapshot) => void, private storage?: Pick<Storage, "getItem" | "setItem">, private now = () => Date.now()) {}
  private patch(value: Partial<UpdateSnapshot>) { this.value = { ...this.value, ...value }; this.notify(this.value); }
  async initialize() { try { this.patch(await this.api.status()); } catch (e) { this.patch({ error: String(e) }); } }
  private snoozed(version: string) {
    try { const reminder = JSON.parse(this.storage?.getItem(REMINDER_KEY) || "null"); return reminder?.version === version && typeof reminder.until === "number" && reminder.until > this.now(); } catch { return false; }
  }
  async check(manual = false) {
    if (this.busy) return;
    this.busy = true; this.patch({ phase: "checking", error: null });
    try {
      const available = await this.api.check();
      this.patch({ available, checked: true, phase: available ? "available" : "idle", open: manual || (!!available && !this.snoozed(available.version)) });
    } catch (e) { this.patch({ error: String(e), phase: this.value.available ? "available" : "idle", open: manual || this.value.open }); }
    finally { this.busy = false; }
  }
  dismiss() {
    if (this.busy) return;
    if (this.value.available) {
      try { this.storage?.setItem(REMINDER_KEY, JSON.stringify({ version: this.value.available.version, until: this.now() + DAY })); } catch { /* Storage is optional. */ }
    }
    this.patch({ open: false });
  }
  show() { this.patch({ open: true }); }
  async install() {
    if (this.busy || !this.value.available) return;
    this.busy = true; this.patch({ error: null });
    try {
      if (this.value.installKind === "manual") { await this.api.openReleases(this.value.releasesUrl); return; }
      this.patch({ phase: "downloading", progress: null });
      await this.api.install(progress => this.patch({ progress, phase: progress.phase === "install" ? "installing" : "downloading" }));
      this.patch({ phase: "installing" });
    } catch (e) { this.patch({ phase: "available", error: String(e), open: true, progress: null }); }
    finally { this.busy = false; }
  }
}
