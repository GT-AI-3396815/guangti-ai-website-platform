// 全量回归测试 v2：覆盖 74 品牌 × 100 类型，检查 buildSite 输出质量 + 快照
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
// 提取 <script> 内容（最后一个 script 块是主逻辑）
const m = html.match(/<script>([\s\S]*?)<\/script>/g);
if (!m) { console.error('NO SCRIPT FOUND'); process.exit(1); }
let scriptBody = m[m.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');

// ── DOM 桩 ──
function FakeEl() {
  return {
    _children: [],
    style: {},
    classList: { add(){}, remove(){}, contains(){return false;} },
    set innerHTML(v){ this._html = v; },
    get innerHTML(){ return this._html || ''; },
    set textContent(v){ this._text = v; },
    get textContent(){ return this._text || ''; },
    appendChild(c){ this._children.push(c); },
    addEventListener(){},
    scrollIntoView(){},
    setAttribute(){}, getAttribute(){return null;},
    querySelector(){ return FakeEl(); },
    querySelectorAll(){ return []; },
    value: ''
  };
}
const elCache = {};
global.document = {
  getElementById(id){ return elCache[id] || (elCache[id] = FakeEl()); },
  querySelector(){ return FakeEl(); },
  querySelectorAll(){ return []; },
  createElement(){ return FakeEl(); },
  addEventListener(){}
};
global.window = { addEventListener(){} };
global.requestAnimationFrame = (cb)=>cb();
global.alert = (msg)=>{ console.log('ALERT:', msg); };
global.localStorage = { getItem(){return null;}, setItem(){} };

// 注入数据
let BRANDS, TYPES, BACKEND, state = { brand:null, type:null, backend:[] };
scriptBody = scriptBody
  .replace(/const BRANDS = __BRANDS__;/, 'BRANDS = ' + JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname,'brands.json'),'utf8'))))
  .replace(/const TYPES = __TYPES__;/, 'TYPES = ' + JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname,'types.json'),'utf8'))))
  .replace(/const BACKEND = __BACKEND__;/, 'BACKEND = ' + JSON.stringify(JSON.parse(fs.readFileSync(path.join(__dirname,'backend.json'),'utf8'))));

// 用 vm 在隔离上下文跑
const vm = require('vm');
const ctx = {
  document: global.document, window: global.window, requestAnimationFrame: global.requestAnimationFrame,
  alert: global.alert, localStorage: global.localStorage, console,
  BRANDS: null, TYPES: null, BACKEND: null,
  setTimeout: (fn)=>fn(), // 立即执行 tick
  setInterval: ()=>0, clearInterval: ()=>{},
  Date, Math, JSON, encodeURIComponent, escape
};
vm.createContext(ctx);
// 把 const 改成 var / 直接赋值，便于后续访问
scriptBody = scriptBody.replace(/const BRANDS =/, 'BRANDS =').replace(/const TYPES =/, 'TYPES =').replace(/const BACKEND =/, 'BACKEND =').replace(/const state = \{[^}]*\}/, 'state = { brand:null, type:null, notes:"", backend:[], docs:"" }');
vm.runInContext(scriptBody, ctx);

BRANDS = ctx.BRANDS; TYPES = ctx.TYPES; BACKEND = ctx.BACKEND;
let pass = 0, fail = 0;
const fails = [];

function check(cond, msg){ if(cond){pass++;} else {fail++; fails.push(msg);} }

check(BRANDS && BRANDS.length===74, `BRANDS count=${BRANDS&&BRANDS.length} (expect 74)`);
check(TYPES && TYPES.length>=100, `TYPES count=${TYPES&&TYPES.length} (expect >=100)`);
check(BACKEND && BACKEND.length>=8, `BACKEND count=${BACKEND&&BACKEND.length}`);

// 逐项 buildSite
let emptyCount=0, undefinedCount=0, nanCount=0, objCount=0;
for (let bi=0; bi<BRANDS.length; bi++) {
  for (let ti=0; ti<TYPES.length; ti++) {
    const b = BRANDS[bi], t = TYPES[ti];
    let site;
    try {
      site = ctx.buildSite(b, t);
    } catch(e) {
      fail++; fails.push(`buildSite THROW brand=${b.title} type=${t.name}: ${e.message}`);
      continue;
    }
    if (!site || site.length < 500) { emptyCount++; continue; }
    // 占位检测
    if (site.includes('undefined')) undefinedCount++;
    if (site.includes('NaN')) nanCount++;
    if (site.includes('[object Object]')) objCount++;
    if (site.includes('[object')) objCount++;
    // 应有核心板块
    if (!site.includes('g-hero')) undefinedCount++;
  }
}

console.log(`\n=== buildSite 全量 (${BRANDS.length}×${TYPES.length}=${BRANDS.length*TYPES.length}) ===`);
console.log(`空输出: ${emptyCount}, 含undefined: ${undefinedCount}, 含NaN: ${nanCount}, 含[object]: ${objCount}`);
check(emptyCount===0, `emptyCount should be 0, got ${emptyCount}`);
check(undefinedCount===0, `undefined leakage should be 0, got ${undefinedCount}`);
check(nanCount===0, `NaN leakage should be 0, got ${nanCount}`);
check(objCount===0, `object leakage should be 0, got ${objCount}`);

// 抽样检查真实内容（非占位）
const sample = ctx.buildSite(BRANDS[0], TYPES[0]);
check(sample.includes(BRANDS[0].title), 'sample includes brand title');
check(sample.includes(TYPES[0].name), 'sample includes type name');
check(sample.includes('g-feats'), 'sample has features grid');
check(sample.includes('g-cta-banner'), 'sample has CTA banner');

// 测试 generate() 全链路（带 setTimeout 立即执行）
ctx.state.brand = BRANDS[0].id; ctx.state.type = TYPES[0].id;
try {
  ctx.generate();
  check(true, 'generate() ran without throw');
  // 验证快照卡片内容已生成
  const snap = elCache['snapJson'] && elCache['snapJson'].textContent;
  check(snap && snap.includes('project'), 'snapshot JSON generated in snapJson');
} catch(e) {
  check(false, `generate() THROW: ${e.message}`);
}

// 测试 ③ 同步函数：buildTaskBrief / 本地历史存取（用 stub 模拟浏览器 API）
try {
  const b0 = BRANDS[3], t0 = TYPES[7];
  const snap = { version:'1.1', generatedAt:new Date().toISOString(),
    project:{name:t0.name,brand:b0.title,category:t0.category},
    brand:{id:b0.id,title:b0.title,primary:(b0.swatches&&b0.swatches[0])||'',swatches:(b0.swatches||[]).slice(0,5),fonts:b0.fonts||[],tone:b0.tone||'',industry:b0.industry||''},
    type:{id:t0.id,name:t0.name,category:t0.category,prompt:(t0.prompt||''),structure:t0.structure||[],modules:(t0.modules||[]).slice(0,12),dataModel:(t0.dataModel||[]).slice(0,12)},
    backend:[], notes:'测试备注', docFile:null,
    outputs:{siteHtml:'<html>x</html>', backendDoc:'# doc'} };
  const brief = ctx.buildTaskBrief(snap);
  check(typeof brief === 'string' && brief.length > 50, 'buildTaskBrief returns non-empty string');
  check(brief.includes('<!-- GUANGTI_SNAPSHOT'), 'brief embeds GUANGTI_SNAPSHOT block');
  check(brief.includes(t0.name) && brief.includes(b0.title), 'brief contains project name + brand');
  check(brief.includes('测试备注'), 'brief contains dev notes');
  // 本地历史 stub（同时更新 VM 沙箱与 Node 全局，保持一致）
  const _store = { _d:{}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=v;} };
  global.localStorage = _store; ctx.localStorage = _store;
  ctx.saveProject(snap);
  const stored = JSON.parse(_store.getItem('guangti_projects')||'[]');
  check(stored.length === 1 && stored[0].snapshot.project.name === t0.name, 'saveProject persists to localStorage');
  // 重新解析简报里的快照，验证可逆
  const m = brief.match(/<!-- GUANGTI_SNAPSHOT\s*([\s\S]*?)\s*-->/);
  const reparsed = JSON.parse(m[1]);
  check(reparsed.project.name === t0.name, 'GUANGTI_SNAPSHOT re-parses to original project');
} catch(e) {
  check(false, `sync functions THROW: ${e.message}`);
}

console.log(`\n=== RESULT ===`);
console.log(`PASS: ${pass}, FAIL: ${fail}`);
if (fails.length) {
  console.log('\n--- FAILURES ---');
  fails.slice(0,30).forEach(f=>console.log(' ✗', f));
}
process.exit(fail>0?1:0);
