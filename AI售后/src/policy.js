/* ============================================================
   政策层 · policy.js
   作用：把所有"业务判断"集中到这里，代码只调用 Policy.xxx()，不再散落魔法数字。
   读法：默认值来自 policy.config.json（构建时内联到 __POLICY_DEFAULTS）；
        运行时覆盖值来自 state.policy（保存在浏览器），每条改名都进审计日志。
   约束：这里的函数必须是纯函数（输入 → 输出），不调用模型、不发网络请求，可单测。

   与 LLM 的分工（见《LLM嵌入方案》§7）：
     LLM 输出 Proposal（我建议……）
     Policy 输出 Decision（执行……）
     LLM 永远够不到 Policy。
   ============================================================ */
// 默认值：Node 里直接读同目录 policy.config.json；浏览器构建时 build.py 会把下面这行替换成配置字面量。
// 构建时（build.py）把这一行替换成 policy.config.json 的字面量；
// Node 里直接 require 时走文件读取（相对本文件，与调用方目录无关）。
const POLICY_DEFAULTS = (typeof __POLICY_DEFAULTS__!=='undefined') ? __POLICY_DEFAULTS__
  : (typeof require!=='undefined' ? require(__dirname + '/policy.config.json') : {});

const Policy = (() => {

  /* ---------- 取值：支持 "routing.l1.hours.value" 这种点路径 ---------- */
  function pathGet(obj, path){ return String(path).split('.').reduce((o,k)=> (o!=null && typeof o==='object') ? o[k] : undefined, obj); }
  function pathSet(obj, path, val){ const ks=String(path).split('.'); const last=ks.pop(); const tgt=ks.reduce((o,k)=>{ if(!o[k]||typeof o[k]!=='object') o[k]={}; return o[k]; }, obj); tgt[last]=val; }

  // 后台读 state.policy；H5 端没有 state，读从 localStorage 拿到的 adminState.policy
  function overrides(){
    if(typeof state!=='undefined' && state && state.policy && state.policy.values) return state.policy.values;
    if(typeof adminState!=='undefined' && adminState && adminState.policy && adminState.policy.values) return adminState.policy.values;
    return {};
  }
  function raw(path){ const ov=pathGet(overrides(), path); return ov!==undefined ? ov : pathGet(POLICY_DEFAULTS, path); }
  function get(path){ const v=raw(path); return (v && typeof v==='object' && 'value' in v) ? v.value : v; }
  function def(path){ return pathGet(POLICY_DEFAULTS, path); }
  function label(path){ const d=def(path); return d && d.label ? d.label : path; }

  /* ---------- 修改：范围校验 + 审计 ---------- */
  function set(path, val){
    const d=def(path);
    if(!d || typeof d!=='object' || !('value' in d)) throw new Error(`政策项 ${path} 不存在`);
    if(d.locked) throw new Error(`政策项「${label(path)}」已锁定，需技术与业务双签后才能修改`);
    let v=val;
    if(Array.isArray(d.value)){ if(!Array.isArray(val)) throw new Error(`${label(path)} 必须是词表`); v=val.slice(); }
    else if(typeof d.value==='number'){ v=+val; if(!isFinite(v)) throw new Error(`${label(path)} 必须是数字`); if(d.min!=null && v<d.min) throw new Error(`${label(path)} 不能小于 ${d.min}`); if(d.max!=null && v>d.max) throw new Error(`${label(path)} 不能大于 ${d.max}`); }
    else if(typeof d.value==='boolean') v=!!val;
    const from=get(path); if(from===v) return {changed:false, from, to:v};
    if(typeof state!=='undefined' && state){ state.policy=state.policy||{values:{},log:[]};
      pathSet(state.policy.values, path, v);
      state.policy.log.push({ at:Date.now(), who:(typeof ROLE!=='undefined'&&typeof role!=='undefined'&&ROLE[role])?ROLE[role].person:'系统', path, label:label(path), from, to:v, version:POLICY_DEFAULTS.version });
      if(state.policy.log.length>200) state.policy.log=state.policy.log.slice(-200);
      if(typeof save==='function') save();
    }
    return {changed:true, from, to:v};
  }
  function reset(path){ if(typeof state!=='undefined' && state && state.policy){ if(path){ const ks=String(path).split('.'); const last=ks.pop(); const tgt=ks.reduce((o,k)=>o&&o[k],state.policy.values); if(tgt) delete tgt[last]; } else state.policy.values={}; if(typeof save==='function') save(); } }
  function log(){ return (typeof state!=='undefined' && state && state.policy && state.policy.log) || []; }
  function diff(){ const out=[]; const walk=(d,p)=>{ if(d&&typeof d==='object'&&Array.isArray(d.value)) return; if(d&&typeof d==='object'&&'value' in d){ const cur=get(p); if(cur!==d.value) out.push({path:p,label:label(p),from:d.value,to:cur}); return; } if(d&&typeof d==='object') for(const k of Object.keys(d)) if(!k.startsWith('_')) walk(d[k], p?p+'.'+k:k); }; walk(POLICY_DEFAULTS,''); return out; }

  /* ---------- 硬规则词表（policy.config.json → hardRuleWords）---------- */
  // 读取某条规则的词表；safety 分 injury（锁定兜底）与 parts（可编辑）两段
  // 注意：词表取"当前生效值"（get），不是出厂值（def）——否则设置页加的词永远不生效
  function words(rule){
    const d=def('hardRuleWords.'+rule); if(!d) return {all:[], locked:[], editable:[]};
    if(d.value && Array.isArray(d.value)){ const cur=get('hardRuleWords.'+rule); const lock=d.locked?(Array.isArray(cur)?cur:d.value):null;
      return { all:(Array.isArray(cur)?cur:d.value).slice(), locked: lock?lock.slice():[], editable: lock?[]:(Array.isArray(cur)?cur:d.value).slice() }; }
    const curInjury=get('hardRuleWords.'+rule+'.injury'), curParts=get('hardRuleWords.'+rule+'.parts');
    const lock=(Array.isArray(curInjury)?curInjury:(d.injury?d.injury.value||[]:[])).slice();
    const edit=(Array.isArray(curParts)?curParts:(d.parts?d.parts.value||[]:[])).slice();
    return { all:lock.concat(edit), locked:lock, editable:edit };
  }
  // 命中的词（大小写不敏感、子串匹配；与原来正则的语义一致：宁可多抓）
  function hitWords(rule, text){
    const t=String(text||'').toLowerCase(); if(!t) return [];
    return words(rule).all.filter(w=>w && t.includes(String(w).toLowerCase()));
  }
  // 某条规则是否被这封来信触发（b2b 是"邮箱不在白名单"的反向判定）
  function matchesHardRule(rule, text, email){
    if(rule==='b2b'){ if(!email) return false; const e=String(email).toLowerCase();
      return !words('b2b').all.some(d=>e.includes(String(d).toLowerCase())); }
    return hitWords(rule, text).length>0;
  }
  // 词表增删：锁定段禁止任何修改（含追加），只能由技术改 config 后发布
  function addWord(rule, kind, word){
    const w=String(word||'').trim(); if(!w) throw new Error('词不能为空');
    const node = kind ? pathGet(POLICY_DEFAULTS,'hardRuleWords.'+rule+'.'+kind) : pathGet(POLICY_DEFAULTS,'hardRuleWords.'+rule);
    if(!node || !Array.isArray(node.value)) throw new Error('该规则没有可编辑词表');
    if(node.locked) throw new Error(`「${node.label||rule}」已锁定，需技术与业务双签后才能修改`);
    const cur=get('hardRuleWords.'+rule+(kind?'.'+kind:''));
    if(cur.map(x=>x.toLowerCase()).includes(w.toLowerCase())) throw new Error('这个词已经在表里');
    set('hardRuleWords.'+rule+(kind?'.'+kind:''), cur.concat([w]));
    return {from:cur.length,to:cur.length+1};
  }
  function removeWord(rule, kind, word){
    const node = kind ? pathGet(POLICY_DEFAULTS,'hardRuleWords.'+rule+'.'+kind) : pathGet(POLICY_DEFAULTS,'hardRuleWords.'+rule);
    if(!node || !Array.isArray(node.value)) throw new Error('该规则没有可编辑词表');
    if(node.locked) throw new Error(`「${node.label||rule}」已锁定，需技术与业务双签后才能修改`);
    const cur=get('hardRuleWords.'+rule+(kind?'.'+kind:''));
    const next=cur.filter(x=>x.toLowerCase()!==String(word).toLowerCase());
    if(next.length===cur.length) return {changed:false};
    set('hardRuleWords.'+rule+(kind?'.'+kind:''), next); return {changed:true};
  }

  /* ---------- 视图：给兼容对象（Engine.assess 现在的入参）---------- */
  // 返回 { threshold, rules:{safety,refund,negative,b2b}, promise:{smallParts,bigParts,videos} }
  // h5_app 也读这个，用来在没有 state 时取默认值。
  function view(){
    return {
      threshold: get('autoReply.threshold'),
      rules: {
        safety:  get('hardRules.safety'),
        refund:  get('hardRules.refund'),
        negative:get('hardRules.negative'),
        b2b:     get('hardRules.b2b')
      },
      promise: {
        smallParts: get('shipping.smallParts'),
        bigParts:   get('shipping.bigParts'),
        videos:     get('shipping.videos')
      },
      // 新增项（旧代码不读，不影响）
      askBand: get('autoReply.askBand'),
      maxAskRounds: get('autoReply.maxAskRounds'),
      noMatchCap: get('autoReply.noMatchCap'),
      autoCommitLimitUsd: get('shipping.autoCommitLimitUsd'),
      trackingHours: get('shipping.requireTrackingWithinHours'),
      mergeReopenDays: get('guard.mergeReopenDays'),
      repairGuideDays: get('guard.repairGuideDays'),
      l1Hours: get('routing.l1.hours'),
      l2Hours: get('routing.l2.hours'),
      l1Name: get('routing.l1.name'),
      l1Email: get('routing.l1.email'),
      maxIssues: get('guard.maxIssuesPerTicket'),
      maxReplyWords: get('guard.maxReplyWords')
    };
  }

  /* ---------- 核心决策函数（纯函数）---------- */

  // 是否可以自动回复。输入是"提案 + 事实"，输出是决定。
  // proposal: { kbId, confidence, evidenceOk, stability, reasons:[], ambiguous }
  // facts:    { hasMatch }（有没有命中知识条目）
  function canAutoReply(proposal, facts){
    facts=facts||{}; const reasons=[]; const v=view();
    const hard=v.rules;
    for(const r of (proposal.reasons||[])) if(hard[r]) reasons.push('hardRule:'+r);
    if(!proposal.kbId && !facts.hasMatch) reasons.push('noKbMatch');
    if(proposal.confidence==null) reasons.push('noConfidence');
    else {
      const noMatchCap=proposal.kbId?100:v.noMatchCap;
      if(proposal.confidence>noMatchCap) reasons.push('noMatchCap');
      if(proposal.confidence<v.threshold) reasons.push('belowThreshold:'+proposal.confidence+'<'+v.threshold);
    }
    if(proposal.ambiguous) reasons.push('ambiguous');
    if(proposal.evidenceOk===false) reasons.push('evidenceGate');      // LLM 化之后由 §5 的证据门槛填
    if(proposal.stability!=null && proposal.stability<0.67) reasons.push('unstable');
    return { ok: reasons.length===0, action: reasons.length===0?'reply':(proposal.confidence!=null&&proposal.confidence>=v.threshold-v.askBand?'ask':'escalate'), reasons };
  }

  // 是否可以由 AI 主动承诺寄件（不变量：超过上限必须人确认；开关关掉必须人确认）
  function canShip(issue, facts){
    facts=facts||{}; const v=view(); const reasons=[];
    const value = (issue && issue.partValue!=null) ? issue.partValue : facts.partValue;
    const hasPart = !!(issue && (issue.part || facts.part));
    if(!hasPart) return {ok:false, reasons:['noPart']};
    if(issue && issue.shipOnReply===false) return {ok:false, reasons:['shipOnReplyDisabled']};
    if(value==null) return {ok:false, reasons:['noPrice']};
    const limit=v.autoCommitLimitUsd;
    if(value>limit) reasons.push(`overLimit:${value}>${limit}`);
    const allowed = value<=limit ? v.promise.smallParts : v.promise.bigParts;
    if(!allowed) reasons.push(value<=limit?'smallPartsOff':'bigPartsOff');
    if(facts.qty!=null && facts.qty<=0) reasons.push('outOfStock');
    if(facts.product==='' || (facts.dealer==='')) { /* 信息不全不阻断寄件本身，只影响承诺措辞 */ }
    return { ok: reasons.length===0, reasons, limit, value };
  }

  // 是否必须转人工（不看置信度）
  function mustEscalate(proposal, facts){
    facts=facts||{}; const v=view(); const reasons=[];
    for(const r of (proposal.reasons||[])) if(v.rules[r]) reasons.push('hardRule:'+r);
    if(proposal.humanRequest) reasons.push('customerAskedHuman');
    if(proposal.guardSafetyHit) reasons.push('safetyGuard');            // 硬词表兜底，见 §8
    if((proposal.asks||0)>=v.maxAskRounds && proposal.action==='ask') reasons.push('askRoundsExhausted');
    return { must: reasons.length>0, reasons };
  }

  // 合成最终决定：状态 + 是否寄件 + 指派 + SLA 时限
  function decide(proposal, facts){
    facts=facts||{}; const v=view();
    const esc=mustEscalate(proposal,facts);
    if(esc.must) return { action: esc.reasons.includes('askRoundsExhausted')?'ask':'escalate', status:'human', ship:null, reasons:esc.reasons, slaHours:v.l1Hours };
    const reply=canAutoReply(proposal,facts);
    if(reply.action!=='reply') return { action:reply.action, status:reply.action==='ask'?'ai':'human', ship:null, reasons:reply.reasons, slaHours:reply.action==='ask'?null:v.l1Hours };
    const ship=canShip({part:proposal.part, partValue:proposal.partValue, shipOnReply:proposal.shipOnReply}, facts);
    return { action:'reply', status:proposal.repairFirst?'guiding':'ai', ship:ship.ok?{part:proposal.part}:{pending:true, reasons:ship.reasons}, reasons:[], slaHours:null };
  }

  /* ---------- 派生量：SLA、批次聚集、运单 ---------- */
  function slaHours(level){ return level==='l2' ? get('routing.l2.hours') : get('routing.l1.hours'); }
  function repairGuideMs(){ return get('guard.repairGuideDays')*(typeof DAY!=='undefined'?DAY:86400000); }
  function mergeReopenMs(){ return get('guard.mergeReopenDays')*(typeof DAY!=='undefined'?DAY:86400000); }
  function trackingMs(){ return get('shipping.requireTrackingWithinHours')*(typeof HR!=='undefined'?HR:3600000); }
  function batchRule(){ return { minSame:get('guard.batchCluster.minSame'), ratio:get('guard.batchCluster.ratio') }; }
  function isBatchHot(same, others){ const r=batchRule(); return same>=r.minSame && same>=r.ratio*Math.max(1,others); }
  function askBand(){ return get('autoReply.askBand'); }
  function maxAskRounds(){ return get('autoReply.maxAskRounds'); }
  function noMatchCap(){ return get('autoReply.noMatchCap'); }

  return { DEFAULT:POLICY_DEFAULTS, version:()=>POLICY_DEFAULTS.version, raw, get, def, label, set, reset, log, diff, view,
    canAutoReply, canShip, mustEscalate, decide, words, hitWords, matchesHardRule, addWord, removeWord,
    slaHours, repairGuideMs, mergeReopenMs, trackingMs, batchRule, isBatchHot, askBand, maxAskRounds, noMatchCap };
})();
if (typeof module!=='undefined') module.exports=Policy;
