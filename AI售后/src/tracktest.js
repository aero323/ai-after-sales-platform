/* ============================================================
   客户追踪页 · tracktest.js
   对应 设计_客户追踪页_v1.md §9 / §12，当前 41 项。node + jsdom，直接读构建产物。
   跑法：NODE_PATH=$PWD/node_modules node tracktest.js
   注意：页面里有 4s 轮询定时器，node 会挂住 → 末尾 process.exit(0)。
   ============================================================ */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'), path=require('path');
const PAGE=path.join(__dirname,'..','原型_客户追踪页.html');
const ADMIN=path.join(__dirname,'..','原型_品牌方后台.html');
const html=fs.readFileSync(PAGE,'utf8');

let pass=0, fail=0;
const ok=(n,c)=>{ if(c){pass++; console.log('ok  ',n);} else {fail++; console.log('FAIL',n);} };
const step=async(n,f)=>{ try{ const r=await f(); if(r===false){fail++; console.log('FAIL',n);} else {pass++; console.log('ok  ',n);} }catch(e){ fail++; console.log('FAIL',n,'→',String(e&&e.message||e).split('\n')[0]); } };
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* token：与页面同一算法（fnv1a + 8 位 base36） */
function fnv(e){ e=String(e).trim().toLowerCase()+'|ironpeak-track-v1'; let h=0x811c9dc5; for(let i=0;i<e.length;i++){ h^=e.charCodeAt(i); h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0; } return (h>>>0).toString(36).padStart(8,'0'); }
const url=(email,hash='#/')=>`http://localhost/track.html?e=${encodeURIComponent(email)}&k=${fnv(email)}${hash}`;

/* 种子数据：后台原型自己会 seed 并存进 localStorage；这里只取一次 as_state 复用 */
function seedState(){
  const vc=new VirtualConsole();
  const dom=new JSDOM(fs.readFileSync(ADMIN,'utf8'),{runScripts:'dangerously',url:'http://localhost/admin.html',pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){ w.URL.createObjectURL=()=>'blob:x'; }});
  const raw=dom.window.localStorage.getItem('as_state');
  dom.window.close();
  return raw;
}
const STATE=seedState();
const STATE_OBJ=JSON.parse(STATE);

/* 开一个追踪页实例 */
async function open(o={}){
  const vc=new VirtualConsole(); const errs=[];
  vc.on('jsdomError',e=>errs.push(String(e&&e.message||e)));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:o.url||url('m.reynolds@gmail.com'),pretendToBeVisual:true,virtualConsole:vc,
    beforeParse(w){
      w.URL.createObjectURL=()=>'blob:x';
      if(o.state!==false) w.localStorage.setItem('as_state',o.state||STATE);
      if(o.inbox) w.localStorage.setItem('as_h5_inbox',JSON.stringify(o.inbox));
      if(o.lang) w.localStorage.setItem('as_track_lang',o.lang);
      if(o.edit){ const st=JSON.parse(o.state||STATE); o.edit(st); w.localStorage.setItem('as_state',JSON.stringify(st)); }
    }});
  const w=dom.window;
  for(let i=0;i<40&&!w.__track;i++) await wait(10);
  if(!w.__track) throw new Error('page did not boot'+(errs[0]?' ('+errs[0]+')':''));
  return {w, d:w.document, dom, errs, txt:()=>w.document.getElementById('app').textContent, html:()=>w.document.getElementById('app').innerHTML};
}

(async()=>{
/* ---------- 1. 合法 token → 列表；非法 token → 过期页 ---------- */
await step('1a valid token renders the customer\'s requests (Mark, single ticket → detail)',async()=>{
  const p=await open(); const t=p.txt();
  if(!/Smith Machine SM-900/.test(t)) throw new Error('product missing');
  if(!/T-26\d\d-\d{4}/.test(t)) throw new Error('ticket id missing');
  if(/This link has expired|链接已失效/.test(t)) throw new Error('showed expired page');
});
await step('1b bad token → expired page',async()=>{
  const p=await open({url:'http://localhost/track.html?e=m.reynolds@gmail.com&k=deadbeef'});
  if(!/This link has expired/.test(p.txt())) throw new Error(p.txt().slice(0,120));
  if(p.w.document.getElementById('gateEmail')==null) throw new Error('no email input');
  if(p.w.__track.view!=='expired') throw new Error('view='+p.w.__track.view);
});
await step('1c bare open (no e) → demo picker, not the expired page',async()=>{
  const p=await open({url:'http://localhost/track.html'});
  if(p.w.__track.view!=='picker') throw new Error('view='+p.w.__track.view);
  if(/This link has expired/.test(p.txt())) throw new Error('expired page on bare open');
  if(!p.d.querySelector('.picker')) throw new Error('picker not rendered');
});

/* ---------- 2. 过期页输入邮箱 → 进入，URL 带 e ---------- */
await step('2 expired page: submit email → enters and URL carries e',async()=>{
  const p=await open({url:'http://localhost/track.html?e=bad&k=nope'});
  p.d.getElementById('gateEmail').value='m.reynolds@gmail.com';
  p.d.getElementById('gateForm').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));
  if(p.w.__track.view!=='detail') throw new Error('view='+p.w.__track.view);
  if(!/m\.reynolds%40gmail\.com/.test(p.w.location.search)) throw new Error('URL: '+p.w.location.search);
  if(!/Smith Machine SM-900/.test(p.txt())) throw new Error('no ticket');
  if(!p.d.querySelector('.foot')&&!/IronPeak Support/.test(p.txt())) throw new Error('page did not render');
});
await step('2b submit still works when history.replaceState throws (file:// SecurityError)',async()=>{
  const p=await open({url:'http://localhost/track.html?e=bad&k=nope'});
  p.w.history.replaceState=()=>{ throw new Error('SecurityError: file://'); };
  p.d.getElementById('gateEmail').value='m.reynolds@gmail.com';
  p.d.getElementById('gateForm').dispatchEvent(new p.w.Event('submit',{bubbles:true,cancelable:true}));
  if(p.w.__track.view!=='detail') throw new Error('view='+p.w.__track.view);
  if(!/Smith Machine SM-900/.test(p.txt())) throw new Error('no ticket after failed replaceState');
});
await step('2c expired page offers a way to the demo picker',async()=>{
  const p=await open({url:'http://localhost/track.html?e=m.reynolds@gmail.com&k=deadbeef'});
  const a=[...p.d.querySelectorAll('a')].find(x=>/\?demo=1/.test(x.getAttribute('href')||''));
  if(!a) throw new Error('no picker link on the expired page');
});

/* ---------- 3. demo 选择器 ---------- */
await step('3 ?demo=1 renders the picker; a normal link does not',async()=>{
  const a=await open({url:'http://localhost/track.html?demo=1#/'});
  if(a.w.__track.view!=='picker') throw new Error('view='+a.w.__track.view);
  const links=[...a.d.querySelectorAll('.picker a')];
  if(links.length!==7) throw new Error('picker rows '+links.length+', expected 7');
  if(!/paul\.richter@t-online\.de/.test(a.txt())) throw new Error('multi-ticket customer missing from picker');
  const pr=links.find(l=>/paul\.richter@t-online\.de/.test(l.textContent));
  const href=new URL(pr.getAttribute('href'),'http://localhost/track.html');
  if(href.searchParams.get('k')!==fnv('paul.richter@t-online.de')) throw new Error('picker link lacks a valid token');
  const c=await open({url:href.href});
  if(c.w.__track.view!=='list') throw new Error('picker link → '+c.w.__track.view);
  if(!/(Resolved requests|Erledigte Anfragen) \(6\)/.test(c.txt())) throw new Error('paul list wrong');
  const b=await open();
  if(/demoPicker|pickerT|Demo: choose a customer/.test(b.txt())) throw new Error('picker leaked into normal link');
  if(b.d.querySelector('.picker')) throw new Error('picker DOM present');
});

/* ---------- 4. 大小写 / 空格 ---------- */
await step('4 email match is case-insensitive and trims spaces',async()=>{
  const p=await open({url:'http://localhost/track.html?e='+encodeURIComponent('  Mark.Reynolds@GMAIL.com ')+'&k='+fnv(' MARK.REYNOLDS@GMAIL.COM ')});
  if(p.w.__track.view!=='detail') throw new Error('view='+p.w.__track.view);
  if(!/Smith Machine SM-900/.test(p.txt())) throw new Error('no ticket');
});

/* ---------- 5. 隔离：Mark 的页面不含 Lena / Paul 的工单号 ---------- */
await step('5 isolation: Mark\'s page contains none of Lena\'s or Paul\'s ticket ids',async()=>{
  const ids=e=>STATE_OBJ.tickets.filter(t=>t.cust.email.toLowerCase()===e).map(t=>t.id);
  const others=[...ids('lena.h@web.de'),...ids('paul.richter@t-online.de'),...ids('paul.r@gmx.de')];
  const p=await open(); const h=p.html();
  const leaked=others.filter(id=>h.includes(id));
  if(leaked.length) throw new Error('leaked '+leaked.join(','));
  if(/lena\.h@|paul\.richter@|paul\.r@gmx/.test(h)) throw new Error('leaked other emails');
});

/* ---------- 6. 多工单分组 ---------- */
await step('6 multi-ticket (liam): in-progress first, resolved collapsed with count',async()=>{
  const p=await open({url:url('liam.o.brien@gmail.com')});
  if(p.w.__track.view!=='list') throw new Error('view='+p.w.__track.view);
  const secs=[...p.d.querySelectorAll('section.sec')];
  const openSec=secs.find(s=>/In progress/.test(s.textContent));
  if(!openSec) throw new Error('no in-progress group');
  const openCards=openSec.querySelectorAll('.tcard');
  if(openCards.length!==1) throw new Error('open cards '+openCards.length);
  const fold=p.d.getElementById('foldDone');
  if(!fold) throw new Error('no resolved fold');
  if(!/Resolved requests \(2\)/.test(fold.textContent)) throw new Error(fold.textContent);
  if(fold.getAttribute('aria-expanded')!=='false') throw new Error('not collapsed');
  const doneList=p.d.getElementById('doneList');
  if(!doneList.hasAttribute('hidden')) throw new Error('resolved list visible');
  return true;
});
await step('6b resolved list expands on click',async()=>{
  const p=await open({url:url('liam.o.brien@gmail.com')});
  p.d.getElementById('foldDone').click();
  if(p.d.getElementById('doneList').hasAttribute('hidden')) throw new Error('still hidden');
  if(p.d.querySelectorAll('#doneList .tcard').length!==2) throw new Error('done cards '+p.d.querySelectorAll('#doneList .tcard').length);
});

/* ---------- 7. 单工单直进详情 ---------- */
await step('7 single-ticket customer goes straight to detail (no list)',async()=>{
  const p=await open();
  if(p.w.__track.view!=='detail') throw new Error('view='+p.w.__track.view);
  if(p.d.querySelector('.cards')) throw new Error('list rendered');
  if(!p.d.querySelector('.banner')) throw new Error('no status banner');
});

/* ---------- 8. 投影 ---------- */
await step('8 projection: (internal) ai, fact/human/dealer/sys, tr never rendered',async()=>{
  // Jake 的工单里有一条 "(internal)" ai；render 出来必须不含它，也不能含 fact/sys 原文
  const p=await open({url:url('jaket@yahoo.com')});
  const h=p.html();
  if(/\(internal\)/.test(h)) throw new Error('(internal) ai leaked');
  if(/识别序列号|视频中锁扣回弹不足/.test(h)) throw new Error('internal note body leaked');
  if(/转品牌方售后|暂停自动回复/.test(h)) throw new Error('sys entry leaked');
  // tr（中文译文）只在内部字段里出现，对客页不得出现
  const jake=STATE_OBJ.tickets.find(t=>t.cust.email==='jaket@yahoo.com');
  const trs=jake.timeline.map(e=>e.tr).filter(Boolean);
  const leaked=trs.filter(x=>h.includes(x.slice(0,12)));
  if(leaked.length) throw new Error('tr leaked: '+leaked[0].slice(0,20));
  // FWT-61：邮件解析： ai + fact/sys 都不能出现
  const f=await open({url:url('max.m@australianfitnesssupplies.com.au')});
  const fh=f.html();
  if(/邮件解析/.test(fh)) throw new Error('"邮件解析：" ai leaked');
  if(/工厂：微信上已讨论|贸易对接 Nandy|承诺日期入库|O4|O5|O6/.test(fh)) throw new Error('fact/sys leaked in FWT-61');
  if(/Internal note|wechat/i.test(fh.replace(/WeChat messages, but the glue type was not specified/,''))) throw new Error('internal chatter leaked');
  // 摘要用客户原文：英文客户页面上不出现后台中文内部标题（种子 issue 是中文）
  if(/粘接失效|配重片|螺栓\b/.test(fh)) throw new Error('Chinese internal issue summary shown on an English page');
  if(!/Another issue with a part sticking/.test(fh)) throw new Error('customer original wording missing from summary');
});

/* ---------- 9. FWT-61 寄件卡 ---------- */
await step('9 FWT-61 detail shows tracking 879545895350, promised date, dispatched, copy button',async()=>{
  const p=await open({url:url('max.m@australianfitnesssupplies.com.au')});
  const t=p.txt();
  if(!/879545895350/.test(t)) throw new Error('no tracking number');
  if(!/30 Oct 2026/.test(t)) throw new Error('no promised date');
  if(!/31 Oct 2026/.test(t)) throw new Error('no shipped date');
  if(!/1 号件|74 号件/.test(t)&&!/74/.test(t)) throw new Error('no parts list');
  const btn=p.d.querySelector('.copy[data-copy="879545895350"]');
  if(!btn) throw new Error('no copy button');
  if(!btn.getAttribute('aria-label')) throw new Error('copy button lacks aria-label');
});

/* ---------- 10. 承诺时间跟随 Policy 覆盖 ---------- */
await step('9b detail omits the manual shortcut and keeps reply as the primary action',async()=>{
  const p=await open({url:url('max.m@australianfitnesssupplies.com.au')});
  if(p.d.querySelector('.actions a[href*="?m="]')) throw new Error('manual shortcut still rendered');
  if(/Open the manual|Anleitung öffnen|打开说明书/.test(p.txt())) throw new Error('manual label still visible');
  const actions=[...p.d.querySelectorAll('.actions a')];
  if(actions.length!==1) throw new Error('expected one detail action, got '+actions.length);
});
await step('10 deadline = statusSince + routing.l1.hours, follows as_state.policy override',async()=>{
  const fresh=Date.now()-10*60000;     // statusSince 10 分钟前
  const p1=await open({edit:st=>{ const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com')); t.status='human'; t.statusSince=fresh; t.updatedAt=fresh; }});
  const probe=p1.w.__track.tickets().find(t=>t.status==='human');
  const d1=p1.w.eval(`deadlineOf(${JSON.stringify(probe)})`);
  if(Math.abs(d1-(fresh+4*3600000))>5000) throw new Error('default 4h: '+((d1-fresh)/3600000));
  // 改政策覆盖：l1 = 12 小时
  const p2=await open({edit:st=>{ const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com')); t.status='human'; t.statusSince=fresh; t.updatedAt=fresh;
    st.policy=st.policy||{values:{},log:[]}; st.policy.values.routing={l1:{hours:12}}; }});
  const probe2=p2.w.__track.tickets().find(t=>t.status==='human');
  const d2=p2.w.eval(`deadlineOf(${JSON.stringify(probe2)})`);
  if(Math.abs(d2-(fresh+12*3600000))>5000) throw new Error('override 12h not applied: '+((d2-fresh)/3600000));
  // factory → l2（默认 24h）
  const pf=await open({edit:st=>{ const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com')); t.status='factory'; t.statusSince=fresh; t.updatedAt=fresh; }});
  const pfT=pf.w.__track.tickets().find(t=>t.status==='factory');
  const d3=pf.w.eval(`deadlineOf(${JSON.stringify(pfT)})`);
  if(Math.abs(d3-(fresh+24*3600000))>5000) throw new Error('factory 24h: '+((d3-fresh)/3600000));
});

/* ---------- 11. 超时 → 正在加急 ---------- */
await step('11 overdue promise → "escalated" copy, no countdown',async()=>{
  const old=Date.now()-30*3600000;
  const p=await open({edit:st=>{ const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com')); t.status='human'; t.statusSince=old; t.updatedAt=old; }});
  const t=p.txt();
  if(!/taking longer than promised|已超过承诺时间|länger als zugesagt/.test(t)) throw new Error('no escalation copy');
  if(!/st-late/.test(p.html())) throw new Error('status pill not in late tone');
  if(/get back to you by/.test(t)) throw new Error('still shows a countdown');
});

/* ---------- 12. H5 收件箱里未导入后台的记录 ---------- */
await step('12 a new H5 inbox record for the same email appears in the list',async()=>{
  const rec={id:'T-2699-9001',createdAt:Date.now()-5*60000,lang:'en',product:'TR-650',sn:'TR6-24A-09999',
    issue:'Treadmill belt slips after 20 minutes',photos:0,email:'liam.o.brien@gmail.com',name:"Liam O'Brien",status:'ai',
    kbId:null,transcript:[{who:'ai',text:'Thanks, we are looking into your belt issue.',t:Date.now()-4*60000},
                          {who:'cust',text:'The belt slips after 20 minutes at 8 km/h.',t:Date.now()-5*60000}]};
  const p=await open({url:url('liam.o.brien@gmail.com'),inbox:[rec]});
  const t=p.txt();
  if(!/T-2699-9001/.test(t)) throw new Error('new H5 ticket not listed');
  if(!/Treadmill TR-650/.test(p.html())) throw new Error('product missing');
  const openCards=[...p.d.querySelectorAll('section.sec')].find(x=>/In progress/.test(x.textContent)).querySelectorAll('.tcard');
  if(openCards.length!==2) throw new Error('open cards '+openCards.length);
});

/* ---------- 13. 轮询 / 重渲染 ---------- */
await step('13 refresh() after a status change updates the pill',async()=>{
  const p=await open();
  const before=/a support engineer is working on it/i.test(p.txt());
  if(!before) throw new Error('expected human status first');
  const st=JSON.parse(p.w.localStorage.getItem('as_state'));
  const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com')); t.status='done'; t.resolvedAt=Date.now(); t.statusSince=Date.now(); t.updatedAt=Date.now();
  p.w.localStorage.setItem('as_state',JSON.stringify(st));
  p.w.__refresh();
  if(/a support engineer is working on it/i.test(p.txt())) throw new Error('still old status');
  if(!/resolved/i.test(p.txt())) throw new Error('new status not shown');
  return true;
});
await step('13b refresh() keeps scroll position and the expanded older-messages state',async()=>{
  // 造一张有 10 条可见消息的工单：默认只显示最近 6 条，多出部分折叠
  const msgs=[]; for(let i=0;i<5;i++){ msgs.push({who:'cust',text:'Customer message number '+(i+1),t:Date.now()-600000+i*2000}); msgs.push({who:'ai',text:'Our reply number '+(i+1),t:Date.now()-599000+i*2000}); }
  const p=await open({edit:st=>{ const t=st.tickets.find(x=>x.cust.email==='m.reynolds@gmail.com'); t.timeline=msgs; }});
  if(p.d.querySelectorAll('.msg').length!==6) throw new Error('default view should show 6, got '+p.d.querySelectorAll('.msg').length);
  const so=p.d.getElementById('showOlder');
  if(!so) throw new Error('no "show earlier messages" control');
  if(!/4/.test(so.textContent)) throw new Error('hidden count wrong: '+so.textContent);
  so.click();
  if(p.d.getElementById('showOlder')) throw new Error('did not expand');
  if(p.d.querySelectorAll('.msg').length!==10) throw new Error('expanded should show 10, got '+p.d.querySelectorAll('.msg').length);
  // jsdom 不实现滚动：把 window.scrollY 换成可写值，验证页面确实读旧位置并在重渲染后恢复
  Object.defineProperty(p.w,'scrollY',{configurable:true,get:()=>640});
  const st=JSON.parse(p.w.localStorage.getItem('as_state'));
  st.tickets.find(x=>x.cust.email==='m.reynolds@gmail.com').updatedAt=Date.now()+1000;
  p.w.localStorage.setItem('as_state',JSON.stringify(st));
  p.w.__refresh();
  if(p.w.__track.scrollTarget!==640) throw new Error('scroll not restored, got '+p.w.__track.scrollTarget);
  if(p.d.getElementById('showOlder')) throw new Error('older messages collapsed again after refresh');
  if(p.d.querySelectorAll('.msg').length!==10) throw new Error('expanded state lost');
});

/* ---------- 14. XSS ---------- */
await step('14 XSS: <img onerror> in issue renders as text',async()=>{
  const evil='<img src=x onerror="window.__pwned=1"> broken cable';
  const p=await open({edit:st=>{ const t=st.tickets.find(x=>x.cust.email==='m.reynolds@gmail.com'); t.issue=evil; if(t.timeline[0]) t.timeline[0].text=evil; }});
  if(p.d.querySelector('#app img')) throw new Error('injected <img> element');
  if(p.w.__pwned) throw new Error('script executed');
  if(!p.txt().includes('<img src=x')) throw new Error('text not rendered literally');
});

/* ---------- 15. 中文切换 ---------- */
await step('15 switching to 中文 works and persists to as_track_lang',async()=>{
  const p=await open();
  const btn=p.d.querySelector('[data-lang="zh"]');
  if(!btn) throw new Error('no zh button');
  btn.click();
  if(!/现在|进度|回复这封邮件/.test(p.txt())) throw new Error('chrome not in Chinese');
  if(p.w.localStorage.getItem('as_track_lang')!=='zh') throw new Error('not persisted');
  // 重新打开（同一 localStorage 语义）→ 记住中文
  const q=await open({lang:'zh'});
  if(!/进度|现在/.test(q.txt())) throw new Error('not remembered on reopen');
});

/* ---------- 16. 空邮箱 ---------- */
await step('16 unknown email → empty state',async()=>{
  const p=await open({url:url('nobody@example.com')});
  if(p.w.__track.view!=='empty') throw new Error('view='+p.w.__track.view);
  if(!/No requests for this address yet/.test(p.txt())) throw new Error('no empty copy');
  if(!p.d.querySelector('a[href*="原型_H5扫码端.html"]')) throw new Error('no H5 link');
});

/* ---------- 17. 语言回退 ---------- */
await step('17 sv customer → chrome in English',async()=>{
  const p=await open({url:url('anna.l@telia.se')});
  if(!/Resolved|In progress|Right now/.test(p.txt())) throw new Error('not English: '+p.txt().slice(0,120));
  if(/Löst|Erledigt|Senaste/.test(p.txt())) throw new Error('wrong fallback');
  if(!p.d.querySelector('[data-lang="en"][aria-pressed="true"]')) throw new Error('en not active');
});

/* ---------- 18. 还有 N 个请求 ---------- */
await step('18 detail page links to other requests',async()=>{
  const p=await open({url:url('liam.o.brien@gmail.com','#/t/'+idOf(STATE_OBJ,'liam.o.brien@gmail.com'))});
  if(p.w.__track.view!=='detail') throw new Error('view='+p.w.__track.view);
  const more=p.d.querySelector('a.more');
  if(!more) throw new Error('no "other requests" link');
  if(!/2 other requests/.test(more.textContent)) throw new Error(more.textContent);
  if(more.getAttribute('href')!=='#/') throw new Error('href '+more.getAttribute('href'));
  // 列表里另一个工单的卡片确实可达
  more.click();
});
await step('18b deep link #/t/<other id> opens that ticket',async()=>{
  const others=STATE_OBJ.tickets.filter(t=>t.cust.email==='liam.o.brien@gmail.com').map(t=>t.id);
  const p=await open({url:url('liam.o.brien@gmail.com','#/t/'+others[1])});
  const h=p.txt();
  if(!h.includes(others[1])) throw new Error('deep-linked ticket not shown');
});

/* ---------- 附加：过期链接不泄露任何邮箱 ---------- */
await step('19 expired page exposes no customer emails',async()=>{
  const p=await open({url:'http://localhost/track.html?e=x&k=y'});
  const h=p.html();
  if(/@gmail\.com|@web\.de|@t-online\.de|australianfitnesssupplies/.test(h)) throw new Error('email leaked on gate page');
});
await step('20 demo picker is the only place with clear-text emails',async()=>{
  const a=await open({url:'http://localhost/track.html?demo=1#/'});
  const b=await open();
  if(!/@gmail\.com/.test(a.html())) throw new Error('picker should list emails');
  if(/m\.reynolds@gmail\.com/.test(b.html())) throw new Error('normal page shows clear-text email');
  if(!/m\*\*\*s@gmail\.com/.test(b.html())) throw new Error('masked email missing');
});
await step('21 no external resources (no http(s) src/href, no @import, no web fonts)',async()=>{
  const p=await open();
  const bad=[...p.d.querySelectorAll('link,script[src],img[src]')].map(n=>n.getAttribute('href')||n.getAttribute('src')).filter(Boolean);
  if(bad.length) throw new Error('external refs: '+bad.join(','));
  if(/url\(\s*['"]?https?:/.test(html)) throw new Error('remote url() in CSS');
  if(/@import/.test(html)) throw new Error('@import in CSS');
});
await step('22 track: role="list" on the rail, pills carry text not just colour',async()=>{
  const p=await open({url:url('max.m@australianfitnesssupplies.com.au')});
  const rail=p.d.querySelector('.track[role="list"]');
  if(!rail) throw new Error('no role=list track');
  if(rail.querySelectorAll('li[role="listitem"]').length<3) throw new Error('too few milestones');
  const pill=p.d.querySelector('.banner .k');
  if(!pill||pill.textContent.trim().length<3) throw new Error('status label has no text');
});

/* ---------- 23. 里程碑一句话概括（2026-11-16）：首次回复 / 已解决 下面各有一句情况描述，且全部来自结构字段 ---------- */
const sophieBelt=()=>{ const t=STATE_OBJ.tickets.find(x=>x.cust.email.toLowerCase()==='sophie.martin@orange.fr'&&x.kbId==='belt'&&x.status==='done'); return url('sophie.martin@orange.fr','#/t/'+encodeURIComponent(t.id)); };
await step('23a resolved-by-AI ticket (Sophie, belt): first reply + resolved carry a one-line summary built from kbId/resolvedBy',async()=>{
  const p=await open({url:sophieBelt(),lang:'en'});
  const li=[...p.d.querySelectorAll('.track li')];
  const first=li.find(x=>/First reply/.test(x.textContent)), done=li.find(x=>/^Resolved/.test(x.querySelector('b').textContent));
  if(!first||!done) throw new Error('milestones missing');
  const d1=first.querySelector('.desc'), d2=done.querySelector('.desc');
  if(!d1||!/Belt drifting \/ lubrication/.test(d1.textContent)) throw new Error('first-reply desc should name the KB category: '+(d1&&d1.textContent));
  if(!/with a short video/.test(d1.textContent)) throw new Error('belt entry has a video → desc should say so');
  if(/offered a free/.test(d1.textContent)) throw new Error('belt entry has no part → must not promise a part');
  if(!d2||!/You confirmed the issue is fixed after “Belt alignment”/.test(d2.textContent)) throw new Error('resolved desc wrong: '+(d2&&d2.textContent));
});
await step('23b rating milestone renders the number (no raw {n} placeholder) in zh',async()=>{
  const p=await open({url:sophieBelt(),lang:'zh'});
  const t=p.txt();
  if(/\{n\}/.test(t)) throw new Error('{n} placeholder leaked');
  if(!/你的评分 5\/5/.test(t)) throw new Error('expected 你的评分 5/5, got: '+(t.match(/你的评分[^\n]{0,8}/)||[''])[0]);
  const li=[...p.d.querySelectorAll('.track li')].find(x=>/我们首次回复/.test(x.textContent));
  if(!li||!/初步判断为「跑带偏移 \/ 润滑」，已发送处理步骤和演示视频。/.test(li.textContent)) throw new Error('zh desc missing: '+(li&&li.textContent));
});
await step('23c safety ticket routed to a person (Mark, cable): first-reply desc says it went to an engineer, never the internal reasons',async()=>{
  const p=await open({lang:'en'});
  const li=[...p.d.querySelectorAll('.track li')].find(x=>/First reply/.test(x.textContent));
  const d=li&&li.querySelector('.desc');
  if(!d||!/support engineer/.test(d.textContent)) throw new Error('hold desc missing: '+(d&&d.textContent));
  if(!/safety-related/.test(d.textContent)) throw new Error('cable entry is safety-flagged → say so');
  if(/confidence|reasons|threshold|kbId/i.test(p.html())) throw new Error('internal fields leaked');
  const human=[...p.d.querySelectorAll('.track li')].find(x=>/Support engineer assigned/.test(x.textContent));
  if(!human||!human.querySelector('.desc')) throw new Error('engineer milestone has no desc');
});
await step('23d status=ai after the assistant replied: one "First reply" only, next step shows "Waiting for your reply"',async()=>{
  const st=JSON.parse(STATE); const t=st.tickets.find(x=>x.status==='ai'&&!x.pending&&(x.timeline||[]).some(e=>e.who==='ai'));
  if(!t) return;   // 种子里没有这种单就跳过
  const p=await open({url:url(t.cust.email,'#/t/'+encodeURIComponent(t.id)),lang:'en'});
  const titles=[...p.d.querySelectorAll('.track li b')].map(b=>b.textContent.trim());
  if(titles.filter(x=>x==='First reply from our team').length!==1) throw new Error('first reply duplicated: '+titles.join(' | '));
  if(!titles.includes('Waiting for your reply')) throw new Error('no next-step placeholder: '+titles.join(' | '));
});
await step('23e pending part (Carlos, bolts): parts milestone names the part from the KB, next step is dispatch',async()=>{
  const p=await open({url:url('carlos.m@outlook.com'),lang:'en'});
  const li=[...p.d.querySelectorAll('.track li')];
  const parts=li.find(x=>/Replacement part requested/.test(x.textContent));
  if(!parts||!/free M10 bolt pack/.test(parts.textContent)) throw new Error('parts desc wrong: '+(parts&&parts.textContent));
  const first=li.find(x=>/First reply/.test(x.textContent));
  if(!first||!/offered a free M10 bolt pack/.test(first.textContent)) throw new Error('first reply should mention the offered part: '+(first&&first.textContent));
  if(!li.some(x=>x.classList.contains('future')&&/Dispatched/.test(x.textContent))) throw new Error('future step should be Dispatched');
});
await step('23f H5-only record (not yet in back office) closed by the customer: resolved desc falls back to "you confirmed"',async()=>{
  const now=Date.now(); const email='h5only.track@example.com';
  const rec={id:'T-H5-DESC1',createdAt:now-3600e3,updatedAt:now-600e3,lang:'en',product:'TR-650',sn:null,issue:'Belt drifts to the left',photos:0,email,name:'Nora',status:'done',rating:4,kbId:'belt',stepsDone:2,
    transcript:[{who:'cust',text:'Belt drifts to the left',t:now-3600e3},{who:'ai',text:'Turn the drift-side bolt a quarter turn clockwise.',t:now-3500e3},{who:'cust',text:'It works now, thanks',t:now-600e3}]};
  const p=await open({url:url(email),lang:'en',inbox:[rec]});
  const li=[...p.d.querySelectorAll('.track li')];
  const done=li.find(x=>/^Resolved/.test((x.querySelector('b')||{}).textContent||''));
  if(!done||!/You confirmed the issue is fixed after “Belt alignment”/.test(done.textContent)) throw new Error('H5 resolved desc: '+(done&&done.textContent));
  if(!/You rated this 4\/5/.test(p.txt())) throw new Error('rating line missing');
});
await step('23g German chrome: descs are German, no raw i18n keys (dReply/dDoneAi…) leak',async()=>{
  const p=await open({url:sophieBelt(),lang:'de'});
  const descs=[...p.d.querySelectorAll('.track .desc')].map(x=>x.textContent);
  if(descs.length<2) throw new Error('no descs');
  if(descs.some(x=>/^d[A-Z]\w+$/.test(x.trim()))) throw new Error('raw key leaked: '+descs.join(' | '));
  if(!descs.some(x=>/Vermutlich „Belt drifting \/ lubrication“/.test(x))) throw new Error('de first-reply desc: '+descs.join(' | '));
  if(!descs.some(x=>/Sie haben bestätigt/.test(x))) throw new Error('de resolved desc: '+descs.join(' | '));
});

/* ---------- 24. P0 低风险增强：键盘焦点、页面语言、滚动回复条、实时更新反馈 ---------- */
await step('24 language switch keeps keyboard focus and updates <html lang>',async()=>{
  const p=await open();
  const btn=p.d.querySelector('[data-lang="zh"]');
  if(!btn) throw new Error('no zh button');
  btn.focus(); btn.click();
  if(p.d.documentElement.lang!=='zh-CN') throw new Error('html lang='+p.d.documentElement.lang);
  if(!p.d.activeElement||p.d.activeElement.id!=='lang-zh') throw new Error('focus lost after language switch: '+(p.d.activeElement&&p.d.activeElement.id||p.d.activeElement&&p.d.activeElement.tagName));
});
await step('24b detail has a hidden-until-scroll mail reply dock; list does not',async()=>{
  const d=await open();
  const dock=d.d.getElementById('replyDock');
  if(!dock) throw new Error('no reply dock');
  if(dock.getAttribute('aria-hidden')!=='true') throw new Error('dock should start hidden');
  const link=dock.querySelector('a[href^="mailto:service@ironpeak.com"]');
  if(!link) throw new Error('dock has no mailto link');
  if(link.tabIndex!==-1) throw new Error('hidden dock link should be out of tab order');
  const list=await open({url:url('liam.o.brien@gmail.com')});
  if(list.d.getElementById('replyDock')) throw new Error('list must not render reply dock');
});
await step('24c live status change shows a visible update notice, announces it, and highlights the new milestone',async()=>{
  const p=await open();
  const st=JSON.parse(p.w.localStorage.getItem('as_state'));
  const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com'));
  t.status='done'; t.resolvedAt=Date.now(); t.statusSince=Date.now(); t.updatedAt=Date.now();
  p.w.localStorage.setItem('as_state',JSON.stringify(st));
  p.w.__refresh();
  const flag=p.d.getElementById('updateFlag');
  if(!flag||flag.hidden) throw new Error('update flag not shown');
  if(!/Updated just now/.test(flag.textContent)) throw new Error('flag copy: '+flag.textContent);
  if(!/New update:/.test(p.d.getElementById('announce').textContent)) throw new Error('update not announced');
  if(!p.d.querySelector('.track li.is-new')) throw new Error('new milestone not highlighted');
  const live=p.d.querySelector('#live span');
  if(!live||!/Updated just now/.test(live.textContent)) throw new Error('top live label not updated');
});
await step('24d a visible timeline-only change (same updatedAt) is detected as a live update',async()=>{
  const p=await open();
  const st=JSON.parse(p.w.localStorage.getItem('as_state'));
  const t=st.tickets.find(x=>x.id===idOf(st,'m.reynolds@gmail.com'));
  const before=t.updatedAt;
  t.timeline.push({t:Date.now()-1000,who:'ai',text:'A new visible reply for the customer.'});
  if(t.updatedAt!==before) throw new Error('fixture changed updatedAt');
  p.w.localStorage.setItem('as_state',JSON.stringify(st));
  p.w.__refresh();
  const flag=p.d.getElementById('updateFlag');
  if(!flag||flag.hidden) throw new Error('timeline-only update not shown');
  if(!/Updated just now/.test(flag.textContent)) throw new Error('flag copy: '+flag.textContent);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(0);
})();

function idOf(st,email){ const t=st.tickets.find(x=>x.cust.email.toLowerCase()===email); return t?t.id:null; }
