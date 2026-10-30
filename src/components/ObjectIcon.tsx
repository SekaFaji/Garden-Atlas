import { Sprite } from '../Sprite';
import type { Kind } from '../model';

/** Canonical object preview shared by the catalog, object list and inspector. */
export function ObjectIcon({kind,size=38,presetId}:{kind:Kind;size?:number;presetId?:string}) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="item-art"><Sprite kind={kind} presetId={presetId}/></svg>;
}
