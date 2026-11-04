# SPDX-License-Identifier: GPL-3.0-or-later
import base64
import importlib.util
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("akko_release", Path(__file__).with_name("release.py"))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name in ["app/package.json", "app/package-lock.json", "app/src-tauri/tauri.conf.json", "app/src-tauri/tauri.windows.conf.json", "app/src-tauri/tauri.fedora.conf.json", "app/src-tauri/Cargo.toml", "app/src-tauri/Cargo.lock", "app/src-web/Cargo.toml", "packaging/updater/public.key", ".github/release-notes.md"]:
            source = release.ROOT / name
            destination = self.root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)

    def artifacts(self):
        folder = self.root / "artifacts/release"
        folder.mkdir(parents=True)
        for platform in release.PLATFORMS:
            artifact = folder / release.artifact_name("0.12.4", platform)
            artifact.write_bytes(b"fixture")
            Path(str(artifact) + ".sig").write_text(base64.b64encode(b"untrusted comment: fixture\n").decode())
        return folder

    def test_newer_versions_on_every_run(self):
        self.assertEqual(release.numbered_version(1, self.root), "0.12.1")
        self.assertEqual(release.numbered_version(12, self.root), "0.12.12")
        with self.assertRaises(ValueError): release.numbered_version(0, self.root)
        with self.assertRaises(ValueError): release.version("0.12.1+build2")

    def test_builds_have_one_version_and_require_signed_bundles(self):
        release.prepare("0.12.4", "windows", self.root)
        self.assertEqual(release.validate(self.root), "0.12.4")
        lock = (self.root / "app/src-tauri/Cargo.lock").read_text()
        self.assertIn('name = "sharkfin"\nversion = "0.12.4"', lock)
        config = release.read_json(self.root / ".release/tauri-release.json")
        self.assertTrue(config["bundle"]["createUpdaterArtifacts"])
        self.assertEqual(config["bundle"]["windows"]["nsis"]["installMode"], "currentUser")

    def test_refuses_a_feed_for_another_repository(self):
        config = self.root / "app/src-tauri/tauri.conf.json"
        value = release.read_json(config)
        value["plugins"]["updater"]["endpoints"] = ["https://example.org/latest.json"]
        release.write_json(config, value)
        with self.assertRaises(ValueError): release.validate(self.root)

    def test_missing_platform_prevents_publication(self):
        folder = self.artifacts()
        (folder / release.artifact_name("0.12.4", "windows")).unlink()
        with self.assertRaises(ValueError): release.manifest("0.12.4", release.REPOSITORY, self.root)
        self.assertFalse((folder / "latest.json").exists())

    def test_missing_signature_prevents_publication(self):
        folder = self.artifacts()
        (folder / (release.artifact_name("0.12.4", "linux") + ".sig")).write_text("")
        with self.assertRaises(ValueError): release.manifest("0.12.4", release.REPOSITORY, self.root)

    def test_complete_feed_is_tied_to_versioned_urls(self):
        folder = self.artifacts()
        release.manifest("0.12.4", release.REPOSITORY, self.root)
        result = json.loads((folder / "latest.json").read_text())
        self.assertEqual(set(result["platforms"]), {"linux-x86_64", "windows-x86_64"})
        for platform in result["platforms"].values():
            self.assertIn("/kayzidev/open-akko/releases/download/v0.12.4/", platform["url"])
            self.assertTrue(platform["signature"])
        self.assertIn("latest.json", (folder / "SHA256SUMS.txt").read_text())

    def test_failed_signature_verification_never_contacts_github(self):
        self.artifacts()
        with patch.object(release.subprocess, "run", side_effect=ValueError("signature rejected")) as run:
            with self.assertRaises(ValueError): release.publish("0.12.4", release.REPOSITORY, "a" * 40, self.root)
            self.assertEqual(run.call_count, 1)
            self.assertEqual(run.call_args.args[0][0], "cargo")


if __name__ == "__main__":
    unittest.main()
