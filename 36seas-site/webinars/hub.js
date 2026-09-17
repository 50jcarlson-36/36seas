(() => {
  let status='all',topic='all',events=[];
  const target=document.getElementById('webinar-results');
  const search=document.getElementById('webinar-search');
  const text=(tag,content,className)=>{const node=document.createElement(tag);node.textContent=content;if(className)node.className=className;return node;};
  const safeLink=value=>{try{const url=new URL(value,location.origin);return url.protocol==='https:'||url.origin===location.origin?url.href:null;}catch{return null;}};
  function render(){
    target.replaceChildren();
    const matches=events.filter(e=>(status==='all'||e.status===status)&&(topic==='all'||e.topic===topic)&&`${e.title} ${e.speaker} ${e.description}`.toLowerCase().includes(search.value.trim().toLowerCase()));
    if(!matches.length){const box=text('div','','empty');box.append(text('h3',events.length?'No matching sessions yet.':status==='past'?'The replay library is on its way.':'Our first sessions are being planned.'),text('p',events.length?'Try another topic or search term.':'No dates or recordings have been announced yet. Join for confirmed session details, registration links, and replay updates.'));const link=text('a','Get webinar updates →','button');link.href='#signup';box.append(link);target.append(box);return;}
    const grid=text('div','','webinar-grid');
    for(const event of matches){const card=text('article','','webinar-card');card.append(text('p',event.status==='past'?'On demand':'Upcoming','eyebrow'),text('h3',event.title),text('p',event.description),text('p',`${event.speaker} · ${event.dateLabel}`));const url=safeLink(event.url);if(url){const link=text('a',event.status==='past'?'Watch replay →':'Register for this session →','text-link');link.href=url;card.append(link);}grid.append(card);}target.append(grid);
  }
  for(const button of document.querySelectorAll('[data-status],[data-topic]'))button.addEventListener('click',()=>{const key=button.hasAttribute('data-status')?'status':'topic';if(key==='status')status=button.dataset.status;else topic=button.dataset.topic;document.querySelectorAll(`[data-${key}]`).forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();});
  search.addEventListener('input',render);
  fetch('/webinars/events.json').then(r=>{if(!r.ok)throw Error('Unavailable');return r.json();}).then(data=>{events=Array.isArray(data)?data.filter(e=>e&&['upcoming','past'].includes(e.status)&&typeof e.title==='string'&&typeof e.description==='string'&&typeof e.url==='string'):[];render();}).catch(()=>{target.replaceChildren(text('p','The webinar library could not load. Please refresh, or join the announcement list for updates.'));});
})();
