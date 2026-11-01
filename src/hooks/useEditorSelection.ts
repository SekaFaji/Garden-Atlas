import { useState } from 'react';
import type { FeatureSelection } from '../featureEdit';
import { toggleObjectId } from '../editorObjectActions';

/** Transient editor selection only. The saved garden and edit history stay in App. */
export function useEditorSelection() {
  const [selectedId,setSelectedId]=useState<string|null>('TREE-001');
  const [selectedGroupId,setSelectedGroupId]=useState<string|null>(null);
  const [selectedFeature,setSelectedFeature]=useState<FeatureSelection|null>(null);
  const [selectedVertex,setSelectedVertex]=useState<number|null>(null);
  const [checkedIds,setCheckedIds]=useState<string[]>([]);
  const [multiSelect,setMultiSelect]=useState(false);

  const selectObject=(id:string|null)=>{setSelectedId(id);setSelectedGroupId(null);};
  const toggleChecked=(id:string)=>setCheckedIds(ids=>toggleObjectId(ids,id));
  /** Project switching/import must not retain selections from the previous garden. */
  const resetSelection=()=>{
    setSelectedId(null);setSelectedGroupId(null);setSelectedFeature(null);
    setSelectedVertex(null);setCheckedIds([]);setMultiSelect(false);
  };
  return {selectedId,setSelectedId,selectedGroupId,setSelectedGroupId,
    selectedFeature,setSelectedFeature,selectedVertex,setSelectedVertex,
    checkedIds,setCheckedIds,multiSelect,setMultiSelect,
    selectObject,toggleChecked,resetSelection};
}
