// SPDX-License-Identifier: GPL-3.0-or-later
import { DEFAULT_AUDIO, type AudioConfig, type AudioSource, type AudioTrack } from "./audio-backend";
export const AUDIO_STORAGE = "akko-audio-config-v2";
export function freshAudio(): AudioConfig { return structuredClone(DEFAULT_AUDIO); }
function readTrack(value: unknown, fallback: AudioTrack, kind: string): AudioTrack {
  if (!value || typeof value !== "object") return { ...fallback };
  const v = value as Record<string, unknown>;
  const number = (key: string, low: number, high: number, base: number) => typeof v[key] === "number" && Number.isFinite(v[key]) && (v[key] as number) >= low && (v[key] as number) <= high ? v[key] as number : base;
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : fallback.enabled,
    sourceId: typeof v.sourceId === "string" && v.sourceId.startsWith(`${kind}:`) ? v.sourceId : "",
    effect: kind === "microphone" ? "volume" : ["spectrum", "volume", "bass"].includes(String(v.effect)) ? v.effect as AudioTrack["effect"] : fallback.effect,
    gain: number("gain", 0.25, 8, fallback.gain), floorDb: number("floorDb", -80, -15, fallback.floorDb), releaseMs: number("releaseMs", 20, 1000, fallback.releaseMs),
  };
}
export function parseAudioPreferences(raw: string | null): AudioConfig {
  const base = freshAudio();
  try {
    const value = JSON.parse(raw || "null");
    if (!value || value.version !== 2 || !value.config) return base;
    const c = value.config;
    return {
      output: readTrack(c.output, base.output, "system"), microphone: readTrack(c.microphone, base.microphone, "microphone"),
      brightness: Number.isInteger(c.brightness) && c.brightness >= 0 && c.brightness <= 4 ? c.brightness : base.brightness,
      rainbow: typeof c.rainbow === "boolean" ? c.rainbow : base.rainbow,
      color: Array.isArray(c.color) && c.color.length === 3 && c.color.every((v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 255) ? c.color : base.color,
    };
  } catch { return base; }
}
export function assignAudioDefaults(config: AudioConfig, sources: AudioSource[]): AudioConfig {
  const choose = (track: AudioTrack, kind: AudioSource["kind"]) => ({ ...track, sourceId: sources.some(s => s.kind === kind && s.id === track.sourceId) ? track.sourceId : sources.find(s => s.kind === kind)?.id ?? "" });
  return { ...config, output: choose(config.output, "system"), microphone: choose(config.microphone, "microphone") };
}
