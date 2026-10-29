import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MapView, type Tool } from './MapView';
import { Sprite } from './Sprite';
import {
  GROUNDS, KINDS, addRegion, clampPoint, demoGarden, emptyGarden, info, isGarden,
  movePlaced, nextGroupId, nextObjectId, polygonArea, removeGroup, resizeGarden, setBoundary,
  type Garden, type GardenObject, type Ground, type Kind, type Mode, type Point
} from './model';
import {
  addProject, deleteProject, importGarden, importLibrary, loadLibrary,
  loadLibraryRecovery, saveLibrary, updateActiveGarden, type ProjectLibrary
} from './storage';

type Visibility={objects:boolean;regions:boolean;boundary:boolean};
const ICONS=['✥','✿','♣','▤','⌂'];
function Icon({kind,size=38}:{kind:Kind;size?:number}){return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="item-art"><Sprite kind={kind}/></svg>;}
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
  const [selectedId,setSelectedId]=useState<string|null>('TREE-001');
  const [selectedGroupId,setSelectedGroupId]=useState<string|null>(null);
  const [selectedPanel,setSelectedPanel]=useState<'tools'|'inspector'|'projects'>('tools');
  const [visibility,setVisibility]=useState<Visibility>({objects:false,regions:false,boundary:false});
  const [newGroupName,setNewGroupName]=useState('');
  const [dims,setDims]=useState({width:String(garden.width),height:String(garden.height)});
  const [notice,setNotice]=useState('Drag objects directly · pinch to zoom · pan on open ground.');
  const [saved,setSaved]=useState(true);
  const [past,setPast]=useState<Garden[]>([]);
  const [future,setFuture]=useState<Garden[]>([]);
  const importFile=useRef<HTMLInputElement>(null),importAllFile=useRef<HTMLInputElement>(null);
  const selected=garden.objects.find(o=>o.id===selectedId)??null;
  const selectedGroup=garden.groups.find(g=>g.id===selectedGroupId)??null;
  useEffect(()=>{setSaved(saveLibrary(library));},[library]);
  useEffect(()=>{setDims({width:String(garden.width),height:String(garden.height)});},[library.activeId,garden.width,garden.height]);
  const applyGarden=(next:Garden,withHistory=true)=>{
    if(!isGarden(next)){setNotice('Change rejected: garden would become invalid.');return;}
    const previous=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;
    if(JSON.stringify(previous)===JSON.stringify(next))return;
    if(withHistory){setPast(list=>[...list.slice(-39),previous]);setFuture([]);}
    const updated=updateActiveGarden(libraryRef.current,next);libraryRef.current=updated;setLibrary(updated);
  };
  const replaceLibrary=(next:ProjectLibrary)=>{
    libraryRef.current=next;setLibrary(next);setPast([]);setFuture([]);setSelectedId(null);setSelectedGroupId(null);setTool('select');setSelectedPanel('tools');
  };
  const undo=()=>{if(!past.length)return;const prev=past[past.length-1];setPast(p=>p.slice(0,-1));setFuture(f=>[...f,garden]);applyGarden(prev,false);setNotice('Undid last edit.');};
  const redo=()=>{if(!future.length)return;const next=future[future.length-1];setFuture(f=>f.slice(0,-1));setPast(p=>[...p,garden]);applyGarden(next,false);setNotice('Redid edit.');};
  const select=(id:string|null)=>{setSelectedId(id);setSelectedGroupId(null);if(id)setSelectedPanel('inspector');};
  const selectGroup=(id:string)=>{setSelectedGroupId(id);setSelectedId(null);setTool('select');setSelectedPanel('inspector');};
  const objectPatch=(id:string,patch:Partial<GardenObject>)=>applyGarden({...garden,objects:garden.objects.map(o=>o.id===id?{...o,...patch}:o)});
  const place=(kind:Kind,p:Point)=>{
    if(garden.objects.length>=3000){setNotice('Garden item limit reached.');return;}
    const detail=info(kind),id=nextObjectId(garden,kind);
    const item:GardenObject={id,kind,name:detail.initialName,species:'',notes:'',groupId:null,diameterM:detail.diameterM,placements:{[mode]:clampPoint(p,garden)}};
    applyGarden({...garden,objects:[...garden.objects,item]});setSelectedId(id);setSelectedGroupId(null);
    setNotice(`${detail.label} placed. Choose another spot to place more, or select the hand tool.`);
  };
  const move=(id:string,point:Point,together:boolean)=>applyGarden(movePlaced(garden,id,mode,point,together));
  const outline=(points:Point[])=>{const next=setBoundary(garden,mode,points);if(next)applyGarden(next);else setNotice('Invalid boundary. Previous outline kept.');};
  const addArea=(points:Point[],type:Ground)=>{const next=addRegion(garden,mode,points,type);if(next)applyGarden(next);else setNotice('Could not add this region.');};
  const createGroup=()=>{
    const name=newGroupName.trim();if(!name)return;
    if(garden.groups.some(g=>g.name.toLowerCase()===name.toLowerCase())){setNotice('That group already exists.');return;}
    const id=nextGroupId(garden);
    applyGarden({...garden,groups:[...garden.groups,{id,name,notes:''}]});setNewGroupName('');selectGroup(id);
  };
  const duplicate=()=>{
    if(!selected||garden.objects.length>=3000)return;
    const id=nextObjectId(garden,selected.kind);
    const placements=Object.fromEntries(Object.entries(selected.placements).map(([key,pos])=>[key,clampPoint({x:pos!.x+1.2,y:pos!.y+1.2},garden)]));
    applyGarden({...garden,objects:[...garden.objects,{...selected,id,name:selected.name+' copy',placements}]});select(id);
    setNotice('Object duplicated 1.2 m away; drag it into place.');
  };
  const removeObject=()=>{
    if(!selected||!window.confirm(`Delete ${selected.name} from both map layouts and its record?`))return;
    applyGarden({...garden,objects:garden.objects.filter(x=>x.id!==selected.id)});select(null);
  };
  const changeDimensions=()=>{
    const width=Number(dims.width),height=Number(dims.height);
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<10||height<10||width>500||height>500){setNotice('Workspace dimensions must be from 10 to 500 metres.');return;}
    if(!window.confirm('Resize map dimensions? Existing object and boundary positions will scale proportionally; species data and IDs stay unchanged.'))return;
    const next=resizeGarden(garden,width,height);if(next){applyGarden(next);setNotice(`Workspace resized to ${width} × ${height} metres.`);}else setNotice('Cannot resize: result would contain invalid geometry.');
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
    if(file.size>4_000_000){setNotice('File too large (4 MB limit).');return;}
    void file.text().then(text=>{
      if(all){const next=importLibrary(text);if(!next){setNotice('Invalid Garden Atlas library backup.');return;}
        if(window.confirm('Replace ALL local gardens with this library backup?')){replaceLibrary(next);setNotice('Garden library restored.');}
      }else{const nextGarden=importGarden(text);if(!nextGarden){setNotice('Invalid garden file. P001–P004 backups are supported.');return;}
        const next=addProject(library,nextGarden);if(!next){setNotice('Maximum 20 projects.');return;}
        replaceLibrary(next);setNotice('Garden imported as a separate project. Existing gardens were preserved.');
      }
    }).catch(()=>setNotice('Could not read the file.'));
  };
  const setNewTool=(value:Tool)=>{setTool(value);if(value==='select'||value==='pan')setNotice(value==='select'?'Drag an object to move it, or drag empty ground to pan.':'Pan around the map; pinch with two fingers to zoom.');};
  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-icon">✿</span><div><div className="brand-name">GARDEN <span>ATLAS</span></div><div className="brand-caption">PIXEL LANDSCAPE EDITOR · P004</div></div></div>
      <div className="top-actions"><span className={`save-status ${saved?'':'danger'}`}>● {saved?'LOCAL SAVE':'NOT SAVED'}</span>
        <button className="btn btn-muted" onClick={()=>importFile.current?.click()}>IMPORT</button>
        <button className="btn btn-highlight" onClick={()=>download(`garden-atlas-${slug(garden.name)}-${date()}.json`,JSON.stringify(garden,null,2))}>↓ BACKUP</button>
        <input hidden ref={importFile} type="file" accept=".json,application/json" onChange={e=>onImport(e,false)}/>
        <input hidden ref={importAllFile} type="file" accept=".json,application/json" onChange={e=>onImport(e,true)}/>
      </div>
    </header>
    <main className="workspace">
      <aside className={`panel library-panel ${selectedPanel==='tools'?'mobile-active':''}`}>
        <div className="section-heading">01 / OBJECT LIBRARY</div>
        <p className="panel-hint">Choose an item, then tap repeatedly to place. Switch to SELECT to drag it.</p>
        <div className="palette-grid">{KINDS.map((k,i)=><button key={k.kind} className={`palette-item ${tool===k.kind?'active':''}`} onClick={()=>setNewTool(k.kind)}><Icon kind={k.kind}/><span>{k.label}</span><small>{ICONS[i]}</small></button>)}</div>
        <div className="section-heading list-heading">02 / GARDEN ITEMS <span className="pill">{garden.objects.length}</span></div>
        <div className="item-list">{garden.objects.map(o=><button key={o.id} className={`object-entry ${selectedId===o.id?'active':''}`} onClick={()=>{select(o.id);setNewTool('select');}}><Icon kind={o.kind} size={28}/><span>{o.name}<small>{o.id} {o.placements[mode]?'●':'○'}</small></span></button>)}</div>
        <div className="section-heading list-heading">03 / GROUPS <span className="pill">{garden.groups.length}</span></div>
        <div className="group-create"><input aria-label="New group name" value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} maxLength={120} placeholder="Group name" onKeyDown={e=>{if(e.key==='Enter')createGroup();}}/><button className="btn btn-highlight" onClick={createGroup}>+</button></div>
        <div className="group-list">{garden.groups.map(group=><button className={`group-entry ${selectedGroupId===group.id?'active':''}`} key={group.id} onClick={()=>selectGroup(group.id)}><span>▦</span><span>{group.name}<small>{garden.objects.filter(o=>o.groupId===group.id).length} members</small></span></button>)}</div>
        <div className="section-heading list-heading">04 / LAYERS</div>
        <div className="layer-list">{([{key:'objects',label:'Plants & structures'},{key:'regions',label:'Terrain regions'},{key:'boundary',label:'Property outline'}] as const).map(x=><label key={x.key}><input type="checkbox" checked={!visibility[x.key]} onChange={e=>setVisibility(v=>({...v,[x.key]:!e.target.checked}))}/>{x.label}</label>)}</div>
        <div className="section-heading list-heading">05 / TERRAIN AREAS</div>
        <div className="terrain-list">{garden.layouts[mode].regions.map(r=><div className="terrain-entry" key={r.id}><span>{r.name} · {r.id}</span><button onClick={()=>applyGarden({...garden,layouts:{...garden.layouts,[mode]:{...garden.layouts[mode],regions:garden.layouts[mode].regions.filter(x=>x.id!==r.id)}}})}>×</button></div>)}</div>
      </aside>
      <section className="editor-column">
        <div className="editor-top"><div><div className="eyebrow">CURRENT GARDEN</div><input className="garden-name" aria-label="Garden name" value={garden.name} maxLength={80} onChange={e=>applyGarden({...garden,name:e.target.value})}/></div>
          <div className="mode-switch"><button className={mode==='illustration'?'on':''} onClick={()=>{setMode('illustration');setNewTool('select');}}>✦ ILLUSTRATION</button><button className={mode==='scale'?'on':''} onClick={()=>{setMode('scale');setNewTool('select');}}>▦ SCALE</button></div>
        </div>
        <div className="map-frame"><div className="map-toolbar"><span>● {mode==='scale'?'MEASURED MAP':'PIXEL MAP'} · {garden.width} × {garden.height} m</span><span>DRAG · PAN · PINCH</span></div>
          <div className="primary-tools" role="toolbar" aria-label="Editor interaction tools">
            {([{id:'select',label:'↖ SELECT'},{id:'pan',label:'✋ PAN'},{id:'outline-edit',label:'◇ EDIT BORDER'},{id:'outline-draw',label:'✎ DRAW BORDER'},{id:'freehand',label:'〰 FREEHAND'},{id:'terrain',label:'▧ TERRAIN'}] as {id:Tool;label:string}[]).map(x=><button key={x.id} className={tool===x.id?'active':''} onClick={()=>setNewTool(x.id)}>{x.label}</button>)}
          </div>
          {tool==='terrain'&&<div className="terrain-chooser"><span>NEW REGION</span><select aria-label="Terrain brush" value={ground} onChange={e=>setGround(e.target.value as Ground)}>{GROUNDS.map(g=><option key={g.value} value={g.value}>{g.label}</option>)}</select></div>}
          <MapView garden={garden} mode={mode} tool={tool} terrain={ground} selectedId={selectedId} selectedGroupId={selectedGroupId} hidden={visibility}
            onPick={select} onPlace={place} onMove={move} onBoundary={outline} onTerrain={addArea} onNotice={setNotice}/>
          <div className="map-bottom"><span>{tool==='select'?'DRAG ITEMS · PAN EMPTY SPACE · PINCH TO ZOOM':tool==='pan'?'DRAG MAP · PINCH TO ZOOM':tool==='outline-edit'?'DRAG CORNERS · TAP EDGE MIDPOINTS TO INSERT':tool==='outline-draw'?'TAP CORNERS · FINISH TO CLOSE OUTLINE':tool==='freehand'?'DRAW A CLOSED BORDER WITH ONE FINGER':tool==='terrain'?'TAP AREA CORNERS · FINISH TO ADD TERRAIN':`TAP TO PLACE ${tool.toUpperCase()}`}</span><div className="history"><button disabled={!past.length} onClick={undo}>↶ UNDO</button><button disabled={!future.length} onClick={redo}>↷ REDO</button></div></div>
        </div>
        <div className="status-message" role="status">✦ {notice}</div>
        <div className="feature-strip"><span>■ TOUCH-FIRST</span><span>■ INDEPENDENT MAPS</span><span>■ LOCAL BACKUPS</span></div>
      </section>
      <aside className={`panel details-panel ${selectedPanel==='inspector'?'mobile-active':''}`}>
        <div className="section-heading">06 / INSPECTOR</div>
        {selected?<>
          <div className="selected-preview"><div className="preview-art"><Icon kind={selected.kind} size={80}/></div><strong>{selected.id}</strong><p>{info(selected.kind).label} · shared record</p></div>
          <label className="field">DISPLAY NAME<input maxLength={80} value={selected.name} onChange={e=>objectPatch(selected.id,{name:e.target.value})}/></label>
          <label className="field">SPECIES / TYPE<input maxLength={140} value={selected.species} placeholder="Optional" onChange={e=>objectPatch(selected.id,{species:e.target.value})}/></label>
          <label className="field">GROUP<select value={selected.groupId??''} onChange={e=>objectPatch(selected.id,{groupId:e.target.value||null})}><option value="">— UNGROUPED —</option>{garden.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          <label className="field">DIAMETER / WIDTH (METRES)<input type="number" min="0.5" max="100" step="0.5" value={selected.diameterM} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=.5&&n<=100)objectPatch(selected.id,{diameterM:n});}}/></label>
          <label className="field">NOTES<textarea rows={4} maxLength={3000} value={selected.notes} onChange={e=>objectPatch(selected.id,{notes:e.target.value})}/></label>
          <div className="placement-box">{mode.toUpperCase()} POSITION: {selected.placements[mode]?`${selected.placements[mode]!.x.toFixed(1)} m × ${selected.placements[mode]!.y.toFixed(1)} m`:'Not placed'}
            {!selected.placements[mode]&&<button className="btn btn-highlight" onClick={()=>move(selected.id,{x:garden.width/2,y:garden.height/2},false)}>PLACE AT CENTER</button>}
            {selected.placements[mode]&&<button className="btn btn-muted" onClick={()=>{const placements={...selected.placements};delete placements[mode];objectPatch(selected.id,{placements});}}>UNPLACE ON THIS MAP</button>}
          </div><div className="inspector-actions"><button className="btn btn-highlight" onClick={duplicate}>DUPLICATE</button><button className="btn btn-danger" onClick={removeObject}>DELETE</button></div>
        </>:selectedGroup?<>
          <div className="selected-preview">▦ <strong>{selectedGroup.id}</strong> · {garden.objects.filter(x=>x.groupId===selectedGroup.id).length} members</div>
          <label className="field">GROUP NAME<input maxLength={120} value={selectedGroup.name} onChange={e=>{if(e.target.value.trim())applyGarden({...garden,groups:garden.groups.map(g=>g.id===selectedGroup.id?{...g,name:e.target.value}:g)});}}/></label>
          <label className="field">GROUP NOTES<textarea maxLength={3000} value={selectedGroup.notes} onChange={e=>applyGarden({...garden,groups:garden.groups.map(g=>g.id===selectedGroup.id?{...g,notes:e.target.value}:g)})}/></label>
          <p className="panel-hint">With the group selected, drag any of its members on the map to move them together. Other map positions remain unchanged.</p>
          <div className="group-list">{garden.objects.filter(o=>o.groupId===selectedGroup.id).map(o=><button key={o.id} className="group-entry" onClick={()=>select(o.id)}><Icon kind={o.kind} size={25}/>{o.name}</button>)}</div>
          <button className="btn btn-danger" onClick={()=>{if(window.confirm('Delete group? All its objects will be kept.')){applyGarden(removeGroup(garden,selectedGroup.id));setSelectedGroupId(null);}}}>DELETE GROUP · KEEP ITEMS</button>
        </>:<p className="empty-inspector">Tap an item on the map to inspect its shared record. Drag directly to move it.</p>}
        <div className="section-heading list-heading">WORKSPACE DIMENSIONS</div>
        <p className="panel-hint">Actual scale dimensions. Changing dimensions proportionally rescales positions and outlines.</p>
        <div className="dimension-row"><label>WIDTH (M)<input type="number" min="10" max="500" value={dims.width} onChange={e=>setDims(d=>({...d,width:e.target.value}))}/></label><label>HEIGHT (M)<input type="number" min="10" max="500" value={dims.height} onChange={e=>setDims(d=>({...d,height:e.target.value}))}/></label></div>
        <button className="btn btn-muted" onClick={changeDimensions}>APPLY SIZE</button>
        <p className="panel-hint">Plot area (Scale): {polygonArea(garden.layouts.scale.boundary).toFixed(1)} m². Not a geospatial survey.</p>
      </aside>
      <aside className={`panel project-panel ${selectedPanel==='projects'?'mobile-active':''}`}>
        <div className="section-heading">07 / MY GARDENS</div>
        <p className="panel-hint">Your projects are stored in this browser only. Download regular backups.</p>
        <div className="project-list">{library.projects.map(p=><button key={p.id} className={`project-entry ${p.id===library.activeId?'active':''}`} onClick={()=>{replaceLibrary({...library,activeId:p.id});setNotice(`Opened ${p.garden.name}.`);}}><span>▧ {p.garden.name}</span><small>{p.garden.objects.length} items · {p.garden.width}×{p.garden.height} m</small></button>)}</div>
        <div className="project-actions"><button className="btn btn-highlight" onClick={()=>newProject(false)}>+ EMPTY GARDEN</button><button className="btn btn-muted" onClick={()=>newProject(true)}>+ DEMO COPY</button><button className="btn btn-danger" onClick={removeProject}>DELETE CURRENT GARDEN</button></div>
        <div className="section-heading list-heading">BACKUP & RECOVERY</div>
        <div className="project-actions"><button className="btn btn-muted" onClick={()=>download(`garden-atlas-all-projects-${date()}.json`,JSON.stringify(library,null,2))}>↓ BACKUP ALL GARDENS</button><button className="btn btn-muted" onClick={()=>importAllFile.current?.click()}>↑ RESTORE ALL GARDENS</button><button className="btn btn-muted" onClick={recover}>↶ LOCAL RECOVERY COPY</button></div>
        <p className="panel-hint">JSON backups contain personal garden data. This version uses browser localStorage; clearing site data may erase it. No cloud sync.</p>
      </aside>
    </main>
    <nav className="mobile-nav" aria-label="Editor panels"><button className={selectedPanel==='tools'?'active':''} onClick={()=>setSelectedPanel('tools')}>♣ OBJECTS</button><button className={selectedPanel==='inspector'?'active':''} onClick={()=>setSelectedPanel('inspector')}>✎ DETAILS</button><button className={selectedPanel==='projects'?'active':''} onClick={()=>setSelectedPanel('projects')}>▧ GARDENS</button></nav>
    <footer className="footer">GARDEN ATLAS · P004 TOUCH-FIRST EDITOR <span>OFFLINE LOCAL PROJECTS · NO ACCOUNTS</span></footer>
  </div>;
}
