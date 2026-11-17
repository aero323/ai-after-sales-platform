/* ================= 知识图谱（知识库管理页顶部面板） =================
   数据全部来自 state.kbFiles / Engine.KB / state.terms / state.inventory / 近 90 天工单。
   力导向模拟自写，不依赖第三方库。PAGES.kb 渲染后调用 KG.mount()；每次 render 重建 canvas，
   模拟位置存在模块内 kgPrev 里，所以重新渲染不会跳变。
   KG._sel / KG._nodes / KG._setSel 供测试与调试，页面逻辑不依赖。 */
const KG=(()=>{
  let sel='all';
  const TAU=Math.PI*2;
  const reduce=()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } };
  const PAL={
    product:{line:'#4FE3CE',halo:'#2DD4BF',core:'#0F8F80'},
    entry:{line:'#7FF0DE',halo:'#2DD4BF',core:'#0E7A6C'},
    part:{line:'#C6B8FF',halo:'#9C8CFF',core:'#5A4FCF'},
    term:{line:'#CBD6DC',halo:'#9FB3BC',core:'#8FA3AC'},
    gap:{line:'#F5B14C',halo:'#F5B14C',core:'#070D12'},
    file:{说明书:'#7CC5FF',零件结构:'#A79BFF','3D 模型':'#5EE0DA',历史客诉:'#F0B26B',故障代码:'#FF8F8F',安装指导:'#9BE29B',术语表:'#C9D3D9',其他资料:'#8C9AA0'}
  };
  const SHORT={说明书:'说明书',零件结构:'爆炸图','3D 模型':'3D 模型',历史客诉:'历史客诉',故障代码:'故障码表',安装指导:'安装视频',术语表:'术语表',其他资料:'资料'};
  const SKIN={product:{r:13,charge:6},entry:{r:8.5,charge:3.4},part:{r:6,charge:1.6},term:{r:4,charge:.8},file:{r:6.5,charge:2.4},gap:{r:5.5,charge:1.3},hub:{r:11,charge:4.5}};
  const FONT='-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
  const now90=()=>Date.now()-90*DAY;
  const clamp=(v,a,b)=>v<a?a:v>b?b:v;
  const randOf=id=>{ let h=2166136261; id=String(id); for(let i=0;i<id.length;i++){ h^=id.charCodeAt(i); h=Math.imul(h,16777619); } h^=h>>>13; return ((h>>>0)%1000)/1000; };
  const rgba=(hex,a)=>{ const h=hex.replace('#',''); return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${clamp(a,0,1).toFixed(3)})`; };

  /* ---------- 选择器：图谱、左侧产品线与下方列表共用 ---------- */
  const curId=()=>sel!=='all'&&state.products.some(p=>p.id===sel)?sel:'all';
  const viewFiles=()=>{ const id=curId(); return id==='all'?state.kbFiles:state.kbFiles.filter(k=>k.p===id); };
  const viewEntries=()=>{ const id=curId(); return id==='all'?Engine.KB:Engine.KB.filter(k=>k.product===id); };
  const entrySrcs=k=>state.kbFiles.filter(f=>(f.p===k.product||f.p==='全部')&&f.st==='已入库');
  const partStock=part=>{ const i=state.inventory.find(x=>x.part===part); return i?i.qty:null; };

  function gapsFor(p){
    const since=now90(), g=[];
    const files=state.kbFiles.filter(k=>k.p===p.id&&k.st==='已入库');
    const entries=Engine.KB.filter(k=>k.product===p.id);
    const tickets=state.tickets.filter(t=>t.product===p.id&&t.createdAt>since).length;
    if(!files.length) g.push({key:p.id+':files',title:`${p.id} 没有任何入库资料`,detail:`近 90 天 ${tickets} 条客诉，AI 只能靠通用条目回答，也无法生成说明书`,act:'upload'});
    else if(!entries.length) g.push({key:p.id+':entries',title:`${p.id} 有资料但没有知识条目`,detail:`${files.length} 份资料已入库，AI 尚未归纳出可直接回答的条目`,act:'tab',tab:'entries'});
    if(!p.has3d&&p.manualLangs.length) g.push({key:p.id+':3d',title:`${p.id} 没有 3D 模型`,detail:'说明书可以生成，但没有安装动画',act:'upload'});
    if(!p.maxUserWeight) g.push({key:p.id+':weight',title:`${p.id} 缺最大用户体重`,detail:'欧盟 / 北美说明书合规检查会不通过',act:'products'});
    return g;
  }
  function gapsAll(){ const g=[]; for(const p of state.products) g.push(...gapsFor(p)); return g; }

  /* ---------- 左侧产品线 ---------- */
  function railHtml(){
    const cur=curId();
    const row=(id,main,sub,warn)=>`<button class="kg-p ${cur===id?'on':''}" data-p="${esc(id)}" onclick="KG.setSel('${esc(id)}')"><span class="kg-pn">${main}</span>${warn?'<span class="kg-pg"></span>':'<span></span>'}<span class="kg-ps">${sub}</span></button>`;
    const rows=state.products.map(p=>{
      const nf=state.kbFiles.filter(k=>k.p===p.id).length, ne=Engine.KB.filter(k=>k.product===p.id).length;
      return row(p.id,`${esc(p.series)} <span style="color:#5F7378">${p.id}</span>`,`资料 ${nf} · 条目 ${ne}`,gapsFor(p).length>0);
    }).join('');
    return `<div class="kg-rail"><div class="kg-rail-h">产品线</div><div class="kg-list">
      ${row('all','全部产品线',`证据 ${state.kbFiles.length} 份 · 条目 ${Engine.KB.length} 条`,false)}${rows}
    </div></div>`;
  }
  function panel(){
    const cur=curId(), open=gapsAll().length;
    const missing=TERM_LANGS.filter(l=>state.terms.some(t=>!t[l]));
    let title,line;
    if(cur==='all'){
      title='全部产品线';
      const pend=state.kbFiles.filter(k=>k.st!=='已入库').length;
      const covered=new Set(Engine.KB.filter(k=>k.product!=='*').map(k=>k.product)).size;
      line=`<b>${state.kbFiles.length}</b> 份资料${pend?`（<b class="w">${pend}</b> 份待处理）`:''} · <b>${Engine.KB.length}</b> 条知识条目，覆盖 <b>${covered}</b> 个型号 + 通用 · 术语 <b>${state.terms.length}</b> 条${missing.length?` · <span class="w">缺 ${missing.map(l=>Engine.LANG_NAME[l]||l).join(' / ')} 列</span>`:''}${open?` · <span class="w">${open} 个缺口</span>`:''}`;
    } else {
      const p=state.products.find(x=>x.id===cur);
      const hits=state.tickets.filter(t=>t.product===cur&&t.createdAt>now90()).length, g=gapsFor(p).length;
      title=`${esc(p.series)} ${p.id}`;
      line=`资料 <b>${state.kbFiles.filter(k=>k.p===cur).length}</b> · 条目 <b>${Engine.KB.filter(k=>k.product===cur).length}</b> · 近 90 天客诉 <b>${hits}</b>${g?` · <span class="w">缺口 ${g}</span>`:''}`;
    }
    return `<div class="kg">
      <input type="file" id="kg_up" multiple hidden>
      ${railHtml()}
      <div class="kg-stage" id="kg_stage">
        <canvas id="kg_cv"></canvas>
        <div class="kg-hud kg-tl"><div class="kg-title">${title}</div><div class="kg-stat">${line}</div></div>
        <div class="kg-hud kg-tr">拖动节点或画布 · 单击跳转 · ⌘/Ctrl+滚轮缩放</div>
        <div class="kg-hud kg-bl"><div class="kg-legend">
          <span><i style="background:#2DD4BF;box-shadow:0 0 6px #2DD4BF"></i>产品</span>
          <span><i style="background:#7FF0DE"></i>知识条目</span>
          <span><i class="ring"></i>安全件</span>
          ${['说明书','零件结构','3D 模型','历史客诉','故障代码','安装指导'].map(k=>`<span><i style="background:${PAL.file[k]}"></i>${SHORT[k]}</span>`).join('')}
          <span><i class="dia"></i>零件</span><span><i class="sm"></i>术语</span><span><i class="hole"></i>缺口</span>
        </div></div>
        <div class="kg-hud kg-br"><button title="放大" onclick="KG.zoom(1.25)">+</button><button title="缩小" onclick="KG.zoom(0.8)">−</button><button title="复位视角" onclick="KG.resetView()">复位</button></div>
        <div class="kg-tip" id="kg_tip"></div>
      </div>
    </div>`;
  }

  /* ---------- 节点提示 ---------- */
  function nodeTip(n){
    if(n.type==='hub') return '<b>通用知识</b><div class="m">与所有产品线共用的条目、资料和术语</div>';
    if(n.type==='product'){
      const p=n.p, hits=state.tickets.filter(t=>t.product===p.id).length, g=gapsFor(p);
      return `<b>${esc(p.series)} ${p.id}</b><div class="m">${esc(p.seriesEn||'')} · SKU ${esc(p.sku)}</div>资料 ${state.kbFiles.filter(k=>k.p===p.id).length} · 条目 ${Engine.KB.filter(k=>k.product===p.id).length} · 累计客诉 ${hits}${g.length?`<div class="w">缺口：${g.map(x=>esc(x.title.replace(p.id+' ',''))).join('、')}</div>`:''}<div class="go">单击${curId()===p.id?'返回全部产品线':'聚焦这条产品线'}</div>`;
    }
    if(n.type==='entry'){
      const k=n.k;
      return `<b>${esc(k.cat.zh)}</b><div class="m">${esc(k.cat.en)} · ${k.product==='*'?'通用':k.product}</div>近 90 天命中 ${n.hits} 次 · 来源资料 ${entrySrcs(k).length} 份${k.safety?'<div class="w">安全件 · 先给人看</div>':''}<div class="go">单击查看条目</div>`;
    }
    if(n.type==='part'){
      const s=partStock(n.part);
      return `<b>${esc(n.partName)}</b><div class="m">零件号 ${esc(n.part)}</div>${n.safety?'<div class="w">安全件 · 需人工确认</div>':'AI 可承诺补发'}${s===null?'':` · <span class="m">在库 ${s}</span>`}`;
    }
    if(n.type==='term'){
      const miss=TERM_LANGS.filter(l=>!n.t[l]);
      return `<b>${esc(n.t.zh)}</b><div class="m">${TERM_LANGS.map(l=>esc(n.t[l]||'—')).join(' · ')}</div>${miss.length?`<div class="w">缺 ${miss.map(l=>Engine.LANG_NAME[l]||l).join(' / ')} 译法</div>`:''}${n.hits&&n.hits.length?`<div class="m">出现在 ${n.hits.map(k=>esc(k.cat.zh)).slice(0,3).join('、')}</div>`:''}<div class="go">单击查看术语表</div>`;
    }
    if(n.type==='file'){
      const f=n.file;
      return `<b>${esc(f.n)}</b><div class="m">${esc(f.t)}${f.size?' · '+esc(f.size):''}</div>关联 ${f.p} · ${esc(f.src)} · ${fmt(f.at)}<div class="m">${f.st==='解析中'?'正在解析，解析完会接上来源条目':f.st==='待确认'?'等待人工确认入库':'已入库'}</div><div class="go">单击查看资料</div>`;
    }
    if(n.type==='gap') return `<b class="w">缺口</b><b>${esc(n.gap.title)}</b><div class="m">${esc(n.gap.detail)}</div><div class="go">单击处理</div>`;
    return '';
  }

  /* ---------- 图数据 ---------- */
  const textOf=k=>[k.cat.zh,k.cat.en,...(k.steps&&k.steps.zh||[]),k.stepTitle&&k.stepTitle.zh||'',k.partName&&k.partName.zh||'',...Object.values(k.kw||{}).flat()].join(' ');
  const shortFile=f=>String(f.n||'').replace(/\.[^.]+$/,'').replace(/^\S*?\d{3,4}\s+/,'').slice(0,13)||SHORT[f.t]||'资料';
  const shortEntry=l=>{ const i=String(l).indexOf('（'); return i>4?String(l).slice(0,i):String(l); };

  function buildModel(id){
    const since=now90(), nodes=[], edges=[], nMap=new Map(), seen=new Set();
    const add=n=>{ if(nMap.has(n.id)) return; nMap.set(n.id,n); nodes.push(n); };
    const link=(a,b,kind,color)=>{ if(a===b||!nMap.has(a)||!nMap.has(b)) return; const key=[a<b?a:b,a<b?b:a,kind].join('|'); if(seen.has(key)) return; seen.add(key); edges.push({a,b,kind,color:color||null,ph:(seen.size*0.618)%1}); };
    const focusOf=k=>id==='all'||k==='*'||k===id;

    add({id:'hub',type:'hub',grp:'*',name:'hub',label:'通用',r:SKIN.hub.r});
    for(const p of state.products) add({id:'p-'+p.id,type:'product',p,grp:p.id,name:p.id,label:`${p.series} ${p.id}`,r:SKIN.product.r,focus:focusOf(p.id)});
    for(const k of Engine.KB){
      const hits=state.tickets.filter(t=>t.kbId===k.id&&t.createdAt>since).length;
      add({id:'e-'+k.id,type:'entry',k,hits,grp:k.product,name:'kbe_'+k.id,label:shortEntry(k.cat.zh),r:SKIN.entry.r+Math.min(6,Math.sqrt(hits)*1.25),focus:focusOf(k.product)});
      link('e-'+k.id,k.product==='*'?'hub':'p-'+k.product,'own');
    }
    for(const f of state.kbFiles){
      const g=(f.p==='全部')?'*':f.p;
      add({id:'f-'+f.id,type:'file',file:f,grp:g,name:'f-'+SHORT[f.t],label:shortFile(f),r:SKIN.file.r,focus:focusOf(g)});
      link('f-'+f.id,g==='*'?'hub':'p-'+g,'own');
    }
    // 聚焦单条产品线时才画「资料 → 条目」来源线（与「关键知识条目」页签里的来源规则一致），总览只画归属线
    if(id!=='all') for(const k of Engine.KB) if(k.product===id) for(const f of entrySrcs(k)) if(f.p!=='全部') link('f-'+f.id,'e-'+k.id,'src',PAL.file[f.t]||'#7CC5FF');
    for(const k of Engine.KB){
      if(!k.part) continue; const pid=String(k.part);
      if(!nMap.has('pt-'+pid)){
        add({id:'pt-'+pid,type:'part',part:pid,partName:k.partName.zh,safety:!!k.safety,grp:k.product,name:'pt-'+pid,label:k.partName.zh,r:SKIN.part.r,focus:focusOf(k.product)});
        for(const f of state.kbFiles) if(f.st==='已入库'&&f.p===k.product&&f.t==='零件结构') link('f-'+f.id,'pt-'+pid,'ref');
      }
      link('e-'+k.id,'pt-'+pid,'own');
    }
    for(const t of state.terms){
      if(!t.zh) continue;
      const hits=Engine.KB.filter(k=>textOf(k).includes(t.zh));
      add({id:'t-'+t.zh,type:'term',t,hits,grp:hits.length?(hits[0].product||'*'):'k',name:'term-'+t.zh,label:t.zh,r:SKIN.term.r,focus:id==='all'||hits.some(k=>focusOf(k.product))});
      if(hits.length) for(const k of hits) link('t-'+t.zh,'e-'+k.id,'ref');
      else { const gf=state.kbFiles.find(f=>f.p==='全部'&&f.t==='术语表'); if(gf) link('t-'+t.zh,'f-'+gf.id,'ref'); }
    }
    for(const g of gapsAll()){
      const pid=g.key.split(':')[0];
      add({id:'g-'+g.key,type:'gap',gap:g,grp:pid,name:'gap-'+g.key,label:g.title.replace(/^[A-Z]{2}-?\d+\s+/,''),r:SKIN.gap.r,focus:focusOf(pid)});
      link('g-'+g.key,'p-'+pid,'gap');
    }
    return {nodes,edges};
  }

  /* ---------- 布局：产品落位；子节点相对父节点按类型分方向 ---------- */
  function anchorsFor(id,W,H){
    const m=new Map(), prods=state.products;
    if(id==='all'){
      m.set('hub',{x:0,y:0});
      const N=prods.length, rx=Math.min(W*0.36,340), ry=Math.min(H*0.3,135);
      prods.forEach((p,i)=>{ const a=-Math.PI/2+i*TAU/N; m.set('p-'+p.id,{x:Math.cos(a)*rx,y:Math.sin(a)*ry}); });
    } else {
      m.set('p-'+id,{x:W*0.05,y:H*0.04}); m.set('hub',{x:W*0.36,y:-H*0.3});
      const others=prods.filter(p=>p.id!==id);
      others.forEach((p,j)=>{ m.set('p-'+p.id,{x:-W*0.31,y:(j-(others.length-1)/2)*Math.min(62,H*0.14)}); });
    }
    return m;
  }
  const DIRS={file:[-.95,-.42],entry:[.95,-.1],part:[.55,.85],term:[.25,.62],gap:[.72,.62]};
  function restFrom(par,child){
    if(par.type==='product'){
      const d=DIRS[child.type]||DIRS.entry;
      const isGen=child.type==='entry'&&child.k.product==='*';
      const base=isGen?70:(curId()!=='all'&&par.p&&par.p.id===curId()?140:105);
      return {x:d[0]*base,y:d[1]*base};
    }
    const a=randOf(child.id)*TAU; return {x:Math.cos(a)*80,y:Math.sin(a)*80};
  }
  function parentOf(n){
    if(n.type==='entry') return n.k.product==='*'?'hub':'p-'+n.k.product;
    if(n.type==='file') return n.file.p==='全部'?'hub':'p-'+n.file.p;
    if(n.type==='part'){ const k=Engine.KB.find(k=>k.part&&String(k.part)===n.part); return k?'e-'+k.id:null; }
    if(n.type==='gap') return 'p-'+n.gap.key.split(':')[0];
    if(n.type==='term'){ const k=n.hits&&n.hits[0]; if(k) return 'e-'+k.id; const gf=state.kbFiles.find(f=>f.p==='全部'&&f.t==='术语表'); return gf?'f-'+gf.id:null; }
    return null;
  }

  /* ---------- 模拟 ---------- */
  let kgPrev=null, kg=null, kgRo=null;
  function syncSim(id){
    const m=buildModel(id), old=kgPrev;
    const sim={nodes:[],edges:m.edges,nMap:new Map(),focus:id};
    for(const n of m.nodes){
      const o=old&&old.nMap.get(n.id);
      const nn=Object.assign({},n,{x:o?o.x:(randOf(n.id)-.5)*80,y:o?o.y:(randOf(n.id+'y')-.5)*80,vx:o?o.vx:0,vy:o?o.vy:0,drag:false,birth:o?1:0,alpha:o?o.alpha:0,scale:o?o.scale:.25});
      sim.nodes.push(nn); sim.nMap.set(nn.id,nn);
    }
    for(const e of sim.edges){ const o=old&&old.edges.find(x=>x.a===e.a&&x.b===e.b&&x.kind===e.kind); if(o){ e.ph=o.ph; e.lit=o.lit; } }
    // 新节点贴着父节点落位，避免第一帧从原点飞过来
    for(const n of sim.nodes){
      if(old&&old.nMap.has(n.id)) continue;
      const parId=parentOf(n), par=parId?sim.nMap.get(parId):null;
      if(par){ const r=restFrom(par,n); n.x=par.x+r.x*.3; n.y=par.y+r.y*.3; n.vx=r.x*.004; n.vy=r.y*.004; }
    }
    kgPrev=sim;
    return sim;
  }
  function refresh(){
    if(!kg||!kg.sim) return;
    const id=curId(), sim=kg.sim, anchors=anchorsFor(id,kg.W,kg.H);
    for(const n of sim.nodes){
      n.focus=id==='all'||n.grp==='*'||n.grp===id;
      n.sig=SKIN[n.type]||SKIN.entry;
      n.anchor=anchors.get(n.id)||null;
      const parId=parentOf(n), par=parId?sim.nMap.get(parId):null;
      n.rest=par?restFrom(par,n):null;
      n.tScale=n.focus?(id==='all'?.85:1):.36;
      n.tAlpha=n.focus?1:(id==='all'?.55:.26);
    }
    for(const e of sim.edges){ const A=sim.nMap.get(e.a),B=sim.nMap.get(e.b); if(!A||!B) continue; e.lit=Math.min(A.tAlpha,B.tAlpha)*.7+.3; }
  }
  function tick(){
    const sim=kg.sim, N=sim.nodes, W=kg.W, H=kg.H;
    for(let i=0;i<N.length;i++) for(let j=i+1;j<N.length;j++){
      const a=N[i],b=N[j];
      let dx=b.x-a.x, dy=b.y-a.y, d2=dx*dx+dy*dy;
      if(d2>250*250) continue;
      if(d2<1){ d2=1; dx=randOf(a.id+b.id)-.5; dy=randOf(b.id+a.id)-.5; }
      const d=Math.sqrt(d2), ux=dx/d, uy=dy/d;
      const s=(a.focus&&b.focus)?1:.3;
      const f=a.sig.charge*b.sig.charge*105*s/d2;
      a.vx-=ux*f; a.vy-=uy*f; b.vx+=ux*f; b.vy+=uy*f;
      const min=(a.r+b.r+9)*1.15;
      if(d<min){ const p=(min-d)*.05*s; a.vx-=ux*p; a.vy-=uy*p; b.vx+=ux*p; b.vy+=uy*p; }
    }
    for(const e of sim.edges){
      const a=sim.nMap.get(e.a), b=sim.nMap.get(e.b); if(!a||!b) continue;
      let par=a, ch=b;
      if(a.type!=='product'&&a.type!=='hub'){ par=b; ch=a; }
      const rest=restFrom(par,ch), len=Math.hypot(rest.x,rest.y)*(ch.focus?1:.72)+26;
      let dx=b.x-a.x, dy=b.y-a.y; const d=Math.hypot(dx,dy)||1;
      const strength=(e.kind==='own'?.9:e.kind==='gap'?.45:e.kind==='src'?.3:.18)*(ch.focus?1:.3);
      const f=(d-len)*.028*strength, ux=dx/d, uy=dy/d;
      a.vx+=ux*f; a.vy+=uy*f; b.vx-=ux*f; b.vy-=uy*f;
    }
    for(const n of N){
      if(n.drag){ n.vx*=.4; n.vy*=.4; continue; }
      if(n.anchor){ n.vx+=(n.anchor.x-n.x)*.06; n.vy+=(n.anchor.y-n.y)*.06; }
      else if(n.rest){ const par=sim.nMap.get(parentOf(n)); if(par){ const tx=par.x+n.rest.x*(n.focus?1:.7), ty=par.y+n.rest.y*(n.focus?1:.7); n.vx+=(tx-n.x)*.016; n.vy+=(ty-n.y)*.016; } }
      if(!n.focus){ const r=Math.hypot(n.x,n.y)||1; n.vx+=n.x/r*.06; n.vy+=n.y/r*.06; }
      n.vx*=.86; n.vy*=.86;
      n.vx=clamp(n.vx,-8,8); n.vy=clamp(n.vy,-8,8);
      n.x+=n.vx; n.y+=n.vy;
      n.scale=clamp(n.scale+(n.tScale-n.scale)*.08,.05,3); n.alpha=clamp(n.alpha+(n.tAlpha-n.alpha)*.1,0,1);
      if(n.birth<1) n.birth=Math.min(1,n.birth+.055);
    }
  }

  /* ---------- 相机与绘制 ---------- */
  function fitCam(){
    const sim=kg.sim;
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    for(const n of sim.nodes){ if(n.tAlpha<.8&&n.type!=='product') continue; const r=n.r*2.4+(n.tAlpha<.8?16:34);
      x0=Math.min(x0,n.x-r); y0=Math.min(y0,n.y-r); x1=Math.max(x1,n.x+r); y1=Math.max(y1,n.y+r); }
    if(x0>x1){ x0=y0=-200; x1=y1=200; }
    if(!isFinite(x0+x1+y0+y1)){ x0=y0=-200; x1=y1=200; }
    const z=clamp(Math.min((kg.W-70)/(x1-x0),(kg.H-118)/(y1-y0)),.3,1.35);
    kg.fit={x:-(x0+x1)/2*z,y:-(y0+y1)/2*z+6*z,z};
  }
  function setCam(){
    if(!userPan){ kg.cam.x+=(kg.fit.x-kg.cam.x)*.12; kg.cam.y+=(kg.fit.y-kg.cam.y)*.12; }
    kg.cam.z=clamp(kg.cam.z+(kg.fit.z*(kg.userZ||1)-kg.cam.z)*.1,.2,3);
  }
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function draw(){
    const cv=kg.cv, ctx=kg.ctx, W=kg.W, H=kg.H, dpr=kg.dpr, sim=kg.sim, HOV=kg.hov;
    const t=performance.now()/1000;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(!kg.bgGrad){ const g=ctx.createRadialGradient(W*.55,H*.42,20,W*.55,H*.42,Math.max(W,H)*.95);
      g.addColorStop(0,'#0E1E26'); g.addColorStop(.55,'#0A141A'); g.addColorStop(1,'#05090C'); kg.bgGrad=g; }
    ctx.fillStyle=kg.bgGrad; ctx.fillRect(0,0,W,H);
    if(!kg.stars){ kg.stars=[]; for(let i=0;i<80;i++) kg.stars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.2+.3,a:Math.random()*.45+.12,p:Math.random()*TAU}); }
    for(const s of kg.stars){
      ctx.fillStyle=`rgba(140,220,210,${(s.a*(.6+.4*Math.sin(t*1.3+s.p))).toFixed(3)})`;
      const px=(((s.x*W+kg.cam.x*.12)%W)+W)%W, py=(((s.y*H+kg.cam.y*.12)%H)+H)%H;
      ctx.beginPath(); ctx.arc(px,py,s.r,0,TAU); ctx.fill();
    }
    ctx.save();
    ctx.translate(W/2+kg.cam.x,H/2+kg.cam.y); ctx.scale(kg.cam.z,kg.cam.z);
    // 星团光
    for(const n of sim.nodes){
      if(n.type!=='product'&&n.type!=='hub') continue;
      const a=n.alpha*(n.type==='product'?(n.focus?.14:0):.1);
      if(a<=0) continue;
      const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,150);
      g.addColorStop(0,rgba('#2DD4BF',a)); g.addColorStop(1,rgba('#2DD4BF',0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(n.x,n.y,150,0,TAU); ctx.fill();
    }
    // 悬停邻居
    const litSet=new Set();
    if(HOV){ for(const e of sim.edges){ if(e.a===HOV) litSet.add(e.b); else if(e.b===HOV) litSet.add(e.a); } }
    // 边
    for(const e of sim.edges){
      const a=sim.nMap.get(e.a), b=sim.nMap.get(e.b); if(!a||!b) continue;
      const hot=HOV&&(e.a===HOV||e.b===HOV);
      const col=e.color||(e.kind==='gap'?'#F5B14C':e.kind==='src'?'#7CC5FF':'#7FC8BD');
      const base=(e.kind==='src'?.55:e.kind==='ref'?.3:e.kind==='gap'?.5:.5)*(e.lit||.4);
      const alpha=clamp(HOV?(hot?1:.08):base,0,1);
      if(alpha<.02) continue;
      ctx.strokeStyle=rgba(col,alpha); ctx.lineWidth=(e.kind==='src'?1.2:.9)/kg.cam.z;
      if(e.kind==='gap') ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      ctx.setLineDash([]);
      if(!reduce()&&alpha>.12&&(e.kind==='src'||e.kind==='gap'||(e.kind==='own'&&(a.type==='product'||b.type==='product')))){
        const u=(t*.3+e.ph)%1, px=a.x+(b.x-a.x)*u, py=a.y+(b.y-a.y)*u;
        ctx.fillStyle=rgba(col,Math.min(1,alpha*1.6)); ctx.beginPath(); ctx.arc(px,py,1.7/kg.cam.z,0,TAU); ctx.fill();
      }
    }
    // 光晕
    for(const n of sim.nodes){
      const r=Math.max(.3,n.r*n.scale*(n.birth<1?Math.max(.05,n.birth):1)*(HOV===n.id?1.3:1));
      if(r<.4) continue;
      const dim=HOV&&HOV!==n.id&&!litSet.has(n.id)?.3:1;
      const a=n.alpha*(n.type==='product'?.9:.65)*dim;
      const col=n.type==='file'?(PAL.file[n.file.t]||'#8FA3AC'):((PAL[n.type]||PAL.entry).halo);
      let glowA=a*.42, glowR=r*4.4;
      if(n.type==='gap'){ const pump=.55+.45*Math.sin(t*2.2+n.r); glowA*=.55*pump; glowR=r*5; }
      const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,glowR);
      g.addColorStop(0,rgba(col,glowA)); g.addColorStop(.45,rgba(col,glowA*.35)); g.addColorStop(1,rgba(col,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(n.x,n.y,glowR,0,TAU); ctx.fill();
    }
    // 本体
    for(const n of sim.nodes){
      const r=Math.max(.3,n.r*n.scale*(n.birth<1?Math.max(.05,n.birth):1));
      if(r<.4) continue;
      const dim=HOV&&HOV!==n.id&&!litSet.has(n.id)?.35:1;
      const a=clamp(n.alpha*dim,0,1);
      if(n.type==='product'){
        ctx.fillStyle=rgba('#0F2A2A',a); ctx.beginPath(); ctx.arc(n.x,n.y,r,0,TAU); ctx.fill();
        ctx.strokeStyle=rgba(PAL.product.line,a); ctx.lineWidth=2.2/kg.cam.z; ctx.stroke();
        ctx.fillStyle=rgba('#C8FFF4',a); ctx.beginPath(); ctx.arc(n.x,n.y,r*.36,0,TAU); ctx.fill();
        if(curId()===n.p.id){ ctx.strokeStyle=rgba('#FFFFFF',a*.7); ctx.lineWidth=1.1/kg.cam.z; ctx.beginPath(); ctx.arc(n.x,n.y,r+5+Math.sin(t*2)*1.5,0,TAU); ctx.stroke(); }
      } else if(n.type==='hub'){
        ctx.fillStyle=rgba('#0E2A28',a*.9); ctx.beginPath(); ctx.arc(n.x,n.y,Math.max(.4,r-1),0,TAU); ctx.fill();
        ctx.setLineDash([3,3]); ctx.strokeStyle=rgba('#9AD9CF',a*.8); ctx.lineWidth=1.3/kg.cam.z;
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle=rgba('#9AD9CF',a); ctx.beginPath(); ctx.arc(n.x,n.y,2.2,0,TAU); ctx.fill();
      } else if(n.type==='entry'){
        ctx.fillStyle=rgba(PAL.entry.core,a); ctx.beginPath(); ctx.arc(n.x,n.y,r,0,TAU); ctx.fill();
        ctx.strokeStyle=rgba(PAL.entry.line,a); ctx.lineWidth=1.3/kg.cam.z; ctx.stroke();
        if(n.k.safety){ ctx.strokeStyle=rgba('#F5B14C',a*.95); ctx.lineWidth=1.5/kg.cam.z; ctx.beginPath(); ctx.arc(n.x,n.y,r+3.5,0,TAU); ctx.stroke(); }
      } else if(n.type==='file'){
        const col=PAL.file[n.file.t]||'#8FA3AC';
        if(n.file.st==='解析中'){
          const k=(t*.8)%1; ctx.strokeStyle=rgba(col,a*(1-k)); ctx.lineWidth=1.2/kg.cam.z;
          ctx.beginPath(); ctx.arc(n.x,n.y,r*(1+k*1.6),0,TAU); ctx.stroke();
        }
        ctx.fillStyle=rgba('#08141A',a*.92); roundRect(ctx,n.x-r,n.y-r,r*2,r*2,Math.max(1.5,r*.45)); ctx.fill();
        ctx.strokeStyle=rgba(col,a); ctx.lineWidth=1.5/kg.cam.z;
        if(n.file.st==='待确认') ctx.setLineDash([2.5,2.5]);
        roundRect(ctx,n.x-r,n.y-r,r*2,r*2,Math.max(1.5,r*.45)); ctx.stroke(); ctx.setLineDash([]);
      } else if(n.type==='part'){
        ctx.fillStyle=rgba(PAL.part.core,a*.9);
        ctx.beginPath(); ctx.moveTo(n.x,n.y-r*1.15); ctx.lineTo(n.x+r*1.15,n.y); ctx.lineTo(n.x,n.y+r*1.15); ctx.lineTo(n.x-r*1.15,n.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle=rgba(PAL.part.line,a); ctx.lineWidth=1.2/kg.cam.z; ctx.stroke();
      } else if(n.type==='gap'){
        ctx.strokeStyle=rgba('#F5B14C',a); ctx.lineWidth=1.4/kg.cam.z; ctx.setLineDash([2.5,2.5]);
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle=rgba('#F5B14C',a); ctx.font=`700 ${r*1.1}px ${FONT}`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('!',n.x,n.y+r*.04);
      } else {
        ctx.fillStyle=rgba(PAL.term.line,a*.85); ctx.beginPath(); ctx.arc(n.x,n.y,r,0,TAU); ctx.fill();
      }
    }
    // 标签
    ctx.textAlign='center'; ctx.textBaseline='top';
    for(const n of sim.nodes){
      const r=Math.max(.3,n.r*n.scale*(n.birth<1?Math.max(.05,n.birth):1));
      if(r<.4||n.alpha<.22) continue;
      const hot=HOV===n.id||litSet.has(n.id);
      const show=hot||n.type==='product'||n.type==='entry'||n.type==='gap'||(curId()!=='all'&&n.focus)||kg.cam.z>1.15;
      if(!show) continue;
      const fs=(n.type==='product'?11.5:n.type==='entry'?10.5:9.5)/kg.cam.z;
      if(fs<6.5) continue;
      const a=clamp(n.alpha*(hot?1:n.type==='product'?1:.78),0,1);
      const above=n.type==='file'||n.type==='term';
      ctx.textBaseline=above?'bottom':'top';
      const y=above?n.y-r-3/kg.cam.z:n.y+r+4/kg.cam.z;
      ctx.font=`${n.type==='product'?600:400} ${fs}px ${FONT}`;
      ctx.lineWidth=3.2/kg.cam.z; ctx.strokeStyle=`rgba(5,10,13,${(.85*a).toFixed(3)})`; ctx.strokeText(n.label,n.x,y);
      ctx.fillStyle=n.type==='product'?`rgba(220,255,250,${a})`:n.type==='gap'?`rgba(245,177,76,${a})`:`rgba(199,224,221,${a})`;
      ctx.fillText(n.label,n.x,y);
    }
    ctx.restore();
  }

  /* ---------- 循环 ---------- */
  function raf(){
    if(!kg||!kg.cv||!kg.cv.isConnected||page!=='kb'){ if(kg) cancelAnimationFrame(kg.raf); kg=null; return; }
    if(kg.settle<2){ tick(); tick(); kg.settle++; if(kg.settle===2){ fitCam(); kg.cam={x:kg.fit.x,y:kg.fit.y,z:kg.fit.z}; } }
    else {
      let energy=0, moving=0;
      for(const n of kg.sim.nodes){ energy+=Math.abs(n.vx)+Math.abs(n.vy); if(n.birth<1||Math.abs(n.scale-n.tScale)>.01||Math.abs(n.alpha-n.tAlpha)>.01) moving++; }
      const active=energy>.5||moving>0||kg.hov||kg.drag||kg.pan||performance.now()<kg.animUntil;
      if(active) tick();
      if(!userPan||kg.resizing){ kg.resizing=false; fitCam(); }
    }
    setCam(); draw();
    kg.raf=requestAnimationFrame(raf);
  }

  /* ---------- 交互 ---------- */
  function bind(){
    const stage=document.getElementById('kg_stage'), cv=kg.cv, tip=document.getElementById('kg_tip');
    const toWorld=(cx,cy)=>{ const r=stage.getBoundingClientRect(); return {x:(cx-r.left-kg.W/2-kg.cam.x)/kg.cam.z,y:(cy-r.top-kg.H/2-kg.cam.y)/kg.cam.z}; };
    const hit=p=>{ let best=null,bd=1e9; for(const n of kg.sim.nodes){ if(n.alpha<.2) continue; const d=Math.hypot(n.x-p.x,n.y-p.y), rr=n.r*(n.scale*n.birth)+11/kg.cam.z; if(d<rr&&d<bd){ best=n; bd=d; } } return best; };
    const showTip=(n,ev)=>{ if(!n){ tip.classList.remove('show'); return; }
      tip.innerHTML=nodeTip(n); tip.classList.add('show');
      const r=stage.getBoundingClientRect(); let x=ev.clientX-r.left+16, y=ev.clientY-r.top+14;
      if(x+tip.offsetWidth>r.width-8) x=ev.clientX-r.left-tip.offsetWidth-16;
      if(y+tip.offsetHeight>r.height-8) y=r.height-tip.offsetHeight-10;
      tip.style.transform=`translate(${Math.max(8,x)}px,${Math.max(8,y)}px)`; };
    kg.down=null; kg.drag=null; kg.pan=null; kg.hov=null; kg.hovNode=null;
    cv.onpointerdown=ev=>{ if(cv.setPointerCapture){ try{ cv.setPointerCapture(ev.pointerId); }catch(e){} } const p=toWorld(ev.clientX,ev.clientY), n=hit(p);
      kg.down={x:ev.clientX,y:ev.clientY,moved:0};
      if(n){ kg.drag=n; n.drag=true; } else kg.pan={x:kg.cam.x,y:kg.cam.y};
      kg.animUntil=performance.now()+2500; };
    cv.onpointermove=ev=>{ const p=toWorld(ev.clientX,ev.clientY);
      if(kg.down) kg.down.moved=Math.max(kg.down.moved,Math.hypot(ev.clientX-kg.down.x,ev.clientY-kg.down.y));
      if(kg.drag&&kg.down&&kg.down.moved>=4){ kg.drag.x=p.x; kg.drag.y=p.y; kg.drag.vx=kg.drag.vy=0; }
      else if(kg.pan&&kg.down){ kg.cam.x=kg.pan.x+(ev.clientX-kg.down.x); kg.cam.y=kg.pan.y+(ev.clientY-kg.down.y); userPan=true; }
      const n=hit(p);
      if(kg.hov!==(n?n.id:null)){ kg.hov=n?n.id:null; kg.animUntil=performance.now()+2500; }
      kg.hovNode=n; cv.style.cursor=n?'pointer':(kg.pan&&kg.down?'grabbing':'grab');
      showTip(n,ev); };
    cv.onpointerup=ev=>{ const click=kg.down&&kg.down.moved<5, n=kg.drag;
      if(kg.drag){ kg.drag.drag=false; }
      kg.drag=null; kg.pan=null; kg.down=null;
      if(click&&n) clickNode(n);
      kg.animUntil=performance.now()+2500; };
    cv.onpointercancel=()=>{ if(kg.drag) kg.drag.drag=false; kg.drag=null; kg.pan=null; kg.down=null; };
    cv.onpointerleave=()=>{ kg.hov=null; kg.hovNode=null; tip.classList.remove('show'); kg.animUntil=performance.now()+2500; };
    cv.ondblclick=()=>{ kg.userZ=1; userPan=false; kg.cam.x=0; kg.cam.y=0; kg.resizing=true; };
    cv.addEventListener('wheel',ev=>{ if(!(ev.ctrlKey||ev.metaKey)) return; ev.preventDefault();
      const r=stage.getBoundingClientRect(), mx=ev.clientX-r.left-r.width/2, my=ev.clientY-r.top-r.height/2;
      const z0=kg.cam.z, z1=clamp(z0*(ev.deltaY<0?1.12:.9),.25,2.6);
      kg.cam.x=mx-(mx-kg.cam.x)*(z1/z0); kg.cam.y=my-(my-kg.cam.y)*(z1/z0);
      kg.userZ=clamp((kg.userZ||1)*z1/z0,.35,2.4); userPan=true; kg.animUntil=performance.now()+2500; },{passive:false});
    kgRo&&kgRo.disconnect();
    if(typeof ResizeObserver!=='undefined'){ kgRo=new ResizeObserver(()=>{ kg.resizing=true; }); kgRo.observe(stage); }
  }
  let userPan=false;
  function flashOpen(sel2,open){
    const els=document.querySelectorAll(sel2);
    els.forEach(el=>{ if(open&&el.tagName==='DETAILS') el.open=true; el.classList.add('kg-flash'); setTimeout(()=>el.classList.remove('kg-flash'),1900); });
    const el=els[0]; if(el&&el.scrollIntoView) el.scrollIntoView({block:'center',behavior:'smooth'});
  }
  function clickNode(n){
    if(n.type==='product'){ setSel(curId()===n.p.id?'all':n.p.id); return; }
    if(n.type==='entry'){ kbTab='entries'; render(); flashOpen('#kbe_'+n.k.id,true); return; }
    if(n.type==='file'){ kbTab='files'; render(); flashOpen('#kbrow_'+n.file.id,false); return; }
    if(n.type==='term'){ kbTab='terms'; render(); return; }
    if(n.type==='part'){ const k=Engine.KB.find(k=>k.part&&String(k.part)===n.part); if(k){ kbTab='entries'; render(); flashOpen('#kbe_'+k.id,true); } return; }
    if(n.type==='gap'){ const g=n.gap;
      if(g.act==='upload'){ const up=document.getElementById('kg_up'); if(g.key.endsWith(':3d')) up.setAttribute('accept','.step,.stp'); else up.removeAttribute('accept'); up.click(); }
      else if(g.act==='products') go('products');
      else if(g.tab){ kbTab=g.tab; render(); }
    }
  }

  /* ---------- 对外 ---------- */
  function setSel(id){
    id=(id==='all'||state.products.some(p=>p.id===id))?id:'all';
    if(id===sel) return;
    sel=id; render();
  }
  function mount(){
    const cv=document.getElementById('kg_cv'); if(!cv) return;
    const ctx=cv.getContext&&cv.getContext('2d');
    kg={cv,ctx,W:0,H:0,dpr:1,cam:{x:0,y:0,z:1},fit:{x:0,y:0,z:1},hov:null,hovNode:null,drag:null,pan:null,down:null,animUntil:performance.now()+2500,settle:0,userZ:1};
    const up=document.getElementById('kg_up'); if(up) up.onchange=e=>{ if(e.target.files&&e.target.files.length){ uploadKB(e.target.files); e.target.value=''; } };
    if(!ctx||typeof ctx.createRadialGradient!=='function'||typeof ctx.arcTo!=='function'){ kg.noDraw=true; kg.sim=syncSim(curId()); return; } // 无 canvas 实现（如 jsdom）：保留数据与结构，不画
    const stage=document.getElementById('kg_stage');
    const size=()=>{ const r=stage.getBoundingClientRect(); kg.W=Math.max(80,r.width); kg.H=Math.max(80,r.height); kg.dpr=Math.min(2,window.devicePixelRatio||1); cv.width=Math.round(kg.W*kg.dpr); cv.height=Math.round(kg.H*kg.dpr); kg.bgGrad=null; };
    kg.sim=syncSim(curId());
    size(); refresh(); bind(); fitCam(); kg.cam={x:kg.fit.x,y:kg.fit.y,z:kg.fit.z};
    cancelAnimationFrame(kg.raf); raf();
  }
  function zoom(f){ if(!kg) return; kg.userZ=clamp((kg.userZ||1)*f,.35,2.4); kg.animUntil=performance.now()+2500; }
  function resetView(){ if(!kg) return; kg.userZ=1; userPan=false; kg.cam.x=0; kg.cam.y=0; kg.resizing=true; kg.animUntil=performance.now()+2500; }
  const api={mount,setSel,zoom,resetView,panel,nodeTip,viewFiles,viewEntries,gapsAll,gapsFor,
    get _sel(){ return curId(); }, get _nodes(){ return kg&&kg.sim?kg.sim.nodes:[]; }, get _edges(){ return kg&&kg.sim?kg.sim.edges:[]; }};
  return api;
})();
window.KG=KG;
