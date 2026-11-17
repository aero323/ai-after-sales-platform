const {JSDOM}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync('../原型_H5扫码端.html','utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900',pretendToBeVisual:true});
const w=dom.window;
const used=new Set();
w.eval("Object.keys(I18N.en)").forEach(k=>used.add(k));
// keys referenced by data-i and t()/T0()
const doc=w.document; doc.querySelectorAll('[data-i]').forEach(el=>used.add(el.dataset.i));
const app=fs.readFileSync('h5_app.js','utf8');
[...app.matchAll(/t\('([a-z0-9_]+)'\)|T0\('([a-z0-9_]+)'/g)].forEach(m=>used.add(m[1]||m[2]));
const miss=['en','zh'].map(l=>[l, w.eval(`Object.keys(I18N['${l}']).length`), [...used].filter(k=>w.eval(`I18N['${l}']['${k}']===undefined`))]);
console.log(JSON.stringify(miss));
process.exit(0);
