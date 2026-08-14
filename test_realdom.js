// 用真实 DOM (jsdom) 端到端驱动：选品牌→选类型→填提示词→生成，验证输出真的渲染
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

setTimeout(() => {
  try {
    console.log('=== INIT ===');
    console.log('generate fn:', typeof window.generate, '| pickBrand:', typeof window.pickBrand, '| useType:', typeof window.useType);

    // 从渲染的 DOM 抽取真实 id
    const bcard = doc.querySelector('.bcard');
    const titem = doc.querySelector('.titem');
    let bid=null, tid=null;
    if (bcard) { const m = (bcard.getAttribute('onclick')||'').match(/pickBrand\('([^']+)'\)/); bid = m && m[1]; }
    if (titem) { tid = titem.getAttribute('data-id'); }
    console.log('picked brand id:', bid, '| type id:', tid);

    if (!bid || !tid) { throw new Error('无法从 DOM 抽取品牌/类型 id，渲染可能失败'); }

    window.pickBrand(bid);
    window.useType(Number(tid) || tid);

    // 模拟在第⑤步填提示词（直接写 state 不可达，改为写 DOM 后走 wizNext 持久化）
    // 先跳到第⑤步
    window.wizGoto(4);
    const promptInput = doc.getElementById('promptInput');
    console.log('promptInput present at step5:', !!promptInput);
    if (promptInput) { promptInput.value = '做一个面向中小企业的 SaaS 官网，强调信任感与转化率'; }
    const docsInput = doc.getElementById('docsInput');
    if (docsInput) { docsInput.value = '需要对接微信登录，部署到 EdgeOne'; }
    window.wizNext(); // 持久化 prompt/docs

    console.log('state.brand after pick:', window.pickBrand ? '(lexical, n/a)' : '');

    // 真正生成
    console.log('\n=== generate() ===');
    window.generate();

    setTimeout(() => {
      const sp = doc.getElementById('sitePreview');
      const op = doc.getElementById('outputs');
      const sj = doc.getElementById('snapJson');
      const dl = doc.getElementById('dlSite');
      const out = {
        sitePreview_srcdoc_len: sp ? (sp.srcdoc||'').length : -1,
        outputs_display: op ? op.style.display : '(none-el)',
        snapJson_len: sj ? (sj.textContent||'').length : -1,
        dlSite_is_data: dl ? String(dl.href).startsWith('data:') : false,
        prompt_in_site: sp ? (sp.srcdoc||'').includes('面向中小企业的 SaaS 官网') : false,
      };
      console.log('\n=== RESULTS ===');
      console.log(JSON.stringify(out, null, 2));
      console.log('\n=== ERRORS (' + errors.length + ') ===');
      errors.slice(0,40).forEach(e => console.log(' ✗', e));

      // 判断成功条件
      const ok = out.sitePreview_srcdoc_len > 500 && out.outputs_display === 'grid' && out.snapJson_len > 50 && out.dlSite_is_data && out.prompt_in_site;
      console.log('\n>>> GENERATE WORKS:', ok);
      process.exit(ok && errors.length===0 ? 0 : 2);
    }, 4500);
  } catch (e) {
    console.log('HARNESS THROW:', e.stack || e.message);
    console.log('errors so far:', errors);
    process.exit(3);
  }
}, 700);
