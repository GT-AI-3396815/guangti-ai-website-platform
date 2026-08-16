// v3.5 端到端：验证「可跳过前面步骤，仅凭需求与文档生成」
// 场景 A：不选品牌/类型，直接到第⑤步填需求 → 生成（应成功且套用默认设计语言）
// 场景 B：正常流程（选品牌+类型+需求）→ 生成（回归）
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('C:/Users/AW/.workbuddy/binaries/node/workspace/node_modules/jsdom');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail ? (e.detail.stack || e.detail) : e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(window) {
    window.HTMLElement.prototype.scrollIntoView = function(){};
    window.Element.prototype.scrollIntoView = function(){};
    window.alert = (m)=>errors.push('[alert shown] ' + m);
  }
});
const { window } = dom;
const doc = window.document;
window.addEventListener('error', e => errors.push('window.onerror: ' + (e.error ? e.error.stack : e.message)));

const wait = ms => new Promise(r => setTimeout(r, ms));
function siteHas(kw){ const sp = doc.getElementById('sitePreview'); return sp ? (sp.srcdoc||'').includes(kw) : false; }

function fillStep5(prompt, docs){
  const p = doc.getElementById('promptInput');
  const d = doc.getElementById('docsInput');
  if (p) p.value = prompt || '';
  if (d) d.value = docs || '';
}

function snap(){
  const sp = doc.getElementById('sitePreview');
  const op = doc.getElementById('outputs');
  const sj = doc.getElementById('snapJson');
  const gs = doc.getElementById('genStatus');
  let snapObj = null;
  try { snapObj = JSON.parse((sj && sj.textContent) || 'null'); } catch(e){}
  return {
    siteLen: sp ? (sp.srcdoc||'').length : -1,
    outputs: op ? op.style.display : '(none)',
    snapLen: sj ? (sj.textContent||'').length : -1,
    genStatusText: gs ? (gs.textContent||'').slice(0,80) : '(none)',
    usedDefaultBrand: snapObj ? (snapObj.brand && snapObj.brand.id === '__default') : false,
    usedDefaultType: snapObj ? (snapObj.type && snapObj.type.id === '__default') : false,
    promptInSite: sp ? (sp.srcdoc||'').includes('智能制造质检') : false,
  };
}

(async () => {
  await wait(700);
  console.log('fns:', typeof window.generate, typeof window.pickBrand, typeof window.useType, typeof window.wizGoto);

  // ---------- 场景 A：跳过前面所有步骤 ----------
  console.log('\n=== 场景 A：仅需求与文档（不选品牌/类型/后端）===');
  window.wizGoto(4); // 直接跳到第⑤步
  fillStep5('做一个面向工厂的智能制造质检 SaaS 官网，突出降本 30%、7 天上线，调性专业可信', '需要对接微信登录，数据库用 PostgreSQL');
  window.generate();
  await wait(4800);
  const A = snap();
  console.log('A:', JSON.stringify(A, null, 2));
  const aOk = A.siteLen > 500 && A.outputs === 'grid' && A.snapLen > 50 && A.usedDefaultBrand && A.usedDefaultType && siteHas('智能制造质检');
  console.log('>>> A (skip-all) WORKS:', aOk);

  // ---------- 场景 B：正常流程回归 ----------
  console.log('\n=== 场景 B：正常流程（品牌+类型+需求）===');
  const bcard = doc.querySelector('.bcard');
  const titem = doc.querySelector('.titem');
  let bid=null, tid=null;
  if (bcard) { const m=(bcard.getAttribute('onclick')||'').match(/pickBrand\('([^']+)'\)/); bid=m&&m[1]; }
  if (titem) { tid=titem.getAttribute('data-id'); }
  console.log('brand id:', bid, '| type id:', tid);
  window.pickBrand(bid);
  window.useType(Number(tid) || tid);
  window.wizGoto(4);
  fillStep5('面向中小制造企业的 B2B 官网，主推智能质检 SaaS，首页要有客户案例与咨询入口', '');
  window.generate();
  await wait(4800);
  const B = snap();
  console.log('B:', JSON.stringify(B, null, 2));
  const bOk = B.siteLen > 500 && B.outputs === 'grid' && B.snapLen > 50 && (B.usedDefaultBrand === false) && siteHas('B2B 官网');
  console.log('>>> B (normal) WORKS:', bOk);

  console.log('\n=== ERRORS (' + errors.length + ') ===');
  errors.slice(0,40).forEach(e => console.log(' ✗', e));

  const ok = aOk && bOk && errors.length === 0;
  console.log('\n>>> TOTAL:', ok ? 'PASS' : 'FAIL');
  process.exit(ok ? 0 : 2);
})().catch(e => { console.log('HARNESS THROW:', e.stack||e.message); console.log('errors:', errors); process.exit(3); });
