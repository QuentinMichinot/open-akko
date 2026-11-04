import {it,expect} from 'vitest';
import {STYLE_PRESETS} from './style-presets';
it('restricts themes to known main effects and independent supported side modes',()=>{
 for(const s of STYLE_PRESETS){
  expect([4,5,6,8,14]).toContain(s.main.mode);expect(s.side.mode).toBeGreaterThanOrEqual(0);expect(s.side.mode).toBeLessThanOrEqual(5);
  for(const p of [s.main,s.side]){expect(p.speed).toBeGreaterThanOrEqual(0);expect(p.speed).toBeLessThanOrEqual(4);expect(p.brightness).toBeGreaterThanOrEqual(0);expect(p.brightness).toBeLessThanOrEqual(4);expect(p.option).toBe(0);}
 }
 expect(STYLE_PRESETS.find(p=>p.id==='quiet')!.side.brightness).toBe(0);
});
