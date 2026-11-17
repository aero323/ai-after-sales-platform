const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','原型_品牌方后台.html'),'utf8');
const errs=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/a.html',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document; const E=c=>w.eval(c);
w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
const ok=(n,c)=>console.log((c?'ok  ':'FAIL'),n);
// 1. 引擎：产品/订单/序列号
ok('F-C20 in products', E("Engine.PRODUCTS.some(p=>p.id==='F-C20')"));
ok('PO-25087 order', E("Engine.ORDERS.some(o=>o.id==='PO-25087')"));
const ps=E("JSON.stringify(Engine.parseSerial('SN 20251042535'))"); const p=JSON.parse(ps);
ok('12-digit serial parsed raw', p.sn==='20251042535'&&p.raw===true);
ok('normal serial unaffected', JSON.parse(E("JSON.stringify(Engine.parseSerial('SM9-24B-00931'))")).order==='PO-24118');
// 2. 知识条目匹配与修复优先
const a=JSON.parse(E(`JSON.stringify((()=>{const a=Engine.assess({text:'part sticking glue again solvent',product:'F-C20',serial:{valid:true},photos:1,email:'x@force.co.au',settings:state.settings});return {kb:a.match&&a.match.entry.id,route:a.route,ship:a.canShip};})())`));
ok('glue KB matched', a.kb==='glue');
ok('no ship promise on first reply', a.ship===false);
// 3. 种子工单
const t=JSON.parse(E("JSON.stringify((()=>{const t=tByTag('fwt61');return {id:t.id,issues:t.issues.length,ship:t.shipments.length,capa:t.capa&&t.capa.status,tl:t.timeline.length,sn:t.sn,order:t.order,status:t.status};})())"));
ok('ticket seeded '+t.id, !!t.id);
ok('3 sub-issues', t.issues===3);
ok('1 shipment with tracking', t.ship===1 && JSON.parse(E("JSON.stringify(tByTag('fwt61').shipments[0].tracking)"))==='879545895350');
ok('CAPA open', t.capa==='open');
ok('timeline ~19 entries', t.tl>=16);
ok('raw sn kept, order linked', t.sn==='20251042535'&&t.order==='PO-25087');
// 4. 渲染
w.go('tickets'); const row=[...d.querySelectorAll('.trow')].find(r=>r.textContent.includes(t.id));
ok('ticket listed', !!row);
w.openTicket(t.id); const dr=d.getElementById('drawer').textContent;
ok('drawer shows 子问题', /子问题/.test(dr)&&/胶水型号/.test(dr));
ok('drawer shows 运单', /879545895350/.test(dr));
ok('drawer shows CAPA', /CAPA/.test(dr)&&/山东宝力龙|Andy/.test(dr));
// 5. 待办提醒
w.closeAll(); const dec=JSON.parse(E("JSON.stringify(decisions().filter(x=>x.id==='"+t.id+"').map(x=>x.title))"));
ok('decisions include CAPA reminder', dec.some(x=>/质量事件/.test(x)));
// 6. 核销交互：勾掉未完成的核销项
E(`issueDone('${t.id}',0,0)`);
ok('checklist toggle persists', E(`tById('${t.id}').issues[0].checklist[0].done`)===true);
// 7. 修复优先状态机：模拟一条新胶水客诉走流水线
E(`state.tickets=state.tickets.filter(x=>x.tag!=='vtest')`);
const r=JSON.parse(E(`JSON.stringify((()=>{const r=runPipeline({from:'new@cust.de',name:'Test User',subject:'part sticking',body:'F-C20 bracket is sticking, looks like the glue again. Serial 20251042535'});return {status:r.ticket.status,due:!!r.ticket.guideDue,steps:r.steps.map(s=>s.k)};})())`));
ok('repair-first → guiding', r.status==='guiding');
ok('guide due set', r.due===true);
ok('guide step logged', r.steps.includes('guide'));
ok('no jsdom errors', errs.length===0);
process.exit(0);
