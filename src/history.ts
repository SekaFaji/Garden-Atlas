/** Labelled edit bursts become a single Undo step; unrelated edits remain separate. */
export interface EditBurst { key:string; time:number }
export function isSameEditBurst(previous:EditBurst|null,key:string|undefined,now:number,maxGap=1200):boolean {
  return Boolean(key&&previous&&previous.key===key&&now>=previous.time&&now-previous.time<maxGap);
}
