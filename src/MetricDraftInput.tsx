import {useEffect, useRef, useState} from 'react';
import {parseMetricDraft} from './metricDraft';

/** Leave partial text alone until blur/Enter; Escape reverts to the saved value. */
export function MetricDraftInput({value,min,max,decimals=2,disabled=false,label,onCommit,onNotice}:{
 value:number;min:number;max:number;decimals?:number;disabled?:boolean;label:string;
 onCommit:(value:number)=>void;onNotice:(message:string)=>void;
}){
 const [draft,setDraft]=useState(String(value));
 const [editing,setEditing]=useState(false);
 const cancelled=useRef(false);
 useEffect(()=>{if(!editing)setDraft(String(value));},[value,editing]);
 const finish=()=>{
   setEditing(false);
   if(cancelled.current){cancelled.current=false;setDraft(String(value));return;}
   const result=parseMetricDraft(draft,min,max,decimals);
   if(result===null){setDraft(String(value));onNotice(`${label}: enter a value from ${min} to ${max}. Previous value kept.`);return;}
   setDraft(String(result));
   if(result!==value)onCommit(result);
 };
 return <input type="text" inputMode={decimals===0?'numeric':'decimal'} className="metric-draft-input" aria-label={label}
  autoComplete="off" spellCheck={false} disabled={disabled} maxLength={12}
  value={draft} onFocus={e=>{cancelled.current=false;setEditing(true);e.currentTarget.select();}}
  onChange={e=>setDraft(e.target.value)} onBlur={finish}
  onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();else if(e.key==='Escape'){cancelled.current=true;e.currentTarget.blur();}}}/>;
}
