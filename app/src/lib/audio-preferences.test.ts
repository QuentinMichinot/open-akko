import { describe, expect, it } from "vitest";
import { assignAudioDefaults, freshAudio, parseAudioPreferences } from "./audio-preferences";
describe("dual audio preferences", () => {
  it("defaults to fast output analysis and an explicitly disabled microphone", () => { const c = freshAudio(); expect(c.output.enabled).toBe(true); expect(c.microphone.enabled).toBe(false); expect(c.output.releaseMs).toBeLessThan(100); });
  it("restores distinct sources and parameters", () => { const c = freshAudio(); c.output.sourceId = "system:speaker"; c.microphone.sourceId = "microphone:mic"; c.microphone.enabled = true; c.microphone.gain = 2; expect(parseAudioPreferences(JSON.stringify({ version: 2, config: c }))).toEqual(c); });
  it("rejects broken data and outdated single-source preferences", () => { for (const raw of ["{", "null", '{"version":1}']) expect(parseAudioPreferences(raw)).toEqual(freshAudio()); });
  it("cannot restore an output device as microphone", () => { const c = freshAudio(); c.microphone.sourceId = "system:speaker"; c.microphone.effect = "bass"; const read = parseAudioPreferences(JSON.stringify({ version: 2, config: c })); expect(read.microphone.sourceId).toBe(""); expect(read.microphone.effect).toBe("volume"); });
  it("rejects invalid numeric values", () => { const c = freshAudio(); c.output.gain = 200; c.microphone.releaseMs = -1; const read = parseAudioPreferences(JSON.stringify({ version: 2, config: c })); expect(read.output.gain).toBe(1); expect(read.microphone.releaseMs).toBe(90); });
  it("assigns the default device independently for each track", () => { const read = assignAudioDefaults(freshAudio(), [{ id: "system:out", name: "Speakers", kind: "system", target: "out" }, { id: "microphone:in", name: "Micro", kind: "microphone", target: "in" }]); expect(read.output.sourceId).toBe("system:out"); expect(read.microphone.sourceId).toBe("microphone:in"); expect(read.microphone.enabled).toBe(false); });
});
