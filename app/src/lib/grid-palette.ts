// SPDX-License-Identifier: GPL-3.0-or-later
export function gridImage(palette:string[]):number[]{
 if(palette.length<2||palette.length>8||palette.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))throw new Error('Choisissez entre 2 et 8 couleurs RGB valides.');
 const rgb=palette.map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
 return Array.from({length:128},(_,slot)=>rgb[(Math.floor(slot/6)+slot%6)%rgb.length]).flat();
}
