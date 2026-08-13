/* =====================================================================
   设计技能接入层（ui-design / frontend-design / figma-to-html）
   本块替换原 buildSite，提供：
   - genSite(brand,type) -> { inline, files }  多文件组件化输出
   - buildSite(...) = genSite(...).inline        兼容测试/预览
   - buildProject(...) = genSite(...).files      多文件映射
   - downloadProject(name, files)                前端 zip 导出
   ===================================================================== */

/* ---------- 工具：文件 slug ---------- */
function slugName(s){return String(s).toLowerCase().replace(/[^a-z0-9一-龥]+/g,'-').replace(/(^-|-$)/g,'');}

/* ---------- 真实图片：分类 -> Picsum 稳定种子 ---------- */
const IMG_MAP={'电商':'store','SaaS':'saas','企业官网':'office','社区论坛':'community','教育在线':'education','博客资讯':'blog','作品集':'portfolio','问答社区':'qanda','着陆页':'landing','门户':'portal','新闻':'news','医疗':'health','金融':'finance','旅行':'travel','美食':'food','房产':'estate','招聘':'jobs','工具':'tool','游戏':'game','论坛':'forum','商城':'shop','支付':'pay','媒体':'media'};
function imgUrl(seed,w,h){return 'https://picsum.photos/seed/'+encodeURIComponent(seed)+'/'+w+'/'+h;}

/* ---------- 品牌 SVG 艺术图（兜底，永不破图） ---------- */
function brandArt(brand){
  var sw=(brand.swatches&&brand.swatches.length)?brand.swatches:[(brand.primary||'#667eea'),'#1b1d29','#ffffff','#f6f7f9'];
  var P=sw[0]||'#667eea',S=sw[1]||P,A=sw[2]||'#ffffff',B=sw[3]||'#f6f7f9';
  var tone=(brand.tone||'').toLowerCase();
  var ang=135; if(/科技|未来/.test(tone))ang=115; else if(/自然|有机/.test(tone))ang=160; else if(/高端|奢侈/.test(tone))ang=120;
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">'
    +'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate('+ang+' .5 .5)">'
    +'<stop offset="0" stop-color="'+P+'"/><stop offset="1" stop-color="'+S+'"/></linearGradient>'
    +'<radialGradient id="r" cx=".82" cy=".18" r=".75"><stop offset="0" stop-color="'+A+'" stop-opacity=".38"/><stop offset="1" stop-color="'+A+'" stop-opacity="0"/></radialGradient></defs>'
    +'<rect width="1200" height="900" fill="url(#g)"/>'
    +'<rect width="1200" height="900" fill="url(#r)"/>';
  var shapes='';
  if(/科技|未来|工业/.test(tone)){
    shapes+='<circle cx="980" cy="220" r="160" fill="'+A+'" fill-opacity=".12"/><rect x="120" y="640" width="240" height="240" rx="24" fill="'+A+'" fill-opacity=".1" transform="rotate(12 240 760)"/>';
  } else if(/自然|有机/.test(tone)){
    shapes+='<circle cx="960" cy="240" r="180" fill="'+A+'" fill-opacity=".14"/><circle cx="1080" cy="430" r="90" fill="'+A+'" fill-opacity=".1"/>';
  } else if(/高端|奢侈|精致/.test(tone)){
    shapes+='<rect x="820" y="120" width="300" height="300" rx="150" fill="none" stroke="'+A+'" stroke-opacity=".25" stroke-width="2"/>';
  } else {
    shapes+='<circle cx="1000" cy="260" r="150" fill="'+A+'" fill-opacity=".12"/><rect x="140" y="660" width="200" height="200" rx="20" fill="'+A+'" fill-opacity=".1" transform="rotate(15 240 760)"/>';
  }
  svg+=shapes+'</svg>';
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}

/* ---------- 专业图标库（内联 SVG，禁用 emoji 图标） ---------- */
const ICONS={
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  wallet:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12h.01"/><path d="M3 9h14a2 2 0 0 1 2 2v0"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 3h2l2.2 12.2a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L21 7H6"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.5 5.5L20 9.3l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.8z"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 5-6"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/></svg>',
  cog:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>'
};
function iconFor(label){
  var k=String(label||'');
  if(/登录|注册|账户|用户|会员|资料/i.test(k))return ICONS.user;
  if(/支付|付款|钱包|微信|支付宝|coin|积分/i.test(k))return ICONS.wallet;
  if(/订单|交易|购物|商城|cart/i.test(k))return ICONS.cart;
  if(/会员|订阅|vip/i.test(k))return ICONS.star;
  if(/消息|通知|推送|bell/i.test(k))return ICONS.bell;
  if(/内容|文章|文档|cms|博客|blog/i.test(k))return ICONS.doc;
  if(/统计|数据|分析|chart/i.test(k))return ICONS.chart;
  if(/权限|安全|认证|shield|锁|lock/i.test(k))return ICONS.shield;
  if(/设置|配置|config|gear/i.test(k))return ICONS.cog;
  if(/搜索|search/i.test(k))return ICONS.search;
  return ICONS.spark;
}

/* ---------- 设计规范前置（ui-design：先出规范再写码） ---------- */
function designSpec(brand,type){
  var tone=(brand.tone||'').toLowerCase();
  var a='Editorial / 精致克制';
  if(/活泼|鲜艳|活力|playful/i.test(tone))a='Playful / 活力鲜明';
  else if(/高端|奢侈|奢华|luxury|精致/i.test(tone))a='Luxury / 克制高级';
  else if(/极简|简约|minimal/i.test(tone))a='Minimal / 极简利落';
  else if(/科技|未来|复古未来|tech/i.test(tone))a='Retro-futuristic / 科技质感';
  else if(/自然|有机|organic/i.test(tone))a='Organic / 自然有机';
  else if(/工业|硬核|utilitarian/i.test(tone))a='Industrial / 工业实用';
  return {aesthetic:a, palette:[(brand.swatches&&brand.swatches[0])||brand.primary||'#667eea',(brand.swatches&&brand.swatches[1])||'#1b1d29',(brand.swatches&&brand.swatches[2])||'#fff'], type:(brand.fonts&&brand.fonts[0])||'系统默认', layout:'split-asymmetric', category:type.category||''};
}

/* ---------- 核心：生成多文件站点 ---------- */
function genSite(brand,type){
  var sw=(brand.swatches&&brand.swatches.length>=4)?brand.swatches.slice(0,5):
    (brand.swatches&&brand.swatches.length)?[brand.swatches[0],brand.swatches[0]||'#1b1d29','#ffffff','#f6f7f9']:
    [(brand.primary||'#667eea'),'#1b1d29','#ffffff','#f6f7f9'];
  var P=sw[0],INK=sw[1]||'#1b1d29',CAN=sw[2]||'#ffffff',SFT=sw[3]||'#f6f7f9',A2=sw[4]||P;
  var fontStack=(brand.fonts&&brand.fonts[0])||'-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
  var mono='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  var isLight=onLight(P);
  var tone=(brand.tone||'').toLowerCase();
  var cat=type.category||'';
  var catSeed=slugName(cat)||'website';
  var uploaded=(typeof state!=='undefined'&&state.heroImage)?state.heroImage:null;
  var heroSrc=uploaded||imgUrl(catSeed+'-hero',1200,900);
  var heroFallback=brandArt(brand);
  var spec=designSpec(brand,type);

  /* 内容 */
  var mods=(type.modules&&type.modules.length)?type.modules:[];
  var modItems=mods.slice(0,6).map(function(m){
    var label=typeof m==='string'?m:((m&&(m.name||m.title))||'');
    var desc=(typeof m==='object'&&m)?((m.desc||m.description)||''):'';
    return {label:String(label),desc:String(desc)};
  });
  var structs=(type.structure&&type.structure.length)?type.structure:['首页','关于我们','服务展示','联系我们'];
  var dmFields=(type.dataModel&&type.dataModel.length)?type.dataModel.map(function(d){return typeof d==='string'?d:((d&&(d.name||d.field))||'');}).filter(Boolean):[];
  var promptHead=(type.prompt||'').split('\n')[0]||type.name;
  var heroH1=type.name;
  var heroSub=promptHead.length>200?promptHead.slice(0,200)+'…':promptHead;
  var ctaMap={'电商':'立即选购','SaaS':'免费试用','企业官网':'了解更多','社区论坛':'加入讨论','教育在线':'开始学习','博客资讯':'订阅更新','作品集':'查看作品','问答社区':'提问交流','着陆页':'立即行动','门户':'进入平台'};
  var ctaText=ctaMap[cat]||'立即开始';

  /* 板块 HTML */
  var featCards=modItems.map(function(m,i){
    return '<div class="g-feat" style="--d:'+(i*70)+'ms"><div class="g-fic">'+iconFor(m.label)+'</div><div><b>'+esc(m.label)+'</b>'+(m.desc?'<span>'+esc(m.desc)+'</span>':'')+'</div></div>';
  }).join('');
  var stats=[{n:mods.length,l:'核心模块'},{n:structs.length,l:'页面结构'},{n:dmFields.length||'-',l:'数据字段'},{n:cat||'-',l:'所属分类'}];
  var statsHtml=stats.map(function(s){return '<div class="g-stat"><b>'+s.n+'</b><span>'+esc(s.l)+'</span></div>';}).join('');
  var stepsHtml=structs.slice(0,5).map(function(s,i){
    return '<div class="g-step"><div class="g-snum">'+(i+1)+'</div><div><b>'+esc(s)+'</b><p>按 '+esc(brand.title)+' 设计规范构建此板块的布局、交互与视觉细节。</p></div></div>';
  }).join('');
  var dmHtml=dmFields.length?'<section class="g-sec g-alt" id="data"><div class="g-wrap"><h2 class="g-h2">数据模型</h2><p class="g-lead">基于业务需求定义的数据结构，支撑 '+esc(type.name)+' 的完整信息流转。</p><div class="g-dm">'+dmFields.map(function(f){return '<div class="g-dm-row"><code>'+esc(f)+'</code><span>字段</span></div>';}).join('')+'</div></div></section>':'';
  var showSeeds=['a','b','c'];
  var showHtml='<section class="g-sec" id="showcase"><div class="g-wrap"><h2 class="g-h2">作品展示</h2><p class="g-lead">基于 '+esc(brand.title)+' 视觉语言呈现的真实场景示例。</p><div class="g-show">'+showSeeds.map(function(s,i){
    var m=modItems[i]||{label:''};
    var u=imgUrl(catSeed+'-'+s,800,600);
    return '<figure class="g-show-item"><img class="g-show-img" src="'+u+'" alt="'+esc(m.label||type.name)+' 场景示例" loading="lazy" onerror="this.onerror=null;this.src=\''+heroFallback+'\'"><figcaption>'+esc(m.label||('场景 '+(i+1)))+'</figcaption></figure>';
  }).join('')+'</div></div></section>';
  var year=new Date().getFullYear();

  /* 导航（非对称 + 主题切换 + 移动菜单） */
  var nav='<header class="g-nav"><div class="g-nav-in"><a class="g-logo" href="#main">'+esc(brand.title)+'</a>'
    +'<nav class="g-nav-links"><a href="#features">核心能力</a><a href="#process">构建流程</a>'
    +(dmFields.length?'<a href="#data">数据模型</a>':'')+'<a href="#showcase">作品展示</a><a href="#cta">'+esc(ctaText)+'</a></nav>'
    +'<button class="g-theme" onclick="toggleTheme()" aria-label="切换主题">◐</button>'
    +'<button class="g-burger" onclick="toggleMenu()" aria-label="菜单">☰</button></div>'
    +'<div class="g-mobile" id="gMobile"><a href="#features">核心能力</a><a href="#process">构建流程</a>'
    +(dmFields.length?'<a href="#data">数据模型</a>':'')+'<a href="#showcase">作品展示</a><a href="#cta">'+esc(ctaText)+'</a></div></header>';

  /* Hero（左文 + 右视觉，非对称） */
  var hero='<header class="g-hero"><div class="g-hero-grid"><div class="g-hero-copy">'
    +'<span class="g-eyebrow" style="background:'+P+'1a;color:'+P+'">'+esc(spec.aesthetic)+'</span>'
    +'<h1 class="g-h1">'+esc(heroH1)+'</h1>'
    +'<p class="g-hero-sub">'+esc(heroSub)+'</p>'
    +'<a href="#cta" class="g-cta">'+esc(ctaText)+' →</a>'
    +'<div class="g-trust">由 '+esc(brand.title)+' 设计语言驱动 · '+mods.length+' 个核心模块 · '+structs.length+' 个页面板块</div>'
    +'</div><div class="g-hero-visual"><img class="g-hero-img" src="'+heroSrc+'" alt="'+esc(type.name)+' 主视觉" loading="eager" onerror="this.onerror=null;this.src=\''+heroFallback+'\'"/>'
    +'<div class="g-float" style="border-color:'+P+'33"><b style="color:'+P+'">'+mods.length+'</b><span>核心模块已就绪</span></div></div></div></header>';

  /* 外链版 HTML（多文件） */
  var htmlExternal='<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width,initial-scale=1.0"/>\n<title>'+esc(type.name)+' · '+esc(brand.title)+'</title>\n<meta name="description" content="'+esc(heroSub)+'"/>\n<link rel="preconnect" href="https://picsum.photos">\n<link rel="stylesheet" href="assets/css/style.css"/>\n</head>\n<body>\n<a class="g-skip" href="#main">跳到主内容</a>\n'
    +nav+'\n<main id="main">\n'+hero+'\n'
    +'<section class="g-sec" id="features"><div class="g-wrap"><h2 class="g-h2">核心能力</h2><p class="g-lead">基于 '+esc(brand.title)+' 设计语言构建，每个模块都经过视觉一致性与交互体验的双重打磨。</p><div class="g-feats">'+featCards+'</div></div></section>\n'
    +'<section class="g-sec g-alt" id="stats"><div class="g-wrap"><div class="g-stats">'+statsHtml+'</div></div></section>\n'
    +'<section class="g-sec" id="process"><div class="g-wrap"><h2 class="g-h2">构建流程</h2><p class="g-lead">从品牌规范到页面落地，每一步都有据可依。</p><div class="g-steps">'+stepsHtml+'</div></div></section>\n'
    +dmHtml+'\n'+showHtml+'\n'
    +'<section class="g-cta-banner" id="cta"><div class="g-wrap"><h2 class="g-h2">准备好开始了吗？</h2><p class="g-lead">使用光体平台，基于 '+esc(brand.title)+' 的设计规范，快速生成高品质网站。</p><a href="#" class="g-cta" onclick="event.preventDefault();">'+esc(ctaText)+' →</a></div></section>\n'
    +'</main>\n<footer class="g-footer"><div class="g-wrap">© '+year+' '+esc(type.name)+' · 设计语言源自 '+esc(brand.title)+' · 由 <strong>光体平台</strong> 生成</div></footer>\n'
    +'<script src="assets/js/site.js"><\/script>\n</body>\n</html>';

  /* 设计系统 CSS（注入品牌 token） */
  var CSS=':root{'
    +'--p:'+P+';--ink:'+INK+';--can:'+CAN+';--sft:'+SFT+';--a2:'+A2+';'
    +'--muted:#6b7080;--line:rgba(0,0,0,.08);--radius:14px;'
    +'--font:'+fontStack+';--mono:'+mono+';'
    +'--on-p:'+(isLight?'#111':'#fff')+';--sub-p:'+(isLight?'rgba(17,17,17,.72)':'rgba(255,255,255,.82)')+';'
    +'--rw:1140px;--ease:cubic-bezier(.25,1,.5,1);--dur:300ms;'
    +'--t-h1:clamp(34px,5vw,56px);--t-h2:clamp(26px,3.5vw,38px);}\n'
    +'*{box-sizing:border-box}html{scroll-behavior:smooth}'
    +'body{margin:0;font-family:var(--font);color:var(--ink);background:var(--can);line-height:1.65;-webkit-font-smoothing:antialiased}\n'
    +'.g-wrap{max-width:var(--rw);margin:0 auto;padding:0 24px}\n'
    +'.g-skip{position:absolute;left:-999px;top:0;background:var(--p);color:var(--on-p);padding:10px 16px;border-radius:0 0 8px 0;z-index:200}.g-skip:focus{left:0}\n'
    +':focus-visible{outline:3px solid var(--p);outline-offset:2px}\n'
    +'.g-nav{position:sticky;top:0;z-index:100;background:color-mix(in srgb,var(--can) 82%,transparent);backdrop-filter:saturate(170%) blur(14px);border-bottom:1px solid var(--line)}\n'
    +'.g-nav-in{max-width:var(--rw);margin:0 auto;padding:12px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px}\n'
    +'.g-logo{font-weight:800;font-size:19px;color:var(--p);letter-spacing:.3px;text-decoration:none}\n'
    +'.g-nav-links{display:flex;gap:26px;font-size:14px;font-weight:600}\n'
    +'.g-nav-links a{color:var(--ink);text-decoration:none;opacity:.72;transition:opacity .2s}.g-nav-links a:hover{opacity:1}\n'
    +'.g-theme,.g-burger{background:none;border:1px solid var(--line);border-radius:10px;width:40px;height:40px;font-size:18px;cursor:pointer;color:var(--ink)}\n'
    +'.g-burger{display:none}.g-mobile{display:none;flex-direction:column;gap:4px;padding:8px 24px 14px;border-bottom:1px solid var(--line)}\n'
    +'.g-mobile a{color:var(--ink);text-decoration:none;padding:10px 0;font-weight:600;border-bottom:1px solid var(--line)}\n'
    +'.g-mobile.open{display:flex}\n'
    +'.g-hero{padding:84px 24px 64px;background:radial-gradient(120% 120% at 80% 0%, color-mix(in srgb,var(--p) 14%,transparent), transparent 60%), var(--can)}\n'
    +'.g-hero-grid{max-width:var(--rw);margin:0 auto;display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center}\n'
    +'.g-eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;padding:6px 12px;border-radius:999px;margin-bottom:18px}\n'
    +'.g-h1{font-size:var(--t-h1);line-height:1.1;margin:0 0 18px;font-weight:900;letter-spacing:-.02em}\n'
    +'.g-hero-sub{font-size:clamp(15px,2vw,19px);max-width:560px;color:var(--muted);margin:0 0 28px}\n'
    +'.g-cta{display:inline-flex;align-items:center;gap:8px;background:var(--p);color:var(--on-p);padding:14px 30px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;transition:transform var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}\n'
    +'.g-cta:hover{transform:translateY(-2px);box-shadow:0 12px 34px color-mix(in srgb,var(--p) 40%,transparent)}\n'
    +'.g-trust{margin-top:22px;font-size:13px;color:var(--muted);font-weight:600}\n'
    +'.g-hero-visual{position:relative}\n'
    +'.g-hero-img{width:100%;height:auto;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.16);display:block;aspect-ratio:4/3;object-fit:cover}\n'
    +'.g-float{position:absolute;right:-10px;bottom:-16px;background:var(--can);border:1px solid;border-radius:16px;padding:14px 18px;box-shadow:0 16px 40px rgba(0,0,0,.14);display:flex;flex-direction:column;gap:2px}\n'
    +'.g-float b{font-size:26px;font-weight:900;line-height:1}.g-float span{font-size:12px;color:var(--muted);font-weight:600}\n'
    +'.g-sec{padding:78px 24px}.g-sec.g-alt{background:var(--sft)}\n'
    +'.g-h2{font-size:var(--t-h2);margin:0 0 10px;font-weight:900;letter-spacing:-.02em}.g-lead{font-size:16px;color:var(--muted);max-width:600px;margin:0 0 36px}\n'
    +'.g-feats{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}\n'
    +'.g-feat{background:var(--can);border:1px solid var(--line);border-radius:var(--radius);padding:24px;display:flex;gap:14px;align-items:flex-start;transition:transform var(--dur) var(--ease),border-color var(--dur) var(--ease);animation:gUp .55s var(--ease) both;animation-delay:var(--d)}\n'
    +'.g-feat:hover{transform:translateY(-4px);border-color:var(--p)}\n'
    +'.g-fic{flex:0 0 44px;height:44px;border-radius:12px;background:color-mix(in srgb,var(--p) 14%,transparent);color:var(--p);display:grid;place-items:center}\n'
    +'.g-fic svg{width:22px;height:22px}.g-feat b{display:block;font-size:15px;margin-bottom:4px}.g-feat span{font-size:13px;color:var(--muted);line-height:1.5}\n'
    +'.g-stats{display:flex;gap:36px;flex-wrap:wrap;justify-content:center;padding:6px 0}\n'
    +'.g-stat{text-align:center}.g-stat b{display:block;font-size:large;font-size:clamp(30px,4vw,46px);font-weight:900;color:var(--p)}.g-stat span{font-size:12px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.5px}\n'
    +'.g-steps{display:flex;flex-direction:column;gap:20px;max-width:720px;margin:0 auto}.g-step{display:flex;gap:16px;align-items:flex-start}\n'
    +'.g-snum{flex:0 0 42px;height:42px;border-radius:50%;background:var(--p);color:var(--on-p);display:grid;place-items:center;font-weight:900;font-size:16px}\n'
    +'.g-step b{display:block;font-size:16px;margin-bottom:4px}.g-step p{margin:0;font-size:14px;color:var(--muted);line-height:1.55}\n'
    +'.g-dm{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}.g-dm-row{background:var(--can);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;font-size:13px}\n'
    +'.g-dm-row code{font-family:var(--mono);font-weight:700;color:var(--p)}.g-dm-row span{color:var(--muted);font-size:12px}\n'
    +'.g-show{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.g-show-item{margin:0;border-radius:var(--radius);overflow:hidden;border:1px solid var(--line);background:var(--can)}\n'
    +'.g-show-img{width:100%;height:200px;object-fit:cover;display:block}.g-show-item figcaption{padding:12px 14px;font-size:13px;font-weight:600;color:var(--ink)}\n'
    +'.g-cta-banner{text-align:center;background:linear-gradient(135deg,var(--p),'+INK+');color:var(--on-p);padding:78px 24px}.g-cta-banner .g-h2{color:var(--on-p)}.g-cta-banner .g-lead{color:var(--sub-p);margin-left:auto;margin-right:auto}.g-cta-banner .g-cta{background:var(--on-p);color:'+(isLight?P:'#fff')+'}\n'
    +'.g-footer{border-top:1px solid var(--line);padding:36px 24px;text-align:center;font-size:13px;color:var(--muted)}.g-footer a{color:var(--p);text-decoration:none;font-weight:600}\n'
    +'.dark{--can:#0f1115;--sft:#171b22;--ink:#eef1f6;--muted:#9aa3b2;--line:rgba(255,255,255,.1)}\n'
    +'.dark .g-nav{background:rgba(15,17,21,.8)}.dark .g-feat,.dark .g-dm-row,.dark .g-show-item{background:var(--sft)}\n'
    +'@keyframes gUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}\n'
    +'.reveal{opacity:0;transform:translateY(18px);transition:opacity .6s var(--ease),transform .6s var(--ease)}.reveal.in{opacity:1;transform:none}\n'
    +'@media(max-width:880px){.g-hero-grid{grid-template-columns:1fr;gap:32px}.g-hero-visual{order:-1}}\n'
    +'@media(max-width:640px){.g-nav-links{display:none}.g-burger{display:block}.g-hero{padding:56px 18px 44px}.g-sec{padding:52px 16px}.g-stats{gap:22px}}\n';

  /* 交互 JS（site.js） */
  var JS='(function(){'
    +'function toggleTheme(){var b=document.body;b.classList.toggle(\'dark\');try{localStorage.setItem(\'gt_theme\',b.classList.contains(\'dark\')?\'dark\':\'light\');}catch(e){}}'
    +'function toggleMenu(){var m=document.getElementById(\'gMobile\');if(m)m.classList.toggle(\'open\');}'
    +'window.toggleTheme=toggleTheme;window.toggleMenu=toggleMenu;'
    +'try{var t=localStorage.getItem(\'gt_theme\');if(t===\'dark\')document.body.classList.add(\'dark\');}catch(e){}'
    +'var els=document.querySelectorAll(\'.g-sec, .g-step, .g-show-item\');'
    +'if(\'IntersectionObserver\' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add(\'in\');io.unobserve(en.target);}});},{threshold:.12});els.forEach(function(e){e.classList.add(\'reveal\');io.observe(e);});}'
    +'document.querySelectorAll(\'.g-mobile a\').forEach(function(a){a.addEventListener(\'click\',function(){var m=document.getElementById(\'gMobile\');if(m)m.classList.remove(\'open\');});});'
    +'})();';

  /* 内联版（预览 / 单文件下载） */
  var inline=htmlExternal
    .replace('<link rel="stylesheet" href="assets/css/style.css"/>','<style>'+CSS+'</style>')
    .replace('<script src="assets/js/site.js"><\/script>','<script>'+JS+'<\/script>');

  /* README */
  var readme='# '+type.name+' · '+brand.title+'\n\n由「光体 · AI 网站开发设计平台」生成（多文件组件化输出）。\n\n## 文件结构\n- index.html — 页面结构（语义化 nav/main/section/footer）\n- assets/css/style.css — 设计系统与组件样式（注入品牌 token）\n- assets/js/site.js — 交互（主题切换 / 移动菜单 / 滚动入场）\n- 图片：通过真实图床 URL 引用（如需自托管，将图片保存到 assets/img/ 并改路径）\n\n## 设计规范\n- 美学方向：'+spec.aesthetic+'\n- 主色：'+P+'\n- 配色板：'+sw.join(' / ')+'\n- 字体：'+((brand.fonts||[]).join('、')||'系统默认')+'\n- 品牌基调：'+brand.tone+'\n\n## 自定义\n编辑 assets/css/style.css 中的 :root 变量即可全局换肤；编辑 index.html 调整板块文案。\n';

  var files={'index.html':htmlExternal,'assets/css/style.css':CSS,'assets/js/site.js':JS,'README.md':readme};
  return {inline:inline, files:files};
}

/* ---------- 兼容 / 导出入口 ---------- */
function buildSite(brand,type){return genSite(brand,type).inline;}
function buildProject(brand,type){return genSite(brand,type).files;}

/* ---------- 主视觉图片上传 ---------- */
function readHeroImg(e){
  var f=e.target.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(){
    state.heroImage=r.result;
    if(el('docReadout'))el('docReadout').textContent='已载入主视觉图片（'+Math.round(f.size/1024)+' KB），将用于生成网站 Hero。';
  };
  r.readAsDataURL(f);
}

/* ---------- 前端 zip 导出（store 模式，无依赖） ---------- */
var _crcTable=(function(){var t=[];for(var n=0;n<256;n++){var c=n;for(var k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}return t;})();
function _crc32(bytes){var c=0xFFFFFFFF;for(var i=0;i<bytes.length;i++)c=_crcTable[(c^bytes[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function downloadProject(name, files){
  try{
    var enc=new TextEncoder();
    var out=[]; var pos=0; var central=[]; var names=Object.keys(files); var offsets=[];
    function u16(n){return new Uint8Array([n&0xFF,(n>>>8)&0xFF]);}
    function u32(n){return new Uint8Array([n&0xFF,(n>>>8)&0xFF,(n>>>16)&0xFF,(n>>>24)&0xFF]);}
    names.forEach(function(fn){
      var fnb=enc.encode(fn); var data=enc.encode(String(files[fn])); var crc=_crc32(data);
      offsets.push(pos);
      var lh=new Uint8Array(30+fnb.length); var dv=new DataView(lh.buffer);
      dv.setUint32(0,0x04034b50,true); dv.setUint16(4,20,true); dv.setUint16(6,0,true); dv.setUint16(8,0,true);
      dv.setUint32(10,0,true); dv.setUint32(12,0,true); dv.setUint32(14,crc,true);
      dv.setUint32(18,data.length,true); dv.setUint32(22,data.length,true); dv.setUint16(26,fnb.length,true); dv.setUint16(28,0,true);
      lh.set(fnb,30); out.push(lh,data); pos+=lh.length+data.length;
      var ch=new Uint8Array(46+fnb.length); var cv=new DataView(ch.buffer);
      cv.setUint32(0,0x02014b50,true); cv.setUint16(4,20,true); cv.setUint16(6,20,true); cv.setUint16(8,0,true); cv.setUint16(10,0,true);
      cv.setUint32(12,0,true); cv.setUint32(14,0,true); cv.setUint32(16,crc,true); cv.setUint32(20,data.length,true); cv.setUint32(24,data.length,true);
      cv.setUint16(28,fnb.length,true); cv.setUint16(30,0,true); cv.setUint16(32,0,true); cv.setUint16(34,0,true); cv.setUint16(36,0,true); cv.setUint32(38,0,true);
      cv.setUint32(42,offsets[offsets.length-1],true); ch.set(fnb,46); central.push(ch);
    });
    var cdSize=central.reduce(function(a,c){return a+c.length;},0); var cdOffset=pos;
    var eo=new Uint8Array(22); var ev=new DataView(eo.buffer);
    ev.setUint32(0,0x06054b50,true); ev.setUint16(4,0,true); ev.setUint16(6,0,true);
    ev.setUint16(8,names.length,true); ev.setUint16(10,names.length,true); ev.setUint32(12,cdSize,true); ev.setUint32(16,cdOffset,true); ev.setUint16(20,0,true);
    var all=out.concat(central,[eo]); var total=all.reduce(function(a,c){return a+c.length;},0);
    var zip=new Uint8Array(total); var o=0; all.forEach(function(c){zip.set(c,o);o+=c.length;});
    var blob=new Blob([zip],{type:'application/zip'}); var url=URL.createObjectURL(blob);
    var a=document.createElement('a'); a.href=url; a.download=(name||'project')+'.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},2000);
  }catch(err){ if(el('syncHint'))el('syncHint').textContent='⚠️ 导出失败：'+err.message; }
}
