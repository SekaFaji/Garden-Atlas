import { useEffect, useRef, useState } from 'react';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
export function OfflineTools({saved}:{saved:boolean}){
  const [connected,setConnected]=useState(()=>navigator.onLine);
  const [ready,setReady]=useState(false);
  const [supported,setSupported]=useState(true);
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches);
  const [installEvent,setInstallEvent]=useState<InstallEvent|null>(null);
  const [waiting,setWaiting]=useState<ServiceWorker|null>(null);
  const [message,setMessage]=useState('');
  const consent=useRef(false);
  useEffect(()=>{
    const online=()=>setConnected(true),offline=()=>setConnected(false);
    const beforeInstall=(e:Event)=>{e.preventDefault();setInstallEvent(e as InstallEvent);};
    const didInstall=()=>{setInstalled(true);setInstallEvent(null);setMessage('Added to your home screen.');};
    window.addEventListener('online',online);window.addEventListener('offline',offline);
    window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',didInstall);
    if(!('serviceWorker' in navigator)||!import.meta.env.PROD){
      setSupported(false);
      return()=>{window.removeEventListener('online',online);window.removeEventListener('offline',offline);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',didInstall);};
    }
    let cancelled=false;
    const sw=navigator.serviceWorker;
    const controller=()=>{if(cancelled)return;setReady(Boolean(sw.controller));if(consent.current)window.location.reload();};
    sw.addEventListener('controllerchange',controller);
    let check:(()=>void)|undefined;
    void sw.register(`${import.meta.env.BASE_URL}sw.js`,{scope:import.meta.env.BASE_URL,updateViaCache:'none'}).then(reg=>{
      if(cancelled)return;
      const track=(worker:ServiceWorker|null)=>{
        if(!worker)return;
        if(worker.state==='installed'&&sw.controller)setWaiting(worker);
        worker.addEventListener('statechange',()=>{if(!cancelled&&worker.state==='installed'&&sw.controller)setWaiting(worker);});
      };
      track(reg.installing);
      if(reg.waiting&&sw.controller)setWaiting(reg.waiting);
      reg.addEventListener('updatefound',()=>track(reg.installing));
      check=()=>{if(navigator.onLine)void reg.update().catch(()=>{});};
      window.addEventListener('online',check);check();
      void sw.ready.then(()=>{if(!cancelled)setReady(true);});
    }).catch(()=>{if(!cancelled){setSupported(false);setMessage('Offline installation unavailable in this browser.');}});
    return()=>{
      cancelled=true;sw.removeEventListener('controllerchange',controller);
      if(check)window.removeEventListener('online',check);
      window.removeEventListener('online',online);window.removeEventListener('offline',offline);
      window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',didInstall);
    };
  },[]);
  const install=async()=>{
    if(!installEvent)return;
    try{
      await installEvent.prompt();
      const result=await installEvent.userChoice;setInstallEvent(null);
      if(result.outcome==='dismissed')setMessage('Installation cancelled. Browser use is still available.');
    }catch{setMessage('Try installing from your browser menu instead.');}
  };
  const update=()=>{
    if(!waiting||!saved)return;
    consent.current=true;waiting.postMessage({type:'SKIP_WAITING'});
    setMessage('Applying update after the latest garden save…');
  };
  const check=()=>{
    if(!connected){setMessage('Connect to check for updates.');return;}
    void navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL).then(reg=>reg?.update()).then(()=>setMessage('Update check complete. Any available update will appear here.')).catch(()=>setMessage('Could not check for updates; your garden remains saved locally.'));
  };
  return <section className="offline-tools" aria-label="Offline app and installation">
    <div className="offline-summary"><span className={connected?'offline-network':'offline-network disconnected'} aria-live="polite">{connected?'● NETWORK AVAILABLE':'● NO INTERNET'}</span><span>{ready?'✓ OFFLINE APP READY':supported?'OFFLINE SETUP PENDING':'BROWSER MODE'}</span></div>
    <div className="offline-actions">
      {installEvent&&!installed&&<button className="btn btn-highlight" onClick={()=>{void install();}}>⬇ INSTALL APP</button>}
      {waiting&&<button className="btn btn-highlight" disabled={!saved} onClick={update}>↻ UPDATE APP{!saved?' · SAVE FIRST':''}</button>}
      {supported&&<button className="btn btn-muted" disabled={!connected} onClick={check}>CHECK FOR UPDATES</button>}
    </div>
    <p className="panel-hint">{installed?'Opened as a home-screen app. ':'On Android: browser menu → Install app / Add to Home screen. On iPhone: Safari Share → Add to Home Screen. '}Visit once online and let the offline cache complete. Afterwards, maps, editing, saved photos and JSON backups work without internet. Gardens stay on this device and do not synchronize.</p>
    <p className="panel-hint">Offline readiness is separate from saving. Watch INDEXEDDB SAVED and download JSON backups. Clearing site data or uninstalling may erase local work.</p>
    {message&&<p className="offline-feedback" role="status">{message}</p>}
  </section>;
}
