import { describe, expect, it } from "vitest";
import catalog from "../../src-tauri/data/studio-profiles.json";
import type { ConnectedDevice } from "./backend";
import { audioProfile, isAudioSupported, keyboardProfile, unavailableEffect, type StudioKeyboardProfile } from "./keyboard-profile";
function device(id = 1165): ConnectedDevice {
  const profile = catalog.profiles.find(p => p.deviceId === id)! as StudioKeyboardProfile;
  return { profile, deviceId: id, path: "test", readOnly: false, link: "usb", spec: { id, vendorId: profile.vendorId, productId: profile.productId, family: profile.family } } as ConnectedDevice;
}
describe("per-model keyboard capabilities", () => {
  it("reads the verified microphone geometry from the model data", () => { expect(audioProfile(device())?.microphoneColumns).toEqual([16]); });
  it("does not grant a sibling model audio access because USB IDs match", () => { const a = device(), b = device(1042); expect(a.spec.productId).toBe(b.spec.productId); expect(isAudioSupported(b)).toBe(false); });
  it("refuses mismatched identities and unknown families", () => { const d = device(); d.spec.family = "gen2"; expect(keyboardProfile(d)).toBeNull(); expect(isAudioSupported(d)).toBe(false); });
  it("requires the cable and writable access", () => { const d = device(); d.link = "receiver"; expect(isAudioSupported(d)).toBe(false); d.link = "usb"; d.readOnly = true; expect(isAudioSupported(d)).toBe(false); });
  it("keeps lighting quirks local to their model", () => { expect(unavailableEffect(device(), 19)).toBe(true); expect(unavailableEffect(device(1042), 19)).toBe(false); });
});
