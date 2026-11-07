# SAFE EXECUTION PLAN: Device 598 Read-Only Verification

**Date:** 2026-11-07  
**Purpose:** Hardware validation WITHOUT settings changes  
**Target:** Akko 5075B Plus USB 3151:4003 (device 598)  
**Platform:** Windows PC  

---

## Executive Summary

✅ **SAFE TO RUN:** Main app scan/connect + custom read-only diagnostic  
⚠️ **UNSAFE:** Existing roundtrip examples  
🔧 **CREATED:** Strict read-only diagnostic tool with explicit allowlist  

---

## I. Code Analysis: What Sends SET Commands?

### ✅ SAFE Operations (No Settings Changes)

#### Main App (`sharkfin.exe`)

**Startup/Scan Flow:**
```
scan() → discover() → Transport::open()
     → identify() [0x8F READ]
     → derive_sweep() [0x89,0x8A,0x91,0x92,0x97,0xAD READ]
     → read_revision() [0x80 READ, optionally 0x8F READ]
```

**Evidence:** Code inspection shows ZERO SET commands during scan/connect.

**File:** `app/src-tauri/src/commands/mod.rs` lines 278-373  
**Operations:**
- `Transport::open()` — opens HID interface (no I/O)
- `transport.identify()` — **0x8F GET** (wire.rs:245)
- `ops::derive_sweep()` — **all GET**: 0x89, 0x8A, 0x91, 0x92, 0x97, 0xAD (ops.rs:287)
- `ops::read_revision()` — **0x80 GET** + fallback **0x8F GET** for gen2 (ops.rs:247)

**Conclusion:** ✅ **App scan/connect is READ-ONLY**

#### Existing Safe Examples

1. **smoke.rs** ✅
   - Opcodes: 0x8F (identify), 0x87 (LED read), 0x85 (profile read)
   - Zero writes
   
2. **probe.rs** ✅
   - Opcodes: 0x8F, 0x84, 0x85, 0x87, 0x86, 0x83, 0x91, 0x80
   - All GET commands, tests family detection
   - Zero writes

### ⚠️ UNSAFE Operations (Settings Changes)

**DO NOT RUN these examples:**

1. **led_roundtrip.rs** ❌
   - Writes **0x07 SET_LEDPARAM**
   - Changes LED mode/brightness temporarily
   - Restores original, but writes nonetheless

2. **profile_probe.rs** ❌
   - Writes **0x04 SET_PROFILE**
   - Switches profiles (lands in flash)
   - May stall firmware

3. **key_roundtrip.rs** ❌
   - Writes key assignments

4. **macro_roundtrip.rs** ❌
   - Writes macro data

5. **gen2_roundtrip.rs** ❌
   - Writes gen2 settings

6. **restore_light.rs** ⚠️
   - Writes 0x07, meant for recovery
   - Only use if LED already broken

---

## II. Commit to Test

### Exact Commit

```
26f3480b72e84f4df09e74eac67fa201774cb38a
```

**Branch:** `cursor/4003-keyboard-interface-7184`  
**Message:** `fix: support 5075B Plus 598`  
**URL:** https://github.com/QuentinMichinot/open-akko/commit/26f3480b72e84f4df09e74eac67fa201774cb38a

**Verification:**
```bash
git log --oneline -1 26f3480b72e84f4df09e74eac67fa201774cb38a
# Output: 26f3480 fix: support 5075B Plus 598
```

**Why this commit:**
- Contains device 598 support code
- Includes interface selection logic
- Tested codebase (review passed)
- No corrections needed (code is correct)

---

## III. Safe Read Commands Allowlist

### HID Protocol: GET vs SET

**Distinction:**
- HID feature reports are **bidirectional** (host ↔ device)
- **GET** = host sends request opcode, device replies with data
- **SET** = host sends opcode + new settings, device acknowledges

**Both directions use feature reports, but:**
- GET commands: opcode in byte 0, device **echoes opcode** in reply[0]
- SET commands: opcode in byte 0, device may echo but **applies change**

**Safe = GET opcodes only**

### yc500 Family GET Commands (Allowlist)

| Opcode | Command | Description | Safe |
|--------|---------|-------------|------|
| 0x8F | IDENTIFY | Device ID | ✅ |
| 0x80 | GET_RF_VERSION | Firmware revision | ✅ |
| 0x85 | GET_PROFILE | Active profile | ✅ |
| 0x87 | GET_LEDPARAM | LED mode/brightness/color | ✅ |
| 0x86 | GET_DEBOUNCE | Debounce setting | ✅ |
| 0x83 | GET_REPORTRATE | Report rate setting | ✅ |
| 0x89 | GET_KEYMATRIX | Keymap page (yc500) | ✅ |
| 0x8B | GET_MACRO | Macro page | ✅ |
| 0x91 | GET_SLEEPTIME | Sleep timers | ✅ |
| 0x92 | GET_SLEEPTIME_BT | BT sleep timers (yc500) | ✅ |
| 0x97 | GET_KBOPTION | Keyboard options (yc500) | ✅ |
| 0xAD | OLED_VERSION | Display version | ✅ |

### yc500 Family SET Commands (FORBIDDEN)

| Opcode | Command | Description | Risk |
|--------|---------|-------------|------|
| 0x04 | SET_PROFILE | Switch profile | ⚠️ Flash write, may stall |
| 0x07 | SET_LEDPARAM | Change LED | ⚠️ Flash write |
| 0x08 | SET_SLEDPARAM | Change side LED | ⚠️ Flash write |
| 0x09 | SET_KBOPTION | Change options | ⚠️ Flash write |
| 0x0A | SET_KEYMATRIX | Remap key | ⚠️ Flash write |
| 0x0B | SET_MACRO | Change macro | ⚠️ Flash write |
| 0x0E | SET_DEBOUNCE | Change debounce | ⚠️ Flash write |
| 0x11 | SET_SLEEPTIME | Change sleep | ⚠️ Flash write |
| 0xFD | RESET | Reboot device | ⚠️ Disconnects |

**Stall Risk:** Repeated flash writes without MIN_WRITE_GAP (12ms) can wedge firmware until replug.

---

## IV. Safe Stopping Conditions

### Normal Operation

**Diagnostic tool auto-stops after:**
1. All interfaces enumerated
2. Device 598 identified (or not found)
3. Read sweep completed
4. Results printed

**No user intervention needed** — tool is finite and self-terminating.

### Error Conditions (Safe Stops)

| Condition | Action | Safe |
|-----------|--------|------|
| No devices found | Exit code 1, no I/O | ✅ |
| Interface open fails | Skip interface, continue | ✅ |
| Identify (0x8F) fails | Skip device, continue | ✅ |
| Any GET fails | Note failure, continue | ✅ |
| Device not 598 | Report mismatch, exit 0 | ✅ |

**No retries, no timeouts, no loops** — single pass through discovered devices.

### Manual Stop (Ctrl+C)

**Safe at any point:**
- Tool only reads
- No pending writes
- No state changes to undo

**Post-stop state:** Device unchanged from before tool ran.

---

## V. Safe Execution Plan (Windows)

### Prerequisites

1. **Environment:**
   - Windows 10/11
   - Akko 5075B Plus connected via USB
   - Rust toolchain installed (https://rustup.rs/)
   - Git client

2. **Checkout:**
   ```powershell
   git clone https://github.com/QuentinMichinot/open-akko.git
   cd open-akko
   git checkout cursor/review-5075b-plus-598-06d9
   git log --oneline -1
   # Verify: 14303da tools: read-only diagnostic 598
   ```

3. **Verify Commit Chain:**
   ```powershell
   git log --oneline -5
   # Should show:
   # 14303da tools: read-only diagnostic 598
   # 639139a docs: rapport final complet
   # 8007d41 docs: PR draft and summary
   # a651da9 docs: security review 598
   # 26f3480 fix: support 5075B Plus 598  ← THIS IS THE TESTED CODE
   ```

### Test Sequence

#### Step 1: Verify No Local Changes

```powershell
git status
# Expected: "nothing to commit, working tree clean"
```

**Critical:** Do NOT apply `hid.rs.patch` — it's redundant and untested.

#### Step 2: Build Read-Only Diagnostic

```powershell
cd app\src-tauri
cargo build --example device_598_readonly_check --release
```

**Expected:** Clean build, no errors.  
**If fails:** Note error, report back (likely missing Visual Studio Build Tools).

#### Step 3: Run Read-Only Diagnostic

```powershell
cargo run --example device_598_readonly_check --release
```

**What happens:**
1. Scans HID devices (no opens yet)
2. Lists all ROYUAN interfaces found
3. Filters for 3151:4003 (your device)
4. Opens each 3151:4003 interface:
   - Interface 0 (keyboard collection): should succeed
   - Interface 1 (vendor, no feature report): should fail open
5. On successful open:
   - Sends 0x8F (identify)
   - Checks if device 598
   - Runs yc500 read sweep (0x80, 0x85, 0x87, 0x89, 0x91, 0x97)
6. Prints results
7. Exits

**Expected Output Pattern:**
```
=== STRICTLY READ-ONLY Device 598 Diagnostic ===

Discovered 2 interface(s):
  [0] 3151:4003 usage=0x0106 Akko Multi-modes Keyboard-B | \\?\hid#...#mi_00#...
  [1] 3151:4003 usage=0x0001 Akko Multi-modes Keyboard-B | \\?\hid#...#mi_01#...

Found 2 interface(s) at 3151:4003:
  [0] usage=0x0106 \\?\hid#...#mi_00#...
  [1] usage=0x0001 \\?\hid#...#mi_01#...

--- Testing interface [0] ---
✓ Transport open succeeded
✓ Identify (0x8F): device_id = 598
✓ Registry lookup: akko 5075B Plus
  ★ THIS IS DEVICE 598 (Akko 5075B Plus) ★
  
  Testing yc500 READ commands:
  ✓ Revision (0x80): ...
  ✓ Profile (0x85): active = 0
  ✓ LED params (0x87): mode=X speed=Y brightness=Z
  ✓ Keymatrix page 0 (0x89): ... non-zero bytes
  ✓ Sleep times (0x91): read ok
  ✓ Keyboard options (0x97): read ok

--- Testing interface [1] ---
✗ Transport open FAILED: interface has no 64-byte settings report
  (Expected for interface 1 - no feature report)

=== Summary ===
✓✓✓ Device 598 (Akko 5075B Plus) DETECTED and WORKING ✓✓✓
```

**Success Indicators:**
- Device 598 identified on interface 0 ✅
- Interface 1 rejected (no feature report) ✅
- All yc500 reads succeeded ✅
- Family detected as yc500 ✅

**Failure Modes:**

| Symptom | Meaning | Action |
|---------|---------|--------|
| No devices found | USB not connected | Check cable, replug |
| Interface 0 open fails | Driver/permissions | Check Device Manager, grant access |
| Identify returns different ID | Wrong device variant | Report actual ID |
| Reads fail | Protocol mismatch | Report which opcodes failed |
| Interface 1 succeeds | Unexpected (ACR75 v2?) | Report device details |

#### Step 4: Optional — Existing Safe Examples

**Only if diagnostic succeeds.**

```powershell
# Smoke test (identify + read profile/LED)
cargo run --example smoke --release

# Protocol probe (tests family detection)
cargo run --example probe --release
```

**Both are read-only** (verified by code inspection).

#### Step 5: Optional — Main App Test

**Only if diagnostic succeeds.**

```powershell
cd ..\..
npm install
npm run tauri dev
```

**What happens:**
1. App opens
2. Detects device automatically (scan() runs on startup)
3. Shows device 598 in UI
4. **All automatic operations are read-only** (verified above)

**Test interaction:**
- Observe device detected
- Open "Device" tab (reads profile/settings)
- **DO NOT CLICK:**
  - "Save Profile"
  - "Upload Layout"
  - Any setting toggles (debounce, sleep, etc.)

**Exit app:** Close window (safe, no pending writes).

---

## VI. Tool Source Location

### Custom Diagnostic

**File:** `app/src-tauri/examples/device_598_readonly_check.rs`  
**Commit:** 14303da  
**Branch:** cursor/review-5075b-plus-598-06d9  
**URL:** https://github.com/QuentinMichinot/open-akko/blob/cursor/review-5075b-plus-598-06d9/app/src-tauri/examples/device_598_readonly_check.rs

**Allowlist enforcement:** Lines 15-22 document exact GET opcodes used.

### Existing Safe Examples

**Directory:** `app/src-tauri/examples/`

**Safe:**
- `smoke.rs` (commit 26f3480, upstream)
- `probe.rs` (commit 26f3480, upstream)

**Unsafe (do not run):**
- `led_roundtrip.rs`
- `profile_probe.rs`
- `key_roundtrip.rs`
- `macro_roundtrip.rs`
- `gen2_roundtrip.rs`
- `restore_light.rs`

---

## VII. Validation Checklist

### After Running Diagnostic

Mark completed:

**Detection:**
- ⬜ Tool found device at 3151:4003
- ⬜ Interface 0 (usage 0x0106) opened successfully
- ⬜ Interface 1 (usage 0x0001) rejected as expected
- ⬜ Device identified as ID 598
- ⬜ Registry entry: "akko 5075B Plus"

**Family:**
- ⬜ Family detected as "yc500"
- ⬜ USB ID: 3151:4003 confirmed

**Reads:**
- ⬜ Revision (0x80): succeeded
- ⬜ Profile (0x85): succeeded
- ⬜ LED params (0x87): succeeded
- ⬜ Keymatrix (0x89): succeeded
- ⬜ Sleep times (0x91): succeeded
- ⬜ Keyboard options (0x97): succeeded

**Safety:**
- ⬜ Zero settings changed (LED still same, profile unchanged)
- ⬜ Device still responsive after tool exits
- ⬜ No firmware stall (keyboard types normally)

**Exit Code:**
- ⬜ Tool exited with code 0 (success)

---

## VIII. What NOT To Do

### ❌ Do Not

1. **Apply hid.rs.patch**
   - Redundant with fork code
   - Not tested in this configuration
   - May cause conflicts

2. **Run roundtrip examples**
   - They write settings (SET commands)
   - Not needed for detection validation
   - Save for phase 2 (write validation)

3. **Use probe_all.rs from upload**
   - Unvetted source
   - Custom diagnostic is safer (explicit allowlist)

4. **Click settings in app UI**
   - Reads are automatic and safe
   - Writes require explicit click
   - Just observe, don't interact

5. **Force operations on failure**
   - If interface doesn't open, it's correct behavior (no feature report)
   - If reads fail, stop and report

---

## IX. Reporting Results

### Success Report Template

```
✅ Device 598 Read-Only Validation: PASS

Hardware: Akko 5075B Plus USB 3151:4003
OS: Windows 11 [version]
Branch: cursor/review-5075b-plus-598-06d9
Commit: 14303da (contains 26f3480)

Detection:
✓ Interface 0 (0x0106): opened, device 598 identified
✓ Interface 1 (0x0001): rejected (no feature report)
✓ Family: yc500

Read Sweep:
✓ All yc500 GET commands succeeded
✓ Revision: [value]
✓ Profile: [0-2]
✓ LED: mode=[X] brightness=[Y]

Safety:
✓ Zero settings changed
✓ Device responsive after test
✓ No firmware stall

Conclusion: Interface selection works correctly.
Ready for phase 2 (write validation).
```

### Failure Report Template

```
⚠️ Device 598 Read-Only Validation: ISSUES

Hardware: [device details]
OS: Windows [version]
Branch: cursor/review-5075b-plus-598-06d9

Issue: [describe problem]

Diagnostic output:
[paste full tool output]

Error observed at: [which step]

Device state after: [responsive/stalled/disconnected]

Questions:
- Did different device ID appear?
- Which reads succeeded/failed?
- Any firmware stall (keyboard unresponsive)?
```

---

## X. Safety Guarantees

### What This Plan Ensures

✅ **Zero settings changes**
- No SET commands in scan/connect flow
- No SET commands in diagnostic tool
- Explicit GET-only allowlist

✅ **No firmware risk**
- No flash writes
- No profile switches
- No resets/bootloader

✅ **Reversible at any point**
- Ctrl+C safe anytime
- No pending writes to undo
- Device unchanged

✅ **Reproducible**
- Exact commit specified
- Exact tool source linked
- Exact commands documented

### What This Does NOT Test

⚠️ **Not tested yet:**
- Write operations (SET commands)
- Round-trip verification (set → get)
- Firmware stall under write load
- ACR75 v2 non-regression (different device needed)

**These require separate phase 2 validation** with:
- Careful write testing (noted originals first)
- Explicit restore operations
- Stall monitoring

---

## XI. Next Steps After Read-Only Validation

### If Diagnostic Passes

1. ✅ Mark read-only checklist complete (section VII)
2. ✅ Report success (section IX template)
3. ⏭️ Proceed to phase 2: write validation
   - Use roundtrip examples carefully
   - Note original values first
   - Test SET + GET + restore
   - Monitor for stalls

### If Diagnostic Fails

1. ⚠️ Report failure with full output (section IX template)
2. 🔍 Analyze which step failed
3. 🛑 DO NOT proceed to writes
4. 💬 Discuss findings before next attempt

---

## XII. Summary

**Commit to test:** `26f3480b72e84f4df09e74eac67fa201774cb38a`  
**Branch:** `cursor/review-5075b-plus-598-06d9`  
**Tool:** `app/src-tauri/examples/device_598_readonly_check.rs`  
**Tool URL:** https://github.com/QuentinMichinot/open-akko/blob/cursor/review-5075b-plus-598-06d9/app/src-tauri/examples/device_598_readonly_check.rs

**Safe operations:**
- Main app scan/connect: ✅ READ-ONLY
- smoke.rs: ✅ READ-ONLY
- probe.rs: ✅ READ-ONLY
- device_598_readonly_check.rs: ✅ READ-ONLY (explicit allowlist)

**Unsafe operations (do not run):**
- led_roundtrip.rs: ❌ WRITES
- profile_probe.rs: ❌ WRITES
- *_roundtrip.rs: ❌ WRITES

**Execution:** Single command, self-terminating, safe Ctrl+C.  
**Validation:** Checklist in section VII.  
**Reporting:** Templates in section IX.

**This plan guarantees zero settings changes.**
