// SPDX-License-Identifier: GPL-3.0-or-later
import { invoke } from "@tauri-apps/api/core";
import { BUILD } from "@/lib/backend";
export interface AudioSource { id: string; name: string; kind: "system" | "microphone"; target: string }
export interface AudioTrack { enabled: boolean; sourceId: string; effect: "spectrum" | "volume" | "bass"; gain: number; floorDb: number; releaseMs: number }
export interface AudioConfig { output: AudioTrack; microphone: AudioTrack; brightness: number; rainbow: boolean; color: [number, number, number] }
export interface AudioMeter { active: boolean; ready: boolean; level: number; frames: number; error: string | null }
export interface AudioStatus { running: boolean; bands: number[]; output: AudioMeter; microphone: AudioMeter; frames: number; error: string | null; config: AudioConfig | null }
const meter: AudioMeter = { active: false, ready: false, level: 0, frames: 0, error: null };
export const EMPTY_AUDIO: AudioStatus = { running: false, bands: Array(32).fill(0), output: { ...meter }, microphone: { ...meter }, frames: 0, error: null, config: null };
export const DEFAULT_AUDIO: AudioConfig = {
  output: { enabled: true, sourceId: "", effect: "spectrum", gain: 1, floorDb: -55, releaseMs: 70 },
  microphone: { enabled: false, sourceId: "", effect: "volume", gain: 1, floorDb: -45, releaseMs: 90 },
  brightness: 3, rainbow: true, color: [0, 200, 255],
};
export const audioSources = () => BUILD === "app" ? invoke<AudioSource[]>("audio_sources") : Promise.resolve([]);
export const audioStatus = () => invoke<AudioStatus>("audio_status");
export const audioStart = (config: AudioConfig) => invoke<void>("audio_start", { config });
export const audioStop = () => invoke<AudioStatus>("audio_stop");
