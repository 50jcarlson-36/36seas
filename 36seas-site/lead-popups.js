(() => {
  'use strict';
  const app = 'https://app.36seas.com';
  const keys = { seen:'36seas.campaigns.lastSeen.v1', session:'36seas.campaigns.session.v1', paused:'36seas.campaigns.paused.v1', last:'36seas.campaigns.lastOffer.v1', measurement:'36seas.campaigns.measurementPaused.v1', metrics:'36seas.campaigns.metricsSession.v1' };
  const make = (tag, cls, text) => { const el = document.createElement(tag); if (cls) el.className = `lp-${cls}`; if (text) el.textContent = text; return el; };
  let catalog = [], selected = null, opener = null, previousOverflow = '', interacted = false;
  const launcher = make('button', 'launcher', 'Offers'); launcher.type = 'button';
  const dialog = make('dialog', 'dialog'); dialog.setAttribute('aria-labelledby', 'lead-popup-title');
  document.body.append(launcher, dialog);
  function metric(event) {
    if (!selected || navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    try {
      if (localStorage.getItem(keys.measurement) === '1') return;
      let session = sessionStorage.getItem(keys.metrics);
      if (!session) { session = crypto.randomUUID(); sessionStorage.setItem(keys.metrics, session); }
      void fetch(`${app}/api/campaigns/events`, { method:'POST', credentials:'omit', headers:{'Content-Type':'application/json'}, keepalive:true, body:JSON.stringify({id:crypto.randomUUID(),session,campaign:selected.id,event,surface:location.pathname.startsWith('/pricing')?'pricing':'home'}) }).catch(() => {});
    } catch { /* Measurement is optional. */ }
  }
  function close() { metric('dismiss'); dialog.close(); document.body.style.overflow = previousOverflow; opener?.focus(); }
  function open(c) {
    if (!c || dialog.open) return;
    interacted = true; selected = c; opener = document.activeElement;
    dialog.replaceChildren(); dialog.dataset.campaign = c.id;
    const dismiss = make('button', 'close', '×'); dismiss.type='button'; dismiss.setAttribute('aria-label','Close opportunity'); dismiss.autofocus=true; dismiss.addEventListener('click',close);
    const art = make('div','art'); const img = make('img',c.image.includes('full-cover')?'spread':'scene'); img.src = new URL(c.image,app).href; img.alt=c.image.includes('full-cover')?'Complete Meat Wagon cover spread':'Illustrative First Mate artwork'; art.append(img);
    const copy=make('div','copy'), badge=make('p','badge',c.badge), heading=make('h2','',c.headline); heading.id='lead-popup-title';
    const body=make('p','description',c.body), cta=make('a','primary',c.cta); const target=new URL(c.href,app);target.searchParams.set('campaign',c.id);if(c.goal!=='founder')target.searchParams.set('popup','0');cta.href=target.href;cta.dataset.testid='campaign-cta';cta.addEventListener('click',()=>{metric('cta_click');dialog.close();document.body.style.overflow=previousOverflow;});
    const note=make('p','note',c.goal==='founder'?'Upcoming betas · Free to request · No access granted yet':c.goal==='publish'?'Publication consideration. Acceptance is not guaranteed.':c.audience==='member'?'Paid membership required. Normal credit limits apply.':'Your story and creative decisions remain yours.');
    const details=make('details','details'); details.append(make('summary','','Offer details & preferences'),make('p','',c.detail));
    const status=make('p','');status.setAttribute('role','status');
    for(const [label,key,value,message] of [['Pause automatic offers',keys.paused,'1','Automatic offers paused.'],['Allow automatic offers',keys.paused,null,'Automatic offers allowed; frequency limits still apply.'],['Pause campaign measurement',keys.measurement,'1','Campaign measurement paused.'],['Allow campaign measurement',keys.measurement,null,'Campaign measurement allowed.']]) {
      const button=make('button','',label);button.type='button';button.addEventListener('click',()=>{try { if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);status.textContent=message; }catch {status.textContent='Preference storage is unavailable.';}});details.append(button);
    }
    details.append(status);copy.append(badge,heading,body,cta,note,details);dialog.append(dismiss,art,copy);
    previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();
    try {localStorage.setItem(keys.seen,String(Date.now()));sessionStorage.setItem(keys.session,'1');localStorage.setItem(keys.last,c.id);} catch {}
    metric('impression');metric('modal_open');
  }
  function next() {
    const pool=catalog.filter(c=>!c.audience||c.audience==='basic');let last='';try{last=localStorage.getItem(keys.last)||'';}catch{}
    return pool[(pool.findIndex(c=>c.id===last)+1)%pool.length];
  }
  launcher.addEventListener('click',()=>open(next()));
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
  fetch(`${app}/api/campaigns/catalog`,{credentials:'omit'}).then(r=>{if(!r.ok)throw new Error('Unavailable');return r.json();}).then(data=>{
    catalog=data.campaigns;
    const requested=new URL(location.href).searchParams.get('campaign');const choice=catalog.find(c=>c.id===requested);
    if(choice){open(choice);return;}
    window.setTimeout(()=>{
      try {
        const last=Number(localStorage.getItem(keys.seen)||0);
        if(interacted||document.visibilityState!=='visible'||document.querySelector('dialog[open], [aria-modal="true"]')||document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')||localStorage.getItem(keys.paused)==='1'||sessionStorage.getItem(keys.session)==='1'||!Number.isFinite(last)||last<0||(last!==0&&Date.now()-last<7*24*60*60*1000))return;
        open(next());
      }catch{ /* Respect unavailable preference storage. */ }
    },18000);
  }).catch(()=>{launcher.hidden=true;});
})();
