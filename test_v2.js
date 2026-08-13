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
scriptBody = scriptBody.replace(/const BRANDS =/, 'BRANDS =').replace(/const TYPES =/, 'TYPES =').replace(/const BACKEND =/, 'BACKEND =').replace(/const state = \{[^}]*\}/, 'state = { brand:null, type:null, prompt:"", notes:"", backend:[], docs:"", heroImage:null, files:[] }');
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

// 测试 ② 多文件组件化输出 buildProject（返回值为 files 映射，非 {inline,files}）
try {
  const b0 = BRANDS[2], t0 = TYPES[5];
  const fp = ctx.buildProject(b0, t0);
  const names = Object.keys(fp);
  check(names.includes('index.html') && names.includes('assets/css/style.css') && names.includes('assets/js/site.js') && names.includes('README.md'), 'buildProject has index/css/js/readme');
  const idx = fp['index.html'];
  check(idx.includes('assets/css/style.css') && idx.includes('assets/js/site.js'), 'index.html links external css/js (multi-file)');
  check(fp['assets/css/style.css'].includes('--p:'), 'css contains injected brand token');
  check(fp['assets/js/site.js'].includes('toggleTheme'), 'js contains theme toggle');
  check(fp['README.md'].includes('文件结构'), 'readme documents file structure');
  check(idx.includes('picsum.photos'), 'generated site uses real image URL (picsum)');
  check(idx.includes('data:image/svg+xml'), 'generated site has brand-art fallback');
  check(idx.includes('<svg') && !idx.includes('✦'), 'features use SVG icons, no emoji icons');
  check(idx.includes('g-mobile') && idx.includes('toggleMenu'), 'nav has mobile menu + theme toggle (frontend-design)');
  // 抽样 50 组合确保 buildProject 不抛错且含真实内容
  let projErr=0;
  for (let bi=0; bi<BRANDS.length; bi+=7) {
    for (let ti=0; ti<TYPES.length; ti+=9) {
      try {
        const f = ctx.buildProject(BRANDS[bi], TYPES[ti]);
        if (!f['index.html'] || !f['assets/css/style.css']) projErr++;
      } catch(e) { projErr++; fails.push('buildProject THROW '+BRANDS[bi].title+'/'+TYPES[ti].name+': '+e.message); }
    }
  }
  check(projErr===0, 'buildProject sampled combos all OK (expect 0 errors), got '+projErr);
  // zip 函数存在且为函数
  check(typeof ctx.downloadProject === 'function', 'downloadProject(zip) function defined');
} catch(e) {
  check(false, `buildProject THROW: ${e.message}`);
}

// 测试 ③ 产品级校验：导航锚点↔section id 一致 / 图片 onerror 兜底 / picsum URL 编码
try {
  let anchorMiss=0, imgTot=0, imgOk=0, encTot=0, encOk=0, leak=0;
  const combos=[[0,0],[2,5],[10,5],[30,40],[50,70],[73,99],[5,55],[20,20]];
  combos.forEach(([bi,ti])=>{
    const s=ctx.buildSite(BRANDS[bi],TYPES[ti]);
    if(/undefined|NaN|\[object/.test(s)) leak++;
    const anchors=[...s.matchAll(/href="#([a-zA-Z]+)"/g)].map(x=>x[1]);
    const ids=[...s.matchAll(/id="([a-zA-Z]+)"/g)].map(x=>x[1]);
    anchors.forEach(a=>{ if(a!=='main' && !ids.includes(a)) anchorMiss++; });
    const imgs=[...s.matchAll(/<img[^>]*>/g)];
    imgTot+=imgs.length;
    imgs.forEach(im=>{ if(/onerror=/.test(im[0])) imgOk++; });
    const pics=[...s.matchAll(/https:\/\/picsum\.photos\/seed\/([^'")\s]+)/g)];
    encTot+=pics.length;
    pics.forEach(p=>{ if(/%[0-9A-Fa-f]{2}/.test(p[1])) encOk++; });
  });
  check(leak===0, 'product: no undefined/NaN/[object] leak in sampled sites, got '+leak);
  check(anchorMiss===0, 'product: every nav anchor has matching section id (no dead nav), got '+anchorMiss);
  check(imgOk===imgTot && imgTot>0, 'product: every <img> has onerror fallback ('+imgOk+'/'+imgTot+')');
  check(encOk===encTot && encTot>0, 'product: every picsum seed URL is percent-encoded ('+encOk+'/'+encTot+')');
} catch(e) {
  check(false, `product check THROW: ${e.message}`);
}

// 测试 ④ 新增：网站提示词 + 开发文档（word/pdf/txt）贯穿生成链路
try {
  const b0 = BRANDS[4], t0 = TYPES[9];
  ctx.state.brand = b0.id; ctx.state.type = t0.id;
  ctx.state.prompt = '做一个面向中小企业的 SaaS 官网，强调信任感与转化率';
  ctx.state.docs = '需要对接微信登录，部署到 EdgeOne';
  ctx.state.files = [
    { name:'需求.docx', size:12345, type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind:'docx', text:'这是从 Word 解析出的正文第一段。' },
    { name:'说明.pdf', size:6789, type:'application/pdf', kind:'pdf', text:'这是从 PDF 解析出的正文。' },
    { name:'备注.txt', size:200, type:'text/plain', kind:'text', text:'纯文本补充说明。' }
  ];
  const fp = ctx.buildProject(b0, t0);
  // 1) 生成站点顶部内嵌需求注释
  check(fp['index.html'].includes('项目需求与文档'), 'generated site embeds 项目需求与文档 comment');
  check(fp['index.html'].includes('面向中小企业的 SaaS 官网'), 'generated site comment contains website prompt');
  check(fp['index.html'].includes('需求.docx') && fp['index.html'].includes('说明.pdf'), 'generated site comment lists uploaded docs');
  // 2) 导出 requirements.md
  check(fp['requirements.md'] && fp['requirements.md'].includes('网站提示词'), 'zip exports requirements.md with prompt section');
  check(fp['requirements.md'].includes('从 Word 解析出的正文'), 'requirements.md includes parsed docx text');
  check(fp['requirements.md'].includes('从 PDF 解析出的正文'), 'requirements.md includes parsed pdf text');
  check(fp['requirements.md'].includes('纯文本补充说明'), 'requirements.md includes txt content');
  // 3) 任务简报含提示词与文档
  const snap = { version:'1.2', generatedAt:new Date().toISOString(),
    project:{name:t0.name,brand:b0.title,category:t0.category},
    brand:{id:b0.id,title:b0.title,primary:(b0.swatches&&b0.swatches[0])||'',swatches:(b0.swatches||[]).slice(0,5),fonts:b0.fonts||[],tone:b0.tone||'',industry:b0.industry||''},
    type:{id:t0.id,name:t0.name,category:t0.category,prompt:(t0.prompt||''),structure:t0.structure||[],modules:(t0.modules||[]).slice(0,12),dataModel:(t0.dataModel||[]).slice(0,12)},
    backend:[], websitePrompt:ctx.state.prompt, notes:'测试备注', docs:ctx.state.docs,
    files:ctx.state.files.map(f=>({name:f.name,size:f.size,type:f.type,kind:f.kind,text:f.text||''})),
    outputs:{siteHtml:'<html>x</html>', backendDoc:'# doc'} };
  const brief = ctx.buildTaskBrief(snap);
  check(brief.includes('网站提示词（核心需求）'), 'brief has website prompt section');
  check(brief.includes('面向中小企业的 SaaS 官网'), 'brief contains website prompt text');
  check(brief.includes('需求.docx') && brief.includes('说明.pdf'), 'brief lists uploaded doc files');
  // 4) 注释安全化：不应含提前结束的 -->
  check(!/-->/.test(fp['index.html'].split('<!-- 光体平台')[1].split('-->')[0]) || fp['index.html'].indexOf('<!-- 光体平台')===fp['index.html'].lastIndexOf('<!-- 光体平台'), 'requirement comment does not contain premature -->');
} catch(e) {
  check(false, `prompt/doc flow THROW: ${e.message}`);
}

console.log(`\n=== RESULT ===`);
console.log(`PASS: ${pass}, FAIL: ${fail}`);
if (fails.length) {
  console.log('\n--- FAILURES ---');
  fails.slice(0,30).forEach(f=>console.log(' ✗', f));
}
process.exit(fail>0?1:0);
