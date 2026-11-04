// SPDX-License-Identifier: GPL-3.0-or-later
import type { ConnectedDevice } from "./backend";
export interface StudioAudioProfile {
  protocol: string; mode: number; option: number; columns: number[]; microphoneColumns: number[]; microphoneKeys: string[];
  evidence: { kind: string; reference: string };
}
export interface StudioKeyboardProfile {
  deviceId: number; vendorId: number; productId: number; family: string; model: string;
  unavailableLightingModes: number[]; fullMacroUpload: boolean; audio: StudioAudioProfile | null;
  evidence: { kind: string; reference: string };
}
export function keyboardProfile(device: ConnectedDevice | null): StudioKeyboardProfile | null {
  const p = device?.profile;
  return device && p && p.deviceId === device.spec.id && p.deviceId === device.deviceId && p.vendorId === device.spec.vendorId && p.productId === device.spec.productId && p.family === device.spec.family ? p : null;
}
export function audioProfile(device: ConnectedDevice | null): StudioAudioProfile | null {
  if (!device || device.readOnly || device.link !== "usb") return null;
  const p = keyboardProfile(device), a = p?.audio;
  if (!p || p.family !== "yc500" || !a || a.protocol !== "yc500-music32" || a.mode !== 22 || a.option !== 0 || !["hardware", "firmware"].includes(a.evidence.kind) || !a.evidence.reference.trim()) return null;
  const columns = new Set(a.columns), microphone = new Set(a.microphoneColumns);
  return columns.size >= 2 && columns.size <= 32 && columns.size === a.columns.length && [...columns].every(c => Number.isInteger(c) && c >= 0 && c < 32) && microphone.size > 0 && microphone.size < columns.size && microphone.size === a.microphoneColumns.length && [...microphone].every(c => columns.has(c)) ? a : null;
}
export const isAudioSupported = (device: ConnectedDevice | null) => audioProfile(device) !== null;
export const unavailableEffect = (device: ConnectedDevice | null, mode: number) => keyboardProfile(device)?.unavailableLightingModes.includes(mode) ?? false;
