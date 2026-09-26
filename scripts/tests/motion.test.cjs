const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('36seas-site/brand/motion.js','utf8');
function setup({os=false,stored=false,storageFails=false}={}){
 const listeners={},classes=new Set(),observers=[],runs=[];
 const button={addEventListener:(k,f)=>listeners['button:'+k]=f,setAttribute(){}};
 const target={dataset:{},getBoundingClientRect:()=>({top:1200,height:200}),animate:(frames,options)=>{const a={frames,options,canceled:false,cancel(){this.canceled=true},finish(){this.onfinish?.()}};runs.push(a);return a}};
 const media={matches:os,addEventListener:(k,f)=>listeners.media=f};
 const document={hidden:false,documentElement:{classList:{toggle:(k,v)=>v?classes.add(k):classes.delete(k)}},querySelector:q=>q==='footer'?{append(){}}:null,createElement:()=>button,querySelectorAll:()=>[target],addEventListener:(k,f)=>listeners[k]=f};
 class Observer{constructor(cb){this.cb=cb;observers.push(this)}observe(){}unobserve(){}disconnect(){}}
 vm.runInNewContext(source,{document,matchMedia:q=>q.includes('reduced')?media:{matches:false,addEventListener(){}},localStorage:{getItem(){if(storageFails)throw Error();return stored?'1':null},setItem(){if(storageFails)throw Error()}},IntersectionObserver:Observer,window:{IntersectionObserver:Observer},Element:{prototype:{animate(){}}},navigator:{},innerHeight:900,addEventListener(){},requestAnimationFrame(){},cancelAnimationFrame(){}});
 return {listeners,classes,observers,runs,target,document,button,media};
}
test('OS reduced motion produces static visible content and disables override',()=>{const s=setup({os:true});assert(s.classes.has('motion-reduced'));assert.equal(s.observers.length,0);assert.equal(s.button.disabled,true)});
test('saved reduced preference prevents reveals',()=>{const s=setup({stored:true});assert.equal(s.observers.length,0);assert(s.classes.has('motion-reduced'))});
test('storage errors do not break motion control',()=>{const s=setup({storageFails:true});s.listeners['button:click']();assert(s.classes.has('motion-reduced'))});
test('reveal runs once and cancels when reduced motion is enabled',()=>{const s=setup();const entry={isIntersecting:true,target:s.target};s.observers[0].cb([entry]);s.observers[0].cb([entry]);assert.equal(s.runs.length,1);s.listeners['button:click']();assert(s.runs[0].canceled)});
test('hidden document never starts a reveal',()=>{const s=setup();s.document.hidden=true;s.observers[0].cb([{isIntersecting:true,target:s.target}]);assert.equal(s.runs.length,0)});
test('device preference change cancels active animation',()=>{const s=setup();s.observers[0].cb([{isIntersecting:true,target:s.target}]);s.media.matches=true;s.listeners.media();assert(s.runs[0].canceled);assert(s.classes.has('motion-reduced'))});
