/* v3.7 专项回归：平台产品页补齐 + 生成站点去占位化 + 热门组合 + 快速微调 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
const { window } = dom;
const { document } = window;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < 50 && !window.genSite; i++) await wait(50);
  if (!window.genSite) { console.error('FAIL: genSite 未初始化'); process.exit(1); }

  const BRANDS = window.eval('BRANDS');
  const TYPES = window.eval('TYPES');
  const DEFAULT_BRAND = window.eval('DEFAULT_BRAND');
  const state = window.eval('state');

  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });

  /* ── 一、平台自身产品页（P0） ── */
  for (const id of ['guide', 'samples', 'pricing', 'faq', 'about']) {
    add(`P0 平台板块 #${id} 存在`, !!document.getElementById(id));
  }
  add('P0 导航含新板块链接', ['guide', 'samples', 'pricing', 'faq', 'about'].every(id => [...document.querySelectorAll('#nav a')].some(a => a.getAttribute('href') === '#' + id)));
  add('P0 教程含三步卡片', document.querySelectorAll('#guide .s3card').length === 3);
  add('P0 价格区含免费公测说明', (document.querySelector('#pricing').textContent || '').includes('免费公测'));
  add('P0 FAQ 至少 8 条', document.querySelectorAll('#faq details').length >= 8);
  add('P0 关于页含更新日志', (document.querySelector('#about') || {}).innerHTML?.includes('更新日志'));
  add('P0 页脚反馈渠道(GitHub Issues)', (document.querySelector('footer') || {}).innerHTML?.includes('github.com/GT-AI-3396815'));
  add('P0 案例画廊已渲染 ≥6 卡片', document.querySelectorAll('#samGrid .sam-card').length >= 6);
  add('P0 组合条已渲染', document.querySelectorAll('#comboStrip .combo').length >= 6);
  add('P0 案例预览为品牌 SVG(无外链)', [...document.querySelectorAll('#samGrid img')].length >= 6 && [...document.querySelectorAll('#samGrid img')].every(i => i.getAttribute('src').startsWith('data:image/svg+xml')));

  /* ── 二、热门组合交互（P2） ── */
  window.applyCombo(1); // SaaS × Stripe
  const comboBrand = BRANDS.find(b => b.id === state.brand);
  const comboType = TYPES.find(t => t.id === state.type);
  add('P2 applyCombo 设置了品牌(Stripe)', comboBrand && comboBrand.id === 'stripe');
  add('P2 applyCombo 设置了类型(电商/SaaS 类)', comboType && comboType.category === 'SaaS');

  /* ── 三、生成站点去占位化（P1） ── */
  state.brand = comboBrand.id;
  state.type = comboType.id;
  state.prompt = '做一个面向跨境卖家的 SaaS 订单管理工具官网，突出「对账快 3 倍」';
  state.docs = ''; state.files = []; state.tuneH1 = ''; state.tuneSub = ''; state.tuneCta = '';
  const gen = window.genSite(comboBrand, comboType);
  const site = gen.inline;
  const files = gen.files;

  add('P1 生成站点含 #contact 表单板块', site.includes('id="contact"') && site.includes('<form class="g-cform"'));
  add('P1 CTA 死链已修复(不再 preventDefault)', !site.includes('event.preventDefault()') && site.includes('href="#contact" class="g-cta"'));
  add('P1 favicon 存在', site.includes('rel="icon"') && site.includes('data:image/svg+xml'));
  add('P1 OG 标签存在', site.includes('og:title') && site.includes('og:site_name') && site.includes('og:locale'));
  add('P1 JSON-LD 结构化数据存在', site.includes('application/ld+json') && site.includes('schema.org'));
  add('P1 无 picsum 随机图', !site.includes('picsum.photos'));
  add('P1 作品展示用品牌 SVG', site.includes('板块视觉示意') && (site.match(/data:image\/svg\+xml/g) || []).length >= 3);
  add('P1 模块卡片带描述(无空卡片)', !site.includes('<b>询盘</b></div>') && /g-feat[^]*?<span>[^<]{10,}<\/span>/.test(site));
  add('P1 数据模型字段级类型建议', /<li><b>[^<]+<\/b><span>(VARCHAR|TEXT|DATETIME|INT|TINYINT|DECIMAL|PK|FK)[^<]*<\/span><\/li>/.test(site));
  add('P1 统计区数据表为数字', /<b>\d+<\/b><span>数据表<\/span>/.test(site));
  add('P1 页脚上线提示', site.includes('g-foot-sub') && site.includes('上线前清单'));
  add('P1 导航含联系我们', site.includes('href="#contact">联系我们</a>'));
  add('P1 site.js 含 CONTACT_EMAIL 配置与表单处理', files['assets/js/site.js'].includes('CONTACT_EMAIL') && files['assets/js/site.js'].includes('gtContact'));
  add('P1 requirements.md 含上线前清单', files['requirements.md'].includes('上线前清单') && files['requirements.md'].includes('ICP 备案'));
  add('P1 README 说明无外部依赖', files['README.md'].includes('无外部依赖'));
  add('P1 JSON-LD 无 </script> 破图风险', !/<\/script>['"]?\s*influence/.test(site) && (site.split('application/ld+json')[1] || '').indexOf('<\/script>') > -1);

  /* ── 四、快速微调（P2） ── */
  state.tuneH1 = '跨境卖家的对账神器';
  state.tuneSub = '订单自动聚合，对账快 3 倍';
  state.tuneCta = '预约演示';
  const gen2 = window.genSite(comboBrand, comboType);
  add('P2 微调 Hero 主标题生效', gen2.inline.includes('跨境卖家的对账神器'));
  add('P2 微调 Hero 副标题生效', gen2.inline.includes('订单自动聚合，对账快 3 倍'));
  add('P2 微调按钮文案生效', gen2.inline.includes('预约演示'));
  state.tuneH1 = ''; state.tuneSub = ''; state.tuneCta = '';

  /* ── 五、默认类型兜底质量 ── */
  state.brand = null; state.type = null; state.prompt = '做一个烘焙工作室的展示官网';
  const dt = window.eval('buildDefaultType')();
  const gd = window.genSite(DEFAULT_BRAND, dt);
  add('P1 默认类型模块含描述', gd.inline.includes('突出差异化价值'));
  add('P1 默认类型无 [object Object] 泄漏', !gd.inline.includes('[object') && !JSON.stringify(gd.files).includes('[object'));

  /* ── 六、任务简报对对象型模块安全 ── */
  const brief = window.eval('buildTaskBrief')({
    project: { name: dt.name, brand: DEFAULT_BRAND.title, category: dt.category },
    brand: { id: DEFAULT_BRAND.id, title: DEFAULT_BRAND.title, primary: '#5b6cff', swatches: ['#5b6cff'], fonts: ['Inter'], tone: '现代简约', industry: '通用' },
    type: { id: '__default', name: dt.name, category: '通用', prompt: 'x', structure: dt.structure, modules: dt.modules, dataModel: dt.dataModel },
    backend: [], notes: '', websitePrompt: '', docs: '', files: [],
    outputs: { siteHtml: '', backendDoc: '' }
  });
  add('P1 简报无 [object Object] 泄漏', !brief.includes('[object') && brief.includes('产品与服务'));

  let pass = 0;
  checks.forEach(c => { console.log((c.ok ? 'PASS' : 'FAIL') + ' — ' + c.name); if (c.ok) pass++; });
  console.log(`\n结果：${pass}/${checks.length} 通过`);
  process.exit(pass === checks.length ? 0 : 1);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
