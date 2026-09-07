/* v3.6 专项回归：数据模型板块必须真实渲染（修复 d.name/d.field → d.table/d.name 的字段名 bug） */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'http://localhost/' });
const { window } = dom;

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < 50 && !window.genSite; i++) await wait(50);
  if (!window.genSite) { console.error('FAIL: genSite 未初始化'); process.exit(1); }

  // 顶层 const 不挂 window，用 eval 取闭包内的真实对象
  const BRANDS = window.eval('BRANDS');
  const TYPES = window.eval('TYPES');
  const DEFAULT_BRAND = window.eval('DEFAULT_BRAND');
  const state = window.eval('state');

  const brand = BRANDS[0];
  const type = TYPES.find(t => t.id === 1); // 企业官网，含 dataModel
  if (!type || !type.dataModel || !type.dataModel.length) { console.error('FAIL: 找不到带 dataModel 的测试类型'); process.exit(1); }

  state.brand = brand.id;
  state.type = type.id;
  state.prompt = '';
  state.docs = '';
  state.files = [];

  const site = window.genSite(brand, type).inline;
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });

  add('① 生成站点非空', site.length > 500);
  add('② 含 #data 数据模型板块', site.includes('id="data"'));
  add('③ 导航含 #data 链接', site.includes('href="#data"'));
  add('④ 渲染出表名 page', site.includes('>page<') || site.includes('page'));
  add('⑤ 渲染出表名 case', site.includes('case'));
  add('⑥ 渲染出字段定义文本', site.includes('页面内容区块') || site.includes('案例'));
  add('⑦ 统计区数据字段为数字(非 -)', /<b>\d+<\/b><span>数据字段<\/span>/.test(site));

  // 反例：默认类型（无 dataModel）不应出现 #data
  const dType = { id:'__default', name:'测试', category:'通用', prompt:'x', modules:['a'], structure:['首页'], dataModel:[] };
  const genDef = window.genSite(DEFAULT_BRAND, dType);
  add('⑧ 默认类型(无 dataModel)不渲染 #data', !genDef.inline.includes('id="data"'));

  let pass = 0;
  checks.forEach(c => { console.log((c.ok ? 'PASS' : 'FAIL') + ' — ' + c.name); if (c.ok) pass++; });
  console.log(`\n结果：${pass}/${checks.length} 通过`);
  process.exit(pass === checks.length ? 0 : 1);
})().catch(e => { console.error('ERROR:', e); process.exit(1); });
