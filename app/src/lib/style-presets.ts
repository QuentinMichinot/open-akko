// SPDX-License-Identifier: GPL-3.0-or-later
import type {LedParam,SledParam} from './backend';
const light=(mode:number,color:[number,number,number],speed=2,brightness=4):LedParam=>({mode,speed,brightness,option:0,dazzle:false,r:color[0],g:color[1],b:color[2]});
export const STYLE_PRESETS:{id:string;name:string;description:string;main:LedParam;side:SledParam}[]=[
 {id:'cyberpunk',name:'Cyberpunk',description:'Vague violette et bandes cyan.',main:light(4,[190,20,255],3),side:light(1,[0,220,255],2,3)},
 {id:'glacier',name:'Glacier',description:'Rayonnement bleu à la frappe, bandes bleu glacier.',main:light(14,[30,100,255],2,3),side:light(2,[30,180,255],1,2)},
 {id:'embers',name:'Braises',description:'Étoiles ambrées et respiration orange.',main:light(6,[255,95,15],1,3),side:light(2,[255,55,5],1,2)},
 {id:'synthwave',name:'Synthwave',description:'Ondulations roses réactives et bandes cyan.',main:light(5,[255,30,160],3),side:light(4,[0,190,255],2,3)},
 {id:'quiet',name:'Sobre',description:'Touches blanches réactives et bandes éteintes.',main:light(8,[255,255,255],2,2),side:light(0,[0,0,0],0,0)},
];
