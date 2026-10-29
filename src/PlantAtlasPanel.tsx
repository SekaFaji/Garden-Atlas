import { useState, type ChangeEvent } from 'react';
import {
  addSpecies, blankProfile, deleteSpecies, isPlantKind, uniqueEntryId, updateProfile, updateSpecies, validDate, MAX_SPECIMEN_PHOTOS, MAX_PHOTO_DATA_CHARS,
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
const MAX_PHOTO_CHARS = MAX_PHOTO_DATA_CHARS;

async function photoFromFile(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 12_000_000) {
    throw new Error('Choose a JPG, PNG or WebP under 12 MB.');
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
    for (const edge of [1000, 850, 700, 540, 400]) {
      const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Image processing is unavailable in this browser.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [.82, .7, .56]) {
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
  const [uploadProgress, setUploadProgress] = useState('');
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
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length || disabled || uploading) return;
    const available = MAX_SPECIMEN_PHOTOS - p.photos.length;
    if (available <= 0) { onNotice('Maximum ' + MAX_SPECIMEN_PHOTOS + ' photos per specimen.'); return; }
    if (files.length > available) onNotice('Only ' + available + ' photo slots remain. Extra files will be skipped.');
    setUploading(true);
    const imported: SpecimenPhoto[] = [];
    let errors = 0;
    try {
      const picked = files.slice(0, available);
      for (let index = 0; index < picked.length; index++) {
        setUploadProgress((index + 1) + ' / ' + picked.length);
        try {
          const dataUrl = await photoFromFile(picked[index]);
          imported.push({id:'', addedOn:today(),caption:picked[index].name.slice(0,120),dataUrl});
        } catch { errors++; }
      }
      if (imported.length) onChange(g=>updateProfile(g,objectId,profile=>{
        const photos = [...profile.photos];
        for (const photo of imported.slice(0, Math.max(0, MAX_SPECIMEN_PHOTOS - photos.length))) {
          photos.push({...photo,id:uniqueEntryId('PHOTO',photos)});
        }
        return {...profile,photos};
      }));
      onNotice(imported.length + ' compressed photo(s) added' + (errors ? ', ' + errors + ' failed' : '') + '. Check the save indicator and download a JSON backup.');
    } finally {setUploading(false);setUploadProgress('');}
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
    <div className="section-heading list-heading">SPECIMEN PHOTOS <span className="pill">{p.photos.length}/{MAX_SPECIMEN_PHOTOS}</span></div>
    <label className="atlas-upload">{uploading?'PROCESSING PHOTO '+uploadProgress+'…':'＋ ADD PHOTOS (JPG / PNG / WEBP)'}<input disabled={disabled||uploading||p.photos.length>=MAX_SPECIMEN_PHOTOS} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={importPhoto}/></label>
    <p className="panel-hint">Up to 8 compressed photos per plant. Multiple files can be added together, and each photo can be exported separately. Photos are saved locally in IndexedDB when supported, and are included in JSON backups. These are optimized copies, not full-resolution originals.</p>
    <div className="atlas-photos">{p.photos.map((photo:SpecimenPhoto)=><div key={photo.id} className="atlas-photo"><img src={photo.dataUrl} alt={photo.caption||`Specimen ${objectId}`} loading="lazy"/><label className="field">CAPTION<input disabled={disabled} maxLength={240} value={photo.caption} onChange={e=>onChange(g=>updateProfile(g,objectId,old=>({...old,photos:old.photos.map(x=>x.id===photo.id?{...x,caption:e.target.value}:x)})),`photo:${photo.id}:caption`)}/></label><a className="btn btn-muted" href={photo.dataUrl} download={["garden-",objectId,"-",photo.id,".jpg"].join("")}>↓ SAVE PHOTO</a><button disabled={disabled} className="btn btn-muted" onClick={()=>onChange(g=>updateProfile(g,objectId,old=>({...old,photos:old.photos.filter(x=>x.id!==photo.id)})))}>REMOVE PHOTO</button></div>)}</div>
  </section>;
}
