/* Editorial invitations. No trackers, personal data, network requests, or fake urgency. */
(() => {
  'use strict';
  const copy = {
    reader: {
      label: 'The reader invitation', image: '/assets/optimized/meat-wagon-cover.webp', imageAlt: 'Meat Wagon by Joshua Carlson',
      literary: {headline:'Some stories follow you ashore.',sub:'A miracle with a terrible secret. A legend with a price. Choose a story from 36seas and take the next chapter with you.',placeholder:'What would you like to read?',cta:'Find my next crossing on Amazon',close:'Let me keep browsing'},
      direct: {headline:'Make your next read a memorable one.',sub:'Discover speculative horror, dark adventure, or ideas for your work and life. Choose your next book, then buy your edition on Amazon.',placeholder:'Choose your next read',cta:'View my book on Amazon',close:'Keep browsing'},
      field:'Your next book', options:[['fiction','Meat Wagon · speculative horror'],['adventure','The Ocala Nine · dark adventure'],['professional','AI-Powered Prototyping · UX Mindset'],['personal','The Function of Man · purpose & agency']],note:'Books are purchased on Amazon. No email required.'
    },
    studio: {
      label: 'FirstMate / Lessons learned',
      literary: {headline:'Give the book a compass.',sub:'Keep the years you have lived in the story. Bring structure to the work ahead. FirstMate connects ideas, pages, and preparation—shaped by the lessons of finishing a book.',placeholder:'Where does your book begin today?',cta:'Explore FirstMate plans',close:'Back to the page'},
      direct: {headline:'Give your next draft a clearer direction.',sub:'Organize the idea, develop the manuscript, and prepare your files in one author studio. Use the lessons behind FirstMate to make the next step more deliberate.',placeholder:'Where are you with your book?',cta:'Compare FirstMate plans',close:'Keep reading'},
      field:'Your manuscript stage',options:[['idea','I have an idea'],['draft','I have a draft'],['finished','I’m preparing a finished manuscript']],note:'Start free with Basic. Paid features and allowances depend on your plan.'
    },
    publishing: {
      label: 'The 36seas imprint / Editorial consideration',
      literary: {headline:'A distinctive voice deserves a considered home.',sub:'If your manuscript is finished, explore a place on the 36seas list. We consider the voice, the reader, and the work behind the words.',placeholder:'How far has your manuscript travelled?',cta:'Find my publishing next step',close:'I’m still finding the story'},
      direct: {headline:'Finished manuscript? Explore 36seas consideration.',sub:'Read our editorial criteria and understand the separate paid review. Selected projects progress to a publishing agreement defining the work, costs, and rights.',placeholder:'Choose your manuscript stage',cta:'Find my publishing next step',close:'Continue exploring'},
      field:'Your manuscript stage',options:[['finished','Finished and ready for review'],['draft','A draft that needs more work'],['idea','An idea or outline']],note:'Review: $99 launch / $199 standard, separate from membership. Acceptance is not guaranteed.'
    },
    welcome: {
      label: 'Your next chapter',
      literary: {headline:'What are you carrying toward the page?',sub:'An idea. A half-written story. A book ready for its next reader. Begin where you are.',placeholder:'Choose the chapter you’re in',cta:'Show me a way forward',close:'I’ll find my own way'},
      direct: {headline:'Find the right next step for your book.',sub:'Choose your starting point. We’ll take you to a useful guide, the studio, or the publishing process.',placeholder:'Where are you starting?',cta:'Show my next step',close:'Not now'},
      field:'Your starting point',options:[['idea','I have an idea'],['draft','I want to finish my draft'],['finished','I’m ready to explore publishing'],['reader','I’m here to find a book']],note:'One choice. No email or account needed.'
    }
  };
  const path=location.pathname;
  const isPreview=path==='/invitation-preview/';
  const seenKey='36seas-invitation-session-v1',cooldownKey='36seas-invitation-dismissed-v1';
  const cooldownMs=7*24*60*60*1000;
  let shown=false,current=null,previousFocus=null,activeMs=0,lastTick=performance.now(),lastInteraction=performance.now(),scrollDepth=0;
  const read=(storage,key)=>{try{return storage.getItem(key)}catch{return null}};
  const save=(storage,key,value)=>{try{storage.setItem(key,value)}catch{/* Storage must never block the experience. */}};
  // Accessing the Storage object itself may be denied in privacy modes.
  let session,local;try{session=window.sessionStorage}catch{}try{local=window.localStorage}catch{}
  const recent=()=>{const value=Number(read(local,cooldownKey));return Number.isFinite(value)&&value>0&&Date.now()-value<cooldownMs;};
  const pathReader=path==='/books/'||/^\/books\/[^/]+\/$/.test(path)||document.body.dataset.pageKind==='reader';
  const pathStudio=path.startsWith('/first-mate/')||document.body.dataset.pageKind==='writing-article';
  const pathPublishing=path==='/write-your-book/';
  const eligible=()=>!current&&!shown&&!read(session,seenKey)&&!recent()&&!document.hidden&&!document.querySelector('dialog[open],.nav.open')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
  const dismiss=()=>{
    if(!current)return;
    const {root,preview,modal}=current;current=null;
    if(!preview)save(local,cooldownKey,String(Date.now()));
    if(modal&&root.open)root.close();root.remove();
    if(modal&&previousFocus?.isConnected)previousFocus.focus();
  };
  const destinations={
    reader:{fiction:'https://www.amazon.com/dp/B0HCWJWTZZ',adventure:'https://www.amazon.com/dp/B0H18PZSY9',professional:'https://www.amazon.com/dp/B0HC7SYW38',personal:'https://www.amazon.com/dp/B0D92TM6C6'},
    studio:{idea:'/pricing/#membership-plans',draft:'/pricing/#membership-plans',finished:'/pricing/#membership-plans'},
    publishing:{finished:'/publishing/manuscript-review/',draft:'/resources/revision-passes/',idea:'/resources/book-brief/'},
    welcome:{idea:'/resources/book-brief/',draft:'/first-mate/method/',finished:'/publishing/manuscript-review/',reader:'/books/'}
  };
  function show(id,variant='direct',preview=false){
    if(!Object.hasOwn(copy,id)||!['direct','literary'].includes(variant))return;
    if(!preview&&!eligible())return;
    if(preview&&current)dismiss();
    const offer=copy[id],words=offer[variant],modal=id!=='welcome';
    const root=document.createElement(modal?'dialog':'aside');
    root.className='invitation '+(modal?'invitation-modal':'invitation-slide')+(id==='studio'?' invitation-fm':'');
    root.setAttribute('aria-labelledby','invitation-title');
    root.setAttribute('aria-describedby','invitation-description');
    if(!modal)root.setAttribute('aria-label','Your next chapter invitation');
    const close=document.createElement('button');close.type='button';close.className='invitation-x';close.setAttribute('aria-label','Close invitation');close.textContent='×';close.addEventListener('click',dismiss);root.append(close);
    const layout=document.createElement('div');layout.className='invitation-layout';root.append(layout);
    if(offer.image){const art=document.createElement('div');art.className='invitation-art';const img=document.createElement('img');img.src=offer.image;img.alt=offer.imageAlt;img.width=180;img.height=288;art.append(img);layout.append(art);}
    const content=document.createElement('div');content.className='invitation-copy';layout.append(content);
    const eyebrow=document.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent=id==='studio'?'FirstMate · Writing software':offer.label;content.append(eyebrow);
    const title=document.createElement('h2');title.id='invitation-title';title.textContent=words.headline;content.append(title);
    const sub=document.createElement('p');sub.id='invitation-description';sub.textContent=words.sub;content.append(sub);
    const form=document.createElement('form');const label=document.createElement('label');label.htmlFor='invitation-choice';label.textContent=offer.field;form.append(label);
    const select=document.createElement('select');select.id='invitation-choice';select.required=true;
    if(id==='reader')select.addEventListener('change',()=>{const covers={fiction:['meat-wagon-cover','Meat Wagon'],adventure:['ocala-nine-cover','The Ocala Nine'],professional:['ux-mindset-cover','AI-Powered Prototyping'],personal:['function-of-man-cover','The Function of Man']};if(!Object.hasOwn(covers,select.value))return;const image=root.querySelector('.invitation-art img');if(image){image.src='/assets/optimized/'+covers[select.value][0]+'.webp';image.alt=covers[select.value][1]+' by Joshua Carlson';}});
    const placeholder=new Option(words.placeholder,'',true,true);placeholder.disabled=true;select.add(placeholder);
    offer.options.forEach(([value,label])=>select.add(new Option(label,value)));form.append(select);
    const cta=document.createElement('button');cta.type='submit';cta.className=id==='studio'?'btn fm-cta':'btn';cta.textContent=words.cta;form.append(cta);
    form.addEventListener('submit',e=>{e.preventDefault();if(!Object.hasOwn(destinations[id],select.value))return;const destination=destinations[id][select.value];if(!preview)save(local,cooldownKey,String(Date.now()));location.assign(destination);});content.append(form);
    const note=document.createElement('p');note.className='invitation-note';note.textContent=offer.note;content.append(note);
    const leave=document.createElement('button');leave.type='button';leave.className='invitation-dismiss';leave.textContent=words.close;leave.addEventListener('click',dismiss);content.append(leave);
    if(preview){const p=document.createElement('p');p.className='invitation-note';p.textContent='Copy preview · This does not change automatic invitation frequency.';content.append(p);}
    previousFocus=document.activeElement;document.body.append(root);current={root,preview,modal};
    if(!preview){shown=true;save(session,seenKey,'1');}
    if(modal){root.addEventListener('cancel',e=>{e.preventDefault();dismiss();});root.addEventListener('click',e=>{if(e.target===root){const r=root.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismiss();}});root.showModal();close.focus();}
  }
  // Preview controls are available only on the noindex copy-review page.
  if(isPreview){document.querySelectorAll('[data-preview-invitation]').forEach(button=>button.addEventListener('click',()=>show(button.dataset.previewInvitation,button.dataset.variant,true)));return;}
  const engaged=()=>{lastInteraction=performance.now();};
  ['pointerdown','keydown','touchstart'].forEach(event=>document.addEventListener(event,engaged,{passive:true}));
  window.addEventListener('scroll',()=>{engaged();const range=document.documentElement.scrollHeight-innerHeight;if(range>0)scrollDepth=Math.max(scrollDepth,scrollY/range);},{passive:true});
  document.addEventListener('visibilitychange',()=>{lastTick=performance.now();if(!document.hidden)engaged();});
  document.addEventListener('mouseout',event=>{
    if(!pathReader||!matchMedia('(hover:hover) and (pointer:fine)').matches||event.relatedTarget!==null||event.clientY>5||event.clientX<=0||event.clientX>=innerWidth)return;
    if(activeMs>=20000&&scrollDepth>=.2)show('reader');
  });
  const timer=setInterval(()=>{
    const now=performance.now();
    if(!document.hidden&&now-lastInteraction<120000)activeMs+=Math.min(now-lastTick,1500);
    lastTick=now;
    if(shown||read(session,seenKey)||recent()){clearInterval(timer);return;}
    if(pathPublishing&&scrollDepth>=.7&&activeMs>=20000)show('publishing');
    else if(pathStudio&&activeMs>=45000&&scrollDepth>=.25)show('studio');
    else if(path==='/'&&activeMs>=30000)show('welcome');
  },1000);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&current&&!current.modal)dismiss();});
})();
