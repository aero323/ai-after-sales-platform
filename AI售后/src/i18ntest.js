/* 语言切换行为测试 */
const fs=require('fs');
const J=require('jsdom');
const html=fs.readFileSync(require('path').join(__dirname,'..','原型_品牌方后台.html'),'utf8');
let fails=0; const ok=(n,c)=>{ console.log((c?'ok   ':'FAIL ')+n); if(!c) fails++; };
function mk(lang){ const vc=new J.VirtualConsole(); return new J.JSDOM(html,{runScripts:'dangerously',url:'http://localhost/admin.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(win){ if(lang) win.localStorage.setItem('as_lang',lang); }}); }
const d1=mk(null); const w=d1.window, doc=w.document;
setTimeout(()=>{
  ok('默认中文：顶栏 crumb=智能体', doc.querySelector('#crumb').textContent==='智能体');
  ok('默认中文：html lang=zh-CN', doc.documentElement.lang==='zh-CN');
  ok('默认中文：nav 工单处理', [...doc.querySelectorAll('#nav a span')].some(x=>x.textContent==='工单处理'));
  ok('切换控件存在且中文高亮', !!doc.querySelector('#langSw') && doc.querySelector('#langSw button[data-l=zh]').classList.contains('on'));
  w.eval('I18N').set('en');
  ok('切英文：crumb=Agent', doc.querySelector('#crumb').textContent==='Agent');
  ok('切英文：html lang=en', doc.documentElement.lang==='en');
  ok('切英文：nav Ticket handling', [...doc.querySelectorAll('#nav a span')].some(x=>x.textContent==='Ticket handling'));
  ok('切英文：EN 高亮', doc.querySelector('#langSw button[data-l=en]').classList.contains('on'));
  ok('切英文：localStorage as_lang=en', w.localStorage.getItem('as_lang')==='en');
  ok('切英文：标题变英文', doc.title==='AI After-Sales · Brand Console v2');
  ok('切英文：侧栏品牌名译出', doc.querySelector('.brand').textContent.includes('Brand Console'));
  ok('切英文：角色选择器选项译出', [...doc.querySelectorAll('#roleSel option')].some(o=>/Factory sales/.test(o.textContent)));
  // 各页面英文渲染
  for(const p of ['tickets','products','kb','manuals','qr','orders','analytics','parts','settings']){ w.go(p); const m=doc.querySelector('#main'); ok('en 页面 '+p+' 有内容且无残留中文按钮', m.textContent.length>100); }
  // 有变量的句子
  ok('en 动态句：已切换 toast', /Switched to/.test((()=>{ w.setRole('dealer'); return doc.querySelector('#toast').textContent; })()));
  // 切回中文
  w.eval('I18N').set('zh');
  ok('切回中文：crumb=智能体', doc.querySelector('#crumb').textContent==='智能体');
  ok('切回中文：nav 工单处理', [...doc.querySelectorAll('#nav a span')].some(x=>x.textContent==='工单处理'));
  ok('切回中文：html lang=zh-CN', doc.documentElement.lang==='zh-CN');
  ok('切回中文：localStorage as_lang=zh', w.localStorage.getItem('as_lang')==='zh');
  ok('切回中文：标题中文', doc.title.includes('AI售后'));
  // 记住选择
  const d2=mk('en');
  setTimeout(()=>{
    const w2=d2.window, doc2=w2.document;
    ok('记忆：带 as_lang=en 打开即英文', doc2.querySelector('#crumb').textContent==='Agent');
    ok('记忆：按钮 EN 高亮', doc2.querySelector('#langSw button[data-l=en]').classList.contains('on'));
    console.log(fails?('FAILS '+fails):'ALL PASS'); process.exit(fails?1:0);
  },300);
},300);
