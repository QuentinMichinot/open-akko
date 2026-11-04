// SPDX-License-Identifier: GPL-3.0-or-later
//! Bounded conversion from device-rate mono samples into 24 kHz DSP frames.
use super::N;
pub struct Converter {
    ratio: f64,
    remaining: f64,
    sum: f64,
    frame: [f32; N],
    used: usize,
}
impl Converter {
    pub fn new(rate: u32) -> Result<Self, String> {
        if !(8000..=384000).contains(&rate) {
            return Err("Fréquence audio du périphérique non prise en charge.".into());
        }
        let ratio = f64::from(rate) / 24000.0;
        Ok(Self {
            ratio,
            remaining: ratio,
            sum: 0.0,
            frame: [0.0; N],
            used: 0,
        })
    }
    pub fn push(&mut self, sample: f32, emit: &mut impl FnMut([f32; N])) {
        let sample = if sample.is_finite() {
            sample.clamp(-1.0, 1.0)
        } else {
            0.0
        };
        let mut available: f64 = 1.0;
        while available > 1e-9 {
            let weight = available.min(self.remaining);
            self.sum += f64::from(sample) * weight;
            self.remaining -= weight;
            available -= weight;
            if self.remaining < 1e-9 {
                self.frame[self.used] = (self.sum / self.ratio) as f32;
                self.used += 1;
                self.sum = 0.0;
                self.remaining = self.ratio;
                if self.used == N {
                    emit(self.frame);
                    self.used = 0;
                }
            }
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn resampling_produces_a_fixed_rate_for_common_devices() {
        for rate in [16000, 24000, 44100, 48000, 96000] {
            let mut c = Converter::new(rate).unwrap();
            let mut count = 0;
            for _ in 0..rate {
                c.push(0.25, &mut |frame| {
                    count += frame.len();
                    assert!(frame.iter().all(|v| (*v - 0.25).abs() < 0.001));
                });
            }
            assert_eq!(count, 24000 / N * N);
        }
    }
    #[test]
    fn invalid_and_out_of_range_samples_are_bounded() {
        let mut c = Converter::new(24000).unwrap();
        let mut output = None;
        for i in 0..N {
            c.push(if i % 2 == 0 { f32::NAN } else { 8.0 }, &mut |frame| {
                output = Some(frame)
            });
        }
        assert!(output
            .unwrap()
            .iter()
            .all(|x| x.is_finite() && (0.0..=1.0).contains(x)));
    }
    #[test]
    fn invalid_rates_are_refused() {
        assert!(Converter::new(0).is_err());
        assert!(Converter::new(1_000_000).is_err());
    }
}
