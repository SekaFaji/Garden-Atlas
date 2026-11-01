import { clampPoint, nextGroupId, nextObjectId } from './model.ts';
import type { Garden, GardenObject } from './model.ts';

/** Pure transformations; App still enforces locks, confirmation, history and validation. */
export function toggleObjectId(ids:readonly string[],id:string):string[] {
  return ids.includes(id)?ids.filter(item=>item!==id):[...ids,id];
}

export function patchGardenObject(garden:Garden,id:string,patch:Partial<GardenObject>):Garden {
  return {...garden,objects:garden.objects.map(item=>item.id===id?{...item,...patch}:item)};
}

export function withoutGardenObjects(garden:Garden,ids:readonly string[]):Garden {
  const removed=new Set(ids);
  return {...garden,objects:garden.objects.filter(item=>!removed.has(item.id))};
}

export function assignGardenObjects(garden:Garden,ids:readonly string[],groupId:string|null):Garden {
  const selected=new Set(ids);
  return {...garden,objects:garden.objects.map(item=>selected.has(item.id)?{...item,groupId}:item)};
}

export function addGardenGroup(garden:Garden,name:string):{garden:Garden;id:string} {
  const id=nextGroupId(garden);
  return {id,garden:{...garden,groups:[...garden.groups,{id,name,notes:''}]}};
}

export function duplicateGardenObject(garden:Garden,source:GardenObject):{garden:Garden;id:string} {
  const id=nextObjectId(garden,source.kind);
  const position=source.position?clampPoint({x:source.position.x+1.2,y:source.position.y+1.2},garden):undefined;
  const copy:GardenObject={...source,id,name:source.name+' copy',position,
    plant:source.plant?{...source.plant,plantedOn:'',identification:'unidentified',observations:[],maintenance:[],photos:[]}:undefined};
  return {id,garden:{...garden,objects:[...garden.objects,copy]}};
}
