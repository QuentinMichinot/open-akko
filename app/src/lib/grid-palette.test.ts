import {it,expect} from 'vitest';
import {gridImage} from './grid-palette';
it('uses all selected colours in a complete RGB image without mixing channels',()=>{
 const image=gridImage(['#ff0000','#00ff00','#0000ff','#ffffff']);expect(image).toHaveLength(384);
 const colours=new Set(Array.from({length:128},(_,s)=>image.slice(s*3,s*3+3).join(',')));
 expect(colours).toEqual(new Set(['255,0,0','0,255,0','0,0,255','255,255,255']));
 expect(image.slice(0,3)).toEqual([255,0,0]);expect(image.slice(18,21)).toEqual([0,255,0]);
});
it('rejects invalid palettes before an upload can be attempted',()=>{
 for(const palette of [[],['#ff0000'],['red','#ffffff'],['#gg0000','#ffffff']])expect(()=>gridImage(palette)).toThrow();
});
