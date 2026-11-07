# PR Title

```
fix: support 5075B Plus 598
```

# PR Body

## Summary

Adds support for Akko 5075B Plus (device 598) at USB 3151:4003 interface 0. This device uses the same keyboard collection interface layout as the Akko 3098B (device 69).

## Device Details

- **USB ID:** 3151:4003
- **USB Revision:** 0301
- **Product String:** Akko Multi-modes Keyboard-B
- **Label:** Akko 5075B Plus
- **Interface:** Interface 0, keyboard collection (usage page 0x01, usage 0x06)
- **Protocol Family:** yc500
- **Device ID:** 598

## Evidence

- Identify (0x8F) succeeded on interface 0 **[HW]**
- Connect sweep answered as yc500 **[HW]**
- Interface 1 has vendor collection (0xFFFF:1) with no 64-byte feature report **[HW]**

## Changes

### Core Implementation

Refactored HID interface selection to handle USB IDs shared across multiple device variants:

1. **Introduced `shared_settings_id()`** to identify 3151:4002 and 3151:4003 devices that share settings across interfaces
2. **Added `board_group()`** to group multiple interfaces of the same physical device (Windows instance ID, USB serial, or fallback)
3. **Added interface selection logic** via `keep_shared_node()` that:
   - Rejects interfaces with no 64-byte settings report
   - Prefers vendor collections over keyboard collections when both have settings reports
   - Keeps keyboard collection when vendor collection lacks the report

### Stall Prevention

Modified `commands/mod.rs` to use `board_present()` (list-only check) instead of `discover()` (opens interfaces) when checking for device presence during stall state. Reduces unnecessary interface traffic.

### Device Registry

- Added device 598 to `devices.json` and `devices.extra.json`
- Registered as yc500 family with standard feature flags
- Updated `BOARDS.md` via automated generation
- Documented interface layout in `PROTOCOL.md`

### Test Coverage

- Added unit tests for 0x4003 interface detection
- Added tests for shared-interface selection logic
- Added WebHID tests for 0x4003 keyboard collection validation
- Added registry test confirming device 598 metadata

## Devices Preserved

This USB ID (3151:4003) is shared with:

- **Device 606 (ACR75 v2):** Uses vendor collection → preserved by interface preference logic
- **Device 1280 (3098B Plus):** Already supported
- **Device 1528 (5075B Plus-S):** Already supported
- **Device 2950 (3084BP-ISO-DE):** Already supported

Interface selection tests cover multi-interface scenarios to prevent regressions.

## Testing

### Automated (Linux CI)
- ✅ TypeScript checks pass
- ✅ Vitest passes (753 tests)
- ✅ Cargo fmt passes
- ✅ Unit tests added for 0x4003 logic

### Hardware Validation Required
- ⬜ Write operations round-tripped on physical device 598
- ⬜ Device 606 (ACR75 v2) verified unaffected, if available

## Notes

- **Interface 1** (vendor 0xFFFF:1) carries input report ID 5 only (no feature report) and is correctly ignored
- Settings **writes have not been round-tripped** on this device variant; marked writable based on yc500 family membership
- The vendor collection preference ensures ACR75 v2 (device 606, same USB ID) continues using its vendor interface

## Related

- Builds on existing 3151:4002 support (device 69, Akko 3098B)
- Shares interface-selection architecture with Apple 05ac:024f special case (device 1033)
