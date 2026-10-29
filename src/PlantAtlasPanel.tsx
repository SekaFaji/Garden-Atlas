import { useState, type ChangeEvent } from 'react';
import {
  addSpecies, blankProfile, deleteSpecies, isPlantKind, uniqueEntryId, updateProfile, updateSpecies, validDate,
  type CareAction, type Maintenance, type Observation, type SpecimenPhoto
} from './plantAtlas';
import type { Garden } from './model';

interface Props {
  garden: Garden;
  objectId: string;
  disabled: boolean;
  onChange: (edit: (current: Garden) => Garden, historyKey?: string) => void;
  onNotice: (message: string) => void;
}
const today = () => new Date().toISOString().slice(0, 10);
const MAX_PHOTO_CHARS = 120_000;

async function photoFromFile(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 8_000_000) {
    throw new Error('Choose a JPG, PNG or WebP under 8 MB.');
  }
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not read this photograph.'));
      image.src = objectUrl;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Image has no usable dimensions.');
    const canvas = document.createElement('canvas');
    for (const edge of [560, 450, 360, 280]) {
      const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image processing is unavailable in this browser.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [.74, .58, .44]) {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length <= MAX_PHOTO_CHARS && dataUrl.startsWith('data:image/jpeg;base64,')) return dataUrl;
      }
    }
    throw new Error('Photo is still too large after compression. Try a smaller image.');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function PlantAtlasPanel({ garden, objectId, disabled, onChange, onNotice }: Props) {
  const object = garden.objects.find(o => o.id === objectId);
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [newBotanicalName, setNewBotanicalName] = useState('');
  const [observationDate, setObservationDate] = useState(today());
  const [observationText, setObservationText] = useState('');
  const [careDate, setCareDate] = useState(today());
  const [careAction, setCareAction] = useState<CareAction>('watering');
  const [careText, setCareText] = useState('');
  const [uploading, setUploading] = useState(false);
  if (!object || !isPlantKind(object.kind)) return null;
  const p = object.plant ?? blankProfile();
  const species = (garden.speciesLibrary ?? []).find(s => s.id === p.speciesId);
  const changeProfile = (change: (profile: typeof p) => typeof p, key?: string) =>
    onChange(g => updateProfile(g, objectId, change), key && `atlas:${objectId}:${key}`);

  const createSpecies = () => {
    const commonName = newSpeciesName.trim();
    if (!commonName) return;
    onChange(g => {
      const next = addSpecies(g, commonName, newBotanicalName);
      if (!next) return g;
      const speciesId = next.speciesLibrary![next.speciesLibrary!.length - 1].id;
      return updateProfile(next, objectId, profile => ({...profile, speciesId, identification:'tentative'}));
    });
    setNewSpeciesName('');setNewBotanicalName('');
    onNotice('Species profile created and linked. Mark identification confirmed only after verification.');
  };
  const addObservation = () => {
    const note=observationText.trim();
    if (!note || !validDate(observationDate)) {onNotice('Enter a valid observation date and note.');return;}
    if (p.observations.length >= 100) {onNotice('Observation limit reached for this specimen.');return;}
    onChange(g=>updateProfile(g,objectId,profile=>({
      ...profile,observations:[...profile.observations,{id:uniqueEntryId('OBS',profile.observations),date:observationDate,note}]
    })));
    setObservationText('');
  };
  const addCare = () => {
    const note=careText.trim();
    if (!note || !validDate(careDate)) {onNotice('Enter a valid maintenance date and note.');return;}
    if (p.maintenance.length >= 100) {onNotice('Maintenance limit reached for this specimen.');return;}
    onChange(g=>updateProfile(g,objectId,profile=>({
      ...profile,maintenance:[...profile.maintenance,{id:uniqueEntryId('CARE',profile.maintenance),date:careDate,action:careAction,note}]
    })));
    setCareText('');
  };
  const importPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file=event.target.files?.[0];event.target.value='';
    if (!file || disabled) return;
    if (p.photos.length>=3) {onNotice('Maximum three compressed photos per specimen.');return;}
    setUploading(true);
    try {
      const dataUrl=await photoFromFile(file);
      onChange(g=>updateProfile(g,objectId,profile=>profile.photos.length>=3?profile:{
        ...profile, photos:[...profile.photos,{id:uniqueEntryId('PHOTO',profile.photos),addedOn:today(),caption:file.name.slice(0,120),dataUrl}]
      }));
      onNotice('Photo added locally. Download a JSON backup to keep your pictures safe.');
    } catch(error) {onNotice(error instanceof Error?error.message:'Photo import failed.');}
    finally {setUploading(false);}
  };
  return <section className="plant-atlas" aria-label={`Plant atlas for ${object.name}`}>
    <div className="section-heading list-heading">🌱 PLANT ATLAS · {object.id}</div>
    <p className="panel-hint">This specimen has its own ID, photos and dated history. Species notes are shared by every specimen linked to that species.</p>
    <label className="field">IDENTIFICATION STATUS
      <select disabled={disabled} value={p.identification} onChange={e=>changeProfile(old=>({...old,identification:e.target.value as typeof p.identification}))}>
        <option value="unidentified">Unidentified</option><option value="tentative">Tentative / uncertain</option><option value="confirmed">Confirmed by user</option>
      </select>
    </label>
    <label className="field">PLANTED ON (OPTIONAL)
      <input disabled={disabled} type="date" min="1900-01-01" max="2100-12-31" value={p.plantedOn} onChange={e=>{if(!e.target.value||validDate(e.target.value))changeProfile(old=>({...old,plantedOn:e.target.value}));}}/>
    </label>
    <div className="section-heading list-heading">SPECIES ENCYCLOPEDIA <span className="pill">{garden.speciesLibrary?.length??0}</span></div>
    <label className="field">LINKED SPECIES
      <select disabled={disabled} value={p.speciesId??''} onChange={e=>changeProfile(old=>({...old,speciesId:e.target.value||null}))}>
        <option value="">No species profile linked</option>
        {(garden.speciesLibrary??[]).map(item=><option key={item.id} value={item.id}>{item.commonName} {item.scientificName?`(${item.scientificName})`:''}</option>)}
      </select>
    </label>
    {species&&<div className="atlas-species-card">
      <small>{species.id} · SHARED SPECIES PROFILE</small>
      <label className="field">COMMON NAME<input disabled={disabled} maxLength={120} value={species.commonName} onChange={e=>onChange(g=>updateSpecies(g,species.id,{commonName:e.target.value}),`species:${species.id}:common`)}/></label>
      <label className="field">BOTANICAL NAME<input disabled={disabled} maxLength={160} value={species.scientificName} onChange={e=>onChange(g=>updateSpecies(g,species.id,{scientificName:e.target.value}),`species:${species.id}:botanical`)}/></label>
      <label className="field">DESCRIPTION / IDENTIFICATION NOTES<textarea disabled={disabled} maxLength={4000} rows={2} value={species.description} onChange={e=>onChange(g=>updateSpecies(g,species.id,{description:e.target.value}),`species:${species.id}:description`)}/></label>
      <label className="field">CARE NOTES<textarea disabled={disabled} maxLength={4000} rows={2} value={species.careNotes} onChange={e=>onChange(g=>updateSpecies(g,species.id,{careNotes:e.target.value}),`species:${species.id}:care`)}/></label>
      <button disabled={disabled} className="btn btn-muted" onClick={()=>{if(window.confirm('Delete this shared species profile? Specimens will be unlinked but kept.'))onChange(g=>deleteSpecies(g,species.id));}}>DELETE SHARED SPECIES</button>
    </div>}
    <div className="atlas-create">
      <label className="field">NEW SPECIES COMMON NAME<input disabled={disabled} placeholder="e.g. Silver birch" maxLength={120} value={newSpeciesName} onChange={e=>setNewSpeciesName(e.target.value)}/></label>
      <label className="field">BOTANICAL NAME (OPTIONAL)<input disabled={disabled} placeholder="e.g. Betula pendula" maxLength={160} value={newBotanicalName} onChange={e=>setNewBotanicalName(e.target.value)}/></label>
      <button disabled={disabled||!newSpeciesName.trim()||(garden.speciesLibrary?.length??0)>=300} className="btn btn-highlight" onClick={createSpecies}>+ CREATE & LINK SPECIES</button>
    </div>
    <div className="section-heading list-heading">DATED OBSERVATIONS <span className="pill">{p.observations.length}</span></div>
    <div className="atlas-entry-form"><input disabled={disabled} aria-label="Observation date" type="date" value={observationDate} onChange={e=>setObservationDate(e.target.value)}/><textarea disabled={disabled} aria-label="Observation note" maxLength={3000} rows={2} placeholder="Growth, flowering, pest damage, condition…" value={observationText} onChange={e=>setObservationText(e.target.value)}/><button disabled={disabled||!observationText.trim()||p.observations.length>=100} className="btn btn-highlight" onClick={addObservation}>+ ADD OBSERVATION</button></div>
    <div className="atlas-event-list">{[...p.observations].reverse().map((entry:Observation)=><div className="atlas-event" key={entry.id}><b>{entry.date}</b><span>{entry.note}</span><button disabled={disabled} aria-label={`Remove observation ${entry.id}`} onClick={()=>onChange(g=>updateProfile(g,objectId,old=>({...old,observations:old.observations.filter(x=>x.id!==entry.id)})))}>×</button></div>)}</div>
    <div className="section-heading list-heading">MAINTENANCE HISTORY <span className="pill">{p.maintenance.length}</span></div>
    <div className="atlas-entry-form"><input disabled={disabled} aria-label="Maintenance date" type="date" value={careDate} onChange={e=>setCareDate(e.target.value)}/><select disabled={disabled} aria-label="Maintenance action" value={careAction} onChange={e=>setCareAction(e.target.value as CareAction)}>{(['watering','pruning','feeding','planting','inspection','other'] as CareAction[]).map(x=><option key={x} value={x}>{x.toUpperCase()}</option>)}</select><textarea disabled={disabled} aria-label="Maintenance note" maxLength={3000} rows={2} placeholder="What was done and why…" value={careText} onChange={e=>setCareText(e.target.value)}/><button disabled={disabled||!careText.trim()||p.maintenance.length>=100} className="btn btn-highlight" onClick={addCare}>+ RECORD MAINTENANCE</button></div>
    <div className="atlas-event-list">{[...p.maintenance].reverse().map((entry:Maintenance)=><div className="atlas-event" key={entry.id}><b>{entry.date} · {entry.action}</b><span>{entry.note}</span><button disabled={disabled} aria-label={`Remove maintenance ${entry.id}`} onClick={()=>onChange(g=>updateProfile(g,objectId,old=>({...old,maintenance:old.maintenance.filter(x=>x.id!==entry.id)})))}>×</button></div>)}</div>
    <div className="section-heading list-heading">SPECIMEN PHOTOS <span className="pill">{p.photos.length}/3</span></div>
    <label className="atlas-upload">{uploading?'PROCESSING PHOTO…':'＋ ADD PHOTO (JPG / PNG / WEBP)'}<input disabled={disabled||uploading||p.photos.length>=3} type="file" accept="image/jpeg,image/png,image/webp" onChange={importPhoto}/></label>
    <p className="panel-hint">Up to 3 compressed photos per plant. Stored in this browser and included in garden JSON backups; not uploaded to a server. Large gardens may hit browser storage limits.</p>
    <div className="atlas-photos">{p.photos.map((photo:SpecimenPhoto)=><div key={photo.id} className="atlas-photo"><img src={photo.dataUrl} alt={photo.caption||`Specimen ${objectId}`} loading="lazy"/><label className="field">CAPTION<input disabled={disabled} maxLength={240} value={photo.caption} onChange={e=>onChange(g=>updateProfile(g,objectId,old=>({...old,photos:old.photos.map(x=>x.id===photo.id?{...x,caption:e.target.value}:x)})),`photo:${photo.id}:caption`)}/></label><button disabled={disabled} className="btn btn-muted" onClick={()=>onChange(g=>updateProfile(g,objectId,old=>({...old,photos:old.photos.filter(x=>x.id!==photo.id)})))}>REMOVE PHOTO</button></div>)}</div>
  </section>;
}
