/* 政策层专项测试：node policytest.js */
global.Policy=require('./policy.js');
let pass=0,fail=0; const ok=(n,c)=>{ c?(pass++,console.log('ok  ',n)):(fail++,console.log('FAIL',n)); };
const throws=(n,fn)=>{ try{ fn(); fail++; console.log('FAIL',n,'(no throw)'); }catch(e){ pass++; console.log('ok  ',n,'→',e.message.slice(0,40)); } };

ok('默认值来自 config（阈值 85）', Policy.get('autoReply.threshold')===85);
ok('嵌套取值（routing.l1.hours）', Policy.get('routing.l1.hours')===4);
ok('没有 state 时也能取默认值', Policy.view().threshold===85 && Policy.view().l1Hours===4);

global.state={policy:{values:{},log:[]}}; global.save=()=>{}; global.role='brand'; global.ROLE={brand:{person:'杨梦'}};
const r=Policy.set('autoReply.threshold',80);
ok('set 生效并记录 from/to', r.changed&&r.from===85&&r.to===80&&Policy.log().length===1);
ok('审计记录带操作人', Policy.log()[0].who==='杨梦');
ok('set 写进 state.policy 覆盖值', state.policy.values.autoReply.threshold===80);
throws('超出范围被拒（> 98）', ()=>Policy.set('autoReply.threshold',99));
throws('低于范围被拒（< 60）', ()=>Policy.set('autoReply.threshold',50));
throws('锁定项被拒（50 美元上限）', ()=>Policy.set('shipping.autoCommitLimitUsd',200));
throws('锁定项被拒（大件开关）', ()=>Policy.set('shipping.bigParts',true));
throws('不存在的项被拒', ()=>Policy.set('autoReply.nope',1));
ok('重复设同值不算变更', Policy.set('autoReply.threshold',80).changed===false && Policy.log().length===1);
ok('diff 能看到与出厂值的差异', Policy.diff().some(d=>d.path==='autoReply.threshold'&&d.to===80));
Policy.reset('autoReply.threshold');
ok('单项恢复出厂值', Policy.get('autoReply.threshold')===85 && Policy.diff().length===0);

// —— 决策函数：canAutoReply / mustEscalate / canShip / decide ——
const prop=(o)=>Object.assign({kbId:'cable',confidence:90,reasons:[]},o);
ok('高置信 + 命中 + 无规则 → 可自动回复', Policy.canAutoReply(prop({}),{hasMatch:true}).ok);
ok('低于阈值 → 不给回复', !Policy.canAutoReply(prop({confidence:70}),{hasMatch:true}).ok);
ok('落在追问区间 → action=ask', Policy.canAutoReply(prop({confidence:70}),{hasMatch:true}).action==='ask');
ok('安全件 → 必须转人工（即使置信度 98）', Policy.mustEscalate(prop({confidence:98,reasons:['safety']})).must);
ok('无知识条目 → 封顶 45 且不给回复', !Policy.canAutoReply(prop({kbId:null,confidence:60}),{hasMatch:false}).ok && Policy.canAutoReply(prop({kbId:null,confidence:60}),{hasMatch:false}).reasons.includes('noMatchCap'));
ok('两个条目同分 → ambiguous 降级', !Policy.canAutoReply(prop({ambiguous:true}),{hasMatch:true}).ok);
ok('客户明确要真人 → 转人工', Policy.mustEscalate(prop({humanRequest:true})).must);

ok('小件 26 美元 → AI 可承诺', Policy.canShip({part:'FT-FC20-20',partValue:26}).ok);
ok('大件 120 美元 → 必须人确认', !Policy.canShip({part:'PCB-TR6-04',partValue:120}).ok && Policy.canShip({part:'PCB-TR6-04',partValue:120}).reasons.some(x=>x.startsWith('overLimit')));
ok('shipOnReply:false（修复优先）→ 首次不承诺', !Policy.canShip({part:'FT-FC20-20',partValue:26,shipOnReply:false}).ok);
ok('没价格 → 不承诺', !Policy.canShip({part:'X'}).ok);
ok('库存为 0 → 不承诺', !Policy.canShip({part:'FT-FC20-20',partValue:26},{qty:0}).ok);

ok('decide：安全件 → escalate/human', (()=>{ const d=Policy.decide(prop({reasons:['safety']})); return d.action==='escalate'&&d.status==='human'&&d.slaHours===4; })());
ok('decide：小件可寄 → reply + ship', (()=>{ const d=Policy.decide(prop({part:'FT-FC20-20',partValue:26}),{}); return d.action==='reply'&&d.ship&&d.ship.part==='FT-FC20-20'; })());
ok('decide：大件 → reply + 待确认', (()=>{ const d=Policy.decide(prop({part:'PCB-TR6-04',partValue:120}),{}); return d.action==='reply'&&d.ship&&d.ship.pending; })());
ok('decide：修复优先条目 → guiding', (()=>{ const d=Policy.decide(prop({repairFirst:true}),{}); return d.status==='guiding'; })());

// —— 改政策后行为真的变（"不用发版"要能验证）——
Policy.set('shipping.smallParts',false);
ok('关掉小件开关 → 26 美元的件不再自动承诺', !Policy.canShip({part:'FT-FC20-20',partValue:26}).ok);
Policy.set('shipping.smallParts',true);
ok('打开后恢复', Policy.canShip({part:'FT-FC20-20',partValue:26}).ok);
Policy.set('hardRules.safety',false);
ok('关掉安全件规则 → 安全件不再强制转人工（风险开关，验证可绑）', !Policy.mustEscalate(prop({reasons:['safety']})).must);
Policy.set('hardRules.safety',true);
ok('打开后恢复', Policy.mustEscalate(prop({reasons:['safety']})).must);
Policy.set('autoReply.maxAskRounds',3);
ok('追问轮数可调', Policy.maxAskRounds()===3 && Policy.mustEscalate(prop({asks:2,action:'ask'})).must===false);
Policy.set('autoReply.maxAskRounds',2);
ok('回到 2 轮后 asks=2 触发转人工', (()=>{ const p=prop({asks:2,action:'ask'}); return Policy.mustEscalate(p).reasons.includes('askRoundsExhausted'); })());
Policy.set('guard.batchCluster.minSame',3); Policy.reset();
ok('全部恢复后与出厂值一致', Policy.diff().length===0);


// —— 触发词表（2026-11-05）——
global.state={policy:{values:{},log:[]}};
ok('safety 分锁定段与可编辑段', Policy.words('safety').locked.includes('hurt') && Policy.words('safety').editable.includes('cable'));
ok('伤害词命中（中文）', Policy.hitWords('safety','机器砸到我了').includes('砸'));
ok('伤害词命中（德语）', Policy.hitWords('safety','ich wurde verletzt').includes('verletz'));
ok('退款词命中', Policy.matchesHardRule('refund','I want a refund') && Policy.matchesHardRule('refund','我要退货'));
ok('负面词命中', Policy.matchesHardRule('negative','I will post a review on trustpilot'));
ok('普通来信不误触发', Policy.hitWords('refund','how do I assemble step 3').length===0);
ok('b2b 白名单内 → 非企业邮箱', !Policy.matchesHardRule('b2b','x','a@gmail.com'));
ok('b2b 白名单外 → 企业邮箱', Policy.matchesHardRule('b2b','x','ops@force.co.au'));
throws('伤害词不能删', ()=>Policy.removeWord('safety','injury','hurt'));
throws('伤害词不能加（锁定段）', ()=>Policy.addWord('safety','injury','xxnewxx'));
ok('安全部件名可加', Policy.addWord('safety','parts','吊带') && Policy.get('hardRuleWords.safety.parts').includes('吊带'));
ok('安全部件名可删', (()=>{ Policy.removeWord('safety','parts','吊带'); return !Policy.get('hardRuleWords.safety.parts').includes('吊带'); })());
throws('重复加词被拒', ()=>{ Policy.addWord('negative','','review'); });
ok('新加的负面词立即生效', (()=>{ Policy.addWord('negative','','cable tv'); const r=Policy.matchesHardRule('negative','my cable tv broke'); Policy.reset('hardRuleWords.negative'); return r; })());
ok('改动进入审计日志', Policy.log().some(l=>l.path.startsWith('hardRuleWords')));

console.log(`\n${pass} 通过 / ${fail} 失败`);
process.exit(fail?1:0);
