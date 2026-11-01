import { useEffect, useRef, useState } from 'react';
import { useEditorSelection } from './hooks/useEditorSelection';
import { patchGardenObject, withoutGardenObjects, assignGardenObjects, duplicateGardenObject, addGardenGroup } from './editorObjectActions';
import type { ChangeEvent } from 'react';
import { MapView, type Tool } from './MapView';
import { MapSizePanel } from './components/MapSizePanel';
import { MapEditingToolbar } from './components/MapEditingToolbar';
import { toolLockMessage, needsDraftExitConfirmation, draftExitMessage } from './toolAccess';
import { ReferenceImagePanel } from './components/ReferenceImagePanel';
import { activeToolDescription } from './editorVisuals';
import { ObjectIcon } from './components/ObjectIcon';
import { GardenObjectList } from './components/GardenObjectList';
import { GardenLayersPanel, type LayerState } from './components/GardenLayersPanel';
import { ObjectCatalog } from './components/ObjectCatalog';
import { NameDraftInput } from './NameDraftInput';
import { defaultPreset, getPreset } from './catalog';
import { GardenReport } from './Report';
import { EditorHeader, type SaveStatus } from './components/EditorHeader';
import { GardenInspector } from './components/GardenInspector';
import { GardenProjectsPanel } from './components/GardenProjectsPanel';
import { MobileNavigation, type EditorPanel } from './components/MobileNavigation';
import { downloadJson, gardenSlug, backupDate } from './utils/backup';
import { imageToReference } from './reference';
import { isSameEditBurst, type EditBurst } from './history';
import { editFeaturePoint, resizeObjectAxes, type FeatureSelection, type EditAction } from './featureEdit';
import {
  KINDS, createPresetObject, changeObjectPreset, addLine, addRegion, alignSelection, moveSelection, setReferenceWidth, demoGarden, emptyGarden, isGarden,
  movePlaced, removeGroup, resizeGarden, resizeWorkspace, addSurroundings, setBoundary, previewLinkedSource, chooseLinkedSource,
  type Garden, type GardenObject, type Ground, type Kind, type Mode, type Point, type LineKind
} from './model';
import {
  addProject, deleteProject, importGarden, importLibrary, loadLibrary,
  updateActiveGarden, type ProjectLibrary
} from './storage';
import { openBrowserLibrary, createBrowserWriter, approveBrowserRecovery, exportStoredRecords, recoverBrowserLibrary, estimateBrowserSpace, requestPersistentStorage, type StorageBackend } from './browserStorage';

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
  const {selectedId,setSelectedId,selectedGroupId,setSelectedGroupId,selectedFeature,setSelectedFeature,selectedVertex,setSelectedVertex,
    checkedIds,setCheckedIds,multiSelect,setMultiSelect,selectObject,toggleChecked,resetSelection}=useEditorSelection();
  const [selectedPanel,setSelectedPanel]=useState<EditorPanel>('map');
  const [visibility,setVisibility]=useState<Visibility>({objects:false,regions:false,lines:false,boundary:false});
  const [locked,setLocked]=useState<LayerState>({objects:false,regions:false,lines:false,boundary:false});
  const [newGroupName,setNewGroupName]=useState('');
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
    libraryRef.current=next;setLibrary(next);setPast([]);setFuture([]);historyGroup.current=null;resetSelection();setTool('select');
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
  const select=selectObject;
  const togglePick=toggleChecked;
  const selectGroup=(id:string)=>{if(!setNewTool('select'))return;setSelectedGroupId(id);setSelectedId(null);showDetails();};
  const objectPatch=(id:string,patch:Partial<GardenObject>,key?:string)=>{if(locked.objects){setNotice('Unlock Plants & structures to edit this item.');return;}applyGarden(patchGardenObject(garden,id,patch),true,key?`object:${id}:${key}`:undefined);};
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
    applyGarden(withoutGardenObjects(garden,checkedIds));setCheckedIds([]);setSelectedId(null);
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
    applyGarden(assignGardenObjects(garden,checkedIds,groupId));
    setCheckedIds([]);setNotice(`Assigned ${checkedIds.length} selected item(s) to the group.`);
  };
  const createGroup=()=>{
    const name=newGroupName.trim();if(!name)return;
    if(garden.groups.some(g=>g.name.toLowerCase()===name.toLowerCase())){setNotice('That group already exists.');return;}
    const {garden:updated,id}=addGardenGroup(garden,name);
    applyGarden(updated);setNewGroupName('');selectGroup(id);
  };
  const duplicate=()=>{if(locked.objects){setNotice('Unlock the object layer first.');return;}
    if(!selected||garden.objects.length>=3000)return;
    const {garden:updated,id}=duplicateGardenObject(garden,selected);
    applyGarden(updated);select(id);
    setNotice('Object duplicated 1.2 m away; drag it into place.');
  };
  const removeObject=()=>{if(locked.objects){setNotice('Unlock the object layer first.');return;}
    if(!selected||!window.confirm(`Delete ${selected.name} from both map layouts and its record?`))return;
    applyGarden(withoutGardenObjects(garden,[selected.id]));select(null);
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
    if(needsDraftExitConfirmation(draftCount,tool,nextTool,mode,nextMode)){
      return window.confirm(draftExitMessage(draftCount));
    }
    return true;
  };
  const setNewTool=(value:Tool):boolean=>{
    const lockMessage=toolLockMessage(value,locked);
    if(lockMessage){setNotice(lockMessage);return false;}
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
        <GardenObjectList garden={garden} selectedId={selectedId} selectedGroupId={selectedGroupId} checkedIds={checkedIds}
          multiSelect={multiSelect} newGroupName={newGroupName}
          onSelectObject={id=>{if(!setNewTool('select'))return;select(id);showDetails();}}
          onCheckObject={(id,checked)=>setCheckedIds(ids=>checked?[...ids,id]:ids.filter(x=>x!==id))}
          onToggleMultiSelect={()=>{if(!setNewTool('select'))return;setMultiSelect(v=>!v);setSelectedGroupId(null);setSelectedId(null);}}
          onSelectAllPlaced={()=>{if(!setNewTool('select'))return;setCheckedIds(garden.objects.filter(o=>o.position).map(o=>o.id));setMultiSelect(true);setSelectedId(null);}}
          onClearSelection={()=>setCheckedIds([])} onAlign={alignChecked} onDeleteSelected={deleteChecked}
          onNewGroupName={setNewGroupName} onCreateGroup={createGroup} onAssignGroup={assignChecked} onSelectGroup={selectGroup}/>
        <GardenLayersPanel garden={garden} visibility={visibility} locked={locked}
          onVisibilityChange={(layer,visible)=>setVisibility(v=>({...v,[layer]:!visible}))}
          onToggleLayerLock={layer=>{if(!setNewTool('select'))return;setLocked(v=>({...v,[layer]:!v[layer]}));setSelectedFeature(null);setSelectedVertex(null);}}
          onEditFeature={feature=>{if(!setNewTool('feature-edit'))return;setSelectedFeature(feature);setSelectedVertex(null);navigateTo('map');}}
          onDeleteRegion={id=>applyGarden({...garden,layout:{...garden.layout,regions:garden.layout.regions.filter(x=>x.id!==id)}})}
          onRenameLine={(id,name)=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.map(x=>x.id===id?{...x,name}:x)}})}
          onChangeLineWidth={(id,widthM)=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.map(x=>x.id===id?{...x,widthM}:x)}})}
          onDeleteLine={id=>applyGarden({...garden,layout:{...garden.layout,lines:garden.layout.lines.filter(x=>x.id!==id)}})}
          onNotice={setNotice}/>

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
          {mapSizeOpen&&<MapSizePanel garden={garden} dimensions={dims} resizeMode={resizeMode}
            onDimensionChange={(axis,value)=>setDims(previous=>({...previous,[axis]:value}))}
            onResizeModeChange={setResizeMode} onApply={changeDimensions}
            onReset={()=>setDims({width:String(garden.width),height:String(garden.height)})}
            onExpand={expandAroundGarden}/>}
          <MapEditingToolbar tool={tool} multiSelect={multiSelect} snapEnabled={snapEnabled}
            canUndo={past.length>0} canRedo={future.length>0}
            migrationBlocked={Boolean(garden.linkMigration&&!garden.linkMigration.confirmed)}
            lineWidth={lineWidth} ground={ground}
            onToggleMultiSelect={()=>{if(!setNewTool('select'))return;setMultiSelect(v=>!v);setSelectedGroupId(null);setSelectedId(null);}}
            onToggleSnap={()=>setSnapEnabled(v=>!v)}
            onUndo={undo} onRedo={redo} onSelectTool={setNewTool}
            onLineWidthChange={setLineWidth} onGroundChange={setGround} onNotice={setNotice}/>
          <ReferenceImagePanel garden={garden} open={referenceOpen} importing={importingReference}
            visible={showReference} fileInputRef={referenceFile} onToggle={()=>setReferenceOpen(o=>!o)}
            onVisibleChange={setShowReference} onImport={referenceChange}
            onOpacityChange={opacity=>updateReference({opacity})} onWidthChange={referenceWidth}
            onPositionChange={updateReference}
            onRemove={()=>{if(window.confirm('Remove this tracing image from your garden? Undo can restore it.')){const {reference:_reference,...rest}=garden;void _reference;applyGarden(rest);}}}
            onNotice={setNotice}/>
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
       <GardenInspector panelRef={inspectorRef} active={selectedPanel==='inspector'} garden={garden}
         selected={selected} selectedGroup={selectedGroup} objectsLocked={locked.objects}
         onMap={()=>navigateTo('map')}
         onMapSettings={()=>{setMapSizeOpen(true);navigateTo('map');window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>mapFrameRef.current?.scrollIntoView({behavior:'auto',block:'start'})));}}
         onNotice={setNotice} onUpdateObject={objectPatch}
         onResizeObjectAxes={(id,axes)=>{const updated=resizeObjectAxes(garden,id,axes);if(updated)applyGarden(updated);else setNotice('Invalid dimension. Previous measurements preserved.');}}
         onPresetChange={(id,preset)=>{const updated=changeObjectPreset(garden,id,preset);if(updated)applyGarden(updated);}}
         onPlaceCenter={id=>move(id,{x:garden.width/2,y:garden.height/2},false)}
         onDuplicate={duplicate} onDeleteObject={removeObject}
         onAtlasChange={(edit,key)=>{if(locked.objects||libraryRef.current.activeId!==library.activeId)return;const current=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;applyGarden(edit(current),true,key);}}
         onRenameGroup={(id,name)=>{const current=libraryRef.current.projects.find(p=>p.id===libraryRef.current.activeId)!.garden;applyGarden({...current,groups:current.groups.map(g=>g.id===id?{...g,name}:g)});}}
         onGroupNotes={(id,notes)=>applyGarden({...garden,groups:garden.groups.map(g=>g.id===id?{...g,notes}:g)},true,'group-notes:'+id)}
         onSelectObject={select}
         onDeleteGroup={id=>{if(!locked.objects&&window.confirm('Delete group? All its objects will be kept.')){applyGarden(removeGroup(garden,id));setSelectedGroupId(null);}}}/>
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
