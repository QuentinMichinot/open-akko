import {describe,it,expect} from 'vitest';
import {REACTIVE_PRESETS,reactiveParams,matchesReactive} from './reactive-presets';
import type {LedParam} from './backend';
const before:LedParam={mode:4,option:3,speed:0,brightness:0,dazzle:true,r:5,g:6,b:7};
describe('reactive native presets',()=>{
 it('replaces an animated or dark setting with a valid native reactive configuration',()=>{
  for(const p of REACTIVE_PRESETS){
   const result=reactiveParams(before,p);expect(result.mode).toBe(p.mode);expect(result.option).toBe(0);
   expect(result.brightness).toBeGreaterThan(0);expect(result.brightness).toBeLessThanOrEqual(4);
   expect(result.speed).toBeGreaterThanOrEqual(0);expect(result.speed).toBeLessThanOrEqual(4);
   expect(matchesReactive(result,p)).toBe(true);
   expect(matchesReactive({...result,mode:1},p)).toBe(false);
   expect(matchesReactive({...result,brightness:0},p)).toBe(false);
  }
  expect(before).toEqual({mode:4,option:3,speed:0,brightness:0,dazzle:true,r:5,g:6,b:7});
 });
 it('distinguishes fixed colours and automatic colour mode',()=>{
  const red=REACTIVE_PRESETS.find(p=>p.id==='red')!,rainbow=REACTIVE_PRESETS.find(p=>p.id==='rainbow')!;
  const params=reactiveParams(before,red);expect([params.r,params.g,params.b]).toEqual([255,0,0]);expect(params.dazzle).toBe(false);
  expect(matchesReactive({...params,b:50},red)).toBe(false);
  const auto=reactiveParams(before,rainbow);expect(auto.dazzle).toBe(true);expect(matchesReactive({...auto,r:10,g:50,b:80},rainbow)).toBe(true);
 });
});
