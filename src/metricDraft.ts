/** Validates a completed measurement, not a partial keystroke. */
export function parseMetricDraft(raw:string, min:number, max:number, decimals=2):number|null {
  const text=raw.trim().replace(',', '.');
  if (!Number.isFinite(min)||!Number.isFinite(max)||min>max||!Number.isInteger(decimals)||decimals<0||decimals>4) return null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const value=Number(text);
  if(!Number.isFinite(value)||value<min||value>max) return null;
  if(decimals===0&&!Number.isInteger(value)) return null;
  const rounded=Number(value.toFixed(decimals));
  return rounded>=min&&rounded<=max?rounded:null;
}
