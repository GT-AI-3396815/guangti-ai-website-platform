// 真实 DOM 复测：勾选后端模块 + 上传文档 + 填提示词 + 生成
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
    window.alert = (m)=>errors.push('[alert] ' + m);
  }
});
const { window } = dom;
const doc = window.document;
window.addEventListener('error', e => errors.push('window.onerror: ' + (e.error ? e.error.stack : e.message)));

setTimeout(() => {
  try {
    const bcard = doc.querySelector('.bcard');
    const titem = doc.querySelector('.titem');
    const bid = (bcard.getAttribute('onclick')||'').match(/pickBrand\('([^']+)'\)/)[1];
    const tid = titem.getAttribute('data-id');
    window.pickBrand(bid);
    window.useType(Number(tid) || tid);

    // 勾选一个后端模块
    const bmod = doc.querySelector('.bmod');
    let modId = null;
    if (bmod) { const m=(bmod.getAttribute('onclick')||'').match(/toggleMod\('([^']+)'\)/); modId=m&&m[1]; }
    console.log('backend module id:', modId);
    if (modId) window.toggleMod(modId);
    const backendDetailLen = (doc.getElementById('backendDetail').textContent||'').length;
    console.log('backendDetail rendered len:', backendDetailLen);

    // 跳到第⑤步，填提示词，上传文档
    window.wizGoto(4);
    const promptInput = doc.getElementById('promptInput');
    const docsInput = doc.getElementById('docsInput');
    promptInput.value = '做一个面向中小企业的 SaaS 官网，强调信任感与转化率';
    docsInput.value = '需要对接微信登录，部署到 EdgeOne';

    // 上传一个真实文本文档（jsdom File + readDoc）
    const f = new window.File(['这是从上传文档解析出的正文：客户要求首页突出案例与咨询入口。'], '需求.txt', {type:'text/plain'});
    window.readDoc({ target: { files: [f] } });

    setTimeout(() => {
      console.log('docReadout:', doc.getElementById('docReadout').textContent);
      // 生成
      window.generate();
      setTimeout(() => {
        const sp = doc.getElementById('sitePreview');
        const op = doc.getElementById('outputs');
        const sj = doc.getElementById('snapJson');
        const srcdoc = sp ? sp.srcdoc : '';
        const out = {
          outputs_display: op ? op.style.display : '(none)',
          site_len: srcdoc.length,
          prompt_in_site: srcdoc.includes('面向中小企业的 SaaS 官网'),
          docs_in_site: srcdoc.includes('对接微信登录'),
          uploaded_doc_in_site: srcdoc.includes('从上传文档解析出的正文'),
          backend_in_doc: (doc.getElementById('backendDoc').textContent||'').includes('接口清单'),
          snap_len: sj ? (sj.textContent||'').length : 0,
          backend_in_snap: (sj.textContent||'').includes('"auth"'),
        };
        console.log('\n=== RESULTS ===');
        console.log(JSON.stringify(out, null, 2));
        console.log('\n=== ERRORS ('+errors.length+') ===');
        errors.slice(0,40).forEach(e=>console.log(' ✗', e));
        const ok = out.outputs_display==='grid' && out.site_len>500 && out.prompt_in_site && out.docs_in_site && out.uploaded_doc_in_site && out.backend_in_doc && out.backend_in_snap && out.snap_len>50 && errors.length===0;
        console.log('\n>>> FULL FLOW WORKS:', ok);
        process.exit(ok?0:2);
      }, 4600);
    }, 400);
  } catch (e) {
    console.log('HARNESS THROW:', e.stack || e.message);
    console.log('errors:', errors);
    process.exit(3);
  }
}, 700);
