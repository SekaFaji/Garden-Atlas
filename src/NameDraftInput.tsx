import {useEffect, useRef, useState} from 'react';
import {parseNameDraft} from './nameDraft';

/** Editing drafts avoid rejecting blank intermediate text or causing save/undo on every key. */
export function NameDraftInput({value,maxLength,label,disabled=false,allowEmpty=false,className,onCommit,onNotice}:{
 value:string;maxLength:number;label:string;disabled?:boolean;allowEmpty?:boolean;className?:string;
 onCommit:(name:string)=>void;onNotice:(message:string)=>void;
}){
 const [draft,setDraft]=useState(value);
 const [editing,setEditing]=useState(false);
 const cancel=useRef(false);
 useEffect(()=>{if(!editing)setDraft(value);},[value,editing]);
 const finish=()=>{
  setEditing(false);
  if(cancel.current){cancel.current=false;setDraft(value);return;}
  const result=parseNameDraft(draft,maxLength,allowEmpty);
  if(result===null){setDraft(value);onNotice(`${label}: enter a name before saving. Previous name kept.`);return;}
  setDraft(result);
  if(result!==value)onCommit(result);
 };
 return <input className={className} type="text" aria-label={label} maxLength={maxLength} disabled={disabled}
  autoComplete="off" value={draft} onFocus={()=>{cancel.current=false;setEditing(true);}}
  onChange={e=>setDraft(e.target.value)} onBlur={finish}
  onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();else if(e.key==='Escape'){cancel.current=true;e.currentTarget.blur();}}}/>;
}
