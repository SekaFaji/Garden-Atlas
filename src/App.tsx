import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MapView, type Tool } from './MapView';
import { Sprite } from './Sprite';
import { PlantAtlasPanel } from './PlantAtlasPanel';
import { PRESETS, findPresets, defaultPreset, getPreset } from './catalog';
import { GardenReport } from './Report';
import { imageToReference } from './reference';
import { isSameEditBurst, type EditBurst } from './history';
import { editFeaturePoint, resizeObjectDiameter, type FeatureSelection, type EditAction } from './featureEdit';
import {
  GROUNDS, KINDS, createPresetObject, changeObjectPreset, addLine, addRegion, alignSelection, moveSelection, setReferenceWidth, clampPoint, demoGarden, emptyGarden, info, isGarden,
  movePlaced, nextGroupId, nextObjectId, polygonArea, removeGroup, resizeGarden, resizeWorkspace, addSurroundings, setBoundary, previewLinkedSource, chooseLinkedSource,
  type Garden, type GardenObject, type Ground, type Kind, type Mode, type Point, type LineKind
} from './model';
import {
  addProject, deleteProject, importGarden, importLibrary, loadLibrary,
  loadLibraryRecovery, saveLibrary, updateActiveGarden, type ProjectLibrary
} from './storage';

type LayerKey='objects'|'regions'|'lines'|'boundary';
type LayerState=Record<LayerKey,boolean>;
type Visibility=LayerState;
const ICONS=['✥','✿','♣','▤','⌂','◆','≈','▣'];
function Icon({kind,size=38,presetId}:{kind:Kind;size?:number;presetId?:string}){return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="item-art"><Sprite kind={kind} presetId={presetId}/></svg>;}
function download(filename:string,data:string){
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
const slug=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'garden';
const date=()=>new Date().toISOString().slice(0,10);
export default function App(){
  const [library,setLibrary]=useState<ProjectLibrary>(loadLibrary);
  const libraryRef=useRef(library);libraryRef.current=library;
  const garden=library.projects.find(p=>p.id===library.activeId)!.garden;
  const [mode,setMode]=useState<Mode>('illustration');
  const [tool,setTool]=useState<Tool>('select');
  const [ground,setGround]=useState<Ground>('soil');
  const [presetId,setPresetId]=useState('tree-oak');
  const [presetSearch,setPresetSearch]=useState('');
  const [presetFilter,setPresetFilter]=useState<Kind|'all'>('all');
  const [lineWidth,setLineWidth]=useState(1.5);
  const [selectedId,setSelectedId]=useState<string|null>('TREE-001');
  const [selectedGroupId,setSelectedGroupId]=useState<string|null>(null);
  const [selectedPanel,setSelectedPanel]=useState<'tools'|'inspector'|'projects'>('tools');
  const [visibility,setVisibility]=useState<Visibility>({objects:false,regions:false,lines:false,boundary:false});
  const [locked,setLocked]=useState<LayerState>({objects:false,regions:false,lines:false,boundary:false});
  const [selectedFeature,setSelectedFeature]=useState<FeatureSelection|null>(null);
  const [selectedVertex,setSelectedVertex]=useState<number|null>(null);
  const [newGroupName,setNewGroupName]=useState('');
  const [checkedIds,setCheckedIds]=useState<string[]>([]);
  const [multiSelect,setMultiSelect]=useState(false);
  const [snapEnabled,setSnapEnabled]=useState(false);
  const [referenceOpen,setReferenceOpen]=useState(false);
  const [showReference,setShowReference]=useState(true);
  const [importingReference,setImportingReference]=useState(false);
  const referenceFile=useRef<HTMLInputElement>(null);
  const [dims,setDims]=useState({width:String(garden.width),height:String(garden.height)});
  const [mapSizeOpen,setMapSizeOpen]=useState(false);
  const [resizeMode,setResizeMode]=useState<'preserve'|'scale'>('preserve');
  const [notice,setNotice]=useState('Linked maps: edits to either view update both · pinch to zoom.');
  const [saved,setSaved]=useState(true);
  const [past,setPast]=useState<Garden[]>([]);
  const historyGroup=useRef<EditBurst|null>(null);
  const [future,setFuture]=useState<Garden[]>([]);
  const importFile=useRef<HTMLInputElement>(null),importAllFile=useRef<HTMLInputElement>(null);
  const selected=garden.objects.find(o=>o.id===selectedId)??null;
  const selectedGroup=garden.groups.find(g=>g.id===selectedGroupId)??null;
  useEffect(()=>{setSaved(saveLibrary(library));},[library]);
  useEffect(()=>{setDims({width:String(garden.width),height:String(garden.height)});},[library.activeId,garden.width,garden.height]);
  const applyGarden=(next:Garden,withHistory=true,historyKey?:string)=>{
    if(!isGarden(next)){setNotice('Change rejected: garden would become invalid.');return;}
    const previous=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;
    if(JSON.stringify(previous)===JSON.stringify(next))return;
    if(withHistory&&previous.linkMigration&&!previous.linkMigration.confirmed){setNotice('Choose and confirm your old map source first. Both original maps are preserved.');return;}
    if(withHistory){
      const now=Date.now(),grouped=isSameEditBurst(historyGroup.current,historyKey,now);
      if(!grouped)setPast(list=>[...list.slice(-39),previous]);
      historyGroup.current=historyKey?{key:historyKey,time:now}:null;
      setFuture([]);
    }
    const updated=updateActiveGarden(libraryRef.current,next);libraryRef.current=updated;setLibrary(updated);
  };
  const replaceLibrary=(next:ProjectLibrary)=>{
    libraryRef.current=next;setLibrary(next);setPast([]);setFuture([]);historyGroup.current=null;setSelectedId(null);setSelectedGroupId(null);setTool('select');setSelectedPanel('tools');setCheckedIds([]);setMultiSelect(false);setSelectedFeature(null);setSelectedVertex(null);
  };
  const undo=()=>{historyGroup.current=null;if(garden.linkMigration&&!garden.linkMigration.confirmed)return;if(!past.length)return;const prev=past[past.length-1];setPast(p=>p.slice(0,-1));setFuture(f=>[...f,garden]);applyGarden(prev,false);setNotice('Undid last edit.');};
  const redo=()=>{historyGroup.current=null;if(garden.linkMigration&&!garden.linkMigration.confirmed)return;if(!future.length)return;const next=future[future.length-1];setFuture(f=>f.slice(0,-1));setPast(p=>[...p,garden]);applyGarden(next,false);setNotice('Redid edit.');};
  useEffect(()=>{
    const listener=(event:KeyboardEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target?.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
      const key=event.key.toLowerCase();
      if(key==='z'&&!event.shiftKey){event.preventDefault();undo();}
      else if(key==='y'||key==='z'&&event.shiftKey){event.preventDefault();redo();}
    };
    window.addEventListener('keydown',listener);return ()=>window.removeEventListener('keydown',listener);
  });
  const select=(id:string|null)=>{setSelectedId(id);setSelectedGroupId(null);if(id&&!multiSelect)setSelectedPanel('inspector');};
  const togglePick=(id:string)=>setCheckedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);
  const selectGroup=(id:string)=>{setSelectedGroupId(id);setSelectedId(null);setTool('select');setSelectedPanel('inspector');};
  const objectPatch=(id:string,patch:Partial<GardenObject>,key?:string)=>{if(locked.objects){setNotice('Unlock Plants & structures to edit this item.');return;}applyGarden({...garden,objects:garden.objects.map(o=>o.id===id?{...o,...patch}:o)},true,key?`object:${id}:${key}`:undefined);};
  const resizeSelected=(id:string,diameter:number)=>{
    if(locked.objects){setNotice('Unlock Plants & structures before resizing.');return;}
    const updated=resizeObjectDiameter(garden,id,diameter);
    if(updated)applyGarden(updated);else setNotice('Resize rejected: choose a diameter from 0.5 to 100 metres.');
  };
  const editExistingFeature=(selection:FeatureSelection,index:number,action:EditAction,point?:Point)=>{
    if(locked[selection.kind==='region'?'regions':'lines']){setNotice('Unlock this layer to edit it.');return;}
    const next=editFeaturePoint(garden,selection,index,action,point);
    if(next){applyGarden(next);setNotice(`${selection.kind==='region'?'Terrain':'Path or fence'} ${action==='insert'?'vertex added':action==='remove'?'vertex removed':'vertex moved'}. Use Undo to reverse.`);}
    else setNotice('Invalid edit: the previous valid shape was preserved.');
  };
  const place=(kind:Kind,p:Point)=>{
    if(locked.objects){setNotice('Unlock Plants & structures to add items.');return;}
    const chosen=getPreset(presetId);
    const preset=chosen?.kind===kind?chosen:defaultPreset(kind);
    const updated=createPresetObject(garden,preset.id,p);
    if(!updated){setNotice('Could not add this garden item. Check the object limit.');return;}
    applyGarden(updated);setSelectedId(updated.objects[updated.objects.length-1].id);setSelectedGroupId(null);
    setNotice(`${preset.name} placed. Tap again to repeat, or select the hand tool.`);
  };
  const move=(id:string,point:Point,together:boolean)=>{if(locked.objects)return;applyGarden(movePlaced(garden,id,mode,point,together));};
  const moveMultiple=(anchorId:string,point:Point)=>{if(!locked.objects)applyGarden(moveSelection(garden,checkedIds,anchorId,point));};
  const alignChecked=(direction:'left'|'right'|'top'|'bottom'|'horizontal'|'vertical')=>{
    if(locked.objects){setNotice('Unlock the object layer first.');return;}
    const next=alignSelection(garden,checkedIds,direction);
    if(next===garden){setNotice('Select more placed objects to align or distribute.');return;}
    applyGarden(next);setNotice('Selected objects aligned. Use Undo to restore their positions.');
  };
  const deleteChecked=()=>{
    if(locked.objects||!checkedIds.length||!window.confirm(`Delete ${checkedIds.length} selected objects from your garden? Undo can restore them.`))return;
    const ids=new Set(checkedIds);
    applyGarden({...garden,objects:garden.objects.filter(o=>!ids.has(o.id))});setCheckedIds([]);setSelectedId(null);
  };
  const referenceChange=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    if(garden.linkMigration&&!garden.linkMigration.confirmed){setNotice('Choose a linked map source before importing an image.');return;}
    const originatingProjectId=libraryRef.current.activeId;
    setImportingReference(true);
    try {
      const reference=await imageToReference(file,garden);
      if(libraryRef.current.activeId!==originatingProjectId){setNotice('Import cancelled: you switched gardens while the image was processing.');return;}
      const next={...garden,reference};
      if(!isGarden(next))throw new Error('Image is outside the current workspace.');
      applyGarden(next);setShowReference(true);setNotice('Local reference imported. It appears in both views and your JSON backups.');
    }catch(error){setNotice(error instanceof Error?error.message:'Could not load this image.');}
    finally{setImportingReference(false);}
  };
  const updateReference=(update:Partial<NonNullable<Garden['reference']>>)=>{
    const r=garden.reference;if(!r)return;
    const reference={...r,...update};
    const candidate={...garden,reference};
    if(isGarden(candidate))applyGarden(candidate,true,'reference:transform');
    else setNotice('Reference image must remain inside the workspace. Expand the map or reduce its size.');
  };
  const referenceWidth=(n:number)=>{
    const next=setReferenceWidth(garden,n);
    if(next)applyGarden(next,true,'reference:transform');else setNotice('Reference does not fit at that width.');
  };
  const outline=(points:Point[])=>{if(locked.boundary){setNotice('Unlock the boundary layer.');return;}const next=setBoundary(garden,mode,points);if(next)applyGarden(next);else setNotice('Invalid boundary. Previous outline kept.');};
  const addMapLine=(points:Point[],kind:LineKind,widthM:number)=>{if(locked.lines){setNotice('Unlock paths & fences before adding them.');return;}
    const next=addLine(garden,mode,points,kind,widthM);
    if(next){applyGarden(next);setNotice(`${kind==='path'?'Path':'Fence'} added to ${mode} map.`);}else setNotice('Invalid line. Tap two or more distinct points.');
  };
  const addArea=(points:Point[],type:Ground)=>{if(locked.regions){setNotice('Unlock terrain regions before adding areas.');return;}const next=addRegion(garden,mode,points,type);if(next)applyGarden(next);else setNotice('Could not add this region.');};
  const assignChecked=(groupId:string|null)=>{if(locked.objects){setNotice('Unlock the object layer first.');return;}
    if(!checkedIds.length){setNotice('Select some items in the object list first.');return;}
    const ids=new Set(checkedIds);
    applyGarden({...garden,objects:garden.objects.map(o=>ids.has(o.id)?{...o,groupId}:o)});
    setCheckedIds([]);setNotice(`Assigned ${ids.size} selected item(s) to the group.`);
  };
  const createGroup=()=>{
    const name=newGroupName.trim();if(!name)return;
    if(garden.groups.some(g=>g.name.toLowerCase()===name.toLowerCase())){setNotice('That group already exists.');return;}
    const id=nextGroupId(garden);
    applyGarden({...garden,groups:[...garden.groups,{id,name,notes:''}]});setNewGroupName('');selectGroup(id);
  };
  const duplicate=()=>{if(locked.objects){setNotice('Unlock the object layer first.');return;}
    if(!selected||garden.objects.length>=3000)return;
    const id=nextObjectId(garden,selected.kind);
    const position=selected.position?clampPoint({x:selected.position.x+1.2,y:selected.position.y+1.2},garden):undefined;
    applyGarden({...garden,objects:[...garden.objects,{...selected,id,name:selected.name+' copy',position,plant:selected.plant?{...selected.plant,plantedOn:'',identification:'unidentified',observations:[],maintenance:[],photos:[]}:undefined}]});select(id);
    setNotice('Object duplicated 1.2 m away; drag it into place.');
  };
  const removeObject=()=>{if(locked.objects){setNotice('Unlock the object layer first.');return;}
    if(!selected||!window.confirm(`Delete ${selected.name} from both map layouts and its record?`))return;
    applyGarden({...garden,objects:garden.objects.filter(x=>x.id!==selected.id)});select(null);
  };
  const changeDimensions=()=>{
    const width=Number(dims.width),height=Number(dims.height);
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<10||height<10||width>500||height>500){setNotice('Map width and height must be between 10 and 500 metres.');return;}
    if(width===garden.width&&height===garden.height){setNotice('Map size is already set to those dimensions.');return;}
    if(resizeMode==='scale'&&!window.confirm('Scale everything? This changes measured distances, object positions and boundaries. Undo can restore the previous layout.'))return;
    const next=resizeMode==='scale'?resizeGarden(garden,width,height):resizeWorkspace(garden,width,height);
    if(!next){setNotice('Map size rejected: this would clip the plot, plants, paths or terrain. Increase the dimensions, use Expand Surroundings or explicitly choose Scale Entire Design.');return;}
    applyGarden(next);
    setNotice(resizeMode==='scale'?`Entire garden scaled to ${width} × ${height} m. Use Undo to reverse.`:`Workspace changed to ${width} × ${height} m without moving or resizing your garden.`);
  };
  const expandAroundGarden=(margin:number)=>{
    const next=addSurroundings(garden,margin);
    if(!next){setNotice('Could not expand map: maximum workspace dimension is 500 m.');return;}
    applyGarden(next);
    setDims({width:String(next.width),height:String(next.height)});
    setNotice(`Added ${margin} m of space around all sides. Your garden remains the same size.`);
  };
  const newProject=(demo=false)=>{
    if(!window.confirm('Create a new garden? Your current garden is saved in this browser. Download a backup for long-term safekeeping.'))return;
    const next=addProject(library,demo?demoGarden():emptyGarden());
    if(!next){setNotice('The local library currently supports 20 gardens.');return;}
    replaceLibrary(next);setNotice('New garden created. Drag on the map to begin editing.');
  };
  const removeProject=()=>{
    if(!window.confirm(`Delete “${garden.name}” from this browser? Export it first. This cannot be undone.`))return;
    const next=deleteProject(library,library.activeId);
    if(!next){setNotice('Keep at least one garden. Create another first.');return;}
    replaceLibrary(next);setNotice('Local garden deleted. Other projects preserved.');
  };
  const recover=()=>{
    const restored=loadLibraryRecovery();
    if(!restored){setNotice('No valid previous local recovery snapshot found.');return;}
    if(!window.confirm('Restore the previous local library snapshot? Back up current data first.'))return;
    replaceLibrary(restored);setNotice('Restored a previous local snapshot.');
  };
  const onImport=(e:ChangeEvent<HTMLInputElement>,all:boolean)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>(all?20_000_000:8_000_000)){setNotice('Backup file exceeds the import size limit.');return;}
    void file.text().then(text=>{
      if(all){const next=importLibrary(text);if(!next){setNotice('Invalid Garden Atlas library backup.');return;}
        if(window.confirm('Replace ALL local gardens with this library backup?')){replaceLibrary(next);setNotice('Garden library restored.');}
      }else{const nextGarden=importGarden(text);if(!nextGarden){setNotice('Invalid garden file. P001–P004 backups are supported.');return;}
        const next=addProject(library,nextGarden);if(!next){setNotice('Maximum 20 projects.');return;}
        replaceLibrary(next);setNotice('Garden imported as a separate project. Existing gardens were preserved.');
      }
    }).catch(()=>setNotice('Could not read the file.'));
  };
  const setNewTool=(value:Tool)=>{
    const layer:LayerKey|null=value==='outline-edit'||value==='outline-draw'||value==='freehand'?'boundary':value==='terrain'?'regions':value==='path'||value==='fence'||value==='feature-edit'?'lines':KINDS.some(k=>k.kind===value)?'objects':null;
    if(layer&&locked[layer]&&!(value==='feature-edit'&&!locked.regions)){setNotice(`Unlock ${layer} to use this tool.`);return;}
    setTool(value);if(value!=='select')setMultiSelect(false);if(value==='select'||value==='pan')setNotice(value==='select'?'Drag an object to move it, or drag empty ground to pan.':'Pan around the map; pinch with two fingers to zoom.');};
  const activatePreset=(id:string)=>{
    const preset=getPreset(id);if(!preset||locked.objects)return;
    setPresetId(preset.id);setNewTool(preset.kind);
    setNotice(`${preset.name}: tap the map to place, then drag to adjust.`);
    if(window.matchMedia('(max-width:760px)').matches){
      window.requestAnimationFrame(()=>document.querySelector('.map-frame')?.scrollIntoView({behavior:'smooth',block:'start'}));
    }
  };
  return <><div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-icon">✿</span><div><div className="brand-name">GARDEN <span>ATLAS</span></div><div className="brand-caption">PIXEL LANDSCAPE EDITOR · P013</div></div></div>
      <div className="top-actions"><span className={`save-status ${saved?'':'danger'}`}>● {saved?'LOCAL SAVE':'NOT SAVED'}</span>
        <button className="btn btn-muted" onClick={()=>importFile.current?.click()}>IMPORT</button>
        <button className="btn btn-highlight" onClick={()=>download(`garden-atlas-${slug(garden.name)}-${date()}.json`,JSON.stringify(garden,null,2))}>↓ BACKUP</button><button className="btn btn-muted" onClick={()=>window.print()} title="Open your browser print dialog to save the garden book as a PDF">☷ PDF / PRINT</button>
        <input hidden ref={importFile} type="file" accept=".json,application/json" onChange={e=>onImport(e,false)}/>
        <input hidden ref={importAllFile} type="file" accept=".json,application/json" onChange={e=>onImport(e,true)}/>
      </div>
    </header>
    <main className="workspace">
      <aside className={`panel library-panel ${selectedPanel==='tools'?'mobile-active':''}`}>
        <div className="section-heading">01 / OBJECT LIBRARY</div>
        <p className="panel-hint">Choose an item, then tap repeatedly to place. Switch to SELECT to drag it.</p>
        <div className="palette-grid">{KINDS.map((k,i)=><button key={k.kind} className={`palette-item ${tool===k.kind?'active':''}`} onClick={()=>{setPresetId(defaultPreset(k.kind).id);setNewTool(k.kind);}}><Icon kind={k.kind} presetId={defaultPreset(k.kind).id}/><span>{k.label}</span><small>{ICONS[i]}</small></button>)}</div>
        <div className="section-heading list-heading">PIXEL-ART PRESETS <span className="pill">{PRESETS.length}</span></div>
        <div className="preset-filters">
          <input aria-label="Search garden objects" type="search" placeholder="Search trees, ponds, furniture…" value={presetSearch} onChange={e=>setPresetSearch(e.target.value)}/>
          <select aria-label="Filter object category" value={presetFilter} onChange={e=>setPresetFilter(e.target.value as Kind|'all')}>
            <option value="all">ALL CATEGORIES</option>{KINDS.map(k=><option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
        </div>
        <div className="preset-grid" aria-label="Garden object presets">
          {findPresets(presetSearch,presetFilter).map(p=><button key={p.id} className={`preset-button ${tool===p.kind&&presetId===p.id?'active':''}`} aria-pressed={tool===p.kind&&presetId===p.id}
            disabled={locked.objects} onClick={()=>activatePreset(p.id)}>
            <Icon kind={p.kind} presetId={p.id} size={46}/><span>{p.name}</span><small>{p.diameterM} m starting size</small>
          </button>)}
          {findPresets(presetSearch,presetFilter).length===0&&<p className="panel-hint">No presets match this search.</p>}
        </div>
        <div className="section-heading list-heading">02 / GARDEN ITEMS <span className="pill">{garden.objects.length}</span></div>
        <div className="item-list">{garden.objects.map(o=><div key={o.id} className="object-row"><button className={`object-entry ${selectedId===o.id?'active':''}`} onClick={()=>{select(o.id);setNewTool('select');}}><Icon kind={o.kind} presetId={o.presetId} size={28}/><span>{o.name}<small>{o.id} {o.position?'●':'○'}</small></span></button><label title={`Select ${o.name} for grouping`} className="batch-check"><input type="checkbox" aria-label={`Batch-select ${o.name}`} checked={checkedIds.includes(o.id)} onChange={e=>setCheckedIds(ids=>e.target.checked?[...ids,o.id]:ids.filter(x=>x!==o.id))}/></label></div>)}</div>
        <div className="batch-editor" aria-label="Multi-object editor">
          <button className={`btn ${multiSelect?'btn-highlight':'btn-muted'}`} aria-pressed={multiSelect} onClick={()=>{setMultiSelect(v=>!v);setTool('select');setSelectedGroupId(null);setSelectedId(null);}}>◩ {multiSelect?'MULTI SELECT ON':'MULTI SELECT'}</button>
          <button className="btn btn-muted" onClick={()=>{setCheckedIds(garden.objects.filter(o=>o.position).map(o=>o.id));setMultiSelect(true);setTool('select');setSelectedId(null);}}>SELECT ALL PLACED</button>
          <button className="btn btn-muted" onClick={()=>setCheckedIds([])} disabled={!checkedIds.length}>CLEAR</button>
          {checkedIds.length>0&&<><span>{checkedIds.length} selected · drag any selected item to move the set</span>
            <div className="alignment-grid">
              {([{id:'left',name:'◧ LEFT'},{id:'right',name:'◨ RIGHT'},{id:'top',name:'▔ TOP'},{id:'bottom',name:'▁ BOTTOM'},{id:'horizontal',name:'↔ SPACE X'},{id:'vertical',name:'↕ SPACE Y'}] as const).map(a=><button key={a.id} className="btn btn-muted" onClick={()=>alignChecked(a.id)}>{a.name}</button>)}
            </div>
            <button className="btn btn-danger" onClick={deleteChecked}>DELETE SELECTED</button>
          </>}
        </div>
        <div className="section-heading list-heading">03 / GROUPS <span className="pill">{garden.groups.length}</span></div>
        <div className="group-create"><input aria-label="New group name" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} maxLength={120} placeholder="Group name" onKeyDown={e=>{if(e.key==='Enter')createGroup();}}/><button className="btn btn-highlight" onClick={createGroup}>+</button></div>
        {checkedIds.length>0&&<div className="batch-actions"><span>{checkedIds.length} selected</span><select aria-label="Assign selected items to group" defaultValue="choose" onChange={e=>{if(e.target.value!=='choose')assignChecked(e.target.value==='none'?null:e.target.value);}}><option value="choose">ASSIGN TO...</option><option value="none">UNGROUP</option>{garden.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select><button className="btn btn-muted" onClick={()=>setCheckedIds([])}>CLEAR</button></div>}
        <div className="group-list">{garden.groups.map(group=><button className={`group-entry ${selectedGroupId===group.id?'active':''}`} key={group.id} onClick={()=>selectGroup(group.id)}><span>▦</span><span>{group.name}<small>{garden.objects.filter(o=>o.groupId===group.id).length} members</small></span></button>)}</div>
        <div className="section-heading list-heading">04 / LAYERS</div>
        <div className="layer-list">{([{key:'objects',label:'Plants & structures'},{key:'regions',label:'Terrain regions'},{key:'lines',label:'Paths & fences'},{key:'boundary',label:'Property outline'}] as const).map(x=><div className="layer-control" key={x.key}>
          <label><input type="checkbox" checked={!visibility[x.key]} onChange={e=>setVisibility(v=>({...v,[x.key]:!e.target.checked}))}/>{x.label}</label>
          <button className={`layer-lock ${locked[x.key]?'locked':''}`} aria-pressed={locked[x.key]} aria-label={`${locked[x.key]?'Unlock':'Lock'} ${x.label}`} onClick={()=>{
            setLocked(v=>({...v,[x.key]:!v[x.key]}));setTool('select');setSelectedFeature(null);setSelectedVertex(null);
          }}>{locked[x.key]?'🔒 LOCKED':'🔓 EDIT'}</button>
        </div>)}</div>
        <p className="panel-hint">Layer locks prevent changes in this editing session; visibility affects display only. Both views share the same garden.</p>
        <div className="section-heading list-heading">05 / TERRAIN AREAS & LINES</div>
        <div className="terrain-list">{garden.layout.regions.map(r=><div className="terrain-entry" key={r.id}><button className="feature-pick" onClick={()=>{setSelectedFeature({kind:'region',id:r.id});setSelectedVertex(null);setNewTool('feature-edit');}}>{r.name} · {r.id} · EDIT POINTS</button><button disabled={locked.regions} title="Delete terrain region" onClick={()=>applyGarden({...garden,layout:{...garden.layout,regions:garden.layout.regions.filter(x=>x.id!==r.id)}})}>×</button></div>)}</div>
        <div className="terrain-list">{garden.layout.lines.map(line=><div className="line-entry" key={line.id}><button className="feature-pick" onClick={()=>{setSelectedFeature({kind:'line',id:line.id});setSelectedVertex(null);setNewTool('feature-edit');}}>✎ EDIT POINTS</button><input disabled={locked.lines} aria-label={`Name of ${line.id}`} maxLength={120} value={line.name} onChange={e=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.map(x=>x.id===line.id?{...x,name:e.target.value}:x)}})}/><label>WIDTH M<input disabled={locked.lines} type="number" min="0.2" max="12" step="0.2" value={line.widthM} onChange={e=>{const n=Number(e.target.value);if(n>=.2&&n<=12)applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.map(x=>x.id===line.id?{...x,widthM:n}:x)}});}}/></label><button disabled={locked.lines} className="btn btn-danger" title="Delete path or fence" onClick={()=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.filter(x=>x.id!==line.id)}})}>×</button></div>)}</div>
      </aside>
      <section className="editor-column">
        <div className="editor-top"><div><div className="eyebrow">CURRENT GARDEN</div><input className="garden-name" aria-label="Garden name" value={garden.name} maxLength={80} onChange={e=>applyGarden({...garden,name:e.target.value},true,'garden-name')}/></div>
          <div className="mode-switch"><button className={mode==='illustration'?'on':''} onClick={()=>{setMode('illustration');setNewTool('select');}}>✦ ILLUSTRATION</button><button className={mode==='scale'?'on':''} onClick={()=>{setMode('scale');setNewTool('select');}}>▦ SCALE</button></div>
        </div>
        {garden.linkMigration&&!garden.linkMigration.confirmed&&<section className="migration-panel" role="alertdialog" aria-label="Choose your linked map source">
          <strong>LINK YOUR EXISTING GARDEN</strong>
          <p>Your previous Scale and Illustration maps may differ. Both originals have been archived inside this garden and will be included in your JSON backups. Choose which old layout should become the single editable layout.</p>
          <div className="migration-actions"><button className={garden.linkMigration.source==='scale'?'active':''} onClick={()=>applyGarden(previewLinkedSource(garden,'scale'),false)}>PREVIEW SCALE</button><button className={garden.linkMigration.source==='illustration'?'active':''} onClick={()=>applyGarden(previewLinkedSource(garden,'illustration'),false)}>PREVIEW ILLUSTRATION</button></div>
          <button className="btn btn-highlight" onClick={()=>{applyGarden(chooseLinkedSource(garden,garden.linkMigration!.source),false);setPast([]);setFuture([]);setNotice('Both maps are now linked. The original layouts remain in your JSON backups.');}}>USE {garden.linkMigration.source.toUpperCase()} AS SHARED MAP</button>
          <button className="btn btn-muted" onClick={()=>download(`garden-atlas-pre-link-${slug(garden.name)}.json`,JSON.stringify(garden.linkMigration!.original,null,2))}>↓ DOWNLOAD ORIGINAL TWO-VIEW BACKUP</button>
          <p className="migration-note">Choose a source before editing. Your original P006 browser storage remains recoverable using the previous local recovery snapshot or a backup.</p>
        </section>}
        <div className={`map-frame ${garden.linkMigration&&!garden.linkMigration.confirmed?'migration-locked':''}`}><div className="map-toolbar"><span>● {mode==='scale'?'MEASURED MAP':'PIXEL MAP'} · {garden.width} × {garden.height} m</span><button type="button" className="map-size-toggle" aria-expanded={mapSizeOpen} aria-controls="map-size-panel" onClick={()=>setMapSizeOpen(o=>!o)}>▣ MAP SIZE {mapSizeOpen?'▴':'▾'}</button></div>
          {mapSizeOpen&&<section id="map-size-panel" className="map-size-panel" aria-label="Map size and surrounding workspace">
            <div className="map-size-heading"><strong>EDIT MAP SIZE</strong><span>Both map styles use the same dimensions</span></div>
            <p>Set the surrounding <b>workspace</b> size separately from the property boundary. You can enlarge the map without stretching trees, paths or land measurements.</p>
            <div className="map-size-fields">
              <label>WIDTH (m)<input type="number" min="10" max="500" step="1" value={dims.width} onChange={e=>setDims(d=>({...d,width:e.target.value}))}/></label>
              <label>HEIGHT (m)<input type="number" min="10" max="500" step="1" value={dims.height} onChange={e=>setDims(d=>({...d,height:e.target.value}))}/></label>
            </div>
            <fieldset className="map-size-modes"><legend>WHEN RESIZING</legend>
              <label><input type="radio" name="map-resize-mode" checked={resizeMode==='preserve'} onChange={()=>setResizeMode('preserve')}/> Keep actual garden size and positions <small>Recommended: change only the surrounding workspace; unsafe shrinking is blocked.</small></label>
              <label><input type="radio" name="map-resize-mode" checked={resizeMode==='scale'} onChange={()=>setResizeMode('scale')}/> Scale entire garden to fit <small>Changes distances, plant positions, boundaries and paths. Requires confirmation.</small></label>
            </fieldset>
            <div className="map-size-actions"><button className="btn btn-highlight" onClick={changeDimensions}>APPLY MAP SIZE</button><button className="btn btn-muted" onClick={()=>setDims({width:String(garden.width),height:String(garden.height)})}>RESET FIELDS</button></div>
            <div className="map-margin-controls"><span>NEED MORE SURROUNDINGS?</span><button className="btn btn-muted" onClick={()=>expandAroundGarden(10)}>+10 m EACH SIDE</button><button className="btn btn-muted" onClick={()=>expandAroundGarden(25)}>+25 m EACH SIDE</button></div>
            <p className="map-size-footnote">Property outline: {polygonArea(garden.layout.boundary).toFixed(1)} m². To alter the actual land border, use DRAW BORDER or EDIT BORDER. All changes can be undone.</p>
          </section>}
          <div className="editor-history-bar" aria-label="Editing history">
              <button className={multiSelect?'active-history':''} aria-pressed={multiSelect} onClick={()=>{setMultiSelect(v=>!v);setTool('select');setSelectedGroupId(null);setSelectedId(null);}} title="Tap objects to select multiple">◩ MULTI</button>
              <button className={snapEnabled?'active-history':''} aria-pressed={snapEnabled} onClick={()=>setSnapEnabled(v=>!v)} title="Snap moves and placements to a 0.5 metre grid">⌗ SNAP {snapEnabled?'ON':'OFF'}</button>
              <button disabled={!past.length||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onClick={undo} title="Undo · Ctrl/Cmd+Z">↶ UNDO</button>
              <button disabled={!future.length||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onClick={redo} title="Redo · Ctrl/Cmd+Shift+Z">↷ REDO</button>
              <span>{garden.linkMigration&&!garden.linkMigration.confirmed?'CHOOSE MAP SOURCE FIRST':'BOTH MAPS LINKED'}</span>
            </div>
            <div className="primary-tools" role="toolbar" aria-label="Editor interaction tools">
            {([{id:'select',label:'↖ SELECT'},{id:'pan',label:'✋ PAN'},{id:'feature-edit',label:'✎ EDIT FEATURES'},{id:'outline-edit',label:'◇ EDIT BORDER'},{id:'outline-draw',label:'✎ DRAW BORDER'},{id:'freehand',label:'〰 FREEHAND'},{id:'terrain',label:'▧ TERRAIN'},{id:'path',label:'〰 PATH'},{id:'fence',label:'┃ FENCE'}] as {id:Tool;label:string}[]).map(x=><button key={x.id} className={tool===x.id?'active':''} onClick={()=>setNewTool(x.id)}>{x.label}</button>)}
          </div>
          {(tool==='path'||tool==='fence')&&<div className="terrain-chooser"><span>{tool.toUpperCase()} WIDTH (M)</span><input aria-label="Path or fence width in metres" type="number" min="0.2" max="12" step="0.2" value={lineWidth} onChange={e=>{const n=Number(e.target.value);if(n>=.2&&n<=12)setLineWidth(n);}}/></div>}
          {tool==='terrain'&&<div className="terrain-chooser"><span>NEW REGION</span><select aria-label="Terrain brush" value={ground} onChange={e=>setGround(e.target.value as Ground)}>{GROUNDS.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>}
          <div className="reference-toolbar">
            <button className="btn btn-muted" onClick={()=>setReferenceOpen(o=>!o)} aria-expanded={referenceOpen} aria-controls="reference-panel">▧ TRACE IMAGE {referenceOpen?'▴':'▾'} {garden.reference?'●':''}</button>
            {garden.reference&&<label><input type="checkbox" checked={showReference} onChange={e=>setShowReference(e.target.checked)}/> SHOW ON MAP</label>}
          </div>
          {referenceOpen&&<section id="reference-panel" className="reference-panel" aria-label="Local reference image controls">
            <p>Import a JPG, PNG or WebP aerial photo or plan. The image stays on this device, and is included in JSON backups. No automatic geolocation or measurement accuracy is assumed.</p>
            <input ref={referenceFile} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={referenceChange}/>
            <button className="btn btn-highlight" disabled={importingReference} onClick={()=>referenceFile.current?.click()}>{importingReference?'PROCESSING IMAGE…':garden.reference?'REPLACE REFERENCE IMAGE':'IMPORT REFERENCE IMAGE'}</button>
            {garden.reference&&<>
              <small>{garden.reference.name} · shown in BOTH map styles</small>
              <label>OPACITY {Math.round(garden.reference.opacity*100)}%<input type="range" min="5" max="100" step="5" value={garden.reference.opacity*100} onChange={e=>updateReference({opacity:Number(e.target.value)/100})}/></label>
              <label>IMAGE WIDTH (metres)<input type="number" min="0.5" max={garden.width} step="0.5" value={Number(garden.reference.widthM.toFixed(2))} onChange={e=>referenceWidth(Number(e.target.value))}/></label>
              <div className="reference-coordinates">
                <label>LEFT X (m)<input type="number" min="0" max={garden.width-garden.reference.widthM} step="0.5" value={Number(garden.reference.x.toFixed(2))} onChange={e=>updateReference({x:Number(e.target.value)})}/></label>
                <label>TOP Y (m)<input type="number" min="0" max={garden.height-garden.reference.heightM} step="0.5" value={Number(garden.reference.y.toFixed(2))} onChange={e=>updateReference({y:Number(e.target.value)})}/></label>
              </div>
              <button className="btn btn-danger" onClick={()=>{if(window.confirm('Remove this tracing image from your garden? Undo can restore it.')){const {reference:_reference,...rest}=garden;void _reference;applyGarden(rest);}}}>REMOVE REFERENCE</button>
              <p>Align the image using width and X/Y offsets. For accurate tracing, calibrate from a known real-world distance. This is a visual reference, not a legal survey.</p>
            </>}
          </section>}
          {tool==='feature-edit'&&<div className="feature-edit-controls" role="group" aria-label="Edit selected path or terrain">
            <span>{selectedFeature?`EDIT ${selectedFeature.kind.toUpperCase()} · ${selectedFeature.id}`:'SELECT A PATH, FENCE OR TERRAIN REGION'}</span>
            <button disabled={!selectedFeature||selectedVertex===null} onClick={()=>{
              if(selectedFeature&&selectedVertex!==null){editExistingFeature(selectedFeature,selectedVertex,'remove');setSelectedVertex(null);}
            }}>− REMOVE SELECTED POINT</button>
            <button onClick={()=>{setSelectedFeature(null);setSelectedVertex(null);}}>CLEAR SELECTION</button>
          </div>}
          <div className="quick-palette" aria-label="Quick add garden objects">{KINDS.map(k=><button key={k.kind} className={tool===k.kind?'active':''} onClick={()=>{setPresetId(defaultPreset(k.kind).id);setNewTool(k.kind);}} title={`Place ${k.label}`}><Icon kind={k.kind} presetId={defaultPreset(k.kind).id} size={29}/><span>{k.label}</span></button>)}<button className={tool==='select'?'active':''} onClick={()=>setNewTool('select')} title="Select and drag">↖<span>Move</span></button></div>
          <MapView garden={garden} mode={mode} tool={tool} terrain={ground} lineWidth={lineWidth} selectedId={selectedId} selectedGroupId={selectedGroupId} hidden={visibility} showReference={showReference} snapEnabled={snapEnabled} selectedIds={checkedIds} multiSelect={multiSelect} locked={locked} selectedFeature={selectedFeature} onSelectFeature={feature=>{setSelectedFeature(feature);setSelectedVertex(null);}} onSelectVertex={setSelectedVertex} onEditFeature={editExistingFeature} onResizeObject={resizeSelected}
            onPick={select} onTogglePick={togglePick} onMoveSelection={moveMultiple} onPlace={place} onMove={move} onBoundary={outline} onTerrain={addArea} onLine={addMapLine} onNotice={setNotice}/>
          <div className="map-bottom"><span>{tool==='select'?(multiSelect?'MULTI MODE · TAP TO SELECT · DRAG SELECTED ITEMS TOGETHER':'DRAG ITEMS · PAN EMPTY SPACE · PINCH TO ZOOM'):tool==='pan'?'DRAG MAP · PINCH TO ZOOM':tool==='feature-edit'?'TAP PATH OR TERRAIN · DRAG HANDLES · TAP EDGE TO ADD POINT':tool==='outline-edit'?'DRAG CORNERS · TAP EDGE MIDPOINTS TO INSERT':tool==='outline-draw'?'TAP CORNERS · FINISH TO CLOSE OUTLINE':tool==='freehand'?'DRAW A CLOSED BORDER WITH ONE FINGER':tool==='terrain'?'TAP AREA CORNERS · FINISH TO ADD TERRAIN':tool==='path'||tool==='fence'?'TAP LINE POINTS · FINISH TO CREATE':`TAP TO PLACE ${tool.toUpperCase()}`}</span></div>
        </div>
        <div className="status-message" role="status">✦ {notice}</div>
        <div className="feature-strip"><span>■ P012 PLANT ATLAS · SPECIMEN HISTORY</span><span>■ TOUCH-FIRST</span><span>■ LINKED SCALE + PIXEL VIEWS</span><span>■ LOCAL BACKUPS</span></div>
      </section>
      <aside className={`panel details-panel ${selectedPanel==='inspector'?'mobile-active':''}`}>
        <div className="section-heading">06 / INSPECTOR</div>
        {selected?<>
          <div className="selected-preview"><div className="preview-art"><Icon kind={selected.kind} presetId={selected.presetId} size={80}/></div><strong>{selected.id}</strong><p>{info(selected.kind).label} · shared record</p></div>
          <label className="field">PIXEL-ART APPEARANCE
            <select value={selected.presetId??defaultPreset(selected.kind).id} disabled={locked.objects}
              onChange={e=>{const updated=changeObjectPreset(garden,selected.id,e.target.value);if(updated)applyGarden(updated);}}>
              {PRESETS.filter(p=>p.kind===selected.kind).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <small>Change the look without replacing this record or altering its size.</small>
          </label>
          <label className="field">DISPLAY NAME<input maxLength={80} value={selected.name} onChange={e=>objectPatch(selected.id,{name:e.target.value},'name')}/></label>
          <label className="field">SPECIES / TYPE<input maxLength={140} value={selected.species} placeholder="Optional" onChange={e=>objectPatch(selected.id,{species:e.target.value},'species')}/></label>
          <label className="field">GROUP<select value={selected.groupId??''} onChange={e=>objectPatch(selected.id,{groupId:e.target.value||null})}><option value="">— UNGROUPED —</option>{garden.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="field">ROTATION (DEGREES)<input type="number" min="0" max="359" step="5" value={selected.rotation??0} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=0&&n<360)objectPatch(selected.id,{rotation:n});}}/></label>
          <label className="field">DIAMETER / WIDTH (METRES)<input type="number" min="0.5" max="100" step="0.5" value={selected.diameterM} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=.5&&n<=100)objectPatch(selected.id,{diameterM:n});}}/></label>
          <label className="field">NOTES<textarea rows={4} maxLength={3000} value={selected.notes} onChange={e=>objectPatch(selected.id,{notes:e.target.value},'notes')}/></label>
          <div className="placement-box">SHARED POSITION: {selected.position?`${selected.position!.x.toFixed(1)} m × ${selected.position!.y.toFixed(1)} m`:'Not placed'}
            {!selected.position&&<button className="btn btn-highlight" onClick={()=>move(selected.id,{x:garden.width/2,y:garden.height/2},false)}>PLACE AT CENTER</button>}
            {selected.position&&<button className="btn btn-muted" onClick={()=>objectPatch(selected.id,{position:undefined})}>REMOVE FROM BOTH MAPS</button>}
          </div><div className="inspector-actions"><button disabled={locked.objects} className="btn btn-highlight" onClick={duplicate}>DUPLICATE</button><button disabled={locked.objects} className="btn btn-danger" onClick={removeObject}>DELETE</button></div>
          <PlantAtlasPanel key={selected.id} garden={garden} objectId={selected.id} disabled={locked.objects||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onNotice={setNotice}
            onChange={(edit,key)=>{if(locked.objects||libraryRef.current.activeId!==library.activeId)return;const current=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;applyGarden(edit(current),true,key);}}/>
        </>:selectedGroup?<>
          <div className="selected-preview">▦ <strong>{selectedGroup.id}</strong> · {garden.objects.filter(x=>x.groupId===selectedGroup.id).length} members</div>
          <label className="field">GROUP NAME<input maxLength={120} value={selectedGroup.name} onChange={e=>{if(e.target.value.trim())applyGarden({...garden,groups:garden.groups.map(g=>g.id===selectedGroup.id?{...g,name:e.target.value}:g)},true,'group-name:'+selectedGroup.id);}}/></label>
          <label className="field">GROUP NOTES<textarea maxLength={3000} value={selectedGroup.notes} onChange={e=>applyGarden({...garden,groups:garden.groups.map(g=>g.id===selectedGroup.id?{...g,notes:e.target.value}:g)},true,'group-notes:'+selectedGroup.id)}/></label>
          <p className="panel-hint">With the group selected, drag any of its members on the map to move them together. Both views update together.</p>
          <div className="group-list">{garden.objects.filter(o=>o.groupId===selectedGroup.id).map(o=><button key={o.id} className="group-entry" onClick={()=>select(o.id)}><Icon kind={o.kind} presetId={o.presetId} size={25}/>{o.name}</button>)}</div>
          <button disabled={locked.objects} className="btn btn-danger" onClick={()=>{if(!locked.objects&&window.confirm('Delete group? All its objects will be kept.')){applyGarden(removeGroup(garden,selectedGroup.id));setSelectedGroupId(null);}}}>DELETE GROUP · KEEP ITEMS</button>
        </>:<p className="empty-inspector">Tap an item on the map to inspect its shared record. Drag directly to move it.</p>}
        <div className="section-heading list-heading">MAP DIMENSIONS</div>
        <p className="panel-hint">Workspace: {garden.width} × {garden.height} m · Property outline: {polygonArea(garden.layout.boundary).toFixed(1)} m² (approximate). Map dimensions can now be changed above the map without stretching the garden.</p>
        <button className="btn btn-muted" onClick={()=>{setMapSizeOpen(true);window.scrollTo({top:0,behavior:'smooth'});}}>OPEN MAP SIZE SETTINGS ↑</button>
      </aside>
      <aside className={`panel project-panel ${selectedPanel==='projects'?'mobile-active':''}`}>
        <div className="section-heading">07 / MY GARDENS</div>
        <p className="panel-hint">Your projects are stored in this browser only. Download regular backups.</p>
        <div className="project-list">{library.projects.map(p=><button key={p.id} className={`project-entry ${p.id===library.activeId?'active':''}`} onClick={()=>{replaceLibrary({...library,activeId:p.id});setNotice(`Opened ${p.garden.name}.`);}}><span>▧ {p.garden.name}</span><small>{p.garden.objects.length} items · {p.garden.width}×{p.garden.height} m</small></button>)}</div>
        <div className="project-actions"><button className="btn btn-highlight" onClick={()=>newProject(false)}>+ EMPTY GARDEN</button><button className="btn btn-muted" onClick={()=>newProject(true)}>+ DEMO COPY</button><button className="btn btn-danger" onClick={removeProject}>DELETE CURRENT GARDEN</button></div>
        <div className="section-heading list-heading">BACKUP & RECOVERY</div>
        {garden.linkMigration&&<button className="btn btn-muted" onClick={()=>download(`garden-atlas-original-two-views-${slug(garden.name)}.json`,JSON.stringify(garden.linkMigration!.original,null,2))}>↓ EXPORT ORIGINAL PRE-LINK MAPS</button>}
        <div className="project-actions"><button className="btn btn-muted" onClick={()=>download(`garden-atlas-all-projects-${date()}.json`,JSON.stringify(library,null,2))}>↓ BACKUP ALL GARDENS</button><button className="btn btn-muted" onClick={()=>importAllFile.current?.click()}>↑ RESTORE ALL GARDENS</button><button className="btn btn-muted" onClick={recover}>↶ LOCAL RECOVERY COPY</button></div>
        <p className="panel-hint">JSON backups contain personal garden data. This version uses browser localStorage; clearing site data may erase it. No cloud sync.</p>
      </aside>
    </main>
    <nav className="mobile-nav" aria-label="Editor panels"><button className={selectedPanel==='tools'?'active':''} onClick={()=>setSelectedPanel('tools')}>♣ OBJECTS</button><button className={selectedPanel==='inspector'?'active':''} onClick={()=>setSelectedPanel('inspector')}>✎ DETAILS</button><button className={selectedPanel==='projects'?'active':''} onClick={()=>setSelectedPanel('projects')}>▧ GARDENS</button></nav>
    <footer className="footer">GARDEN ATLAS · P012 PLANT ATLAS & SPECIMEN RECORDS <span>OFFLINE LOCAL PROJECTS · NO ACCOUNTS</span></footer>
  </div><GardenReport garden={garden}/></>;
}
