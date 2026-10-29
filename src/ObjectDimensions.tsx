import { useEffect, useRef, useState } from 'react';
import { parseDimensionDraft } from './dimensions';
import { objectDimensions, type GardenObject } from './model';

/** Draft state allows clearing/typing '0' without reverting the input every keypress. */
export function ObjectDimensions({object,disabled,onChange,onNotice}:{object:GardenObject;disabled:boolean;onChange:(next:{widthM:number;lengthM:number})=>void;onNotice:(message:string)=>void}){
 const dimensions=objectDimensions(object);
 const [width,setWidth]=useState(String(dimensions.widthM));
 const [length,setLength]=useState(String(dimensions.lengthM));
 const [editing,setEditing]=useState<'width'|'length'|null>(null);
 const cancelRef=useRef(false);
 useEffect(()=>{if(editing!=='width')setWidth(String(dimensions.widthM));if(editing!=='length')setLength(String(dimensions.lengthM));},[dimensions.widthM,dimensions.lengthM,editing]);
 const finish=(axis:'width'|'length')=>{
  if(cancelRef.current){cancelRef.current=false;setEditing(null);setWidth(String(dimensions.widthM));setLength(String(dimensions.lengthM));return;}
  const draft=axis==='width'?width:length;
  const parsed=parseDimensionDraft(draft);
  setEditing(null);
  if(parsed===null){onNotice('Enter a dimension between 0 and 100 m. Blank or invalid values were not saved.');
   if(axis==='width')setWidth(String(dimensions.widthM));else setLength(String(dimensions.lengthM));return;}
  if(axis==='width'){setWidth(String(parsed));if(parsed!==dimensions.widthM)onChange({...dimensions,widthM:parsed});}
  else{setLength(String(parsed));if(parsed!==dimensions.lengthM)onChange({...dimensions,lengthM:parsed});}
 };
 const field=(axis:'width'|'length')=><label key={axis}>{axis==='width'?'WIDTH (X) · METRES':'LENGTH (Y) · METRES'}
  <input aria-label={axis==='width'?'Object width in metres':'Object length in metres'} type="text" inputMode="decimal" maxLength={8} autoComplete="off" disabled={disabled}
   value={axis==='width'?width:length} onFocus={e=>{cancelRef.current=false;setEditing(axis);e.currentTarget.select();}}
   onChange={e=>{if(axis==='width')setWidth(e.target.value);else setLength(e.target.value);}}
   onBlur={()=>finish(axis)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();if(e.key==='Escape'){cancelRef.current=true;e.currentTarget.blur();}}}/>
 </label>;
 return <div className="object-dimensions"><div className="dimension-row">{field('width')}{field('length')}</div>
  <p className="dimension-hint">Type freely, then tap outside or press Enter to apply. 0 m means not measured; a small map marker remains visible.</p>
 </div>;
}
