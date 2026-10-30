export type EditorPanel = 'map' | 'tools' | 'inspector' | 'projects';

const PANELS: readonly { id: EditorPanel; label: string }[] = [
  { id: 'map', label: '⌖ MAP' },
  { id: 'tools', label: '♣ OBJECTS' },
  { id: 'inspector', label: '✎ DETAILS' },
  { id: 'projects', label: '▧ GARDENS' },
];

/** Accessible mobile navigation; scrolling and editing decisions belong to the parent. */
export function MobileNavigation({ selected, onNavigate }: { selected: EditorPanel; onNavigate: (panel: EditorPanel) => void }) {
  return <nav className="mobile-nav" aria-label="Mobile garden navigation">
    {PANELS.map(item => <button key={item.id} type="button" className={selected === item.id ? 'active' : ''}
      aria-current={selected === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}>{item.label}</button>)}
  </nav>;
}
