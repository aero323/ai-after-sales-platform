/* 英文覆盖率检查：在 en 模式下逐页/逐弹层检查，
   排除有意保留中文的区域：语言切换、说明书中文原稿(data-noi18n)、可编辑单元格、术语表 zh 列等 */
const fs=require('fs');
const J=require('jsdom');
const html=fs.readFileSync(require('path').join(__dirname,'..','原型_品牌方后台.html'),'utf8');
const vc=new J.VirtualConsole();
const dom=new J.JSDOM(html,{runScripts:'dangerously',url:'http://localhost/admin.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(win){ win.localStorage.setItem('as_lang','en'); }});
const w=dom.window,d=w.document;
const CJK=/[一-鿿]/;
const out=new Set();
function excl(n){ const p=n.parentElement; if(!p) return true;
  if(p.closest('#langSw,[data-noi18n],[contenteditable="true"]')) return true;
  if(p.tagName==='SCRIPT'||p.tagName==='STYLE'||p.tagName==='TEXTAREA') return true;
  if(p.closest('.term-zh')) return true;
  if(p.tagName==='OPTION'){ const sel=p.closest('select'); if(sel&&sel.id==='roleSel') return false; }
  return false; }
function sweep(label){
  try{ w.eval('I18N.apply(document.body)'); }catch(e){}
  const vis=[d.querySelector('#main'),d.querySelector('.side'),d.querySelector('.top'),d.querySelector('#nav')];
  if(d.querySelector('#drawer').classList.contains('show')) vis.push(d.querySelector('#drawer'));
  if(d.querySelector('#modal').classList.contains('show')) vis.push(d.querySelector('#modal'));
  for(const root of vis){
    if(!root) continue;
    const tw=d.createTreeWalker(root,w.NodeFilter.SHOW_TEXT); let n;
    while(n=tw.nextNode()){ if(n.nodeValue&&CJK.test(n.nodeValue)&&!excl(n)) out.add(label+' | '+n.nodeValue.trim().replace(/\s+/g,' ').slice(0,150)); }
    for(const el of root.querySelectorAll('[title],[placeholder],[aria-label]')){
      if(el.closest('#langSw,[data-noi18n]')) continue;
      for(const a of ['title','placeholder','aria-label']){ const v=el.getAttribute(a); if(v&&CJK.test(v)) out.add(label+' @'+a+' | '+v.slice(0,120)); }
    }
  }
}
const pages=['agent','tickets','products','kb','manuals','qr','orders','analytics','parts','settings'];
setTimeout(()=>{
  for(const role of ['brand','factory','dealer']){
    w.eval(`setRole('${role}')`);
    for(const p of pages){ w.eval(`go('${p}')`); w.eval('closeAll()'); sweep(role+':'+p); }
    // 二级视图
    try{ w.eval("go('tickets');openTicket(state.tickets.find(t=>t.tag==='fwt61').id)"); sweep(role+':fwt61'); w.eval('closeAll()');
         w.eval("openTicket(state.tickets.find(t=>t.status==='human').id)"); sweep(role+':human'); w.eval('closeAll()');
         w.eval("openTicket(state.tickets.find(t=>!t.sn).id)"); sweep(role+':nosn'); w.eval('closeAll()');
         w.eval("openNewTicket()"); sweep(role+':newticket'); w.eval('closeAll()');
         w.eval("openSimEmail()"); sweep(role+':simemail'); w.eval('closeAll()');
    }catch(e){ out.add('ERR tickets '+e.message); }
    try{ w.eval("go('products');batchOpen='SM-900';render()"); sweep(role+':batch');
         w.eval("openNewProduct()"); sweep(role+':newproduct'); w.eval('closeAll()'); w.eval('batchOpen=null');
    }catch(e){ out.add('ERR products '+e.message); }
    try{ w.eval("go('kb');for(const t of ['files','entries','terms','gaps']){kbTab=t;render();sweepX()}")
    }catch(e){}
    for(const tb of ['files','entries','terms','gaps']){ try{ w.eval(`go('kb');kbTab='${tb}';render()`); sweep(role+':kb:'+tb); }catch(e){} }
    try{ const mid=w.eval("(state.manuals.find(m=>m.id==='M-0041')||state.manuals[0]).id");
      w.eval(`go('manuals');openManual('${mid}')`); sweep(role+':review');
      for(const tb of ['deliverables','audit','content']){ w.eval(`setManualTab('${tb}')`); sweep(role+':review:'+tb); }
      for(const mode of ['diff','output','side']){ w.eval(`setReviewMode('${mode}')`); sweep(role+':review:'+mode); }
      w.eval('backToManualList()'); w.eval("manualView='new';render()"); sweep(role+':wizard');
      w.eval("wiz.step=2;render()"); sweep(role+':wizard2'); w.eval("wiz.step=3;render()"); sweep(role+':wizard3');
      w.eval("manualView='list';render()");
    }catch(e){ out.add('ERR manuals '+e.message); }
    try{ w.eval("go('orders');orderTab='partners';render()"); sweep(role+':partners');
      w.eval("orderTab='orders';orderSel=state.orders[0].id;render()"); sweep(role+':orderDetail');
      w.eval("openInvite(state.orders[0].id)"); sweep(role+':invite'); w.eval('closeAll()');
      w.eval("openInvite(null,'青岛迈动器械')"); sweep(role+':invite-org'); w.eval('closeAll()');
      w.eval("openNewOrder()"); sweep(role+':neworder'); w.eval('closeAll()');
      w.eval("openNewPartner()"); sweep(role+':newpartner'); w.eval('closeAll()');
      w.eval("orderSel=null");
    }catch(e){ out.add('ERR orders '+e.message); }
    for(const tb of ['mail','route','ai','lang','team']){ try{ w.eval(`go('settings');setTab='${tb}';render()`); sweep(role+':settings:'+tb); }catch(e){} }
    try{ w.eval("go('qr');qrFocus='SM-900';render()"); sweep(role+':qrfocus'); w.eval("qrFocus=null"); }catch(e){}
  }
  if(out.size){ for(const x of out) console.log(x); console.log('residual',out.size); process.exit(1); } console.log('residual 0'); process.exit(0);
  console.log('unique residual',out.size);
  process.exit(0);
},400);
