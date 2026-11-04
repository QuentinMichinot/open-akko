// SPDX-License-Identifier: GPL-3.0-or-later
import type {LedParam} from './backend';
export interface ReactivePreset {
 inspiration?:string; mode:5|8|14; id:string; name:string; description:string; speed:number; brightness:number;
 color:[number,number,number]; rainbow:boolean;
}
export const REACTIVE_PRESETS:ReactivePreset[]=[
 {mode:8,id:'flash',name:'Frappe éclair',description:'Blanc, vitesse élevée et pleine luminosité.',speed:4,brightness:4,color:[255,255,255],rainbow:false},
 {mode:8,id:'soft',name:'Trace douce',description:'Cyan, vitesse lente et lumière atténuée.',speed:1,brightness:2,color:[0,200,255],rainbow:false},
 {mode:8,id:'amber',name:'Frappe discrète',description:'Ambre, luminosité réduite pour le soir.',speed:2,brightness:1,color:[255,120,20],rainbow:false},
 {mode:8,id:'red',name:'Impact rouge',description:'Rouge vif, vitesse élevée.',speed:4,brightness:4,color:[255,0,0],rainbow:false},
 {mode:8,id:'blue',name:'Écho bleu',description:'Bleu, vitesse lente et lumière soutenue.',speed:1,brightness:3,color:[20,80,255],rainbow:false},
 {mode:8,id:'green',name:'Frappe menthe',description:'Vert menthe, vitesse moyenne.',speed:2,brightness:3,color:[30,255,150],rainbow:false},
 {mode:8,id:'violet',name:'Néon violet',description:'Violet, vitesse élevée.',speed:3,brightness:4,color:[180,30,255],rainbow:false},
 {mode:8,id:'rainbow',name:'Frappe arc-en-ciel',description:'Couleurs automatiques, vitesse moyenne.',speed:2,brightness:4,color:[255,255,255],rainbow:true},
 {mode:14,id:'ripple-white',name:'Onde blanche',description:'Propagation depuis l’appui, blanc et vitesse élevée.',speed:4,brightness:4,color:[255,255,255],rainbow:false},
 {mode:14,id:'ripple-blue',name:'Onde bleue',description:'Propagation bleue depuis la touche pressée.',speed:2,brightness:3,color:[20,80,255],rainbow:false},
 {mode:14,id:'ripple-amber',name:'Onde ambrée',description:'Propagation ambrée, lente et atténuée.',speed:1,brightness:2,color:[255,120,20],rainbow:false},
 {mode:14,id:'ripple-rainbow',name:'Onde arc-en-ciel',description:'Propagation réactive avec couleurs automatiques.',speed:2,brightness:4,color:[255,255,255],rainbow:true},
 {mode:5,id:'ripple-soft',name:'Ondulation douce',description:'Ondes cyan depuis les appuis, lumière atténuée.',speed:1,brightness:2,color:[0,200,255],rainbow:false},
 {mode:5,id:'ripple-vivid',name:'Ondulation vive',description:'Ondes multicolores qui se superposent à la frappe.',speed:3,brightness:4,color:[255,255,255],rainbow:true},
 {mode:8,id:'qmk-solid',name:'Solid Reactive · adaptation',description:'Frappe cyan, inspirée de la famille communautaire QMK.',speed:3,brightness:3,color:[0,210,230],rainbow:false,inspiration:'https://docs.qmk.fm/features/rgb_matrix#rgb-matrix-effect-solid-reactive'},
 {mode:14,id:'qmk-splash',name:'Solid Splash · adaptation',description:'Propagation violette depuis un appui, adaptée au mode Rayonnement.',speed:2,brightness:4,color:[175,40,255],rainbow:false,inspiration:'https://docs.qmk.fm/features/rgb_matrix'},
 {mode:5,id:'qmk-multi',name:'Multisplash · adaptation',description:'Ondes cyan superposées, adaptées au mode Ondulation.',speed:3,brightness:4,color:[0,220,255],rainbow:false,inspiration:'https://docs.qmk.fm/features/rgb_matrix'},
];
export function reactiveParams(current:LedParam,preset:ReactivePreset):LedParam {
 return {...current,mode:preset.mode,option:0,speed:preset.speed,brightness:preset.brightness,
  dazzle:preset.rainbow,r:preset.color[0],g:preset.color[1],b:preset.color[2]};
}
export function matchesReactive(current:LedParam,preset:ReactivePreset):boolean {
 return current.mode===preset.mode&&current.option===0&&current.speed===preset.speed&&current.brightness===preset.brightness&&current.dazzle===preset.rainbow&&
  (preset.rainbow||(current.r===preset.color[0]&&current.g===preset.color[1]&&current.b===preset.color[2]));
}
