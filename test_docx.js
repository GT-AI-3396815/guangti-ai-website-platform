// 校验真实 parseDocx 逻辑：构造一个 deflate 压缩的 word/document.xml 的 minimal docx，喂给从 index.html 抽出的函数
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/g);
const body = m[m.length - 1].replace(/^<script>/, '').replace(/<\/script>$/, '');

function extract(name){
  const start = body.search(new RegExp('(?:async )?function '+name+'\\('));
  if(start<0) throw new Error('cannot find '+name);
  let i = body.indexOf('{', start);
  let depth = 0, inStr = null;
  for(; i<body.length; i++){
    const c = body[i];
    if(inStr){ if(c===inStr && body[i-1]!=='\\') inStr=null; continue; }
    if(c==='"'||c==="'"){ inStr=c; continue; }
    if(c==='{') depth++;
    else if(c==='}'){ depth--; if(depth===0){ return body.slice(start, i+1); } }
  }
  throw new Error('unbalanced '+name);
}
const src = extract('parseDocx') + '\n' + extract('inflateRaw') + '\n' + extract('safeComment');

function buildDocx(text){
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
    '<w:p><w:r><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>';
  const raw = Buffer.from(xml, 'utf8');
  const comp = zlib.deflateRawSync(raw);
  const name = 'word/document.xml';
  const nb = Buffer.from(name,'utf8');
  const lh = Buffer.alloc(30+nb.length);
  lh.writeUInt32LE(0x04034b50,0); lh.writeUInt16LE(20,4); lh.writeUInt16LE(0,6); lh.writeUInt16LE(8,8);
  lh.writeUInt32LE(0,14); lh.writeUInt32LE(comp.length,18); lh.writeUInt32LE(raw.length,22);
  lh.writeUInt16LE(nb.length,26); lh.writeUInt16LE(0,28); nb.copy(lh,30);
  const data = comp;
  const cd = Buffer.alloc(46+nb.length);
  cd.writeUInt32LE(0x02014b50,0); cd.writeUInt16LE(20,4); cd.writeUInt16LE(20,6); cd.writeUInt16LE(0,8); cd.writeUInt16LE(8,10);
  cd.writeUInt32LE(0,12); cd.writeUInt32LE(0,14); cd.writeUInt32LE(0,16);
  cd.writeUInt32LE(comp.length,20); cd.writeUInt32LE(raw.length,24);
  cd.writeUInt16LE(nb.length,28); cd.writeUInt16LE(0,30); cd.writeUInt16LE(0,32); cd.writeUInt16LE(0,34); cd.writeUInt16LE(0,36);
  cd.writeUInt32LE(0,38); cd.writeUInt32LE(0,42); nb.copy(cd,46);
  const eo = Buffer.alloc(22);
  eo.writeUInt32LE(0x06054b50,0); eo.writeUInt16LE(0,4); eo.writeUInt16LE(0,6); eo.writeUInt16LE(1,8); eo.writeUInt16LE(1,10);
  eo.writeUInt32LE(cd.length,12); eo.writeUInt32LE(lh.length+data.length,16); eo.writeUInt16LE(0,20);
  return Buffer.concat([lh,data,cd,eo]);
}

const fakeFile = (buf)=>({ name:'test.docx', size:buf.length, type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset, buf.byteOffset+buf.length) });

(async()=>{
  const code = src + '\n; module.exports={parseDocx, inflateRaw, safeComment};';
  const Module = require('module');
  const mod = new Module('docxlib');
  mod._compile(code, 'docxlib.js');
  const lib = mod.exports;
  const buf = buildDocx('这是从 Word 解析出的正文第一段。Hello <DocX> &amp; 测试');
  const out = await lib.parseDocx(fakeFile(buf));
  const ok = out.includes('这是从 Word 解析出的正文第一段') && out.includes('Hello') && out.includes('测试');
  console.log('解析结果:', JSON.stringify(out));
  console.log('PASS:', ok);
  process.exit(ok?0:1);
})().catch(function(e){ console.error('THROW:', (e && e.stack) ? e.stack : e); process.exit(1); });
