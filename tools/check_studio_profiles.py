#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-or-later
"""Check identity, evidence and audio geometry before adding a model profile."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def check():
    catalog = json.loads((ROOT / 'app/src-tauri/data/studio-profiles.json').read_text(encoding='utf-8'))
    registry = {d['id']: d for d in json.loads((ROOT / 'app/src-tauri/data/devices.json').read_text(encoding='utf-8'))}
    assert catalog['version'] == 1, 'Unsupported profile version'
    seen = set()
    for profile in catalog['profiles']:
        identity = tuple(profile[k] for k in ['deviceId', 'vendorId', 'productId'])
        assert identity not in seen, f'Duplicate identity: {identity}'
        seen.add(identity)
        device = registry[profile['deviceId']]
        assert [profile[k] for k in ['vendorId', 'productId', 'family']] == [device[k] for k in ['vendorId', 'productId', 'family']], f'Identity mismatch: {identity}'
        assert profile['model'].strip() and profile['evidence']['reference'].strip()
        if profile['fullMacroUpload'] or profile['unavailableLightingModes']:
            assert profile['evidence']['kind'] in ['hardware', 'firmware'], 'A registry entry does not prove a write quirk'
        audio = profile.get('audio')
        if audio:
            assert profile['family'] == 'yc500'
            assert audio['protocol'] == 'yc500-music32' and audio['mode'] == 22 and audio['option'] == 0
            assert audio['evidence']['kind'] in ['hardware', 'firmware'] and audio['evidence']['reference'].strip()
            columns, mic = audio['columns'], audio['microphoneColumns']
            assert 2 <= len(columns) <= 32 and len(set(columns)) == len(columns)
            assert all(type(c) is int and 0 <= c < 32 for c in columns)
            assert 0 < len(mic) < len(columns) and len(set(mic)) == len(mic) and set(mic) <= set(columns)
            assert audio['microphoneKeys']
    print(f'{len(seen)} model profiles checked; unknown audio protocols remain disabled')

if __name__ == '__main__':
    check()
