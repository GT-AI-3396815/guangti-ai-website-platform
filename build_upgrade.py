# -*- coding: utf-8 -*-
import io, sys

TPL = r"C:\Users\AW\WorkBuddy\2026-07-30-21-07-56\guangti-platform\template.html"
GEN = r"C:\Users\AW\WorkBuddy\2026-07-30-21-07-56\guangti-platform\gen_block.js"

with io.open(TPL, "r", encoding="utf-8") as f:
    content = f.read()
with io.open(GEN, "r", encoding="utf-8") as f:
    gen_block = f.read()

# 1) Splice gen_block between START marker and `function buildBackendDoc(){`
START = "/* ---------- generate (high-quality output per DESIGN_QUALITY.md) ---------- */"
END = "\nfunction buildBackendDoc(){"
if START not in content:
    print("ERR: START marker not found"); sys.exit(1)
si = content.index(START)
ei = content.index(END, si)
content = content[:si] + gen_block + "\n\n" + content[ei:]
print("spliced gen_block OK (replaced %d chars)" % (ei - si))

def rep(old, new, label):
    global content
    if old not in content:
        print("ERR: replacement target not found ->", label); sys.exit(1)
    content = content.replace(old, new, 1)
    print("replaced:", label)

# 2) generate(): build genSite
rep(
"""      const site=buildSite(b,t);
      const doc=buildBackendDoc();""",
"""      const gen=genSite(b,t);
      const site=gen.inline;
      const doc=buildBackendDoc();""",
"generate site building")

# 3) generate(): wire zip button
rep(
"""      el('dlSite').href='data:text/html;charset=utf-8,'+encodeURIComponent(site);
      el('dlDoc').href='data:text/markdown;charset=utf-8,'+encodeURIComponent(doc);
      el('dlSnap').href='data:application/json;charset=utf-8,'+encodeURIComponent(snapStr);""",
"""      el('dlSite').href='data:text/html;charset=utf-8,'+encodeURIComponent(site);
      el('dlDoc').href='data:text/markdown;charset=utf-8,'+encodeURIComponent(doc);
      el('dlSnap').href='data:application/json;charset=utf-8,'+encodeURIComponent(snapStr);
      if(el('btnZip'))el('btnZip').onclick=()=>downloadProject(slugName(t.name+'_'+b.title)||'project', gen.files);""",
"wire zip button")

# 4) snapshot outputFiles
rep(
"outputFiles:['guangti-site.html','backend-config.md','project-snapshot.json']",
"outputFiles:['index.html','assets/css/style.css','assets/js/site.js','README.md','backend-config.md','project-snapshot.json']",
"snapshot outputFiles")

# 5) logs add step 7
rep(
"    '⑥ 生成项目快照（可同步到 WorkBuddy 任务）…'",
"    '⑥ 生成项目快照（可同步到 WorkBuddy 任务）…',\n    '⑦ 接入真实图片与多文件组件 zip 导出…'",
"logs add step 7")

# 6) UI: add zip download button
rep(
'        <a class="dl" id="dlSite" download="guangti-site.html">⬇ 下载网站 HTML</a>',
'        <a class="dl" id="dlSite" download="guangti-site.html">⬇ 下载网站 HTML（单文件）</a>\n        <button class="dl btn-act" id="btnZip">📦 下载完整项目（多文件 .zip）</button>',
"UI add zip button")

# 7) step5: add hero image upload
rep(
'      <div class="filein">📎 上传文档（支持 .txt/.md/.json 直接读入内容，或附加 .pdf/.doc/.docx 随附交付）：<input type="file" id="docFile" accept=".txt,.md,.markdown,.json,.text,.pdf,.doc,.docx" onchange="readDoc(event)" /></div>',
'      <div class="filein">📎 上传文档（支持 .txt/.md/.json 直接读入内容，或附加 .pdf/.doc/.docx 随附交付）：<input type="file" id="docFile" accept=".txt,.md,.markdown,.json,.text,.pdf,.doc,.docx" onchange="readDoc(event)" /></div>\n      <div class="filein">🖼 上传主视觉图片（可选，用作生成网站 Hero 真实配图）：<input type="file" id="heroImgFile" accept="image/*" onchange="readHeroImg(event)" /></div>',
"step5 add image upload")

# 8) state init add heroImage
rep(
'const state = { brand:null, type:null, notes:"", backend:[], docs:"" };',
'const state = { brand:null, type:null, notes:"", backend:[], docs:"", heroImage:null };',
"state init heroImage")

with io.open(TPL, "w", encoding="utf-8") as f:
    f.write(content)
print("template.html updated, total length:", len(content))
