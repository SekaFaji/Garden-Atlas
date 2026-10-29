/** Original, locally rendered pixel-art object presets. These are visual starting points,
 * not automatic botanical identifications or measurements of a real specimen.
 */
import type { Kind } from './model.ts';

export interface ObjectPreset {
  id: string;
  kind: Kind;
  name: string;
  species: string;
  diameterM: number;
}

export const PRESETS: readonly ObjectPreset[] = [
  {id:'tree-oak',kind:'tree',name:'Broadleaf tree',species:'',diameterM:5},
  {id:'tree-pine',kind:'tree',name:'Pine / conifer',species:'',diameterM:4},
  {id:'tree-apple',kind:'tree',name:'Fruit tree',species:'',diameterM:3.5},
  {id:'tree-cherry',kind:'tree',name:'Flowering tree',species:'',diameterM:4},
  {id:'shrub-round',kind:'shrub',name:'Round shrub',species:'',diameterM:2},
  {id:'shrub-hedge',kind:'shrub',name:'Hedge section',species:'',diameterM:2},
  {id:'shrub-lavender',kind:'shrub',name:'Lavender-like shrub',species:'',diameterM:1.2},
  {id:'shrub-rose',kind:'shrub',name:'Flowering bush',species:'',diameterM:1.6},
  {id:'flower-wild',kind:'flower',name:'Wildflower patch',species:'',diameterM:1.6},
  {id:'flower-tulip',kind:'flower',name:'Spring bulbs',species:'',diameterM:1.2},
  {id:'flower-sunflower',kind:'flower',name:'Tall flowers',species:'',diameterM:1.7},
  {id:'bed-vegetable',kind:'bed',name:'Vegetable patch',species:'',diameterM:3},
  {id:'bed-raised',kind:'bed',name:'Raised bed',species:'',diameterM:2.5},
  {id:'bed-herb',kind:'bed',name:'Herb garden',species:'',diameterM:2},
  {id:'house-home',kind:'house',name:'House',species:'',diameterM:7},
  {id:'house-shed',kind:'house',name:'Garden shed',species:'',diameterM:3.5},
  {id:'house-greenhouse',kind:'house',name:'Greenhouse',species:'',diameterM:4},
  {id:'rock-boulder',kind:'rock',name:'Boulder',species:'',diameterM:1.5},
  {id:'rock-stones',kind:'rock',name:'Rock cluster',species:'',diameterM:2},
  {id:'pond-small',kind:'pond',name:'Garden pond',species:'',diameterM:4},
  {id:'pond-lily',kind:'pond',name:'Water garden',species:'',diameterM:4},
  {id:'furniture-bench',kind:'furniture',name:'Garden bench',species:'',diameterM:2},
  {id:'furniture-table',kind:'furniture',name:'Patio table',species:'',diameterM:2},
  {id:'furniture-planter',kind:'furniture',name:'Decorative planter',species:'',diameterM:1},
];
export function getPreset(id:string):ObjectPreset|undefined {return PRESETS.find(p=>p.id===id);}
export function defaultPreset(kind:Kind):ObjectPreset {const result=PRESETS.find(p=>p.kind===kind);if(!result)throw new Error('Unknown garden object kind');return result;}
export function findPresets(query:string,kind:Kind|'all'='all'):ObjectPreset[] {
  const q=query.trim().toLocaleLowerCase();
  return PRESETS.filter(p=>(kind==='all'||p.kind===kind)&&(!q||`${p.name} ${p.id} ${p.kind}`.toLocaleLowerCase().includes(q)));
}
