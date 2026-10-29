import test from 'node:test';
import assert from 'node:assert/strict';
import {demoGarden,parseGarden,isGarden} from '../src/model.ts';
import {
 addSpecies,updateSpecies,deleteSpecies,updateProfile,blankProfile,uniqueEntryId,
 validDate,isPlantKind,validPlantAtlas
} from '../src/plantAtlas.ts';

const jpeg='data:image/jpeg;base64,'+'a'.repeat(120);
const testGarden=()=>{
 const g=demoGarden();
 assert.ok(isGarden(g));
 return g;
};

test('P011 data opens without any plant atlas data migration',()=>{
 const old=testGarden();
 const loaded=parseGarden(JSON.parse(JSON.stringify(old)));
 assert.deepEqual(loaded,old);
 assert.equal(loaded.version,6);
 assert.equal(loaded.speciesLibrary,undefined);
});

test('species library and specimen history use stable separate IDs',()=>{
 let g=addSpecies(testGarden(),'English oak','Quercus robur');
 assert.ok(g);
 assert.equal(g.speciesLibrary[0].id,'SPECIES-001');
 const originalId=g.objects[0].id;
 const otherId=g.objects[1].id;
 g=updateProfile(g,originalId,() => ({
   ...blankProfile(),speciesId:'SPECIES-001',identification:'tentative',plantedOn:'2024-02-29',
   observations:[{id:'OBS-1',date:'2026-10-25',note:'New buds'}],
   maintenance:[{id:'CARE-1',date:'2026-10-25',action:'pruning',note:'Pruned branches'}],
 }));
 assert.equal(isGarden(g),true);
 assert.equal(g.objects[1].plant,undefined);
 assert.equal(g.objects[0].id,originalId);
 assert.equal(g.objects[1].id,otherId);
 assert.equal(parseGarden(JSON.parse(JSON.stringify(g))).objects[0].plant.observations[0].note,'New buds');
 g=updateSpecies(g,'SPECIES-001',{careNotes:'Water when young'});
 assert.equal(g.speciesLibrary[0].careNotes,'Water when young');
 g=deleteSpecies(g,'SPECIES-001');
 assert.equal(isGarden(g),true);
 assert.equal(g.objects[0].plant.speciesId,null);
 assert.equal(g.objects[0].plant.observations.length,1);
});

test('plant atlas rejects malformed dates, dangling species and duplicate histories',()=>{
 const base=testGarden();
 let g=updateProfile(base,base.objects[0].id,()=>({...blankProfile(),speciesId:'MISSING'}));
 assert.equal(isGarden(g),false);
 g=updateProfile(base,base.objects[0].id,()=>({...blankProfile(),plantedOn:'2026-02-29'}));
 assert.equal(isGarden(g),false);
 g=updateProfile(base,base.objects[0].id,()=>({...blankProfile(),observations:[{id:'O1',date:'2026-10-28',note:'ok'},{id:'O1',date:'2026-10-29',note:'bad'}]}));
 assert.equal(isGarden(g),false);
 assert.equal(validDate('2024-02-29'),true);
 assert.equal(validDate('2026-02-29'),false);
 assert.equal(validDate('nope'),false);
});

test('photos validate format, size, number and do not leak into nonplant objects',()=>{
 const base=testGarden();
 const plant=base.objects.find(o=>o.kind==='tree');
 assert.ok(plant);
 let g=updateProfile(base,plant.id,()=>({...blankProfile(),photos:[{id:'PHOTO-1',addedOn:'2026-10-29',caption:'Oak',dataUrl:jpeg}]}));
 assert.equal(isGarden(g),true);
 assert.equal(JSON.parse(JSON.stringify(g)).objects.find(o=>o.id===plant.id).plant.photos[0].dataUrl,jpeg);
 g=updateProfile(base,plant.id,()=>({...blankProfile(),photos:[{id:'PHOTO-1',addedOn:'2026-10-29',caption:'bad',dataUrl:'javascript:alert(1)'}]}));
 assert.equal(isGarden(g),false);
 g=updateProfile(base,plant.id,()=>({...blankProfile(),photos:Array.from({length:4},(_,i)=>({id:`PHOTO-${i}`,addedOn:'2026-10-29',caption:'x',dataUrl:jpeg}))}));
 assert.equal(isGarden(g),false);
 g={...base,objects:base.objects.map(o=>o.kind==='house'?{...o,plant:blankProfile()}:o)};
 assert.equal(isGarden(g),false);
});

test('species IDs and entry IDs are collision-safe, records remain user-owned',()=>{
 let g=testGarden();
 g=addSpecies(g,'Oak');g=addSpecies(g,'Birch');
 assert.equal(g.speciesLibrary[1].id,'SPECIES-002');
 assert.equal(uniqueEntryId('OBS',[{id:'OBS-1'},{id:'OBS-3'}]),'OBS-2');
 assert.equal(isPlantKind('flower'),true);
 assert.equal(isPlantKind('rock'),false);
 assert.equal(validPlantAtlas({...g,speciesLibrary:[g.speciesLibrary[0],g.speciesLibrary[0]]},g.objects),false);
});

test('species encyclopedia and specimen notes are included in whole garden JSON',()=>{
 const base=testGarden();
 const withSpecies=addSpecies(base,'Pine','Pinus');
 const g=updateProfile(withSpecies,base.objects[0].id,p=>({...p,speciesId:withSpecies.speciesLibrary[0].id,maintenance:[{id:'CARE-1',date:'2026-10-29',action:'inspection',note:'Checked health'}]}));
 const backup=JSON.stringify(g);
 assert.ok(backup.includes('Checked health'));
 assert.ok(backup.includes('Pinus'));
 assert.equal(isGarden(JSON.parse(backup)),true);
});
