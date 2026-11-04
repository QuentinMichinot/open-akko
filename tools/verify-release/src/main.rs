// SPDX-License-Identifier: GPL-3.0-or-later
use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};
use std::{error::Error, fs};

fn decode(path: &str) -> Result<String, Box<dyn Error>> {
    Ok(String::from_utf8(
        STANDARD.decode(fs::read_to_string(path)?.trim())?,
    )?)
}
fn main() -> Result<(), Box<dyn Error>> {
    let mut args = std::env::args().skip(1);
    let key_path = args
        .next()
        .ok_or("Expected public.key and release artifacts")?;
    let key = PublicKey::decode(&decode(&key_path)?)?;
    let artifacts: Vec<_> = args.collect();
    if artifacts.is_empty() {
        return Err("No release artifacts supplied".into());
    }
    for artifact in artifacts {
        let signature = Signature::decode(&decode(&format!("{artifact}.sig"))?)?;
        key.verify(&fs::read(&artifact)?, &signature, true)?;
        println!("Signature verified: {artifact}");
    }
    Ok(())
}
