const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs'); const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','原型_H5扫码端.html'),'utf8');
const errors=[]; const vc=new VirtualConsole(); vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=TR-650',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document; const E=c=>w.eval(c); w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
const step=(n,f)=>{ try{ f(); console.log('ok  ',n);}catch(e){ console.log('FAIL',n,'→',e.message.split('\n')[0]); } };
const vis=()=>d.querySelector('.view.show').dataset.v; const stage=()=>E('stage'); const wait=ms=>new Promise(r=>setTimeout(r,ms)); const lastAI=()=>E("ticket.transcript.filter(m=>m.who==='ai').at(-1).text"); const chat=()=>d.getElementById('chat').textContent;
const howBtns=()=>[...d.querySelectorAll('[data-s="how"] .how-list .how')];
(async()=>{
/* ---------- 进入工单第一屏：语言 / 落地页 / 标签 ---------- */
step('lang screen first',()=>{ if(vis()!=='0') throw new Error(vis()); if(!/TR-650/.test(d.querySelector('[data-v="0"]').textContent)) throw new Error('model param'); });
step('pick Deutsch → landing, ui en, cust de',()=>{ w.pickLang('en','DE','de'); if(vis()!=='1') throw new Error(vis()); if(E('custLang')!=='de') throw new Error(E('custLang')); });
step('landing prioritizes report; secondary actions are grouped below',()=>{ w.go(1); const primary=d.querySelector('[data-v="1"] .action-primary'); const secondary=[...d.querySelectorAll('[data-v="1"] .landing-more button')]; if(!primary||primary.dataset.priority!=='primary') throw new Error('primary action missing'); if(secondary.length!==2) throw new Error('secondary count '+secondary.length); if(!d.querySelector('[data-v="1"] .repair-steps')) throw new Error('repair steps missing'); if(d.querySelector('[data-v="1"] .entries')) throw new Error('old flat entry stack remains'); const model=d.querySelector('.hero-model'); if(!model||!/TR-650/.test(model.textContent)||!/DEVICE MATCHED/.test(model.textContent)) throw new Error('scanned model badge missing: '+(model||{}).textContent); });
step('manual screen lists every guide with a video card and support link',()=>{ w.go('m'); const n=d.querySelectorAll('#manualList details').length; if(n<2) throw new Error('n='+n); if(d.querySelectorAll('#manualList .manual-video').length!==n) throw new Error('video card count'); if(!/E07/.test(d.getElementById('manualList').textContent)) throw new Error('no e07'); if(!/Still need help|还没解决/.test(d.querySelector('.manual-support-link').textContent)) throw new Error('support link'); w.goBack(); });
step('full manual opens as a scrollable document with AI reader',()=>{ w.go('m'); w.openManualDoc(); if(vis()!=='d') throw new Error(vis()); if(!/Operating & maintenance manual|操作与维护说明书/.test(d.getElementById('manualDoc').textContent)) throw new Error('manual title'); if(d.querySelectorAll('#manualDoc .manual-video').length!==d.querySelectorAll('#manualList details').length) throw new Error('doc video cards'); if(!d.getElementById('manualChat').textContent) throw new Error('AI greeting'); if(!d.getElementById('manualAsk')) throw new Error('AI input'); });
d.getElementById('manualAsk').value='Belt lubrication'; w.askManual();
await wait(800);
step('manual AI reader answers from the document',()=>{ const txt=d.getElementById('manualChat').textContent; if(!/Belt drifting|adjustment bolts/.test(txt)) throw new Error(txt); });
w.goBack(); w.goBack();
step('no category form left: label → entry directly, no chips / description box',()=>{ if(d.getElementById('chips')||d.getElementById('desc')) throw new Error('old form still in DOM'); if(/Send to support/.test(d.body.textContent)) throw new Error('old button label'); });
step('label unreadable → skip still opens a ticket',()=>{ E('serial=null;labelDone=false;ticket=null'); w.go(2); w.skipLabel(); if(vis()!=='3'||!E('ticket')) throw new Error(vis()); if(!E('ticket').id) throw new Error('no id'); if(!JSON.parse(w.localStorage.getItem('as_h5_inbox')).some(x=>x.id===E('ticket').id)) throw new Error('skip ticket not in inbox'); w.localStorage.setItem('as_h5_inbox','[]'); E('ticket=null'); w.go(2); });
step('serial manual entry: bad / wrong model / ok',()=>{ w.go(2); w.showSnEntry(); d.getElementById('snInput').value='abc'; w.checkSn(); if(!d.getElementById('snErr').textContent) throw new Error('no err'); d.getElementById('snInput').value='SM9-24B-00931'; w.checkSn(); if(!/different model|另一个型号/.test(d.getElementById('snErr').textContent)) throw new Error('wrong model msg'); d.getElementById('snInput').value='tr6-24a-00988'; w.checkSn(); if(!E('serial')||E('serial').order!=='PO-24097') throw new Error('order'); if(!/FitHaus/.test(d.getElementById('labelResult').textContent)) throw new Error('dealer'); });

/* ---------- 第一步：只说明"可以怎么描述问题"，两种方式 --------------------------------------------------- */
step('start → step 1 (how) with two ways, no action form',()=>{ E('ticket=null'); w.go(2); w.startChat(); if(vis()!=='3') throw new Error(vis()); if(stage()!=='how') throw new Error(stage());
  if(!E('ticket')) throw new Error('no ticket before first word'); const box=JSON.parse(w.localStorage.getItem('as_h5_inbox')); if(!box.length||box[0].id!==E('ticket').id) throw new Error('ticket not written to inbox at open');
  const btns=howBtns(); if(btns.length!==2) throw new Error('how buttons '+btns.length);
  if(!btns[0].classList.contains('how-primary')||!btns[1].classList.contains('how-combo')) throw new Error('action hierarchy');
  if(!/8 seconds|8 秒/.test(btns[0].textContent)) throw new Error('video copy: '+btns[0].textContent);
  if(!/photo|照片/i.test(btns[1].textContent)||!/voice|语音|文字/i.test(btns[1].textContent)) throw new Error('combined photo/note copy: '+btns[1].textContent);
  if(!d.querySelector('[data-s="how"] .how-hero img[data-img="engineer"]')) throw new Error('engineer hero missing');
  if(d.querySelector('[data-s="how"] [data-i="how_s"]')||/Pick one|选一种就行/.test(d.querySelector('[data-s="how"]').textContent)) throw new Error('removed helper copy still present');
  if(!d.querySelector('[data-s="how"] .how-sheet .how-list')) throw new Error('bottom action sheet missing');
  if(d.querySelector('[data-s="how"] .tipbox')||d.querySelector('[data-s="how"] [data-i="how_foot"]')) throw new Error('removed helper copy still present');
  if(d.querySelector('[data-s="how"] .stg-foot')) throw new Error('old foot bar with pick-one confirm still there'); });
step('half-screen stage is gone: no sheet, no spots row under the viewfinder',()=>{ if(d.querySelector('.cam-sheet')||d.getElementById('spots')) throw new Error('old half-screen layout still in DOM'); if(!d.getElementById('camVideo')||!d.getElementById('camShutter')&&!d.getElementById('shutter')) throw new Error('camera not built'); });

/* ---------- 第二步：全屏相机（jsdom 没有 getUserMedia → 自动演示画面） ---------- */
step('video card → full-screen camera in video mode, demo view flagged',()=>{ howBtns()[0].click(); if(stage()!=='aim') throw new Error(stage()); if(E('camMode')!=='video') throw new Error(E('camMode'));
  if(d.getElementById('camWrap').classList.contains('live')) throw new Error('should not be live without getUserMedia');
  if(d.getElementById('camDemo').style.display==='none') throw new Error('demo chip hidden');
  if(!d.getElementById('camImg').src) throw new Error('demo image not set');
  if(!d.getElementById('modeVideo').classList.contains('on')) throw new Error('video tab not active'); });
step('camera selector shows a placeholder first, then the chosen issue; guidance follows it',()=>{ const spot=d.getElementById('camSpot'); if(!/Choose an issue or part/.test(spot.textContent)) throw new Error('selector copy: '+spot.textContent); if(d.querySelector('[data-i="cam_auto"]')||/Auto-blur/.test(d.getElementById('camWrap').textContent)) throw new Error('auto-blur still present');
  const oldSpot=E('spotId'); const next=E("spotList().find(k=>k.id!=='"+oldSpot+"')?.id"); if(!next) throw new Error('no alternate spot'); w.pickSpot(next);
  const expected=E("SPOT_META['"+next+"'].aim.en"); if(d.getElementById('camTip').textContent!==expected) throw new Error('guidance did not update: '+d.getElementById('camTip').textContent);
  const picked=E("spotLabel(spotList().find(k=>k.id==='"+next+"'),'en')"); if(!spot.textContent.includes(picked)) throw new Error('selector did not show chosen issue: '+spot.textContent);
  E("spotPicked=false; spotId='"+oldSpot+"'; renderSpots()"); });
step('recording runs to 8 s label and stop makes one clip',()=>{ w.recordClip(); if(!E('clipOn')) throw new Error('not recording'); if(d.getElementById('recTime').textContent!=='00:08') throw new Error(d.getElementById('recTime').textContent);
  if(!d.getElementById('recRing').classList.contains('on')) throw new Error('ring hidden'); w.clipStop(); if(E('clipOn')) throw new Error('still on');
  const kinds=E('shots.map(s=>s.kind)'); if(kinds.join()!=='clip') throw new Error(kinds.join()); if(d.getElementById('toAnalyze').disabled) throw new Error('analyze still disabled'); });
step('shutter while recording stops early',()=>{ w.recordClip(); w.shoot(); if(E('clipOn')) throw new Error('still recording'); if(E('shots').length!==2) throw new Error('shot count '+E('shots').length); });
step('photo tab → shutter opens a photo review with preview and add-photo affordance',()=>{ w.setCamMode('photo'); if(!d.getElementById('modePhoto').classList.contains('on')) throw new Error('photo tab'); w.shoot();
  if(E('shots').at(-1).kind!=='photo') throw new Error('not photo'); if(stage()!=='photo-review') throw new Error(stage()); if(!d.getElementById('reviewPhoto').src) throw new Error('review preview missing'); if(!d.getElementById('reviewStrip').querySelector('.review-thumb.add')) throw new Error('add photo missing');
  if(!d.querySelector('.review-note-action[data-mode="voice"]')||!d.querySelector('.review-note-action[data-mode="text"]')) throw new Error('note actions missing'); w.addReviewPhoto(); if(stage()!=='aim'||E('cameraReturn')!=='photo-review') throw new Error('add photo did not reopen camera'); w.exitCamera(); if(stage()!=='photo-review') throw new Error('camera close did not return to review'); });
step('photo review accepts optional voice/text notes before analysis',()=>{ w.openReviewNote('voice'); w.toggleReviewVoice(); if(!E('reviewVoiceOn')) throw new Error('voice did not start'); w.toggleReviewVoice(); if(!E('reviewVoiceAttached')) throw new Error('voice note not attached'); w.openReviewNote('text'); d.getElementById('reviewNoteText').value='拍照时补一句'; w.saveReviewNote(); if(E('reviewNoteText')!=='拍照时补一句') throw new Error(E('reviewNoteText')); w.analyzePhotoReview(); if(stage()!=='analyzing') throw new Error(stage()); });
await wait(2200);
step('confirm shows the region and separate photo / clip badges',()=>{ if(stage()!=='confirm') throw new Error(stage()); const t=d.getElementById('seeBadges').textContent; if(!/1 × (Photo|照片)/.test(t)||!/2 × (Clip|视频)/.test(t)) throw new Error(t); if(/undefined|NaN/.test(d.getElementById('seeBadges').textContent)) throw new Error('badge text '+t); });
step('close camera goes back to step 1 and stops the stream',()=>{ E("setStage('aim'); cameraReturn='how'"); w.exitCamera(); if(stage()!=='how') throw new Error(stage()); if(E('camStream')!==null) throw new Error('stream not stopped'); });
step('combined photo/note card opens photo camera',()=>{ howBtns()[1].click(); if(stage()!=='aim') throw new Error(stage()); if(E('camMode')!=='photo'||E('photoNoteMode')!==true) throw new Error(E('camMode')); E("shots=[{kind:'photo',spot:spotId,t:Date.now()}]; renderShots()"); w.startAnalyze(); });
await wait(2200);
step('photo confirmation offers words or voice',()=>{ if(stage()!=='confirm') throw new Error(stage()); const b=d.getElementById('photoNoteBtn'); if(!b||b.style.display==='none') throw new Error('note action hidden'); b.click(); if(stage()!=='text') throw new Error(stage()); if(d.getElementById('txTitle').textContent!=='Add words or voice') throw new Error(d.getElementById('txTitle').textContent); });
step('chat composer is voice-first with keyboard switch',()=>{ if(vis()!=='3') throw new Error(vis()); const q=d.querySelector('#q1'); if(!q) throw new Error('quick actions missing'); const labels=[...q.querySelectorAll('button')].map(b=>b.textContent); if(!/Add a photo or video/.test(labels[0])) throw new Error('video chip order: '+labels.join('|')); if(d.getElementById('ta').placeholder!=='Describe your issue') throw new Error('placeholder: '+d.getElementById('ta').placeholder); if(!d.getElementById('voiceBtn')||!d.querySelector('.composer .voice-main')||!d.getElementById('keyboardBtn')) throw new Error('voice-first controls missing'); if(d.getElementById('composer').classList.contains('text-mode')) throw new Error('not voice mode by default'); w.toggleInputMode(); if(!d.getElementById('composer').classList.contains('text-mode')||d.getElementById('keyboardBtn').getAttribute('aria-label')!=='Switch to voice') throw new Error('keyboard mode'); w.toggleInputMode(); if(d.getElementById('composer').classList.contains('text-mode')) throw new Error('voice mode not restored'); });

/* ---------- 对话兜底 + 真引擎 ---------- */
step('voice chip opens the camera (photo) from the chat',()=>{ E("E_backToShot=backToShot; openText()"); howBtns.length; w.enterCamera('photo'); if(stage()!=='aim') throw new Error(stage()); E("camGen++; stopLiveCam(); setStage('text')"); });
step('customer describes the problem in chat (E07, de)',()=>{ d.getElementById('ta').value='Laufband stoppt nach 10 Minuten mit Fehlercode E07'; w.sendMsg(); if(!E("ticket.transcript.some(m=>m.who==='cust'&&/Laufband stoppt/.test(m.text))")&&E('ticket.issue')!=='E07 电机过热停机') throw new Error('issue '+E('ticket').issue); });
await wait(1600);
step('AI replied in German with video solution card',()=>{ const ai=lastAI(); if(!/E07/.test(ai)) throw new Error('no reply'); if(!/Überhitzung|Steuer/.test(ai)) throw new Error('not german: '+ai.slice(0,80)); if(!d.querySelector('.stepcard')||!/[Ss]ilicone|Silikonöl|lubricant|Motor/.test(d.querySelector('.stepcard').textContent)) throw new Error('no stepcard: '+(d.querySelector('.stepcard')||{}).textContent); if(E('ticket').kbId!=='e07') throw new Error('kb '+E('ticket').kbId); });
step('inbox written',()=>{ const box=JSON.parse(w.localStorage.getItem('as_h5_inbox')); if(!box.length||box[0].product!=='TR-650'||box[0].sn!=='TR6-24A-00988') throw new Error(JSON.stringify(box[0])); });
step('"Danke, aber immer noch E07" → notfixed, not solved',()=>{ d.getElementById('ta').value='Danke, aber immer noch E07 nach 5 Minuten'; w.sendMsg(); });
await wait(1300);
step('status human + banner',()=>{ if(E('ticket').status!=='human') throw new Error(E('ticket').status); });
step('after handover, typing does not restart the AI',()=>{ d.getElementById('ta').value='Also the belt squeaks'; w.sendMsg(); });
await wait(1300);
step('→ noted, still human',()=>{ if(E('ticket').status!=='human') throw new Error(E('ticket').status); if(!/Noted/.test(lastAI())) throw new Error(lastAI()); });
step('wrap-up email + rating',()=>{ w.go(4); if(!/T-\d{4}-9\d{3}/.test(d.getElementById('h5title').textContent)) throw new Error('title'); d.getElementById('email').value='bad'; w.saveEmail(); if(E('ticket').email) throw new Error('accepted bad'); d.getElementById('email').value='lena@web.de'; w.saveEmail(); w.rate(4); const box=JSON.parse(w.localStorage.getItem('as_h5_inbox')); if(box[0].email!=='lena@web.de'||box[0].rating!==4||box[0].status!=='human') throw new Error(JSON.stringify(box[0])); });
step('track finds it',()=>{ w.go('t'); d.getElementById('trackInput').value=E('ticket').id; w.track(); if(!/T-/.test(d.getElementById('trackResult').textContent)) throw new Error('not found'); });

/* ---------- flow 2：zh 跑带 → 直接回复 → "解决了" ---------- */
step('zh belt flow',()=>{ w.setLang('zh');
  if(d.getElementById('ta').placeholder!=='描述您遇到的问题') throw new Error('zh placeholder'); E('serial=null;labelDone=false;ticket=null;shots=[]'); w.go(2); w.showSnEntry(); d.getElementById('snInput').value='TR6-24C-00100'; w.checkSn(); if(E('serial').order!=='PO-24122') throw new Error('24C order'); w.startChat(); w.openText(); if(d.getElementById('ta').placeholder!=='描述您遇到的问题') throw new Error('zh placeholder'); if(!/补一张照片或视频/.test([...d.querySelectorAll('#q1 button')][0].textContent)) throw new Error('zh video chip: '+[...d.querySelectorAll('#q1 button')][0].textContent); d.getElementById('ta').value='跑带偏了，怎么润滑'; w.sendMsg(); });
await wait(1500);
step('zh belt → direct reply, no “你好，你好”',()=>{ const txt=chat(); if(E('ticket').kbId!=='belt') throw new Error('kb '+E('ticket').kbId); if(!/调节螺栓|润滑/.test(txt)) throw new Error('no zh steps'); if(/你好，你好/.test(txt)) throw new Error('double greeting'); if(!d.querySelector('#q1')) throw new Error('no quick'); });
step('"谢谢，但还是偏" → notfixed',()=>{ d.getElementById('ta').value='谢谢，但还是偏'; w.sendMsg(); });
await wait(1300);
step('→ human, not done',()=>{ if(E('ticket').status!=='human') throw new Error(E('ticket').status); });

/* ---------- flow 3：安装问题追问上限 ---------- */
step('zh assembly question in chat → ask',()=>{ E("ticket=null; asks=0; lastAction=null"); w.startChat(); w.openText(); d.getElementById('ta').value='安装不会装'; w.sendMsg(); });
await wait(1500);
await wait(600);
step('first reply is a question (ask), asks=1',()=>{ if(E('lastAction')!=='ask'||E('asks')!==1) throw new Error(E('lastAction')+' '+E('asks')); });
step('"左边装不上去" after an ask is re-assessed, not “方案无效”',()=>{ d.getElementById('ta').value='左边那根横梁装不上去'; w.sendMsg(); });
await wait(1300);
step('→ still ask / no notfixed message',()=>{ if(/不再猜了/.test(lastAI())) throw new Error('notfixed fired without a fix'); });
step('third ask → handover (limit 2)',()=>{ d.getElementById('ta').value='还是不知道怎么装'; w.sendMsg(); });
await wait(2200);
step('→ human after 2 asks',()=>{ if(E('ticket').status!=='human') throw new Error(E('ticket').status+' asks='+E('asks')); });

/* ---------- flow 4：无序列号 / 说明书转人工 / 重置 ---------- */
step('no-serial chat shows no dealer guess',()=>{ E("ticket=null; asks=0; lastAction=null; serial=null; labelDone=false; shots=[]"); w.startChat(); w.openText(); if(/FitHaus|NordicGym/.test(d.querySelector('.sysnote').textContent)) throw new Error('dealer guessed'); d.getElementById('ta').value='跑带偏了'; w.sendMsg(); });
await wait(1500);
step('solved → done',()=>{ d.getElementById('ta').value='解决了，谢谢'; w.sendMsg(); });
await wait(1300);
step('done status',()=>{ if(E('ticket').status!=='done') throw new Error(E('ticket').status); });
step('manual support link starts a human conversation',()=>{ E('ticket=null'); w.go(1); w.go('m'); w.contactSupportFromManual(); if(vis()!=='3') throw new Error(vis()); if(E('ticket').status!=='human') throw new Error(E('ticket').status); });
step('handoff keeps one flow and carries an optional engineer note',()=>{ const title=d.querySelector('[data-s="handoff"] [data-i="h_t"]').textContent; if(title!=='由我们的售后人员接手') throw new Error(title); const role=d.querySelector('[data-s="handoff"] [data-i="tech_role"]').textContent; if(!/IronPeak 售后工程师/.test(role)||/你的语言/.test(role)) throw new Error(role); if(!/通常 4 小时/.test(d.getElementById('techOn').textContent)) throw new Error(d.getElementById('techOn').textContent); if(d.getElementById('hRoutes')||d.querySelector('.routes')||d.querySelector('[data-i="h_foot"]')) throw new Error('old handoff choices remain'); const note=d.getElementById('handoffNote'); if(!note) throw new Error('engineer note missing'); note.value='周六上午方便联系'; w.saveHandoffNote(note.value); w.handoffGo(); if(vis()!=='4') throw new Error(vis()); if(E('ticket').route!=='engineer') throw new Error(E('ticket').route); if(E('ticket').handoffNote!=='周六上午方便联系') throw new Error(E('ticket').handoffNote); const box=JSON.parse(w.localStorage.getItem('as_h5_inbox')); const rec=box.find(x=>x.id===E('ticket').id); if(!rec||rec.handoffNote!=='周六上午方便联系') throw new Error(JSON.stringify(rec)); if(!/通常 4 小时内联系/.test(d.getElementById('h5sum').textContent)) throw new Error(d.getElementById('h5sum').textContent); });
step('reset returns to first screen, clears media and closes the camera',()=>{ E("shots.push({kind:'photo',spot:spotId,url:'blob:x'})"); w.resetDemo(); if(vis()!=='0') throw new Error('view '+vis()); if(E('ticket')!==null) throw new Error('ticket not cleared'); if(E('serial')!==null||E('labelDone')!==false) throw new Error('label state not cleared'); if(E('shots').length!==0) throw new Error('shots not cleared'); if(E('camStream')!==null||E('clipOn')) throw new Error('camera not closed'); if(E('stage')!=='how') throw new Error('stage '+E('stage')); if(E('hist').length!==0) throw new Error('history'); if(d.getElementById('chat').textContent!=='') throw new Error('chat not cleared'); if(d.getElementById('ta').value!=='') throw new Error('composer not cleared'); if(E('inputMode')!=='voice'||E('voiceOn')!==false) throw new Error('voice mode not reset'); if(d.getElementById('resetDemo').getAttribute('aria-label')!=='重置演示') throw new Error('reset label'); });

/* ---------- 合并会话：判断 + 分步指导 ---------- */
const errorsC=[]; const vcC=new VirtualConsole(); vcC.on('jsdomError',e=>errorsC.push(e.message));
const domC=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=TR-650&go=guide&spot=belt&sn=TR6-24A-00988',pretendToBeVisual:true,virtualConsole:vcC});
await wait(3400);
const wC=domC.window, dC=wC.document;
step('combined consult replaces verdict + guide stages',()=>{ if(wC.eval('stage')!=='consult') throw new Error(wC.eval('stage')); if(!dC.querySelector('[data-s="consult"]')) throw new Error('consult missing'); if(dC.querySelector('[data-s="verdict"]')||dC.querySelector('[data-s="guide"]')) throw new Error('old stages remain'); const img=dC.getElementById('consultImg'); if(!img||!img.src) throw new Error('evidence image missing'); if(!dC.getElementById('consultChat').textContent) throw new Error('chat empty'); });
step('judgment bubble carries finding, risk, confidence and expandable basis',()=>{ const row=dC.querySelector('.judgment-row'); if(!row) throw new Error('judgment missing'); if(!/Low risk|低风险/.test(row.textContent)) throw new Error('risk missing'); if(!/95%/.test(row.textContent)) throw new Error('confidence missing'); const why=row.querySelector('details.consult-why'); if(!why||why.open) throw new Error('why collapsed'); why.open=true; if(!/KB belt|知识库 belt/.test(why.textContent)||!/Threshold|判断门槛/.test(why.textContent)) throw new Error('basis missing'); });
step('only the current step is added, with actions and no separate text-screen jump',()=>{ const steps=dC.querySelectorAll('#consultChat .consult-step'); if(steps.length!==1) throw new Error('steps '+steps.length); if(steps[0].dataset.step!=='0') throw new Error('step index'); const actions=[...dC.querySelectorAll('#consultActions button')].map(b=>b.textContent); if(!/好了，继续|Okay, next/.test(actions[0]||'')||!/卡住|stuck/.test(actions[1]||'')) throw new Error(JSON.stringify(actions)); if(dC.querySelector('[data-s="consult"] .iconbtn[onclick="openText()"]')) throw new Error('old text shortcut remains'); });
step('evidence header can collapse and reopen',()=>{ const ev=dC.getElementById('consultEvidence'); wC.toggleConsultEvidence(); if(!ev.classList.contains('compact')||ev.getAttribute('aria-expanded')!=='false') throw new Error('collapse failed'); wC.toggleConsultEvidence(); if(ev.classList.contains('compact')||ev.getAttribute('aria-expanded')!=='true') throw new Error('expand failed'); });
step('double completion tap advances exactly one step',()=>{ wC.consultUserDone(); wC.consultUserDone(); });
await wait(1500);
step('step 1 completed once, step 2 shown, transcript recorded',()=>{ if(wC.eval('ticket.stepsDone')!==1) throw new Error('stepsDone '+wC.eval('ticket.stepsDone')); if(dC.querySelectorAll('#consultChat .consult-step').length!==2) throw new Error('step bubbles '+dC.querySelectorAll('#consultChat .consult-step').length); if(!dC.querySelector('#consultChat .consult-step[data-step="0"]').classList.contains('done')) throw new Error('step 1 not marked done'); if(!wC.eval("ticket.transcript.some(m=>m.who==='sys'&&/完成第 1/.test(m.text))")) throw new Error('system transcript missing'); const txt=dC.getElementById('consultChat').textContent; if(/第 1 步完成|接下来是第 2 步/.test(txt)) throw new Error('robotic status copy remains'); if(!/接着往下走/.test(txt)) throw new Error('organic transition missing'); });
step('keyboard input “下一步” advances the guided conversation',()=>{ wC.toggleConsultInputMode(); if(!dC.getElementById('consultComposer').classList.contains('text-mode')) throw new Error('text mode missing'); dC.getElementById('consultTa').value='下一步'; wC.sendConsultMsg(); });
await wait(1500);
step('text intent reached step 3',()=>{ if(wC.eval('ticket.stepsDone')!==2) throw new Error('stepsDone '+wC.eval('ticket.stepsDone')); if(dC.querySelectorAll('#consultChat .consult-step').length!==3) throw new Error('steps '+dC.querySelectorAll('#consultChat .consult-step').length); if(!dC.getElementById('consultContext').textContent) throw new Error('context missing'); });
step('voice starts and stops with a simulated transcript state',()=>{ wC.toggleConsultVoice(); if(dC.getElementById('consultVoiceBtn').getAttribute('aria-pressed')!=='true') throw new Error('not recording'); wC.toggleConsultVoice(); });
await wait(1800);
step('simulated voice completes the final step and offers outcome CTA',()=>{ if(wC.eval('ticket.stepsDone')!==3) throw new Error('stepsDone '+wC.eval('ticket.stepsDone')); if(!wC.eval("ticket.transcript.some(m=>m.tr==='模拟语音转写')")) throw new Error('voice transcript missing'); if(!/模拟语音/.test(dC.querySelector('.consult-row.me')?.parentElement.textContent||'')) throw new Error('voice label missing'); const action=dC.querySelector('#consultActions button'); if(!action||!/看看现在的情况|See how it’s doing/.test(action.textContent)) throw new Error(action&&action.textContent); action.click(); });
await wait(120);
step('final CTA opens the existing outcome stage, not another guide screen',()=>{ if(wC.eval('stage')!=='outcome') throw new Error(wC.eval('stage')); if(!dC.querySelector('[data-s="outcome"] h1')) throw new Error('outcome missing'); if(errorsC.length) throw new Error(errorsC[0]); });
domC.window.close();

/* ---------- 卡住：先简化，再转人工 ---------- */
const domS=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=TR-650&go=guide&spot=belt&sn=TR6-24A-00988',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
await wait(3400);
const wS=domS.window, dS=wS.document;
step('first “stuck” keeps the conversation and simplifies the step',()=>{ wS.consultUserStuck(); });
await wait(850);
step('simplified help appears with video and a second-stuck option',()=>{ if(!/没事|No problem/.test(dS.getElementById('consultChat').textContent)) throw new Error('simplified help missing'); const labels=[...dS.querySelectorAll('#consultActions button')].map(b=>b.textContent); if(!labels.some(x=>/还是不行|Still stuck/.test(x))) throw new Error(JSON.stringify(labels)); if(!labels.some(x=>/看演示|Watch demo/.test(x))) throw new Error('video action missing'); });
step('second “stuck” on the same step hands off to a person',()=>{ wS.consultStuckAgain(); });
await wait(1450);
step('stuck branch reaches handoff with human status',()=>{ if(wS.eval('stage')!=='handoff') throw new Error(wS.eval('stage')); if(wS.eval('ticket.status')!=='human') throw new Error(wS.eval('ticket.status')); if(wS.eval('ticket.stepsDone')!==0) throw new Error('stepsDone '+wS.eval('ticket.stepsDone')); });
domS.window.close();

/* ---------- 安全件：不生成自助步骤，直接进入安全说明 ---------- */
const domSafe=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900&go=guide&spot=cable&sn=SM9-24B-00931',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
await wait(3400);
const wSafe=domSafe.window, dSafe=wSafe.document;
step('safety route shows judgment without step bubbles',()=>{ if(wSafe.eval('stage')!=='consult') throw new Error(wSafe.eval('stage')); if(dSafe.querySelectorAll('#consultChat .consult-step').length!==0) throw new Error('unsafe steps generated'); if(!/停止|安全|Stop|safety/.test(dSafe.getElementById('consultChat').textContent)) throw new Error('safety copy missing'); const action=dSafe.querySelector('#consultActions button'); if(!action||!/交给售后工程师|support engineer/.test(action.textContent)) throw new Error(action&&action.textContent); action.click(); });
await wait(120);
step('safety CTA opens the stop-use screen',()=>{ if(wSafe.eval('stage')!=='safety') throw new Error(wSafe.eval('stage')); if(!dSafe.getElementById('sfList').textContent) throw new Error('safety list missing'); });
domSafe.window.close();

/* ---------- 低置信度：不生成步骤，要求补拍或转人 ---------- */
const domAsk=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900&go=guide&spot=assembly&sn=SM9-24B-00931',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
await wait(3400);
const wAsk=domAsk.window, dAsk=wAsk.document;
step('low-confidence ask stays conversational and blocks unsafe step generation',()=>{ if(wAsk.eval('assess.action')!=='ask') throw new Error(wAsk.eval('assess.action')); if(dAsk.querySelectorAll('#consultChat .consult-step').length!==0) throw new Error('steps generated for ask'); if(!/再看清楚一点|see a little more/.test(dAsk.getElementById('consultChat').textContent)) throw new Error('ask copy missing'); const labels=[...dAsk.querySelectorAll('#consultActions button')].map(b=>b.textContent); if(!labels.some(x=>/再补拍|one more angle/.test(x))||!labels.some(x=>/交给售后工程师|support engineer/.test(x))) throw new Error(JSON.stringify(labels)); });
domAsk.window.close();

/* ---------- regression：默认页面上"跑带偏了，怎么润滑"必须命中跑带视频 ---------- */
const errors2=[]; const vc2=new VirtualConsole(); vc2.on('jsdomError',e=>errors2.push(e.message));
const dom2=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900&go=chat&sn=SM9-24B-00955',pretendToBeVisual:true,virtualConsole:vc2});
await wait(300);
step('scanned model badge follows the URL model',()=>{ const d2=dom2.window.document; const badge=d2.querySelector('.hero-model'); const label=d2.getElementById('heroModel').textContent; if(!badge||!/史密斯机 SM-900/.test(label)) throw new Error(label); });
dom2.window.openText();
dom2.window.document.getElementById('ta').value='跑带偏了，怎么润滑';
dom2.window.sendMsg();
await wait(2000);
step('SM-900 + belt lubrication → forced belt video solution',()=>{ const w2=dom2.window,d2=w2.document; if(w2.eval('ticket.kbId')!=='belt') throw new Error(w2.eval('ticket.kbId')); const sc=d2.querySelector('.stepcard'); if(!sc||!/调节螺栓/.test(sc.textContent)||!/观看视频/.test(sc.textContent)) throw new Error(sc&&sc.textContent.slice(0,120)); if(errors2.length) throw new Error(errors2[0]); });
dom2.window.close();

/* ---------- regression：?go=shot 演示直链直接打开相机 ---------- */
const dom3=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900&go=shot&mode=photo',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
await wait(250);
step('?go=shot deep link lands in the full-screen camera (photo)',()=>{ const w3=dom3.window; if(w3.eval('stage')!=='aim') throw new Error(w3.eval('stage')); if(w3.eval('camMode')!=='photo') throw new Error(w3.eval('camMode')); });
dom3.window.close();

console.log('errors:',errors.length?errors:'none'); w.close(); process.exit(0);
})();
