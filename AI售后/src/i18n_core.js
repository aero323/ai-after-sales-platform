/* ============================================================
   I18N —— 后台界面中英文切换（右上角「中 / EN」）
   思路：state 与种子数据保持中文（它们参与逻辑，如 f.st==='已入库'、m.market==='欧盟'），
   翻译只发生在渲染出口：
     1) render() / openDrawer() / openModal() / toast() 之后同步翻一遍新 DOM；
     2) MutationObserver 兜住异步更新（智能体对话流、定时刷新、setRole 等）；
     3) Canvas 文字（知识图谱）不经过 DOM，在绘制处调 I18N.t()。
   字典：I18N_DICT.MAP 精确句 → 英文；I18N_DICT.PAT 带 \u0000 占位的句型 → 英文（占位内容递归翻译）；
   运行时再并入 Engine 自带的 zh/en 对（知识条目名、零件名、步骤、产品系列）。
   匹配顺序：整句精确 → 句型 → 按标点/· 分段递归 → 最长词优先替换（兜底，调试模式会记录走到兜底的句子）。
   切回中文：所有翻译都以"源 DOM 仍是中文"为前提，重新 render() 即恢复。
   ============================================================ */
const I18N = (() => {
  const KEY='as_lang';
  let lang='zh';
  try{ const v=localStorage.getItem(KEY); if(v==='en'||v==='zh') lang=v; }catch(e){}
  try{ const q=new URLSearchParams(location.search).get('lang'); if(q==='en'||q==='zh'){ lang=q; localStorage.setItem(KEY,q); } }catch(e){}
  const isEn=()=>lang==='en';
  const CJK=/[一-鿿㐀-䶿　-〿＀-￯]/;
  const MAP=Object.assign({}, I18N_DICT.MAP);
  const norm=s=>String(s).replace(/\s+/g,' ').trim();
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const PAT=Object.entries(I18N_DICT.PAT).filter(([k,v])=>CJK.test(k.replace(/\u0000/g,''))&&k.split('\u0000').length===v.split('\u0000').length).map(([k,v])=>{
    const parts=k.split('\u0000'); const lit=parts.join('');
    return { re:new RegExp('^'+parts.map(reEsc).join('([^\\n]+?)')+'$'), en:v.split('\u0000'), w:(lit.match(/[一-鿿]/g)||[]).length*10+lit.length };
  }).sort((a,b)=>b.w-a.w);
  let ALT=null; const debug={fallback:new Set(), miss:new Set()};
  function rebuildAlt(){ const keys=Object.keys(MAP).filter(k=>k.length>=2&&!k.includes('\u0000')).sort((a,b)=>b.length-a.length); ALT=new RegExp(keys.map(reEsc).join('|'),'g'); }
  /* Engine 自带的双语对 */
  function addPairs(){
    try{
      for(const k of Engine.KB){ if(k.cat) MAP[norm(k.cat.zh)]=k.cat.en; if(k.partName) MAP[norm(k.partName.zh)]=k.partName.en; if(k.stepTitle) MAP[norm(k.stepTitle.zh)]=k.stepTitle.en;
        if(k.steps&&k.steps.zh&&k.steps.en) k.steps.zh.forEach((s,i)=>{ if(k.steps.en[i]) MAP[norm(s)]=k.steps.en[i]; }); }
      for(const p of Engine.PRODUCTS){ MAP[norm(p.series.zh)]=p.series.en; MAP[norm(`${p.series.zh} ${p.id}`)]=`${p.series.en} ${p.id}`; }
      if(typeof I18N_EXTRA==='object') Object.assign(MAP,I18N_EXTRA);
    }catch(e){}
    rebuildAlt();
  }
  const PUNCT=[[/，/g,', '],[/。/g,'. '],[/；/g,'; '],[/：/g,': '],[/、/g,', '],[/（/g,' ('],[/）/g,') '],[/「/g,' “'],[/」/g,'” '],[/？/g,'? '],[/！/g,'! '],[/【/g,' ['],[/】/g,'] '],[/～/g,'~']];
  function punct(s){ for(const [re,r] of PUNCT) s=s.replace(re,r); return s.replace(/\s+([,.;:!?)\]”])/g,'$1').replace(/([(\[“])\s+/g,'$1').replace(/ {2,}/g,' ').trim(); }
  const SEP=/( · |，|。|；|：|、|（|）|「|」|“|”|——| — | \/ |\n|？|！)/;
  const SEPMAP={' · ':' · ','，':', ','。':'. ','；':'; ','：':': ','、':', ','（':' (','）':') ','「':' “','」':'” ','“':' “','”':'” ','——':' — ',' — ':' — ',' / ':' / ','\n':'\n','？':'? ','！':'! '};
  function core(s,depth){
    if(!CJK.test(s)) return s;
    const n=norm(s); if(!n) return s;
    const hit=MAP[n]; if(hit!=null) return hit;
    if(depth>8){ debug.miss.add(n); return punct(n); }
    if(n.length<=320&&!n.includes('\n')) for(const p of PAT){ const m=p.re.exec(n); if(m){ if(m.slice(1).some(g=>g.length>=n.length)) continue; let out=p.en[0]; for(let i=1;i<m.length;i++) out+=core(m[i],depth+1)+(p.en[i]||''); return punct(out); } }
    const parts=n.split(SEP);
    if(parts.length>1){ let out=''; let allDone=true; for(let i=0;i<parts.length;i++){ if(i%2){ out+=SEPMAP[parts[i]]??parts[i]; } else { const r=core(parts[i],depth+1); if(r===parts[i]&&CJK.test(r)) allDone=false; out+=r; } } if(!allDone&&CJK.test(out)) return n; return punct(out); }
    if(n.length>14){ debug.miss.add(n); return n; }   // 长句不硬替换：宁可整句留观，也不产生中英混排
    debug.fallback.add(n);
    const LAT=/[A-Za-z0-9%]/;
    const out=n.replace(ALT,(k,off,str)=>{ const pre=off>0&&LAT.test(str[off-1])?' ':''; const nx=str[off+k.length]; const post=nx&&LAT.test(nx)?' ':''; return pre+MAP[k]+post; });
    if(CJK.test(out)) debug.miss.add(n);
    return punct(out);
  }
  function trText(raw){
    raw=String(raw); if(!CJK.test(raw)) return raw;
    const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
    return m[1]+core(m[2],0)+m[3];
  }
  const t=s=>isEn()?trText(s):String(s);

  /* ---------- DOM ---------- */
  const ATTRS=['title','placeholder','aria-label'];
  const SKIP_TAG={SCRIPT:1,STYLE:1,NOSCRIPT:1,TEXTAREA:1};
  const skip=el=>!!(el&&(SKIP_TAG[el.tagName]||(el.closest&&el.closest('[data-noi18n],[contenteditable="true"]'))));
  function trNode(n){ if(!n.nodeValue||!CJK.test(n.nodeValue)) return; if(skip(n.parentElement)) return; const v=trText(n.nodeValue); if(v!==n.nodeValue) n.nodeValue=v; }
  function trEl(el){
    if(!el||el.nodeType!==1||skip(el)) return;
    const els=[el,...el.querySelectorAll('*')];
    for(const e of els){ if(e.closest('[data-noi18n]')) continue; for(const a of ATTRS){ const v=e.getAttribute(a); if(v&&CJK.test(v)){ const nv=trText(v); if(nv!==v) e.setAttribute(a,nv); } } }
    const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT); let n; const nodes=[]; while(n=tw.nextNode()) nodes.push(n); nodes.forEach(trNode);
  }
  function apply(root){ if(!isEn()) return; root=root||document.body; if(root.nodeType===3) trNode(root); else trEl(root); }
  let mo=null;
  function observe(){ if(mo||typeof MutationObserver==='undefined') return; mo=new MutationObserver(ms=>{ if(!isEn()) return; for(const m of ms){ if(m.type==='characterData') trNode(m.target); else for(const n of m.addedNodes){ if(n.nodeType===1) trEl(n); else if(n.nodeType===3) trNode(n); } } }); mo.observe(document.body,{childList:true,subtree:true,characterData:true}); }
  /* 原生对话框 */
  const _confirm=window.confirm, _alert=window.alert;
  window.confirm=function(msg){ return _confirm.call(window, isEn()?trText(String(msg)):msg); };
  window.alert=function(msg){ return _alert.call(window, isEn()?trText(String(msg)):msg); };

  const TITLE={zh:'AI售后 · 品牌方后台原型 v2',en:'AI After-Sales · Brand Console v2'};
  function chrome(){ document.documentElement.lang=lang==='en'?'en':'zh-CN'; document.title=TITLE[lang]; document.querySelectorAll('#langSw button').forEach(b=>b.classList.toggle('on',b.dataset.l===lang)); }
  function set(next){
    const nl=next==='en'?'en':'zh'; if(nl===lang){ chrome(); return; }
    lang=nl; try{ localStorage.setItem(KEY,lang); }catch(e){}
    if(typeof closeAll==='function') closeAll();
    if(typeof restoreChrome==='function') restoreChrome();  // 侧栏 / 顶栏静态文案回到中文源
    if(typeof render==='function') render();                // 页面重渲染（render 末尾会 apply）
    chrome(); apply(document.body);
  }
  function boot(){ addPairs(); chrome(); observe(); if(isEn()) apply(document.body); }
  return { get lang(){return lang;}, isEn, t, apply, set, boot, _debug:debug, _map:MAP };
})();
