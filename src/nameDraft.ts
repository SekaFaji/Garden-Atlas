/** Validate a finished name, never an intermediate keystroke. */
export function parseNameDraft(raw:string,maxLength:number,allowEmpty=false):string|null {
 if(typeof raw!=='string'||!Number.isInteger(maxLength)||maxLength<1||maxLength>300||raw.length>maxLength)return null;
 const trimmed=raw.trim();
 if(!trimmed&&!allowEmpty)return null;
 return allowEmpty?raw:trimmed;
}
