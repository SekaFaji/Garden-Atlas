/** Parse a completed object-size edit, not a partial keystroke. */
export function parseDimensionDraft(text:string):number|null {
 const value=text.trim().replace(',', '.');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))return null;
 const number=Number(value);
 if(!Number.isFinite(number)||number<0||number>100)return null;
 return Math.round(number*100)/100;
}
