/** Labelled edit bursts become a single Undo step; unrelated edits remain separate. */
export interface EditBurst { key:string; time:number }
export function isSameEditBurst(previous:EditBurst|null,key:string|undefined,now:number,maxGap=1200):boolean {
  return Boolean(key&&previous&&previous.key===key&&now>=previous.time&&now-previous.time<maxGap);
}


import type { Garden } from './model.ts';

/** Transient in-memory history. History snapshots are never written to the garden schema. */
export interface GardenHistory {
  past: Garden[];
  future: Garden[];
  burst: EditBurst | null;
}

export function emptyGardenHistory(): GardenHistory {
  return {past:[],future:[],burst:null};
}

/** A run of edits with the same key and short time gap occupies one Undo slot. */
export function recordGardenEdit(history:GardenHistory,previous:Garden,key:string|undefined,now:number):GardenHistory {
  const grouped=isSameEditBurst(history.burst,key,now);
  return {
    past: grouped ? history.past : [...history.past.slice(-39),previous],
    future:[],
    burst:key?{key,time:now}:null,
  };
}

export function undoGardenEdit(history:GardenHistory,current:Garden):{history:GardenHistory;garden:Garden|null} {
  if(!history.past.length)return {history,garden:null};
  return {garden:history.past[history.past.length-1],history:{
    past:history.past.slice(0,-1),future:[...history.future,current],burst:null,
  }};
}

export function redoGardenEdit(history:GardenHistory,current:Garden):{history:GardenHistory;garden:Garden|null} {
  if(!history.future.length)return {history,garden:null};
  return {garden:history.future[history.future.length-1],history:{
    past:[...history.past,current],future:history.future.slice(0,-1),burst:null,
  }};
}
