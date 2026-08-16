// 文档驱动设计回归：上传文档/提示词的要点必须真实进入生成网站的可见板块（而非仅存于注释）
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
    window.wizGoto(4);
    const promptInput = doc.getElementById('promptInput');
    const docsInput = doc.getElementById('docsInput');
    promptInput.value = '做一个面向烘焙爱好者的在线课程平台，主推零基础学烘焙系列课，访客是想学做蛋糕的宝妈，调性温暖治愈。';
    docsInput.value = '- 首页突出 30 天学会打卡\n- 顶部导航放社群入口\n- 课程详情页要有试看视频\n- 关于我们讲创始人故事';

    window.generate();
    setTimeout(() => {
      const sp = doc.getElementById('sitePreview');
      const srcdoc = sp ? sp.srcdoc : '';
      // 去掉顶部注释，确保下面检查的是“可见内容”而非注释
      const visible = srcdoc.replace(/<!--[\s\S]*?-->/g, '');
      const bullet = '首页突出 30 天学会打卡';
      const bullet2 = '课程详情页要有试看视频';
      const out = {
        site_len: srcdoc.length,
        has_brief_section: visible.includes('项目需求与设计依据'),
        bullet_in_visible: visible.includes(bullet),
        bullet2_in_visible: visible.includes(bullet2),
        hero_has_prompt_summary: visible.includes('烘焙爱好者'),
        doc_text_visible: visible.includes('顶部导航放社群入口'),
      };
      console.log('\n=== DOC-DRIVEN RESULTS ===');
      console.log(JSON.stringify(out, null, 2));
      console.log('\n=== ERRORS ('+errors.length+') ===');
      errors.slice(0,20).forEach(e=>console.log(' ✗', e));
      const ok = out.site_len>500 && out.has_brief_section && out.bullet_in_visible && out.bullet2_in_visible && out.hero_has_prompt_summary && out.doc_text_visible && errors.length===0;
      console.log('\n>>> DOC-DRIVEN WORKS:', ok);
      process.exit(ok?0:2);
    }, 4600);
  } catch (e) {
    console.log('HARNESS THROW:', e.stack || e.message);
    process.exit(3);
  }
}, 700);
