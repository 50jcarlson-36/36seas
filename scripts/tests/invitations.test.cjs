const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('36seas-site/brand/invitations.js','utf8');
function storage() { const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}; }
function env(path,options={}) {
 let clock=0,interval,removed=false,assigned=null;const docEvents={},winEvents={};
 class El {
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.events={};this.attributes={};this.dataset={};this.isConnected=true;this.value='';}
  append(...elements){this.children.push(...elements);elements.forEach(e=>e.parent=this)}
  setAttribute(k,v){this.attributes[k]=v}addEventListener(k,fn){this.events[k]=fn}
  add(el){this.children.push(el)} focus(){document.activeElement=this}
  showModal(){this.open=true}close(){this.open=false}remove(){this.isConnected=false;this.parent.children=this.parent.children.filter(e=>e!==this)}
  getBoundingClientRect(){return {left:0,right:800,top:0,bottom:800}}
 }
 const body=new El('body');body.dataset.pageKind=options.kind||'';
 const document={body,hidden:false,activeElement:new El('a'),documentElement:{scrollHeight:2000},createElement:t=>new El(t),addEventListener:(k,fn)=>docEvents[k]=fn,querySelector:()=>options.blocked?new El('dialog'):null};
 const context={document,location:{pathname:path,assign:u=>assigned=u},performance:{now:()=>clock},Date:{now:()=>1700000000000+clock},Option:class {constructor(text,value){this.text=text;this.value=value}},window:{sessionStorage:options.session||storage(),localStorage:options.local||storage(),addEventListener:(k,fn)=>winEvents[k]=fn},matchMedia:()=>({matches:options.touch!==true}),setInterval:fn=>{interval=fn;return 1},clearInterval:()=>removed=true,innerHeight:800,innerWidth:1440,scrollY:0};
 vm.runInNewContext(source,context);
 return {context,document,winEvents,docEvents,get roots(){return body.children},get assigned(){return assigned},scroll(fraction){context.scrollY=1200*fraction;winEvents.scroll?.()},tick(seconds){for(let i=0;i<seconds&&!removed;i++){clock+=1000;interval?.()}},exit(){docEvents.mouseout?.({relatedTarget:null,clientY:0,clientX:400})},dismiss(){const root=body.children[0];root.children[0].events.click()},choose(value){const root=body.children[0];const all=[];function walk(e){all.push(e);e.children?.forEach(walk)}walk(root);all.find(e=>e.tagName==='SELECT').value=value;all.find(e=>e.tagName==='FORM').events.submit({preventDefault(){}})}};
}
test('homepage slide-in waits thirty active seconds and does not take focus',()=>{const e=env('/'),focus=e.document.activeElement;e.tick(29);assert.equal(e.roots.length,0);e.tick(1);assert.equal(e.roots[0].tagName,'ASIDE');assert.equal(e.document.activeElement,focus)});
test('time while hidden never qualifies',()=>{const e=env('/');e.document.hidden=true;e.tick(60);assert.equal(e.roots.length,0);e.document.hidden=false;e.tick(30);assert.equal(e.roots.length,1)});
test('writing invitation requires time AND reading progress',()=>{const e=env('/resources/book-brief/',{kind:'writing-article'});e.tick(45);assert.equal(e.roots.length,0);e.scroll(.3);e.tick(1);assert.equal(e.roots[0].tagName,'DIALOG')});
test('publishing invitation requires seventy percent and minimum engagement',()=>{const e=env('/write-your-book/');e.scroll(.8);e.tick(19);assert.equal(e.roots.length,0);e.tick(1);assert.equal(e.roots.length,1)});
test('reader exit does not appear without engagement',()=>{const e=env('/books/');e.exit();assert.equal(e.roots.length,0);e.tick(20);e.scroll(.3);e.exit();assert.equal(e.roots.length,1)});
test('touch device does not simulate exit intent',()=>{const e=env('/books/',{touch:true});e.tick(30);e.scroll(.8);e.exit();assert.equal(e.roots.length,0)});
test('typing and open navigation defer an invitation',()=>{const options={blocked:true},e=env('/',options);e.tick(35);assert.equal(e.roots.length,0);options.blocked=false;e.document.activeElement.tagName='INPUT';e.tick(2);assert.equal(e.roots.length,0);e.document.activeElement.tagName='A';e.tick(1);assert.equal(e.roots.length,1)});
test('session cap applies across page changes',()=>{const session=storage(),first=env('/',{session});first.tick(30);const second=env('/first-mate/',{session});second.scroll(.8);second.tick(60);assert.equal(second.roots.length,0)});
test('dismissal suppresses another concept in a new session',()=>{const local=storage(),first=env('/',{local});first.tick(30);first.dismiss();assert.equal(first.roots.length,0);const second=env('/write-your-book/',{local});second.scroll(.9);second.tick(60);assert.equal(second.roots.length,0)});
test('seven-day cooldown expires',()=>{const local=storage();local.setItem('36seas-invitation-dismissed-v1',String(1700000000000-8*86400000));const e=env('/',{local});e.tick(30);assert.equal(e.roots.length,1)});
test('storage failure cannot break content or dismissal',()=>{const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};const e=env('/',{local:denied,session:denied});e.tick(30);assert.equal(e.roots.length,1);e.dismiss();assert.equal(e.roots.length,0)});
test('reader choice goes directly to the corresponding Amazon title',()=>{const e=env('/books/');e.tick(20);e.scroll(.3);e.exit();e.choose('adventure');assert.equal(e.assigned,'https://www.amazon.com/dp/B0H18PZSY9')});
test('unfinished author receives development guidance rather than paid review',()=>{const e=env('/write-your-book/');e.scroll(.8);e.tick(20);e.choose('draft');assert.equal(e.assigned,'/resources/revision-passes/')});
test('finished author receives the review information page',()=>{const e=env('/write-your-book/');e.scroll(.8);e.tick(20);e.choose('finished');assert.equal(e.assigned,'/publishing/manuscript-review/')});
test('invalid selections never navigate',()=>{const e=env('/');e.tick(30);e.choose('untrusted');assert.equal(e.assigned,null);e.choose('__proto__');assert.equal(e.assigned,null)});
test('modal Escape restores the previous focus target',()=>{const e=env('/books/'),focus=e.document.activeElement;e.tick(20);e.scroll(.3);e.exit();assert.notEqual(e.document.activeElement,focus);e.roots[0].events.cancel({preventDefault(){}});assert.equal(e.document.activeElement,focus);assert.equal(e.roots.length,0)});
