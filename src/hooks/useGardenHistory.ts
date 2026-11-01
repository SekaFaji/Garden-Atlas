import { useRef, useState } from 'react';
import type { Garden } from '../model';
import { emptyGardenHistory, recordGardenEdit, undoGardenEdit, redoGardenEdit, type GardenHistory } from '../history';

/** Undo/redo is ephemeral editor state. App owns validation and IndexedDB writes. */
export function useGardenHistory() {
  const [history,setHistory]=useState<GardenHistory>(emptyGardenHistory);
  const current=useRef(history);
  // Keep rapid edit/undo operations ordered even before React's next render.
  const commit=(next:GardenHistory)=>{current.current=next;setHistory(next);};

  const recordEdit=(previous:Garden,key?:string)=>{
    commit(recordGardenEdit(current.current,previous,key,Date.now()));
  };
  const clearHistory=()=>commit(emptyGardenHistory());
  const takeUndo=(garden:Garden):Garden|null=>{
    const result=undoGardenEdit(current.current,garden);
    if(result.garden)commit(result.history);
    return result.garden;
  };
  const takeRedo=(garden:Garden):Garden|null=>{
    const result=redoGardenEdit(current.current,garden);
    if(result.garden)commit(result.history);
    return result.garden;
  };
  return {past:history.past,future:history.future,recordEdit,clearHistory,takeUndo,takeRedo};
}
