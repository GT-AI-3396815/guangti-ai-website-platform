// 演示 ③ 闭环：用平台真实数据集跑一次「设计→简报→项目记录落盘」
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = __dirname;

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/g);
let scriptBody = m[m.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');

function FakeEl(){return{_children:[],style:{},classList:{add(){},remove(){},contains(){return false;}},set innerHTML(v){this._html=v;},get innerHTML(){return this._html||'';},set textContent(v){this._text=v;},get textContent(){return this._text||'';},appendChild(c){this._children.push(c);},addEventListener(){},scrollIntoView(){},setAttribute(){},getAttribute(){return null;},querySelector(){return FakeEl();},querySelectorAll(){return [];},value:''};}
const elCache={};
const document={getElementById(id){return elCache[id]||(elCache[id]=FakeEl());},querySelector(){return FakeEl();},querySelectorAll(){return [];},createElement(){return FakeEl();},addEventListener(){},body:{appendChild(){},removeChild(){}}};
const store={_d:{},getItem(k){return this._d[k]||null;},setItem(k,v){this._d[k]=v;}};
const window={addEventListener(){}};
const ctx={document,window,requestAnimationFrame:(cb)=>cb(),alert:(m)=>console.log('ALERT:',m),localStorage:store,console,setTimeout:(fn)=>fn(),setInterval:()=>0,clearInterval:()=>{},Date,Math,JSON,encodeURIComponent,escape,BRANDS:null,TYPES:null,BACKEND:null};
vm.createContext(ctx);
scriptBody=scriptBody
  .replace(/const BRANDS = __BRANDS__;/,'BRANDS = '+JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'brands.json'),'utf8'))))
  .replace(/const TYPES = __TYPES__;/,'TYPES = '+JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'types.json'),'utf8'))))
  .replace(/const BACKEND = __BACKEND__;/,'BACKEND = '+JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'backend.json'),'utf8'))))
  .replace(/const BRANDS =/,'BRANDS =').replace(/const TYPES =/,'TYPES =').replace(/const BACKEND =/,'BACKEND =')
  .replace(/const state = \{[^}]*\}/,'state = { brand:null, type:null, notes:"", backend:[], docs:"" }');
vm.runInContext(scriptBody, ctx);

const brand = ctx.BRANDS.find(b=>/stripe/i.test(b.title)) || ctx.BRANDS[3];
const type = ctx.TYPES.find(t=>/企业官网/.test(t.name)) || ctx.TYPES[7];
const snapshot = {
  version:'1.1', generatedAt:new Date().toISOString(),
  project:{name:type.name, brand:brand.title, category:type.category},
  brand:{id:brand.id,title:brand.title,primary:(brand.swatches&&brand.swatches[0])||'',swatches:(brand.swatches||[]).slice(0,5),fonts:brand.fonts||[],tone:brand.tone||'',industry:brand.industry||''},
  type:{id:type.id,name:type.name,category:type.category,prompt:(type.prompt||''),structure:type.structure||[],modules:(type.modules||[]).slice(0,12),dataModel:(type.dataModel||[]).slice(0,12)},
  backend:[{id:'auth',name:'注册登录',apis:6,tables:3}],
  notes:'演示：企业官网，含注册登录模块。',
  docFile:null,
  outputs:{ siteHtml:'<!-- 生成网站 HTML 由平台 buildSite 产出 -->', backendDoc:'# 后端配置说明\n\n## 注册登录\n- POST /api/auth/register' }
};
const brief = ctx.buildTaskBrief(snapshot);
console.log('=== BRIEF (用户贴回 WorkBuddy 的内容预览) ===');
console.log(brief.slice(0,520)+'\n...[truncated]...');
console.log('\ncontains GUANGTI_SNAPSHOT:', brief.includes('<!-- GUANGTI_SNAPSHOT'));

// guangti-sync 技能同款落盘
const ws='C:/Users/AW/WorkBuddy/2026-07-30-21-07-56';
const projDir=path.join(ws,'guangti-projects');
fs.mkdirSync(projDir,{recursive:true});
const slug=`${brand.title}-${type.name}`.replace(/[^\w一-龥]+/g,'-').slice(0,40)+'-demo1';
const outPath=path.join(projDir,slug+'.json');
fs.writeFileSync(outPath,JSON.stringify(snapshot,null,2),'utf8');
console.log('\n=== 项目记录落盘 ===');
console.log('path:',outPath);
console.log('slug:',slug);
