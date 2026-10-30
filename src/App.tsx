import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MapView, type Tool } from './MapView';
import { EDITOR_TOOLS, activeToolDescription } from './editorVisuals';
import { ObjectIcon } from './components/ObjectIcon';
import { ObjectCatalog } from './components/ObjectCatalog';
import { PlantAtlasPanel } from './PlantAtlasPanel';
import { ObjectDimensions } from './ObjectDimensions';
import { NameDraftInput } from './NameDraftInput';
import { MetricDraftInput } from './MetricDraftInput';
import { PRESETS, defaultPreset, getPreset } from './catalog';
import { GardenReport } from './Report';
import { EditorHeader, type SaveStatus } from './components/EditorHeader';
import { GardenProjectsPanel } from './components/GardenProjectsPanel';
import { MobileNavigation, type EditorPanel } from './components/MobileNavigation';
import { downloadJson, gardenSlug, backupDate } from './utils/backup';
import { imageToReference } from './reference';
import { isSameEditBurst, type EditBurst } from './history';
import { editFeaturePoint, resizeObjectAxes, type FeatureSelection, type EditAction } from './featureEdit';
import {
  GROUNDS, KINDS, createPresetObject, changeObjectPreset, addLine, addRegion, alignSelection, moveSelection, setReferenceWidth, clampPoint, demoGarden, emptyGarden, info, isGarden,
  movePlaced, nextGroupId, nextObjectId, polygonArea, removeGroup, resizeGarden, resizeWorkspace, addSurroundings, setBoundary, previewLinkedSource, chooseLinkedSource,
  type Garden, type GardenObject, type Ground, type Kind, type Mode, type Point, type LineKind
} from './model';
import {
  addProject, deleteProject, importGarden, importLibrary, loadLibrary,
  updateActiveGarden, type ProjectLibrary
} from './storage';
import { openBrowserLibrary, createBrowserWriter, approveBrowserRecovery, exportStoredRecords, recoverBrowserLibrary, estimateBrowserSpace, requestPersistentStorage, type StorageBackend } from './browserStorage';

type LayerKey='objects'|'regions'|'lines'|'boundary';
type LayerState=Record<LayerKey,boolean>;
type Visibility=LayerState;
export default function App(){
  const [library,setLibrary]=useState<ProjectLibrary>(loadLibrary);
  const libraryRef=useRef(library);libraryRef.current=library;
  const garden=library.projects.find(p=>p.id===library.activeId)!.garden;
  const [mode,setMode]=useState<Mode>('illustration');
  const [draftCount,setDraftCount]=useState(0);
  const [tool,setTool]=useState<Tool>('select');
  const [ground,setGround]=useState<Ground>('soil');
  const [presetId,setPresetId]=useState('tree-oak');
  const [lineWidth,setLineWidth]=useState(1.5);
  const [selectedId,setSelectedId]=useState<string|null>('TREE-001');
  const [selectedGroupId,setSelectedGroupId]=useState<string|null>(null);
  const [selectedPanel,setSelectedPanel]=useState<EditorPanel>('map');
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
  const inspectorRef=useRef<HTMLElement>(null);
  const toolsPanelRef=useRef<HTMLElement>(null);
  const projectsPanelRef=useRef<HTMLElement>(null);
  const mapFrameRef=useRef<HTMLDivElement>(null);
  const editorRef=useRef<HTMLElement>(null);
  /** Mobile tab navigation must scroll to the *visible* section after React renders it. */
  const navigateTo=(section:EditorPanel)=>{
    const mobile=window.matchMedia('(max-width:760px)').matches;
    if(mobile){
      const focused=document.activeElement;
      if(focused instanceof HTMLElement&&focused.matches('input, textarea, select'))focused.blur();
    }
    setSelectedPanel(section);
    window.requestAnimationFrame(()=>{
      if(!mobile&&section!=='inspector')return;
      const target=section==='map'?editorRef.current:section==='tools'?toolsPanelRef.current:section==='inspector'?inspectorRef.current:projectsPanelRef.current;
      target?.scrollIntoView({behavior:'auto',block:'start'});
    });
  };
  const showDetails=()=>navigateTo('inspector');
  const [dims,setDims]=useState({width:String(garden.width),height:String(garden.height)});
  const [mapSizeOpen,setMapSizeOpen]=useState(false);
  const [resizeMode,setResizeMode]=useState<'preserve'|'scale'>('preserve');
  const [notice,setNotice]=useState('Linked maps: edits to either view update both · pinch to zoom.');
  const [saveStatus,setSaveStatus]=useState<SaveStatus>('loading');
  const saved=saveStatus==='saved';
  const [hydrated,setHydrated]=useState(false);
  const [backend,setBackend]=useState<StorageBackend>('indexeddb');
  const [storageLocked,setStorageLocked]=useState(false);
  const writerRef=useRef<ReturnType<typeof createBrowserWriter>|null>(null);
  const skipFirstSave=useRef(true);
  const migrationPending=useRef(false);
  const [storageInfo,setStorageInfo]=useState('Checking storage…');
  const [past,setPast]=useState<Garden[]>([]);
  const historyGroup=useRef<EditBurst|null>(null);
  const [future,setFuture]=useState<Garden[]>([]);
  const importFile=useRef<HTMLInputElement>(null),importAllFile=useRef<HTMLInputElement>(null);
  const selected=garden.objects.find(o=>o.id===selectedId)??null;
  const selectedGroup=garden.groups.find(g=>g.id===selectedGroupId)??null;
  useEffect(()=>{
    let cancelled=false;
    void openBrowserLibrary().then(result=>{
      if(cancelled)return;
      libraryRef.current=result.library;setLibrary(result.library);setBackend(result.backend);
      writerRef.current=createBrowserWriter(result.backend,result.revision);
      migrationPending.current=result.needsMigration;
      skipFirstSave.current=true;
      setStorageLocked(result.locked);
      setHydrated(true);
      setSaveStatus(result.locked?'blocked':result.needsMigration?'saving':'saved');
      if(result.warning)setNotice(result.warning);
      void estimateBrowserSpace().then(v=>{if(!cancelled)setStorageInfo(v);});
    }).catch(()=>{
      if(!cancelled){setSaveStatus('failed');setNotice('Cannot load local garden storage. No changes have been saved.');}
    });
    return ()=>{cancelled=true;};
  },[]);
  useEffect(()=>{
    if(!hydrated||storageLocked||saveStatus==='conflict')return;
    if(skipFirstSave.current){
      skipFirstSave.current=false;
      if(!migrationPending.current){setSaveStatus('saved');return;}
    }
    migrationPending.current=false;
    let active=true;
    setSaveStatus('saving');
    void writerRef.current?.save(library).then(result=>{
      if(!active)return;
      if(result.status==='saved')setSaveStatus('saved');
      else if(result.status==='conflict'){
        setSaveStatus('conflict');
        setNotice('ANOTHER TAB SAVED THIS LIBRARY: This tab has been paused to prevent overwriting newer changes. Export your work before reloading.');
      }else{
        setSaveStatus('failed');
        setNotice('SAVE FAILED: Your latest changes are not safely stored. Export a JSON backup now.');
      }
      void estimateBrowserSpace().then(v=>{if(active)setStorageInfo(v);});
    }).catch(()=>{
      if(!active)return;
      setSaveStatus('failed');
      setNotice('SAVE FAILED: Browser storage is unavailable. Export a JSON backup now.');
    });
    return ()=>{active=false;};
  },[library,hydrated,backend,storageLocked]);
  const restoreDamagedData=async()=>{
    if(!window.confirm('Replace the damaged saved record with the displayed recovery or local fallback? The original damaged records will be preserved separately in IndexedDB. Download the raw record and a JSON backup first.'))return;
    const result=await approveBrowserRecovery(libraryRef.current);
    if(result.status!=='saved'){
      setNotice(result.status==='conflict'?'Saved data changed in another tab. Reload before attempting recovery.':'Recovery could not be saved. Original data was not replaced.');return;
    }
    writerRef.current=createBrowserWriter('indexeddb',result.revision);
    skipFirstSave.current=true;
    migrationPending.current=false;
    setStorageLocked(false);
    setSaveStatus('saved');
    setNotice('Recovery approved and saved. The previous damaged record is preserved in IndexedDB. Download a new JSON backup.');
  };
  const downloadRawData=async()=>{
    const raw=await exportStoredRecords();
    if(raw)downloadJson(`garden-atlas-stored-records-${backupDate()}.json`,raw);
    else setNotice('Could not read raw records. No stored records were altered.');
  };
  // A queued save may still be in flight when the browser is closed or reloaded.
  useEffect(()=>{
    if(saveStatus==='saved'||saveStatus==='loading')return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[saveStatus]);
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
    libraryRef.current=next;setLibrary(next);setPast([]);setFuture([]);historyGroup.current=null;setSelectedId(null);setSelectedGroupId(null);setTool('select');setCheckedIds([]);setMultiSelect(false);setSelectedFeature(null);setSelectedVertex(null);
    // Projects, restores and imports must return to the new garden, not leave the user below a hidden panel.
    navigateTo('map');
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
  // Selecting on the map must not yank mobile focus away from the map. Details opens explicitly.
  const select=(id:string|null)=>{setSelectedId(id);setSelectedGroupId(null);};
  const togglePick=(id:string)=>setCheckedIds(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);
  const selectGroup=(id:string)=>{if(!setNewTool('select'))return;setSelectedGroupId(id);setSelectedId(null);showDetails();};
  const objectPatch=(id:string,patch:Partial<GardenObject>,key?:string)=>{if(locked.objects){setNotice('Unlock Plants & structures to edit this item.');return;}applyGarden({...garden,objects:garden.objects.map(o=>o.id===id?{...o,...patch}:o)},true,key?`object:${id}:${key}`:undefined);};
  const resizeSelected=(id:string,widthM:number,lengthM:number)=>{
    if(locked.objects){setNotice('Unlock Plants & structures before resizing.');return;}
    const updated=resizeObjectAxes(garden,id,{widthM,lengthM});
    if(updated)applyGarden(updated);else setNotice('Resize rejected: dimensions must be between 0 and 100 metres.');
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
  const recover=async()=>{
    const restored=await recoverBrowserLibrary(backend);
    if(!restored){setNotice('No valid previous local recovery snapshot found.');return;}
    if(!window.confirm('Restore the previous local library snapshot? Back up current data first.'))return;
    replaceLibrary(restored);setNotice('Restored a previous local snapshot.');
  };
  const onImport=(e:ChangeEvent<HTMLInputElement>,all:boolean)=>{
    const file=e.target.files?.[0];e.target.value='';if(!file)return;
    if(file.size>(all?150_000_000:40_000_000)){setNotice('Backup file exceeds the import size limit.');return;}
    void file.text().then(text=>{
      if(all){const next=importLibrary(text);if(!next){setNotice('Invalid Garden Atlas library backup.');return;}
        if(window.confirm('Replace ALL local gardens with this library backup?')){replaceLibrary(next);setNotice('Garden library restored.');}
      }else{const nextGarden=importGarden(text);if(!nextGarden){setNotice('Invalid garden file. P001–P004 backups are supported.');return;}
        const next=addProject(libraryRef.current,nextGarden);if(!next){setNotice('Maximum 20 projects.');return;}
        replaceLibrary(next);setNotice('Garden imported as a separate project. Existing gardens were preserved.');
      }
    }).catch(()=>setNotice('Could not read the file.'));
  };
  const confirmDraftExit=(nextTool:Tool,nextMode:Mode=mode)=>{
    if(draftCount>0&&(nextTool!==tool||nextMode!==mode)){
      return window.confirm(`Discard ${draftCount} unfinished drawing point${draftCount===1?'':'s'}? Finish or clear the shape first to keep working on it.`);
    }
    return true;
  };
  const setNewTool=(value:Tool):boolean=>{
    const layer:LayerKey|null=value==='outline-edit'||value==='outline-draw'||value==='freehand'?'boundary':value==='terrain'?'regions':value==='path'||value==='fence'||value==='feature-edit'?'lines':KINDS.some(k=>k.kind===value)?'objects':null;
    if(layer&&locked[layer]&&!(value==='feature-edit'&&!locked.regions)){setNotice(`Unlock ${layer} to use this tool.`);return false;}
    if(!confirmDraftExit(value))return false;
    setTool(value);if(value!=='select')setMultiSelect(false);if(value==='select'||value==='pan')setNotice(value==='select'?'Drag an object to move it, or drag empty ground to pan.':'Pan around the map; pinch with two fingers to zoom.');
    return true;
  };
  const changeMapMode=(next:Mode)=>{
    if(!confirmDraftExit('select',next))return;
    setMode(next);setTool('select');setMultiSelect(false);
  };
  const activatePreset=(id:string)=>{
    const preset=getPreset(id);if(!preset||locked.objects)return;
    if(!setNewTool(preset.kind))return;
    setPresetId(preset.id);
    setNotice(`${preset.name}: tap the map to place, then drag to adjust.`);
    if(window.matchMedia('(max-width:760px)').matches){
      setSelectedPanel('map');
      window.requestAnimationFrame(()=>mapFrameRef.current?.scrollIntoView({behavior:'auto',block:'start'}));
    }
  };
  if(!hydrated)return <div className="app-shell"><div className="status-message" role="status">Loading saved gardens… {saveStatus==='failed'?'Storage is unavailable; reload or check browser permissions.':''}</div></div>;
  if(storageLocked||saveStatus==='conflict')return <main className="app-shell" style={{padding:'24px',maxWidth:'700px',margin:'0 auto'}}>
    <h1>Garden Atlas · Save protection</h1>
    <p role="alert">{storageLocked?'Stored garden data could not be validated. The editor is paused to protect the original record.':'Another open tab changed the saved garden library. This tab has stopped saving to prevent accidental overwrites.'}</p>
    <p>{storageLocked?'The garden shown in the backup may be a recovery snapshot or an older local copy. Download both backups before approving replacement.':'Your current unsaved edits remain in this tab. Export them before reloading to pick up the other tab’s changes.'}</p>
    <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
      <button className="btn btn-highlight" onClick={()=>downloadJson(`garden-atlas-safety-backup-${backupDate()}.json`,JSON.stringify(library,null,2))}>↓ DOWNLOAD VISIBLE GARDEN BACKUP</button>
      {storageLocked&&<button className="btn btn-muted" onClick={()=>{void downloadRawData();}}>↓ DOWNLOAD RAW STORED RECORDS</button>}
      {storageLocked&&<button className="btn btn-danger" onClick={()=>{void restoreDamagedData();}}>APPROVE RECOVERY / REPLACEMENT</button>}
      {saveStatus==='conflict'&&<button className="btn btn-muted" onClick={()=>window.location.reload()}>RELOAD LATEST SAVED GARDEN</button>}
    </div>
    <p role="status">{notice}</p>
    <p>The editor has not automatically overwritten the data that triggered this warning.</p>
  </main>;
  return <><div className="app-shell">
    <EditorHeader status={saveStatus} backend={backend}
      onImport={() => importFile.current?.click()}
      onBackup={() => downloadJson(`garden-atlas-${gardenSlug(garden.name)}-${backupDate()}.json`, JSON.stringify(garden, null, 2))}
      onPrint={() => window.print()}
      fileInputs={<>
        <input hidden ref={importFile} type="file" accept=".json,application/json" onChange={e=>onImport(e,false)}/>
        <input hidden ref={importAllFile} type="file" accept=".json,application/json" onChange={e=>onImport(e,true)}/>
      </>}/>

    <main className="workspace">
      <aside ref={toolsPanelRef} className={`panel library-panel ${selectedPanel==='tools'?'mobile-active':''}`}>
        <ObjectCatalog activeTool={tool} activePresetId={presetId} locked={locked.objects} onActivatePreset={activatePreset}/>
        <div className="section-heading list-heading">02 / GARDEN ITEMS <span className="pill">{garden.objects.length}</span></div>
        <div className="item-list">{garden.objects.map(o=><div key={o.id} className="object-row"><button className={`object-entry ${selectedId===o.id?'active':''}`} onClick={()=>{if(!setNewTool('select'))return;select(o.id);showDetails();}}><ObjectIcon kind={o.kind} presetId={o.presetId} size={28}/><span>{o.name}<small>{o.id} {o.position?'●':'○'}</small></span></button><label title={`Select ${o.name} for grouping`} className="batch-check"><input type="checkbox" aria-label={`Batch-select ${o.name}`} checked={checkedIds.includes(o.id)} onChange={e=>setCheckedIds(ids=>e.target.checked?[...ids,o.id]:ids.filter(x=>x!==o.id))}/></label></div>)}</div>
        <div className="batch-editor" aria-label="Multi-object editor">
          <button className={`btn ${multiSelect?'btn-highlight':'btn-muted'}`} aria-pressed={multiSelect} onClick={()=>{if(!setNewTool('select'))return;setMultiSelect(v=>!v);setSelectedGroupId(null);setSelectedId(null);}}>◩ {multiSelect?'MULTI SELECT ON':'MULTI SELECT'}</button>
          <button className="btn btn-muted" onClick={()=>{if(!setNewTool('select'))return;setCheckedIds(garden.objects.filter(o=>o.position).map(o=>o.id));setMultiSelect(true);setSelectedId(null);}}>SELECT ALL PLACED</button>
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
            if(!setNewTool('select'))return;setLocked(v=>({...v,[x.key]:!v[x.key]}));setSelectedFeature(null);setSelectedVertex(null);
          }}>{locked[x.key]?'🔒 LOCKED':'🔓 EDIT'}</button>
        </div>)}</div>
        <p className="panel-hint">Layer locks prevent changes in this editing session; visibility affects display only. Both views share the same garden.</p>
        <div className="section-heading list-heading">05 / TERRAIN AREAS & LINES</div>
        <div className="terrain-list">{garden.layout.regions.map(r=><div className="terrain-entry" key={r.id}><button className="feature-pick" onClick={()=>{if(!setNewTool('feature-edit'))return;setSelectedFeature({kind:'region',id:r.id});setSelectedVertex(null);navigateTo('map');}}>{r.name} · {r.id} · EDIT POINTS</button><button disabled={locked.regions} title="Delete terrain region" onClick={()=>applyGarden({...garden,layout:{...garden.layout,regions:garden.layout.regions.filter(x=>x.id!==r.id)}})}>×</button></div>)}</div>
        <div className="terrain-list">{garden.layout.lines.map(line=><div className="line-entry" key={line.id}><button className="feature-pick" onClick={()=>{if(!setNewTool('feature-edit'))return;setSelectedFeature({kind:'line',id:line.id});setSelectedVertex(null);navigateTo('map');}}>✎ EDIT POINTS</button><input disabled={locked.lines} aria-label={`Name of ${line.id}`} maxLength={120} value={line.name} onChange={e=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.map(x=>x.id===line.id?{...x,name:e.target.value}:x)}})}/><label>WIDTH M<MetricDraftInput key={line.id} disabled={locked.lines} label={`${line.name} width in metres`} min={0.2} max={12} value={line.widthM} onCommit={n=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.map(x=>x.id===line.id?{...x,widthM:n}:x)}})} onNotice={setNotice}/></label><button disabled={locked.lines} className="btn btn-danger" title="Delete path or fence" onClick={()=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.filter(x=>x.id!==line.id)}})}>×</button></div>)}</div>
      </aside>
      <section ref={editorRef} className="editor-column">
        <div className="editor-top"><div><div className="eyebrow">CURRENT GARDEN</div><NameDraftInput className="garden-name" label="Garden name" value={garden.name} maxLength={80} onCommit={name=>{const current=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;applyGarden({...current,name});}} onNotice={setNotice}/></div>
          <div className="mode-switch"><button className={mode==='illustration'?'on':''} onClick={()=>changeMapMode('illustration')}>✦ ILLUSTRATION</button><button className={mode==='scale'?'on':''} onClick={()=>changeMapMode('scale')}>▦ SCALE</button></div>
        </div>
        {garden.linkMigration&&!garden.linkMigration.confirmed&&<section className="migration-panel" role="alertdialog" aria-label="Choose your linked map source">
          <strong>LINK YOUR EXISTING GARDEN</strong>
          <p>Your previous Scale and Illustration maps may differ. Both originals have been archived inside this garden and will be included in your JSON backups. Choose which old layout should become the single editable layout.</p>
          <div className="migration-actions"><button className={garden.linkMigration.source==='scale'?'active':''} onClick={()=>applyGarden(previewLinkedSource(garden,'scale'),false)}>PREVIEW SCALE</button><button className={garden.linkMigration.source==='illustration'?'active':''} onClick={()=>applyGarden(previewLinkedSource(garden,'illustration'),false)}>PREVIEW ILLUSTRATION</button></div>
          <button className="btn btn-highlight" onClick={()=>{applyGarden(chooseLinkedSource(garden,garden.linkMigration!.source),false);setPast([]);setFuture([]);setNotice('Both maps are now linked. The original layouts remain in your JSON backups.');}}>USE {garden.linkMigration.source.toUpperCase()} AS SHARED MAP</button>
          <button className="btn btn-muted" onClick={()=>downloadJson(`garden-atlas-pre-link-${gardenSlug(garden.name)}.json`,JSON.stringify(garden.linkMigration!.original,null,2))}>↓ DOWNLOAD ORIGINAL TWO-VIEW BACKUP</button>
          <p className="migration-note">Choose a source before editing. Your original P006 browser storage remains recoverable using the previous local recovery snapshot or a backup.</p>
        </section>}
        <div ref={mapFrameRef} className={`map-frame ${garden.linkMigration&&!garden.linkMigration.confirmed?'migration-locked':''}`}><div className="map-toolbar"><span>● {mode==='scale'?'MEASURED MAP':'PIXEL MAP'} · {garden.width} × {garden.height} m</span><button type="button" className="map-size-toggle" aria-expanded={mapSizeOpen} aria-controls="map-size-panel" onClick={()=>setMapSizeOpen(o=>!o)}>▣ MAP SIZE {mapSizeOpen?'▴':'▾'}</button></div>
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
              <button className={multiSelect?'active-history':''} aria-pressed={multiSelect} onClick={()=>{if(!setNewTool('select'))return;setMultiSelect(v=>!v);setSelectedGroupId(null);setSelectedId(null);}} title="Tap objects to select multiple">◩ MULTI</button>
              <button className={snapEnabled?'active-history':''} aria-pressed={snapEnabled} onClick={()=>setSnapEnabled(v=>!v)} title="Snap moves and placements to a 0.5 metre grid">⌗ SNAP {snapEnabled?'ON':'OFF'}</button>
              <button disabled={!past.length||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onClick={undo} title="Undo · Ctrl/Cmd+Z">↶ UNDO</button>
              <button disabled={!future.length||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onClick={redo} title="Redo · Ctrl/Cmd+Shift+Z">↷ REDO</button>
              <span>{garden.linkMigration&&!garden.linkMigration.confirmed?'CHOOSE MAP SOURCE FIRST':'BOTH MAPS LINKED'}</span>
            </div>
            <div className="primary-tools" role="toolbar" aria-label="Editor interaction tools">
            {EDITOR_TOOLS.map(x=><button type="button" key={x.id} className={tool===x.id?'active':''} aria-pressed={tool===x.id} aria-label={`${x.name}: ${x.hint}`} title={x.hint} onClick={()=>setNewTool(x.id)}>{x.label}</button>)}
          </div>
          {(tool==='path'||tool==='fence')&&<div className="terrain-chooser"><span>{tool.toUpperCase()} WIDTH (M)</span><MetricDraftInput label="New path or fence width in metres" min={0.2} max={12} value={lineWidth} onCommit={setLineWidth} onNotice={setNotice}/></div>}
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
              <label>IMAGE WIDTH (metres)<MetricDraftInput label="Tracing image width in metres" min={0.5} max={garden.width} value={garden.reference.widthM} onCommit={referenceWidth} onNotice={setNotice}/></label>
              <div className="reference-coordinates">
                <label>LEFT X (m)<MetricDraftInput label="Tracing image X offset in metres" min={0} max={Math.max(0,garden.width-garden.reference.widthM)} value={garden.reference.x} onCommit={x=>updateReference({x})} onNotice={setNotice}/></label>
                <label>TOP Y (m)<MetricDraftInput label="Tracing image Y offset in metres" min={0} max={Math.max(0,garden.height-garden.reference.heightM)} value={garden.reference.y} onCommit={y=>updateReference({y})} onNotice={setNotice}/></label>
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
          <div className="quick-palette" aria-label="Quick add garden objects">{KINDS.map(k=><button key={k.kind} className={tool===k.kind?'active':''} onClick={()=>{if(setNewTool(k.kind))setPresetId(defaultPreset(k.kind).id);}} title={`Place ${k.label}`}><ObjectIcon kind={k.kind} presetId={defaultPreset(k.kind).id} size={29}/><span>{k.label}</span></button>)}<button className={tool==='select'?'active':''} onClick={()=>setNewTool('select')} title="Select and drag">↖<span>Move</span></button></div>
          <MapView garden={garden} mode={mode} tool={tool} onDraftCountChange={setDraftCount} terrain={ground} lineWidth={lineWidth} selectedId={selectedId} selectedGroupId={selectedGroupId} hidden={visibility} showReference={showReference} snapEnabled={snapEnabled} selectedIds={checkedIds} multiSelect={multiSelect} locked={locked} selectedFeature={selectedFeature} onSelectFeature={feature=>{setSelectedFeature(feature);setSelectedVertex(null);}} onSelectVertex={setSelectedVertex} onEditFeature={editExistingFeature} onResizeObject={resizeSelected}
            onPick={select} onTogglePick={togglePick} onMoveSelection={moveMultiple} onPlace={place} onMove={move} onBoundary={outline} onTerrain={addArea} onLine={addMapLine} onNotice={setNotice}/>
          {tool==='select'&&!multiSelect&&selected&&<div className="map-selection-bar" aria-label="Selected garden item"><span><strong>SELECTED</strong> · {selected.name}</span><button type="button" className="btn btn-highlight" onClick={showDetails}>EDIT DETAILS ↓</button></div>}
          {tool==='select'&&multiSelect&&checkedIds.length>0&&<div className="map-selection-bar map-multi-selection-bar" aria-label="Multiple objects selected"><span><strong>{checkedIds.length} SELECTED</strong> · Drag together on the map</span><button type="button" className="btn btn-highlight" onClick={()=>navigateTo('tools')}>OBJECT LIST ↓</button></div>}
          <div className="map-bottom" aria-label="Active editor tool"><span className="map-tool-guidance"><strong className="map-tool-pill">{activeToolDescription(tool,multiSelect).name}</strong><span title={activeToolDescription(tool,multiSelect).hint}>{activeToolDescription(tool,multiSelect).hint}</span></span></div>
        </div>
        <div className="status-message" role="status">✦ {notice}</div>
        <div className="feature-strip"><span>■ P022 SELECTION POLISH</span><span>■ TOUCH-FIRST</span><span>■ LINKED SCALE + PIXEL VIEWS</span><span>■ LOCAL BACKUPS</span></div>
      </section>
      <aside ref={inspectorRef} className={`panel details-panel ${selectedPanel==='inspector'?'mobile-active':''}`} aria-label="Garden item details">
        <div className="section-heading">06 / INSPECTOR</div>
        {selected?<>
          <div className="inspector-compact-header">
            <div className="inspector-compact-art"><ObjectIcon kind={selected.kind} presetId={selected.presetId} size={56}/></div>
            <div className="inspector-compact-title"><strong>{selected.name}</strong><span>{selected.id} · {info(selected.kind).label}</span></div>
            <button type="button" className="inspector-map-link" onClick={()=>navigateTo('map')} aria-label="Return to garden map">⌖ MAP</button>
          </div>
          <div className="inspector-core-fields">
            <label className="field inspector-name-field">DISPLAY NAME<NameDraftInput key={selected.id} label="Object name" value={selected.name} maxLength={80} allowEmpty disabled={locked.objects} onCommit={name=>objectPatch(selected.id,{name})} onNotice={setNotice}/></label>
            <label className="field">SPECIES / TYPE<input maxLength={140} value={selected.species} disabled={locked.objects} placeholder="Optional" onChange={e=>objectPatch(selected.id,{species:e.target.value},'species')}/></label>
            <label className="field">GROUP<select value={selected.groupId??''} disabled={locked.objects} onChange={e=>objectPatch(selected.id,{groupId:e.target.value||null})}><option value="">— UNGROUPED —</option>{garden.groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
          </div>
          <div className="inspector-subheading">SIZE · METRES</div>
          <ObjectDimensions key={selected.id} object={selected} disabled={locked.objects} onNotice={setNotice} onChange={axes=>{const updated=resizeObjectAxes(garden,selected.id,axes);if(updated)applyGarden(updated);else setNotice('Invalid dimension. Previous measurements preserved.');}}/>
          <details key={`appearance-${selected.id}`} className="inspector-fold">
            <summary>APPEARANCE & ROTATION</summary>
            <div className="inspector-fold-body">
              <label className="field">PIXEL-ART APPEARANCE
                <select value={selected.presetId??defaultPreset(selected.kind).id} disabled={locked.objects}
                  onChange={e=>{const updated=changeObjectPreset(garden,selected.id,e.target.value);if(updated)applyGarden(updated);}}>
                  {PRESETS.filter(p=>p.kind===selected.kind).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <small>Changes the artwork, not the record or measurements.</small>
              </label>
              <label className="field">ROTATION (DEGREES)<MetricDraftInput key={selected.id} disabled={locked.objects} label="Rotation in degrees" min={0} max={359} decimals={0} value={selected.rotation??0} onCommit={n=>objectPatch(selected.id,{rotation:n})} onNotice={setNotice}/></label>
            </div>
          </details>
          <details key={`notes-${selected.id}`} className="inspector-fold">
            <summary>NOTES & MAP PLACEMENT</summary>
            <div className="inspector-fold-body">
              <label className="field">NOTES<textarea rows={4} maxLength={3000} disabled={locked.objects} value={selected.notes} onChange={e=>objectPatch(selected.id,{notes:e.target.value},'notes')}/></label>
              <div className="placement-box">SHARED POSITION: {selected.position?`${selected.position.x.toFixed(1)} m × ${selected.position.y.toFixed(1)} m`:'Not placed'}
                {!selected.position&&<button disabled={locked.objects} className="btn btn-highlight" onClick={()=>move(selected.id,{x:garden.width/2,y:garden.height/2},false)}>PLACE AT CENTER</button>}
                {selected.position&&<button disabled={locked.objects} className="btn btn-muted" onClick={()=>objectPatch(selected.id,{position:undefined})}>REMOVE FROM BOTH MAPS</button>}
              </div>
            </div>
          </details>
          <div className="inspector-actions"><button disabled={locked.objects} className="btn btn-highlight" onClick={duplicate}>DUPLICATE</button><button disabled={locked.objects} className="btn btn-danger" onClick={removeObject}>DELETE</button></div>
          {(selected.kind==='tree'||selected.kind==='shrub'||selected.kind==='flower')&&<details key={`atlas-${selected.id}`} className="inspector-fold inspector-atlas-fold">
            <summary>PLANT ATLAS · PHOTOS & HISTORY</summary>
            <div className="inspector-fold-body">
              <PlantAtlasPanel garden={garden} objectId={selected.id} disabled={locked.objects||Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)} onNotice={setNotice}
                onChange={(edit,key)=>{if(locked.objects||libraryRef.current.activeId!==library.activeId)return;const current=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;applyGarden(edit(current),true,key);}}/>
            </div>
          </details>}
        </>:selectedGroup?<>
          <div className="inspector-compact-header inspector-group-header"><div className="inspector-group-icon">▦</div>
            <div className="inspector-compact-title"><strong>{selectedGroup.name}</strong><span>{selectedGroup.id} · {garden.objects.filter(x=>x.groupId===selectedGroup.id).length} members</span></div>
            <button type="button" className="inspector-map-link" onClick={()=>navigateTo('map')}>⌖ MAP</button>
          </div>
          <label className="field">GROUP NAME<NameDraftInput key={selectedGroup.id} label="Group name" value={selectedGroup.name} maxLength={120} onCommit={name=>{const current=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;applyGarden({...current,groups:current.groups.map(g=>g.id===selectedGroup.id?{...g,name}:g)});}} onNotice={setNotice}/></label>
          <label className="field">GROUP NOTES<textarea maxLength={3000} value={selectedGroup.notes} onChange={e=>applyGarden({...garden,groups:garden.groups.map(g=>g.id===selectedGroup.id?{...g,notes:e.target.value}:g)},true,'group-notes:'+selectedGroup.id)}/></label>
          <p className="panel-hint">Drag any member on the map to move the entire group. Both views remain linked.</p>
          <div className="group-list">{garden.objects.filter(o=>o.groupId===selectedGroup.id).map(o=><button key={o.id} className="group-entry" onClick={()=>select(o.id)}><ObjectIcon kind={o.kind} presetId={o.presetId} size={25}/>{o.name}</button>)}</div>
          <button disabled={locked.objects} className="btn btn-danger" onClick={()=>{if(!locked.objects&&window.confirm('Delete group? All its objects will be kept.')){applyGarden(removeGroup(garden,selectedGroup.id));setSelectedGroupId(null);}}}>DELETE GROUP · KEEP ITEMS</button>
        </>:<p className="empty-inspector">Tap an item on the map or select one from OBJECTS to edit its shared record.</p>}
        <div className="section-heading list-heading">MAP DIMENSIONS</div>
        <p className="panel-hint">Workspace: {garden.width} × {garden.height} m · Property outline: {polygonArea(garden.layout.boundary).toFixed(1)} m² (approximate).</p>
        <button className="btn btn-muted inspector-map-size-link" onClick={()=>{setMapSizeOpen(true);navigateTo('map');window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>mapFrameRef.current?.scrollIntoView({behavior:'auto',block:'start'})));}}>OPEN MAP SIZE SETTINGS ↑</button>
      </aside>
      <GardenProjectsPanel panelRef={projectsPanelRef} active={selectedPanel==='projects'} library={library} garden={garden} saved={saved}
        backend={backend} storageInfo={storageInfo}
        onOpenProject={id=>{const project=library.projects.find(p=>p.id===id);if(!project)return;replaceLibrary({...library,activeId:id});setNotice(`Opened ${project.garden.name}.`);}}
        onNewProject={newProject} onRemoveProject={removeProject}
        onExportOriginal={()=>{if(garden.linkMigration)downloadJson(`garden-atlas-original-two-views-${gardenSlug(garden.name)}.json`,JSON.stringify(garden.linkMigration.original,null,2));}}
        onBackupAll={()=>downloadJson(`garden-atlas-all-projects-${backupDate()}.json`,JSON.stringify(library,null,2))}
        onRestoreAll={()=>importAllFile.current?.click()} onRecover={()=>{void recover();}}
        onProtectStorage={()=>{void requestPersistentStorage().then(ok=>setNotice(ok?'Browser granted persistent storage for this site. Keep external backups too.':'Persistent storage was unavailable or declined. JSON backups are recommended.'));}}/>

    </main>
    <MobileNavigation selected={selectedPanel} onNavigate={navigateTo}/>
    <footer className="footer">GARDEN ATLAS · LOCAL-FIRST GARDEN EDITOR <span>OFFLINE LOCAL PROJECTS · NO ACCOUNTS</span></footer>
  </div><GardenReport garden={garden}/></>;
}
