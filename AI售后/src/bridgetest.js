// 端到端桥接：H5 建单 → 后台导入 → H5 继续对话 / 留邮箱 / 评分 → 后台增量合并（修复 #44）
const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=require('path');
const h5=fs.readFileSync(path.join(__dirname,'..','原型_H5扫码端.html'),'utf8'); const admin=fs.readFileSync(path.join(__dirname,'..','原型_品牌方后台.html'),'utf8');
const vc=new VirtualConsole(); const ok=(n,c)=>console.log((c?'ok  ':'FAIL'),n); const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const d1=new JSDOM(h5,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900',pretendToBeVisual:true,virtualConsole:vc}); const w=d1.window; w.URL.createObjectURL=()=>'blob:x';
  w.pickLang('en','EN','en'); w.go(2); w.showSnEntry(); w.document.getElementById('snInput').value='SM9-24B-00955'; w.checkSn(); w.startChat();
  const atOpen=JSON.parse(w.localStorage.getItem('as_h5_inbox'))[0]; ok('ticket exists in inbox before the first customer message ('+atOpen.id+')',!!atOpen&&atOpen.id&&atOpen.transcript.length===1&&atOpen.transcript[0].who==='ai');
  w.document.getElementById('ta').value='Missing 2 bolts from bag C at step 7'; w.sendMsg();
  await wait(1500);
  const rec0=JSON.parse(w.localStorage.getItem('as_h5_inbox'))[0]; console.log('H5 ticket:',rec0.id,rec0.status,rec0.kbId,'transcript',rec0.transcript.length,'email',rec0.email);
  // 后台在此时打开并导入（演示时后台通常一直开着）
  const d2=new JSDOM(admin,{runScripts:'dangerously',url:'http://localhost/admin.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(win){ win.localStorage.setItem('as_h5_inbox',JSON.stringify([rec0])); win.URL.createObjectURL=()=>'blob:x'; }});
  const a=d2.window; const S=a.eval('state'); let t=S.tickets.find(x=>x.id===rec0.id);
  ok('admin imported ticket '+(t&&[t.status,t.kbId,t.product,t.sn,t.order,t.dealer,t.channel,t.cust.email].join(' | ')),!!t&&t.order==='PO-24118'&&t.cust.email.includes('anonymous'));
  const inv0=S.inventory.find(i=>i.part==='M10x60-PK').qty;
  // H5 继续：点"寄零件给我" → 留邮箱 → 评分 → "That fixed it"
  ok('H5 reply template promised shipping → ship recorded without a button ('+rec0.ship+')',rec0.ship==='M10x60-PK');
  w.go(5); w.document.getElementById('email').value='carla@gmail.com'; w.saveEmail(); w.rate(5);
  w.go(4); w.document.getElementById('ta').value='Perfect, that fixed it'; w.sendMsg(); await wait(1300);
  const rec1=JSON.parse(w.localStorage.getItem('as_h5_inbox'))[0]; console.log('H5 after wrap-up:',rec1.status,'email',rec1.email,'rating',rec1.rating,'ship',rec1.ship,'transcript',rec1.transcript.length);
  // 后台再次轮询收件箱 → 增量合并
  a.localStorage.setItem('as_h5_inbox',JSON.stringify([rec1])); const n=a.importInbox(); t=S.tickets.find(x=>x.id===rec0.id);
  ok('incremental import returned 1 update ('+n+')',n===1);
  ok('email + name merged: '+t.cust.email+' / '+t.cust.name,t.cust.email==='carla@gmail.com'&&t.cust.name==='Carla');
  ok('rating merged: '+t.rating,t.rating===5);
  ok('status done by ai: '+t.status+'/'+t.resolvedBy,t.status==='done'&&t.resolvedBy==='ai');
  ok('ship deducted inventory once (seed 23 → '+S.inventory.find(i=>i.part==='M10x60-PK').qty+'), shipped flag set',S.inventory.find(i=>i.part==='M10x60-PK').qty===22&&t.shipped);
  ok('new transcript lines appended ('+t.timeline.filter(e=>e.who==='cust').length+' cust lines)',t.timeline.some(e=>e.text==='Perfect, that fixed it'));
  ok('second poll is idempotent',a.importInbox()===0);
  a.go('tickets'); const row=[...a.document.querySelectorAll('#ttable tr.trow')].find(r=>r.textContent.includes(rec0.id)); ok('visible in ticket list with real name',!!row&&/Carla/.test(row.textContent));
  // 第二条：小件承诺关闭时，螺栓包也要等品牌方确认（H5 读后台设置）
  const st=JSON.parse(a.localStorage.getItem('as_state')); st.policy=st.policy||{values:{},log:[]}; st.policy.values.shipping={smallParts:false};
  const d3=new JSDOM(h5,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900',pretendToBeVisual:true,virtualConsole:vc,beforeParse(win){ win.localStorage.setItem('as_state',JSON.stringify(st)); win.URL.createObjectURL=()=>'blob:x'; }}); const w3=d3.window;
  w3.pickLang('en','EN','en'); w3.go(2); w3.showSnEntry(); w3.document.getElementById('snInput').value='SM9-24B-00956'; w3.checkSn(); w3.startChat(); w3.document.getElementById('ta').value='Missing bolts from bag C at step 7'; w3.sendMsg(); await wait(1500);
  const rec3=JSON.parse(w3.localStorage.getItem('as_h5_inbox')).at(-1); ok('smallParts off: H5 records pendingShip, not ship ('+rec3.pendingShip+'/'+rec3.ship+')',rec3.pendingShip==='M10x60-PK'&&!rec3.ship);
  const a3=rec3.transcript.filter(m=>m.who==='ai').at(-1).text; ok('customer told "a colleague will confirm", not "we will ship"',/colleague will confirm/.test(a3)&&!/We'll ship/.test(a3));
  a.localStorage.setItem('as_h5_inbox',JSON.stringify([rec1,rec3])); a.importInbox(); const t3=S.tickets.find(x=>x.id===rec3.id);
  ok('admin: pending created for brand confirmation',!!t3&&!!t3.pending&&t3.pending.part==='M10x60-PK'&&t3.pending.from==='NordicGym AB');
  ok('appears in 需要你的决定',a.decisions().some(d=>d.id===t3.id&&/等你确认补发/.test(d.title)));
  const q0=S.inventory.find(i=>i.part==='M10x60-PK').qty; a.openTicket(t3.id); a.confirmShip(t3.id);
  ok('brand confirms → inventory '+q0+' → '+S.inventory.find(i=>i.part==='M10x60-PK').qty+', customer notified',S.inventory.find(i=>i.part==='M10x60-PK').qty===q0-1&&!t3.pending&&/ship it from NordicGym/.test(t3.timeline.at(-1).text));
  // 第三条：E07 首次回复只给排查步骤，不产生寄件；"还是不行"转人工后，品牌方回复里写了控制板零件号 → 按同一口径扣库存
  const r=a.runPipeline({from:'e07@gmail.com',subject:'E07',body:'My TR-650 stops after 10 minutes with error E07. Serial TR6-24A-00450. Photo attached.',photos:1}); const te=r.ticket;
  ok('E07 first reply: direct reply, no ship / no pending (part only after troubleshooting)',te.status==='ai'&&!te.pending&&!te.shipped);
  a.runPipeline({from:'e07@gmail.com',subject:'Re: E07',body:'Still E07 after lubricating and 30 min unplugged.'}); ok('"still E07" → human',te.status==='human');
  const pcb0=S.inventory.find(i=>i.part==='PCB-TR6-04').qty; a.openTicket(te.id); a.document.getElementById('replyBox').value='We will replace the control board PCB-TR6-04 under warranty, shipping from FitHaus in 2-4 days.'; a.sendReply(te.id);
  ok('brand reply mentioning PCB-TR6-04 deducts inventory '+pcb0+' → '+S.inventory.find(i=>i.part==='PCB-TR6-04').qty,S.inventory.find(i=>i.part==='PCB-TR6-04').qty===pcb0-1&&te.shipped);
  process.exit(0);
})();
