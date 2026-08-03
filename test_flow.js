const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const sm=html.match(/<script>([\s\S]*)<\/script>/);
const head=html.slice(0, sm.index);
const code=sm[1];

// collect static ids from body
const staticIds=new Set();
let m, re=/id="([^"]+)"/g;
while((m=re.exec(head))) staticIds.add(m[1]);

const store={};
function mkEl(id){
  return {
    id, innerHTML:'', textContent:'', value:'', href:'', srcdoc:'', disabled:false,
    dataset:{}, style:{}, classList:{add(){},remove(){},toggle(){}},
    appendChild(){}, addEventListener(){}, getAttribute(){return '#x';},
    scrollIntoView(){}, getBoundingClientRect(){return {top:0,left:0,width:0,height:0};}
  };
}
// pre-register static ids
for(const id of staticIds) store[id]=mkEl(id);

global.document={
  getElementById:(id)=> store[id] || (store[id]=mkEl(id)),
  querySelector:(s)=> store[s.replace('#','')] || (store[s.replace('#','')]=mkEl(s.replace('#',''))),
  querySelectorAll:(s)=> [],
  createElement:()=> mkEl('new'),
  body: mkEl('body')
};
global.window={addEventListener(){},scrollTo(){}};
global.localStorage={getItem:()=>null,setItem(){}};
global.addEventListener=()=>{};
global.requestAnimationFrame=(fn)=>{ fn(); };       // run synchronously so generate() completes
global.setTimeout=(fn)=>{ fn(); return 0; };         // run synchronously
global.setInterval=()=>0;                             // don't loop
let alertMsg=null;
global.alert=(msg)=>{ alertMsg=msg; };

// expose internals
const expose = `
global.__api = {
  pickBrand, useType, toggleMod, wizGoto, wizNext, wizPrev, generate,
  filteredBrands, filteredTypes, toggleF, renderBrands, renderTypes,
  getStep:()=>currentStep, getState:()=>state, getBF:()=>bf, getTF:()=>tf,
  BRANDS, TYPES, BACKEND, STEPS
};
`;

let pass=0, fail=0;
function assert(name, cond, extra){
  if(cond){ pass++; console.log('  PASS '+name); }
  else { fail++; console.log('  FAIL '+name+(extra?(' :: '+extra):'')); }
}

try{
  eval(code + expose);
  const A=global.__api;
  console.log('--- INIT ---');
  assert('script ran no throw', true);
  assert('brandGrid rendered 74', (store['brandGrid'].innerHTML.match(/class="bcard /g)||[]).length===74, (store['brandGrid'].innerHTML.match(/class="bcard /g)||[]).length);
  assert('typeList rendered 100', (store['typeList'].innerHTML.match(/class="titem /g)||[]).length===100, (store['typeList'].innerHTML.match(/class="titem /g)||[]).length);
  assert('backendGrid rendered 8', (store['backendGrid'].innerHTML.match(/class="bmod /g)||[]).length===8, (store['backendGrid'].innerHTML.match(/class="bmod /g)||[]).length);
  assert('brandCount text', store['brandCount'].textContent.includes('/ 74'), store['brandCount'].textContent);
  assert('typeCount text', store['typeCount'].textContent.includes('/ 100'), store['typeCount'].textContent);

  console.log('--- BRAND SEARCH ---');
  const bf=A.getBF(); bf.q='stripe'; A.renderBrands();
  const sr=(store['brandGrid'].innerHTML.match(/class="bcard /g)||[]).length;
  assert('search "stripe" narrows list (>0, substring match)', sr>=1 && store['brandGrid'].innerHTML.includes('stripe'), 'count='+sr);
  bf.q=''; A.renderBrands();
  assert('clear search restores 74', (store['brandGrid'].innerHTML.match(/class="bcard /g)||[]).length===74);

  console.log('--- BRAND FILTER (industry/tone/color) ---');
  // pick an industry present
  const industries=[...new Set(A.BRANDS.map(b=>b.industry))];
  bf.industry=[industries[0]]; A.renderBrands();
  const fi=A.filteredBrands();
  assert('industry filter only keeps matching', fi.every(b=>b.industry===industries[0]), 'n='+fi.length);
  bf.industry=[]; A.renderBrands();

  console.log('--- TYPE SEARCH + CATEGORY ---');
  const tf=A.getTF(); tf.q='电商'; A.renderTypes();
  const ts=A.filteredTypes();
  assert('type search "电商" returns matches', ts.length>0 && ts.every(t=>(t.name+t.category+t.prompt).includes('电商')), 'n='+ts.length);
  tf.q=''; tf.cat='SaaS'; A.renderTypes();
  const tsc=A.filteredTypes();
  assert('category filter SaaS works', tsc.length>0 && tsc.every(t=>t.category==='SaaS'), 'n='+tsc.length);
  tf.cat=''; A.renderTypes();

  console.log('--- WIZARD: pick brand -> auto step1 ---');
  const typeId=A.TYPES[0].id;
  A.pickBrand('stripe');
  assert('state.brand set', A.getState().brand==='stripe');
  assert('auto advanced to step1', A.getStep()===1, 'step='+A.getStep());
  assert('step1 body prompts type selection', store['stepBody'].innerHTML.includes('② 选择网站类型'));

  console.log('--- WIZARD: pick type -> auto step2 ---');
  A.useType(typeId);
  assert('state.type set', A.getState().type===typeId);
  assert('auto advanced to step2', A.getStep()===2, 'step='+A.getStep());
  // regression: step1 must render with selected numeric type id (was crashing on esc(t.id))
  A.wizGoto(1);
  assert('step1 renders selected type id without crash', store['stepBody'].innerHTML.includes(String(typeId)), 'step='+A.getStep());
  A.wizGoto(2);

  console.log('--- WIZARD: step3 backend toggle ---');
  A.wizGoto(3);
  const before=A.getState().backend.length;
  A.toggleMod(A.BACKEND[0].id);
  assert('backend module added', A.getState().backend.length===before+1);
  assert('backendDetail updated', store['backendDetail'].innerHTML.includes(A.BACKEND[0].name));
  A.toggleMod(A.BACKEND[1].id);
  assert('two backend modules', A.getState().backend.length===before+2);

  console.log('--- WIZARD: step5 docs + generate ---');
  A.wizGoto(4);
  assert('step5 has docsInput', store['stepBody'].innerHTML.includes('docsInput'));
  assert('step5 has docFile upload', store['stepBody'].innerHTML.includes('docFile'));
  assert('docFile accepts pdf/doc', /accept="[^"]*\.pdf[^"]*\.doc/.test(store['stepBody'].innerHTML), 'accept attr');
  // set notes & docs via state
  A.getState().notes='主色用 brand indigo，圆角小。';
  A.getState().docs='需要对接微信登录，部署到 EdgeOne。';

  console.log('--- GENERATE (happy path) ---');
  A.wizGoto(4); // ensure on last step; generate also callable from summary
  A.generate();
  assert('progress shown then outputs grid shown', store['outputs'].style.display==='grid', 'outputs.display='+store['outputs'].style.display);
  assert('sitePreview.srcdoc populated', store['sitePreview'].srcdoc && store['sitePreview'].srcdoc.includes('<!DOCTYPE html>'), 'len='+(store['sitePreview'].srcdoc||'').length);
  assert('sitePreview uses brand token', store['sitePreview'].srcdoc.includes('stripe') || store['sitePreview'].srcdoc.includes('--p:'));
  assert('backendDoc populated', store['backendDoc'].textContent && store['backendDoc'].textContent.includes('接口清单'), 'head='+store['backendDoc'].textContent.slice(0,20));
  assert('backendDoc mentions selected modules', store['backendDoc'].textContent.includes(A.BACKEND[0].name) && store['backendDoc'].textContent.includes(A.BACKEND[1].name));
  assert('dlSite href is data url', (store['dlSite'].href||'').startsWith('data:text/html'));
  assert('dlDoc href is data url', (store['dlDoc'].href||'').startsWith('data:text/markdown'));

  console.log('--- GENERATE (guard: no selection) ---');
  // reset selection
  A.getState().brand=null; A.getState().type=null;
  A.generate();
  assert('guard triggered alert', !!alertMsg, 'msg='+alertMsg);

  console.log('--- WIZARD prev navigation ---');
  A.pickBrand('stripe'); A.useType(typeId); A.wizGoto(3);
  A.wizPrev(); assert('prev from step3 -> step2', A.getStep()===2, 'step='+A.getStep());
  A.wizPrev(); assert('prev from step2 -> step1', A.getStep()===1);
  A.wizPrev(); assert('prev from step1 -> step0', A.getStep()===0);
  A.wizPrev(); assert('prev blocked at step0', A.getStep()===0);

  console.log('\n=== RESULT: '+pass+' passed, '+fail+' failed ===');
  process.exit(fail?1:0);
}catch(e){
  console.log('RUNTIME ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,8).join('\n'));
  process.exit(2);
}
