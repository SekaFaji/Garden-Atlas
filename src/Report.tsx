import { Sprite } from './Sprite';
import { polygonArea, type Garden, type Mode, type Ground } from './model';
import { formatArea } from './geometry';
import { isPlantKind } from './plantAtlas';

const palette:Record<Ground,string>={grass:'#96c67e',soil:'#a77d55',gravel:'#acaea3',stone:'#c0bbb1',water:'#69aabe'};
const points=(p:{x:number;y:number}[])=>p.map(v=>`${v.x*20},${v.y*20}`).join(' ');
function ReportMap({garden,mode}:{garden:Garden;mode:Mode}){
  const layout=garden.layout;
  return <div className="report-map"><svg viewBox={`-10 -10 ${garden.width*20+20} ${garden.height*20+20}`} role="img" aria-label={`${mode} garden plan, printable top down`}>
    <rect width={garden.width*20} height={garden.height*20} fill="#e3e9d8"/>
    <polygon points={points(layout.boundary)} fill={palette[layout.ground]} stroke="#365a3a" strokeWidth="4"/>
    {layout.regions.map(reg=><polygon key={reg.id} points={points(reg.points)} fill={palette[reg.ground]} stroke="#667661" strokeWidth="2"/>)}
    {layout.lines.map(line=><g key={line.id}><polyline points={points(line.points)} fill="none" stroke={line.kind==='path'?'#665a45':'#463325'} strokeWidth={line.widthM*20+3}/><polyline points={points(line.points)} fill="none" stroke={line.kind==='path'?'#d9ceb1':'#b99b74'} strokeWidth={line.widthM*20} strokeDasharray={line.kind==='fence'?'9 10':undefined}/></g>)}
    {garden.objects.map(item=>{
      const p=item.position;if(!p)return null;
      const d=Math.max(20,item.diameterM*20);
      return <g key={item.id} transform={`translate(${p.x*20} ${p.y*20})`}>
        <svg x={-d/2} y={-d/2} width={d} height={d} viewBox="0 0 64 64"><g transform={`rotate(${item.rotation??0} 32 32)`}><Sprite kind={item.kind} presetId={item.presetId}/></g></svg>
        <rect x={-55} y={d/2+4} width="110" height="15" fill="#ffffff" opacity=".85"/>
        <text x="0" y={d/2+15} textAnchor="middle" fontSize="10" fill="#1e3b26">{item.id.slice(0,14)}</text>
      </g>;
    })}
  </svg></div>;
}
/** Browser print dialog offers "Save as PDF" without any server or external PDF renderer. */
export function GardenReport({garden}:{garden:Garden}){
  const today=new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  return <article className="print-report">
    <header className="report-cover"><div className="report-kicker">GARDEN ATLAS · PERSONAL GARDEN RECORD</div>
      <h1>{garden.name||'Untitled Garden'}</h1>
      <p>Illustrated landscape plan & specimen inventory</p>
      <div className="report-meta"><span>Generated: {today}</span><span>{garden.objects.length} items · {garden.groups.length} groups</span></div>
    </header>
    <h2>01 / Garden overview</h2>
    <p>Workspace {garden.width} × {garden.height} metres. Scale boundary area: {formatArea(polygonArea(garden.layout.boundary))}. All measurements are approximate and not a legal land survey.</p>
    <h3>Measured garden map</h3><ReportMap garden={garden} mode="scale"/>
    <h3>Illustrated garden map</h3><ReportMap garden={garden} mode="illustration"/>
    <h2>02 / Paths & fences</h2>
    {garden.layout.lines.length===0?<p>No paths or fences added.</p>:garden.layout.lines.map(line=><p key={line.id}>{line.name||line.kind} ({line.id}) · {line.kind} · {line.widthM.toFixed(1)} m wide</p>)}
    <h2>03 / Groups</h2>
    {garden.groups.length===0?<p>No groups added.</p>:garden.groups.map(g=><section key={g.id} className="report-group"><h3>{g.name} <small>{g.id}</small></h3><p>{g.notes||'No shared notes.'}</p><p>Specimens: {garden.objects.filter(o=>o.groupId===g.id).length}</p></section>)}
    <h2>04 / Plant & feature inventory</h2>
    {garden.objects.length===0?<p>No garden objects recorded yet.</p>:garden.objects.map(o=><section key={o.id} className="report-specimen">
      <div className="report-specimen-icon"><svg width="50" height="50" viewBox="0 0 64 64"><Sprite kind={o.kind} presetId={o.presetId}/></svg></div>
      <div><h3>{o.name||'Unnamed'} <small>{o.id}</small></h3>
        <p><strong>Type:</strong> {o.kind}{o.presetId?` (${o.presetId})`:""} · <strong>Species:</strong> {o.species||'Not recorded'} · <strong>Diameter:</strong> {o.diameterM.toFixed(1)} m</p>
        <p><strong>Group:</strong> {garden.groups.find(g=>g.id===o.groupId)?.name||'Ungrouped'}</p>
        <p><strong>Scale:</strong> {o.position?`${o.position.x.toFixed(1)} m, ${o.position.y.toFixed(1)} m`:'Unplaced'} · <strong>Both views linked</strong></p>
        {o.notes&&<p><strong>Notes:</strong> {o.notes}</p>}
        {isPlantKind(o.kind)&&<>
          <p><strong>Identification:</strong> {o.plant?.identification??'unidentified'} · <strong>Planted:</strong> {o.plant?.plantedOn||'Not recorded'}</p>
          {(()=>{const species=garden.speciesLibrary?.find(s=>s.id===o.plant?.speciesId);return species?<p><strong>Species profile:</strong> {species.commonName} {species.scientificName&&<em>({species.scientificName})</em>}{species.careNotes&&<> · Care: {species.careNotes}</>}</p>:null;})()}
          {o.plant?.observations.map(e=><p key={e.id}><strong>Observation {e.date}:</strong> {e.note}</p>)}
          {o.plant?.maintenance.map(e=><p key={e.id}><strong>Maintenance {e.date} · {e.action}:</strong> {e.note}</p>)}
          {o.plant?.photos.map(photo=><figure className="report-photo" key={photo.id}><img src={photo.dataUrl} alt={photo.caption||'Specimen photograph'}/><figcaption>{photo.caption}</figcaption></figure>)}
        </>}
      </div>
    </section>)}
    <footer className="report-footer">Generated locally by Garden Atlas · Your records remain in your browser unless you export them.</footer>
  </article>;
}
