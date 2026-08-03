const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const scriptMatch=html.match(/<script>([\s\S]*)<\/script>/);
const head=html.slice(0, scriptMatch.index);
const staticIds=new Set();
let m, re=/id="([^"]+)"/g;
while((m=re.exec(head))) staticIds.add(m[1]);
const code=scriptMatch[1];
const refs=new Set();
let r2=/el\(\s*['"]([^'"]+)['"]\s*\)/g;
while((m=r2.exec(code))) refs.add(m[1]);
let r3=/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g;
while((m=r3.exec(code))) refs.add(m[1]);
console.log('STATIC IDs count:', staticIds.size);
console.log('el()/getElementById refs count:', refs.size);
const missingStatic=[...refs].filter(id=>!staticIds.has(id));
console.log('REFS NOT in static body (must be dynamic via innerHTML):');
console.log('  '+missingStatic.join(', '));
// ids created in code via id="X" (escaped in template strings)
const createdViaInnerHTML=new Set();
let r5=/id=\\?"([^"\\]+)\\?"/g;
while((m=r5.exec(code))) createdViaInnerHTML.add(m[1].replace(/\\/g,''));
console.log('Created-via-innerHTML ids in code:', [...createdViaInnerHTML].join(', '));
// genuinely missing (referenced but neither static nor created dynamically)
const trulyMissing=missingStatic.filter(id=>!createdViaInnerHTML.has(id) && !['docFile','notesInput','docsInput','docReadout'].includes(id));
console.log('\nTRULY MISSING (referenced, not static, not dynamic):', trulyMissing.length? trulyMissing.join(', ') : 'NONE');
console.log('\nSTEPS defined:', /const STEPS\s*=/.test(code));
console.log('state defined:', /const state\s*=/.test(code));
const stm=code.match(/const STEPS\s*=\s*\[([^\]]*)\]/);
if(stm) console.log('STEPS =', stm[1].replace(/\s+/g,' ').trim());
// querySelector('#X') static nav targets
const qs=new Set();
let r4=/querySelector\(\s*['"]#([^'"]+)['"]\s*\)/g;
while((m=r4.exec(code))) qs.add(m[1]);
console.log('querySelector targets:', [...qs].join(', '));
const navMissing=[...qs].filter(id=>!staticIds.has(id));
console.log('querySelector targets missing in body:', navMissing.length?navMissing.join(', '):'NONE');
