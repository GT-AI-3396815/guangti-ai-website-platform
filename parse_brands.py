import os, re, json, colorsys

SRC = "C:/Users/AW/.workbuddy/skills/awesome-design-md/design-md"
OUT = "C:/Users/AW/WorkBuddy/2026-07-30-21-07-56/guangti-platform/brands.json"

# ---- curated industry + tone per brand folder ----
META = {
 "airbnb":("生活/消费","温暖亲和"),"airtable":("企业服务/SaaS","清新自然"),"apple":("科技/互联网","极简"),
 "binance":("区块链/加密","活力鲜艳"),"bmw":("汽车/出行","奢华高端"),"bmw-m":("汽车/出行","暗黑酷感"),
 "bugatti":("汽车/出行","奢华高端"),"cal":("企业服务/SaaS","清新自然"),"claude":("AI/大模型","温暖亲和"),
 "clay":("设计/创意","活力鲜艳"),"clickhouse":("数据库/基础设施","专业克制"),"cohere":("AI/大模型","专业克制"),
 "coinbase":("区块链/加密","专业克制"),"composio":("开发工具/云","科技感"),"cursor":("开发工具/云","暗黑酷感"),
 "dell-1996":("科技/互联网","专业克制"),"elevenlabs":("AI/大模型","极简"),"expo":("开发工具/云","活力鲜艳"),
 "ferrari":("汽车/出行","奢华高端"),"figma":("设计/创意","活力鲜艳"),"framer":("设计/创意","清新自然"),
 "hashicorp":("开发工具/云","专业克制"),"hp":("科技/互联网","专业克制"),"ibm":("企业服务/SaaS","专业克制"),
 "intercom":("企业服务/SaaS","温暖亲和"),"kraken":("区块链/加密","专业克制"),"lamborghini":("汽车/出行","奢华高端"),
 "linear.app":("开发工具/云","暗黑酷感"),"lovable":("AI/大模型","活力鲜艳"),"mastercard":("金融/支付","活力鲜艳"),
 "meta":("科技/互联网","专业克制"),"minimax":("AI/大模型","科技感"),"mintlify":("开发工具/云","清新自然"),
 "miro":("设计/创意","活力鲜艳"),"mistral.ai":("AI/大模型","专业克制"),"mongodb":("数据库/基础设施","活力鲜艳"),
 "nike":("生活/消费","暗黑酷感"),"nintendo-2001":("游戏/娱乐","活力鲜艳"),"notion":("企业服务/SaaS","清新自然"),
 "nvidia":("科技/互联网","暗黑酷感"),"ollama":("AI/大模型","极简"),"opencode.ai":("开发工具/云","暗黑酷感"),
 "pinterest":("设计/创意","活力鲜艳"),"playstation":("游戏/娱乐","暗黑酷感"),"posthog":("开发工具/云","活力鲜艳"),
 "raycast":("开发工具/云","暗黑酷感"),"renault":("汽车/出行","专业克制"),"replicate":("AI/大模型","极简"),
 "resend":("开发工具/云","极简"),"revolut":("金融/支付","暗黑酷感"),"runwayml":("AI/大模型","暗黑酷感"),
 "sanity":("开发工具/云","清新自然"),"sentry":("开发工具/云","暗黑酷感"),"shopify":("电商/零售","活力鲜艳"),
 "slack":("通讯/协作","活力鲜艳"),"spacex":("科技/互联网","暗黑酷感"),"spotify":("游戏/娱乐","暗黑酷感"),
 "starbucks":("生活/消费","温暖亲和"),"stripe":("金融/支付","科技感"),"supabase":("开发工具/云","活力鲜艳"),
 "superhuman":("企业服务/SaaS","极简"),"tesla":("汽车/出行","暗黑酷感"),"theverge":("媒体/资讯","编辑感/杂志"),
 "together.ai":("AI/大模型","专业克制"),"uber":("汽车/出行","极简"),"vercel":("开发工具/云","暗黑酷感"),
 "vodafone":("通讯/协作","活力鲜艳"),"voltagent":("AI/大模型","科技感"),"warp":("开发工具/云","暗黑酷感"),
 "webflow":("设计/创意","清新自然"),"wired":("媒体/资讯","编辑感/杂志"),"wise":("金融/支付","活力鲜艳"),
 "x.ai":("AI/大模型","极简"),"zapier":("企业服务/SaaS","活力鲜艳"),
}

HEX_RE = re.compile(r'#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b')

def clean_title(raw):
    t = raw or ""
    t = re.sub(r'-design-analysis$','',t,flags=re.I)
    t = re.sub(r'-Inspired-design-analysis$','',t,flags=re.I)
    t = t.replace('-',' ').strip()
    return t[:40]

def classify_color(hexv):
    hexv = hexv.lstrip('#')
    if len(hexv)==3: hexv=''.join(c*2 for c in hexv)
    r=int(hexv[0:2],16)/255; g=int(hexv[2:4],16)/255; b=int(hexv[4:6],16)/255
    h,l,s = colorsys.rgb_to_hls(r,g,b)
    h=h*360; l=l*100; s=s*100
    if l<18: return "暗黑/黑"
    if l>88: return "中性/白"
    if s<18: return "中性/灰"
    if h<15 or h>=345: return "红"
    if h<45: return "橙/黄"
    if h<70: return "黄/绿"
    if h<160: return "绿"
    if h<200: return "青"
    if h<260: return "蓝"
    if h<290: return "紫"
    if h<330: return "品红/粉"
    return "红"

def parse_frontmatter(text):
    if not text.startswith('---'): return "", text
    end = text.find('\n---',3)
    if end==-1: return {}, text
    fm = text[3:end]
    body = text[end+4:]
    return fm, body

def extract_colors(fm, body):
    # 1) frontmatter `colors:` block
    colors={}
    m = re.search(r'colors:\s*\n((?:[ \t]+[-\w]+\s*:\s*"#[0-9a-fA-F]{3,8}"\n?)+)', fm)
    if m:
        block=m.group(1)
        for line in block.splitlines():
            km=re.match(r'\s*([-\w]+)\s*:\s*"?([#0-9a-fA-F]{3,8})"?',line)
            if km: colors[km.group(1)]=km.group(2).lower()
    if not colors:
        for km in re.finditer(r'([-\w]+)\s*:\s*"(#[0-9a-fA-F]{3,8})"', fm):
            colors[km.group(1)]=km.group(2).lower()
    # 2) prose: **Name** (`#hex`) or **Name** (#hex)  (handles brands without frontmatter)
    for mm in re.finditer(r'\*\*([A-Za-z0-9 /&\-\u4e00-\u9fff]+?)\*\*\s*[\(（]?\s*[`\'"]?(#[0-9a-fA-F]{3,8})', body):
        nm=mm.group(1).strip()
        if nm.lower() in ('note','tip','example'): continue
        if nm not in colors:
            colors[nm]=mm.group(2).lower()
    return colors

def extract_all_hex(text):
    return sorted(set(h.lower() for h in HEX_RE.findall(text)),
                  key=lambda x: text.lower().find(x))

def find_primary(fm, body, colors, all_hex):
    # frontmatter primary first
    pm=re.search(r'^\s*primary\s*:\s*"?([0-9a-fA-F]{3,8})"?', fm, re.M)
    if pm: return ('#'+pm.group(1)).lower()
    # keyword near a hex
    for kw in ['primary','brand','accent','cta','logo','mark']:
        m=re.search(r'\b'+kw+r'\b[^\n]{0,70}?#([0-9a-fA-F]{3,8})', body, re.I)
        if m: return ('#'+m.group(1)).lower()
    if colors: return next(iter(colors.values()))
    if all_hex: return all_hex[0]
    return '#666666'

def extract_fonts(fm, body):
    fonts=set()
    # frontmatter fontFamily
    for fm2 in re.finditer(r'fontFamily\s*:\s*([^\n]+)', fm):
        val=fm2.group(1).strip().strip('"').strip("'")
        first = re.split(r'[,/]', val)[0].strip().strip("'").strip('"')
        if first and len(first)<40 and not first.startswith('#') and first.lower() not in ('sans-serif','serif','monospace','system-ui'):
            fonts.add(first)
    # prose: **Role**: `FontName`  (Display / Text / Primary / Title / UI / Body ...)
    for mm in re.finditer(r'\*\*([A-Za-z][^*]{0,18}?)\*\*?\s*:\s*`([^`]+)`', body):
        role=mm.group(1).lower(); val=mm.group(2).strip()
        if 'font' in role or any(k in role for k in ['display','title','primary','body','ui','text','family']):
            for part in re.split(r'[,/]', val):
                p=part.strip().strip("'").strip('"')
                if p and len(p)<40 and not p.startswith('#') and 'http' not in p.lower():
                    fonts.add(p); break
    # fallback A: backtick tokens that look like a font name
    GENERIC={'sans-serif','serif','monospace','system-ui'}
    for mm in re.finditer(r'`([^`]{2,32})`', body):
        cand=re.split(r'[,/]', mm.group(1))[0].strip().strip('"\'')
        low=cand.lower()
        if low in GENERIC or low.startswith('#'): continue
        if re.search(r'\b(px|rem|em|rgba?|http|width|height|color)\b', low): continue
        if re.fullmatch(r'[A-Za-z][A-Za-z0-9 .\-]{1,30}', cand) and ((' ' in cand) or ('-' in cand) or any(c.isupper() for c in cand[1:])):
            fonts.add(cand)
    # fallback B: "typeface — FontName" mentions
    for mm in re.finditer(r'typeface[^\n]{0,30}?\b([A-Za-z][A-Za-z0-9]{2,20})\b', body, re.I):
        f=mm.group(1)
        if f.lower() not in GENERIC and not f.lower().startswith('http'):
            fonts.add(f)
    return sorted(fonts)[:4]

def extract_description(fm):
    m=re.search(r'description\s*:\s*(.*?)(?=\n\w|\Z)', fm, re.S)
    if m:
        d=m.group(1).strip().strip('"').strip("'")
        d=re.sub(r'\s+',' ',d)
        return d[:300]
    return ""

brands=[]
for folder in sorted(os.listdir(SRC)):
    fp=os.path.join(SRC,folder,"DESIGN.md")
    if not os.path.isfile(fp): continue
    with open(fp,encoding='utf-8') as f: text=f.read()
    fm, body = parse_frontmatter(text)
    nm=re.search(r'name\s*:\s*([^\n]+)',fm)
    raw_name = nm.group(1).strip().strip('"').strip("'") if nm else folder
    colors=extract_colors(fm, body)
    fonts=extract_fonts(fm, body)
    desc=extract_description(fm)
    all_hex = extract_all_hex(body if body else text)
    # primary
    primary = find_primary(fm, body if body else text, colors, all_hex)
    # swatches: primary first, then named colors, then other hexes (dedupe, cap 8)
    swatches=[primary] if primary else []
    for v in colors.values():
        if v not in swatches: swatches.append(v)
    for h in all_hex:
        if h not in swatches: swatches.append(h)
    swatches = swatches[:8]
    ind,tone = META.get(folder,("其他","专业克制"))
    color_sys = classify_color(primary)
    brands.append({
        "id":folder,
        "title":clean_title(raw_name) or folder,
        "name":folder,
        "industry":ind,
        "tone":tone,
        "colorSystem":color_sys,
        "primary":primary,
        "colors":colors,
        "swatches":swatches,
        "fonts":fonts if fonts else ["系统默认无衬线"],
        "description":desc or ("以 "+folder+" 品牌视觉语言为基调的设计系统。"),
    })

os.makedirs(os.path.dirname(OUT),exist_ok=True)
with open(OUT,'w',encoding='utf-8') as f:
    json.dump(brands,f,ensure_ascii=False,indent=1)

print("解析品牌数:",len(brands))
print("色系分布:",{c:sum(1 for b in brands if b['colorSystem']==c) for c in sorted(set(b['colorSystem'] for b in brands))})
print("行业分布:",{c:sum(1 for b in brands if b['industry']==c) for c in sorted(set(b['industry'] for b in brands))})
print("调性分布:",{c:sum(1 for b in brands if b['tone']==c) for c in sorted(set(b['tone'] for b in brands))})
# sample
print("SAMPLE:",json.dumps(brands[0],ensure_ascii=False)[:400])
