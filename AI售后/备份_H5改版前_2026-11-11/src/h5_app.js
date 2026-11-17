/* ================= H5 扫码端（真实逻辑） ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const INBOX_KEY='as_h5_inbox', STORE_KEY='as_state';
const qs=new URLSearchParams(location.search);
let adminState=null; try{ adminState=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch(e){}
const settings=Object.assign({brandColor:'#0E7A6C',h5Langs:['en','de','es','fr','it','sv'],h5Email:true,h5App:false},adminState?adminState.settings:{},(typeof Policy!=='undefined'?Policy.view():{threshold:85,rules:{safety:true,refund:true,negative:true,b2b:false},promise:{smallParts:true,bigParts:false,videos:true}}));
if(adminState&&Array.isArray(adminState.orders)&&adminState.orders.length) Engine.setOrders(adminState.orders);
const model=(qs.get('m')||'SM-900').toUpperCase(); const product=Engine.PRODUCTS.find(p=>p.id===model)||Engine.PRODUCTS[0];
const productOrders=Engine.ordersFor(product.id);   // 该型号的全部订单；扫标签前不知道客户属于哪一张，所以页面上不显示分销商
document.documentElement.style.setProperty('--brand',settings.brandColor);
document.documentElement.style.setProperty('--brand-ink',shade(settings.brandColor,-18));
document.documentElement.style.setProperty('--brand-soft',tint(settings.brandColor));
function shade(hex,p){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+Math.round(255*p/100),g=((n>>8)&255)+Math.round(255*p/100),b=(n&255)+Math.round(255*p/100); const c=v=>Math.max(0,Math.min(255,v)); return '#'+[c(r),c(g),c(b)].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function tint(hex){ const n=parseInt(hex.slice(1),16); const r=n>>16,g=(n>>8)&255,b=n&255; return `rgba(${r},${g},${b},.12)`; }

/* ---------- 文案 ---------- */
const I18N={
en:{ cap_title:'Scan-to-help H5', cap_p:'What a customer sees after scanning the fixed support QR printed next to the product label. No app, no login. Everything below runs on real logic: the camera, the serial-number check, the assistant\'s answers and the request that lands in the brand back office.',
  cap_hint:'Click through the phone. Requests you create here show up in the back-office prototype (same browser) under 工单处理.',
  flow:['Choose language','Photo of the label → model & serial','Chat','Save the conversation · rate'],
  brand:'IronPeak Support', prod:`${product.series.en} ${product.id}`, prod_sub:'IronPeak Fitness · support for this model',
  h0:'Hi. What do you need help with?', l0:"Most questions are answered in a few minutes. A person steps in whenever the assistant can't help.",
  o1:'Report a problem or get repair help', o2:'Open the manual and assembly videos', o3:'Check an existing request', note0:'Replies in your language · 24 h response commitment',
  h1:'Choose your language', l1:`Support for ${product.series.en} ${product.id}. We'll reply in the language you pick; you can type in any language anyway.`,
  h2:'Take a photo of the product label', l2:"It's the silver sticker next to this QR code, usually on the rear upright. We read the model and serial number so you don't have to type them.",
  h2b:'Is this your machine?', l2b:'We matched the label to an order, so the right people see your request straight away.',
  hint:'Fit the whole label inside the frame', hint_busy:'Reading the label…', hint_ok:'Got it', hint_fail:'Couldn\'t read a serial number — try again or type it',
  ok:'✓ Label recognised', k_model:'Model', k_sn:'Serial number', k_via:'Purchased via', k_war:'Warranty', k_batch:'Batch', war_active:'Active until', war_unknown:'Not on record',
  b_snap:'Take photo', b_type:'Type the serial number instead', b_skip_label:'No label? Start without it', b_start:'Start chat', b_retake:'Not right — retake photo', b_check:'Check serial number', sn_ph:'e.g. SM9-24B-00931', sn_bad:'That doesn\'t look like an IronPeak serial (format AA0-00A-00000)', sn_wrong:'This serial belongs to a different model', sn_noorder:'Serial format is valid but we have no order on record — a person will check the warranty', reset_label:'Reset demo', reset_done:'Demo reset',
  ph_msg:'Describe your issue', need_desc:'Please describe the problem in a few words', voice_label:'Voice input', voice_start:'Recording—tap again to stop', voice_stop:'Voice input stopped (prototype)', voice_prompt:'Tap to speak', voice_hint:'Tell us what is happening', voice_listening:'Listening…', voice_hint_listening:'Tap again to stop', switch_text:'Switch to keyboard', switch_voice:'Switch to voice',
  k_ticket:'Request', k_ticket_new:(id)=>`Request ${id} created for you`, l_ticket:(who)=>`AI and our support team will work together to help you.`,
  c_open:(id)=>`Hi—your request ${id} is ready, and the product label details are already attached. What's going on with it? A sentence is enough; a photo or short video helps too.`,
  h5:'Request {id} is logged', l5:'Leave your email and we\'ll send updates and this conversation, so nothing is lost when you close this page.',
  k_email:'Email', ph_email:'you@example.com', b_save:'Save and email me updates', b_app:'Get the IronPeak app', k_rate:'How was this so far?', email_bad:'Please enter a valid email', saved:'Saved. Updates will go to ', thanks:'Thanks for the feedback',
  t_attach:'Photo added — the assistant will use it', t_manual_pdf:'Prototype: the full PDF manual opens here',
  // chat
  c_sys:(sr)=>`${product.series.en} ${product.id} · ${sr?sr.sn:'serial not provided'} · ${sr&&sr.dealer?sr.dealer:'IronPeak'}`, c_photo:(n)=>`${n} photo${n>1?'s':''} attached`, c_video:'Video attached', c_video_intro:(issue)=>`Your issue is “${issue}”. Watch the video below to try solving it.`, video_label:'Video solution', video_play:'Playing video (prototype)', c_meta:'Support assistant · just now',
  q_self:'Send the part, I\'ll fit it myself', q_tech:'I\'d rather have a technician', q_person:'Talk to a person', q_video:'Send a video', q_photo:'Add a photo', q_solved:'That fixed it', q_notfixed:'Still not working', q_save:'Save this conversation', q_more:'One more question',
  c_handover:(name,h)=>`Handing over to ${name} at IronPeak support. They usually reply within ${h} hours; you'll get an email as soon as they do.`,
  c_logged:(id)=>`Your request is logged as ${id} with your photos and serial number, so you won't need to repeat anything.`,
  c_ship:(part,dealer,id)=>`Done. A new ${part} ships from ${dealer} to the address on your order; you'll get the tracking number by email. Request number: ${id}. Anything else about the machine?`,
  c_tech:(name,h)=>`Understood — I've asked ${name} to arrange a technician visit through your dealer. They'll confirm a date within ${h} hours by email.`,
  c_solved:'Great, glad that fixed it. I\'ll close this request; you can always reopen it by replying to the email.',
  c_notfixed:(name,h)=>`Sorry about that. Since the first fix didn't work I'm not going to guess again — ${name} from our team will look at your photos and reply within ${h} hours.`,
  c_more:'Sure — go ahead. If it\'s about a different part, a photo helps me find the right guide.',
  c_noted:'Noted — I\'ve added this to your request so the person handling it sees it. No need to repeat anything.',
  steps_t:'Steps', watch:'Watch', human_tag:'A person is now on this',
  // track
  h_track:'Check a request', l_track:'Enter the request number from your email, e.g. T-2611-0312.', b_track:'Look up', track_none:'No request with that number. Check the email we sent you.', st:{ai:'Being handled by the assistant',human:'With a person at IronPeak',factory:'With the factory team',done:'Resolved'},
  // manual
  h_manual:'Manual & videos', l_manual:`${product.series.en} ${product.id} · common tasks with step-by-step guides.`, b_pdf:'Open full manual', manual_video:'Watch video', manual_video_short:'Video', manual_contact:'Still need help? Contact our support team',
  doc_heading:'Operating & maintenance manual', doc_meta:(id,sn)=>`${id} · ${sn||'serial not provided'} · prototype edition`, doc_contents:'Contents', doc_steps:'Steps', doc_note:'If the issue persists, ask the AI below or contact support.',
  doc_ai_title:'AI manual assistant', doc_ai_hint:'Answers from this manual', doc_ask_ph:'Ask about this manual…', doc_send:'Send question', doc_ai_hello:'Which section can I explain? Ask me directly.', doc_ai_none:'I could not find that section. Try asking about E07, belt lubrication, or assembly.', doc_ai_found:(issue,steps,video)=>`The manual section “${issue}” suggests doing this in order: ${steps.map((s,i)=>`${i+1}. ${s}`).join(' ')}${video?' The video card above demonstrates it.':''} If one step does not work, tell me which one.`,
  re_human:/technician|person|human|someone|agent/i, re_solved:/fixed|solved|works|thank|great|perfect/i, re_photo:/photo|picture|video|attach/i,
},
zh:{ cap_title:'扫码售后 H5', cap_p:'消费者扫描印在产品标签旁的固定售后二维码后看到的页面。不用装 App、不用登录。下面的每一步都是真逻辑：相机取图、序列号校验、助手的回答、以及写入品牌方后台的工单。',
  cap_hint:'直接点手机走流程。在这里创建的工单会出现在后台原型（同一浏览器）的"工单处理"里。',
  flow:['选择语言','拍产品标签 → 型号与序列号','对话','保存对话 · 评价'],
  brand:'IronPeak 售后', prod:`${product.series.zh} ${product.id}`, prod_sub:'IronPeak Fitness · 本型号的售后支持',
  h0:'你好，需要什么帮助？', l0:'大多数问题几分钟内就能解决。助手处理不了的，会有人工接手。',
  o1:'报修或获取维修指导', o2:'查看说明书和安装视频', o3:'查询已有工单进度', note0:'用你的语言回复 · 承诺 24 小时内响应',
  h1:'选择语言', l1:`${product.series.zh} ${product.id} 的售后支持。我们会用你选的语言回复；你用任何语言输入都可以。`,
  h2:'拍一张产品标签的照片', l2:'就是这个二维码旁边的银色贴纸，一般在后立柱上。我们会自动读出型号和序列号，不用你手打。',
  h2b:'是这台设备吗？', l2b:'标签已匹配到订单，相关负责人会立刻看到你的请求。',
  hint:'把整张标签放进取景框', hint_busy:'正在识别标签…', hint_ok:'识别完成', hint_fail:'没读到序列号，再拍一次或手动输入',
  ok:'✓ 标签已识别', k_model:'型号', k_sn:'序列号', k_via:'购买渠道', k_war:'保修', k_batch:'批次', war_active:'有效至', war_unknown:'无记录',
  b_snap:'拍照', b_type:'改为手动输入序列号', b_skip_label:'标签看不清？直接咨询', b_start:'开始咨询', b_retake:'不对，重新拍', b_check:'校验序列号', sn_ph:'例如 SM9-24B-00931', sn_bad:'不像 IronPeak 的序列号（格式 AA0-00A-00000）', sn_wrong:'这个序列号属于另一个型号', sn_noorder:'格式正确但没有对应订单记录，保修情况会由人工核实', reset_label:'重置演示', reset_done:'已重置演示',
  ph_msg:'描述您遇到的问题', need_desc:'请用几句话描述一下问题', voice_label:'语音输入', voice_start:'正在录音，再点一次结束', voice_stop:'语音输入已结束（原型）', voice_prompt:'点按说话', voice_hint:'说说您遇到的问题', voice_listening:'正在听…', voice_hint_listening:'再点一次结束', switch_text:'切换键盘输入', switch_voice:'切换到语音输入',
  k_ticket:'工单号', k_ticket_new:(id)=>`工单 ${id} 已为您建立`, l_ticket:(who)=>`人工智能与人类客服将密切协作，同时为您服务。`,
  c_open:(id)=>`你好，工单 ${id} 已经建好，设备标签信息也带过来了。现在遇到什么问题了？简单说说就行，有照片或视频更好。`,
  h5:'工单 {id} 已受理', l5:'留下邮箱，我们会把进度和这段对话发给你，关掉页面也不会丢。',
  k_email:'邮箱', ph_email:'you@example.com', b_save:'保存并接收邮件更新', b_app:'下载 IronPeak App', k_rate:'到目前为止体验如何？', email_bad:'请输入有效邮箱', saved:'已保存，更新将发送到 ', thanks:'感谢你的反馈',
  t_attach:'照片已添加，助手会参考', t_manual_pdf:'原型：这里打开完整 PDF 说明书',
  c_sys:(sr)=>`${product.series.zh} ${product.id} · ${sr?sr.sn:'未提供序列号'} · ${sr&&sr.dealer?sr.dealer:'IronPeak'}`, c_photo:(n)=>`已附 ${n} 张照片`, c_video:'已附视频', c_video_intro:(issue)=>`您的问题是“${issue}”，您可以查看以下的视频来尝试解决这个问题。`, video_label:'视频解决方案', video_play:'正在播放视频（原型）', c_meta:'售后助手 · 刚刚',
  q_self:'寄零件给我，我自己换', q_tech:'我想要技术人员上门', q_person:'转人工', q_video:'发送视频', q_photo:'补一张照片', q_solved:'解决了', q_notfixed:'还是不行', q_save:'保存这段对话', q_more:'还有一个问题',
  c_handover:(name,h)=>`已转给 IronPeak 售后 ${name}，通常 ${h} 小时内回复，回复后会邮件通知你。`,
  c_logged:(id)=>`你的请求已记录为工单 ${id}，照片和序列号都带上了，不需要再重复说明。`,
  c_ship:(part,dealer,id)=>`已安排。新的${part}将从 ${dealer} 寄到你订单上的地址，物流单号会邮件发你。工单号：${id}。关于这台设备还有别的问题吗？`,
  c_tech:(name,h)=>`好的，我已请 ${name} 通过你的经销商安排技术人员上门，${h} 小时内会邮件确认时间。`,
  c_solved:'太好了。我会关闭这个工单；回复邮件随时可以重新打开。',
  c_notfixed:(name,h)=>`抱歉。第一次的办法没解决，我就不再猜了——我们团队的 ${name} 会看你的照片，${h} 小时内回复。`,
  c_more:'请说。如果是其他零件的问题，拍张照片我能更快找到对应的指引。',
  c_noted:'已收到，这条消息已附到你的工单里，接手的同事会看到，不需要重复说明。',
  steps_t:'步骤', watch:'观看', human_tag:'已有人工接手',
  h_track:'查询工单进度', l_track:'输入邮件里的工单号，例如 T-2611-0312。', b_track:'查询', track_none:'没有这个编号的工单，请核对邮件。', st:{ai:'助手处理中',human:'品牌方人工处理中',factory:'工厂团队处理中',done:'已解决'},
  h_manual:'说明书与视频', l_manual:`${product.series.zh} ${product.id} · 常见操作的分步指引。`, b_pdf:'打开完整说明书', manual_video:'观看视频', manual_video_short:'视频', manual_contact:'还没解决？联系我们的客服',
  doc_heading:'操作与维护说明书', doc_meta:(id,sn)=>`${id} · ${sn||'未提供序列号'} · 原型演示版`, doc_contents:'目录', doc_steps:'操作步骤', doc_note:'如果按步骤处理后仍有异常，可以继续问下方 AI，或联系售后。',
  doc_ai_title:'AI 说明书助手', doc_ai_hint:'基于本说明书回答', doc_ask_ph:'问问 AI，这段说明书怎么看…', doc_send:'发送问题', doc_ai_hello:'说明书里哪一段没看懂？直接问我。', doc_ai_none:'我没定位到对应段落。你可以问“E07 怎么排查”“跑带怎么润滑”或“安装步骤”。', doc_ai_found:(issue,steps,video)=>`说明书里的「${issue}」这一段建议按下面顺序处理：${steps.map((s,i)=>`${i+1}. ${s}`).join(' ')}${video?' 上方的视频卡有更直观的演示。':''}如果哪一步卡住了，直接告诉我。`,
  re_human:/人工|技术人员|上门|真人|客服/, re_solved:/解决|好了|谢谢|可以了|搞定/, re_photo:/照片|图片|视频|拍/,
}};
const LANGS=[['中文','ZH','zh','zh'],['English','EN','en','en'],['Deutsch','DE','en','de'],['Español','ES','en','es'],['Français','FR','en','fr'],['Italiano','IT','en','it'],['Svenska','SV','en','sv']].filter(l=>l[3]==='zh'||l[3]==='en'||settings.h5Langs.includes(l[3]));

// 分类表单已取消：客户不选分类，问题的归类交给 AI 从对话内容判断（Engine.matchKB），
// 分类只作为后台视图里的展示字段存在。


/* ---------- 状态 ---------- */
let ui='zh', badge='ZH', custLang='zh', v=0, hist=[], labelDone=false, serial=null, photos=0, videos=0, photoUrl=null, chatStep=0, asks=0, lastAction=null, voiceOn=false, inputMode='voice';   // lastAction: AI 上一步是 reply / ask / hold
let ticket=null; // {id, createdAt, status, transcript[], email, rating, kbId, issue}
const t=k=>I18N[ui][k];
const T0=(k,...a)=>{ const x=I18N[ui][k]; return typeof x==='function'?x(...a):x; };
// 步骤号：0 语言 · 1 落地 · 2 标签 · 3 对话 · 4 收尾（m/t 是侧路，不计步）
const STEPS=4;
const stepOf=n=>(n==='m'||n==='t'||n==='d')?-1:(n<=1?0:n===2?1:n===3?2:3);   // 落地页、说明书等侧路不改变主流程进度

function setLang(l,b,cl){ ui=l; badge=b||(l==='zh'?'ZH':'EN'); custLang=cl||l; document.documentElement.lang=l==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i]').forEach(el=>{ const val=t(el.dataset.i); if(typeof val==='string') el.textContent=val; });
  $('#langBadge').textContent=badge; $('#tg-zh').classList.toggle('on',l==='zh'); $('#tg-en').classList.toggle('on',l==='en');
  $('#flow').innerHTML=t('flow').map((s,i)=>`<li class="${i===stepOf(v)?'on':''}">${s}</li>`).join(''); $('#stepnote').textContent=stepOf(v)>=0?`${stepOf(v)+1} / ${STEPS} · ${t('flow')[stepOf(v)]}`:'';
  $('#langs').innerHTML=LANGS.map(x=>`<button class="opt ${x[1]===badge?'on':''}" onclick="pickLang('${x[2]}','${x[1]}','${x[3]}')"><span class="flag"></span><span class="n">${x[0]}</span><span class="s">${x[1]}</span></button>`).join('');
  $('#ta').placeholder=t('ph_msg'); $('#email').placeholder=t('ph_email'); $('#snInput').placeholder=t('sn_ph'); $('#trackInput').placeholder='T-2611-0312';
  updateVoiceUI(); updateInputModeUI();
  $('#resetDemo').setAttribute('aria-label',t('reset_label')); $('#resetDemo').title=t('reset_label');
  $('#manualAsk').placeholder=t('doc_ask_ph'); $('#manualAskBtn').setAttribute('aria-label',t('doc_send'));
  $('#t2').textContent=labelDone?t('h2b'):t('h2'); $('#l2').textContent=labelDone?t('l2b'):t('l2'); $('#hint').textContent=labelDone?t('hint_ok'):t('hint');
  $('#appBtn').style.display=settings.h5App?'flex':'none'; $('#emailBlock').style.display=settings.h5Email?'block':'none';
  if(ticket) $('#h5title').textContent=t('h5').replace('{id}',ticket.id);
  renderLabelResult(); renderManual(); if(v==='d') renderManualDoc(true); if(v===3&&ticket) rerenderChat(); }
function toast(s){ const e=$('#toast'); e.textContent=s; e.classList.add('show'); clearTimeout(e._t); e._t=setTimeout(()=>e.classList.remove('show'),2200); }
function go(n,push=true){ if(push) hist.push(v); v=n; document.querySelectorAll('.view').forEach(s=>s.classList.toggle('show',s.dataset.v===String(n))); const s=stepOf(n); $('#prog').style.width=(s>=0?(s+1)/STEPS*100:'')+'%'; $('#back').classList.toggle('show',n!==0&&n!==3&&n!==4); $('#composer').style.display=n===3?'flex':'none'; document.querySelectorAll('#flow li').forEach((li,i)=>li.classList.toggle('on',i===s)); $('#stepnote').textContent=s>=0?`${s+1} / ${STEPS} · ${t('flow')[s]}`:''; if(n===4&&ticket) $('#h5title').textContent=t('h5').replace('{id}',ticket.id); const vw=document.querySelector('.view.show'); if(vw) vw.scrollTop=0; }
function goBack(){ if(hist.length) go(hist.pop(),false); }
function resetDemo(){ if(photoUrl){ URL.revokeObjectURL(photoUrl); photoUrl=null; } ticket=null; v=0; hist=[]; photos=0; videos=0; chatStep=0; asks=0; lastAction=null; voiceOn=false; inputMode='voice'; $('#chat').innerHTML=''; $('#ta').value=''; $('#ta').style.height='auto'; $('#email').value=''; $('#snInput').value=''; $('#trackInput').value=''; $('#trackResult').innerHTML=''; $('#manualDoc').innerHTML=''; $('#manualChat').innerHTML=''; $('#manualAsk').value=''; $('#h5title').textContent=''; document.querySelectorAll('#stars button').forEach(b=>b.classList.remove('on')); resetLabel(); setLang('zh'); go(0,false); toast(t('reset_done')); }
function pickLang(l,b,cl){ setLang(l,b,cl); go(1); }

/* ---------- 标签识别 ---------- */
function onPhoto(input){ const f=input.files&&input.files[0]; if(!f) return; if(photoUrl) URL.revokeObjectURL(photoUrl); photoUrl=URL.createObjectURL(f); const fd=$('#finder'); fd.style.backgroundImage=`url(${photoUrl})`; fd.classList.add('hasimg'); fd.classList.add('busy'); $('#hint').textContent=t('hint_busy');
  // 识别：原型里无法做真正的 OCR，用文件内容的哈希生成一个本批次内的序列号，并走真实的序列号校验与订单匹配
  const reader=new FileReader(); reader.onload=()=>{ const bytes=new Uint8Array(reader.result.slice(0,65536)); let h=7; for(let i=0;i<bytes.length;i+=97) h=(h*31+bytes[i])>>>0; const num=String(100+h%1100).padStart(5,'0'); const po=productOrders.length?productOrders[h%productOrders.length]:null; const batch=po?po.batches[0]:'24A'; const sn=`${product.snPrefix}-${batch}-${num}`; setTimeout(()=>{ fd.classList.remove('busy'); applySerial(sn,true); },1400); }; reader.readAsArrayBuffer(f.slice(0,65536)); input.value=''; }
function applySerial(sn,fromPhoto){ const p=Engine.parseSerial(sn); if(!p||!p.valid){ $('#hint').textContent=t('hint_fail'); $('#snErr').textContent=fromPhoto?'':t('sn_bad'); return false; } if(p.product!==product.id){ $('#snErr').textContent=t('sn_wrong'); $('#hint').textContent=t('hint_fail'); return false; } serial=p; labelDone=true; photos+=fromPhoto?1:0; $('#snErr').textContent=p.order?'':t('sn_noorder'); $('#hint').textContent=t('hint_ok'); $('#t2').textContent=t('h2b'); $('#l2').textContent=t('l2b'); $('#labelActions').style.display='none'; $('#snEntry').style.display='none'; $('#labelConfirm').style.display='block'; renderLabelResult(); return true; }
function renderLabelResult(){ const box=$('#labelResult'); if(!serial){ box.style.display='none'; return; } box.style.display='block'; box.innerHTML=`<div class="ok">${t('ok')}</div><div class="kv" style="margin-top:10px"><span>${t('k_model')}</span><span><b>${t('prod')}</b></span><span>${t('k_sn')}</span><span>${serial.sn}</span><span>${t('k_batch')}</span><span>${serial.batch}</span><span>${t('k_via')}</span><span>${serial.dealer?serial.dealer+' ('+serial.city+')':'—'}</span><span>${t('k_war')}</span><span>${serial.warrantyUntil?t('war_active')+' '+serial.warrantyUntil:t('war_unknown')}</span></div>`; }
function showSnEntry(){ $('#snEntry').style.display='block'; $('#labelActions').style.display='none'; $('#snInput').focus(); }
function checkSn(){ const v=$('#snInput').value.trim().toUpperCase(); if(applySerial(v,false)) toast(t('hint_ok')); }
function resetLabel(){ labelDone=false; serial=null; const fd=$('#finder'); fd.style.backgroundImage=''; fd.classList.remove('hasimg'); $('#labelResult').style.display='none'; $('#labelActions').style.display='block'; $('#labelConfirm').style.display='none'; $('#snEntry').style.display='none'; $('#snErr').textContent=''; $('#hint').textContent=t('hint'); $('#t2').textContent=t('h2'); $('#l2').textContent=t('l2'); }
function skipLabel(){ startChat(); }   // 标签看不清也能进对话，工单照样先建

/* ---------- 工单与收件箱 ---------- */
function newTicketId(){ const d=new Date(); return `T-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}-${9000+Math.floor(Math.random()*999)}`; }
function syncInbox(){ if(!ticket) return; try{ const box=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'); const i=box.findIndex(x=>x.id===ticket.id); const rec={ id:ticket.id, createdAt:ticket.createdAt, lang:custLang, product:product.id, sn:serial?serial.sn:null, issue:ticket.issue, photos, videos, email:ticket.email||null, name:ticket.name||null, status:ticket.status, rating:ticket.rating||null, kbId:ticket.kbId, ship:ticket.ship||null, pendingShip:ticket.pendingShip||null, transcript:ticket.transcript.map(m=>({who:m.who,text:m.text,tr:m.tr||'',t:m.t})) }; if(i>=0) box[i]=rec; else box.push(rec); localStorage.setItem(INBOX_KEY,JSON.stringify(box.slice(-50))); }catch(e){} }

/* ---------- 对话 ---------- */
function add(html){ $('#chat').insertAdjacentHTML('beforeend',html); const s=document.querySelector('.view[data-v="3"]'); s.scrollTop=s.scrollHeight; }
function typing(then,ms=900){ add('<div class="typing" id="ty"><i></i><i></i><i></i></div>'); setTimeout(()=>{ const x=$('#ty'); if(x) x.remove(); then(); },ms); }
function record(who,text,tr){ ticket.transcript.push({who,text,tr,t:Date.now()}); syncInbox(); }
function aiMsg(text,tr){ record('ai',text,tr); add(`<div class="msg ai">${esc(text)}<div class="meta">${t('c_meta')}</div></div>`); }
function playVideo(){ toast(t('video_play')); }
function stepCard(kb){ const sl=ui==='zh'?'zh':'en'; const intro=kb.video?T0('c_video_intro',kb.cat[sl]):''; const media=kb.video?`<button type="button" class="pic video-poster" onclick="playVideo()" aria-label="${t('video_play')}"><span class="video-badge">${t('video_label')}</span><span class="play"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><small>${kb.video}</small></button>`:`<div class="pic"><span class="muted small">${kb.cat[sl]}</span></div>`; return `<div class="stepcard">${media}<div class="body">${intro?`<div class="video-copy">${esc(intro)}</div>`:''}<b>${kb.stepTitle[sl]}</b><ol>${kb.steps[sl].map(s=>`<li>${s}</li>`).join('')}</ol></div></div>`; }
function quick(list){ return `<div class="quick" id="q1">${list.map(([label,fn])=>`<button onclick="${fn}">${label}</button>`).join('')}</div>`; }
function clearQuick(){ const q=$('#q1'); if(q) q.remove(); }
function mediaQuick(){ return [[t('q_video'),'simVideo()'],[t('q_photo'),'simPhoto()']]; }
function routeName(){ return (typeof Policy!=='undefined'&&Policy.get('routing.l1.name'))||'Zhang Rui'; }
function routeHours(){ return (typeof Policy!=='undefined'&&Policy.get('routing.l1.hours'))||4; }
function ctx(){ return { lang:custLang, name:'', dealer:serial&&serial.dealer||'our warehouse', city:serial&&serial.city||'Europe', hasSerial:!!serial, hasPhotos:photos>0||videos>0, hours:routeHours() }; }
function assessNow(text){
  // 原型固定演示意图：只要提到跑带偏移 / 润滑，就命中带视频的跑带解决方案。
  const beltVideoIntent=/(跑带|跑步带)/.test(text||'')&&/偏|润滑|上油/.test(text||'');
  const a=Engine.assess({ text, product:beltVideoIntent?'TR-650':product.id, serial, photos:photos+videos, email:ticket&&ticket.email||'', settings });
  if(beltVideoIntent){ const entry=Engine.KB.find(k=>k.id==='belt'); a.match={entry,hits:99,runnerUp:null,ambiguous:false}; a.confidence=Math.max(a.confidence,95); a.reasons=[]; a.route='ai'; a.action='reply'; a.canShip=false; }
  return a;
}

// 开场即建单：客户打第一个字之前，工单已经在后台存在，并明确告知会有人接手。
// 没有分类表单、没有描述框——问题归类由 AI 从对话里判断（Engine.matchKB），客户只需要说话。
function startChat(){ if(ticket){ go(3); return; }   // 同一页面只建一张工单；重复点击不会重复建单
  ticket={ id:newTicketId(), createdAt:Date.now(), status:'ai', transcript:[], issue:'', kbId:null }; chatStep=0; asks=0; lastAction=null;
  syncInbox();   // 客户还没说一个字，后台已经有这张工单了
  go(3);
  $('#chat').innerHTML='';
  add(`<div class="sysnote">${T0('c_sys',serial)}</div>`);
  add(ticketCard());
  record('ai',T0('c_open',ticket.id),'开场：工单已建立并抄送人工，等客户描述问题');
  add(`<div class="msg ai">${esc(T0('c_open',ticket.id))}<div class="meta">${t('c_meta')}</div></div>`);
  chatIdle(); }
function ticketCard(){ return `<div class="card" style="align-self:stretch;border-color:var(--brand);background:var(--brand-soft)">
    <div class="row-sp"><b style="color:var(--brand-ink)">${T0('k_ticket_new',ticket.id)}</b><span class="tag ai">${ui==='zh'?'已人工同步':'Support notified'}</span></div>
    <div class="small" style="margin-top:6px;color:#2B333C">${T0('l_ticket',routeName())}</div></div>`; }
// 对话已开始但客户还没描述问题：给几个出口，避免空屏
function chatIdle(){ clearQuick(); add(quick([...mediaQuick(),[t('q_person'),"userSay(t('q_person'))"]])); }
function handover(reason){ ticket.status='human'; lastAction='hold'; syncInbox(); add(`<div class="human">${T0('c_handover',routeName(),routeHours())}</div>`); add(`<div class="msg ai">${T0('c_logged',ticket.id)}</div>`); record('sys',reason||'转人工',''); add(quick([[t('q_save'),'go(4)']])); }
function respond(text){ clearQuick(); const a=assessNow(text); const kb=a.match?a.match.entry:null; ticket.kbId=kb?kb.id:null; const tr=Engine.summarizeZh(a,{});
  if(a.route==='human'){ aiMsg(Engine.compose(a,ctx()),tr); setTimeout(()=>handover(tr),700); return; }
  if(a.action==='ask'){
    if(asks>=2){ aiMsg(Engine.compose({action:'hold'},ctx()),'AI 已追问 2 轮仍无法判断，转人工'); setTimeout(()=>handover('追问 2 轮后仍无法判断'),700); return; }   // 追问上限
    asks++; lastAction='ask'; aiMsg(Engine.compose(a,ctx()),tr); add(quick([...mediaQuick(),[t('q_person'),"userSay(t('q_person'))"]])); return; }
  lastAction='reply'; aiMsg(Engine.compose(a,ctx()),tr); if(kb) add(stepCard(kb));
  // 模板里一旦写了"将从 X 寄出"，承诺就成立 → 同步给后台扣库存（与邮件渠道口径一致）；无权承诺则记 pendingShip，后台生成"等你确认补发"
  if(Engine.offersPart(a)){ if(a.canShip){ ticket.ship=kb.part; record('sys',`AI 承诺寄送 ${kb.partName.zh}（${kb.part}）`,''); } else { ticket.pendingShip=kb.part; record('sys',`${kb.partName.zh}（${kb.part}，约 ${kb.partValue} 美元）超出 AI 可承诺范围，待品牌方确认`,''); } syncInbox(); }
  const q=[]; q.push([t('q_solved'),"userSay(t('q_solved'))"],[t('q_notfixed'),"userSay(t('q_notfixed'))"]); if(kb&&kb.part) q.push([t('q_tech'),"userSay(t('q_tech'))"]); q.push([t('q_person'),"userSay(t('q_person'))"]); add(quick(q)); }
function onChatMedia(input){ const f=input.files&&input.files[0]; if(!f) return; if((f.type||'').startsWith('video/')) simVideo(); else simPhoto(); input.value=''; }
const KEYBOARD_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h1M10 10h1M14 10h1M18 10h.01M6 14h2M10 14h4M16 14h2"/></svg>';
const MIC_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
function updateVoiceUI(){ const b=$('#voiceBtn'), title=$('#voiceTitle'), hint=$('#voiceHint'); b.classList.toggle('recording',voiceOn); b.setAttribute('aria-pressed',String(voiceOn)); b.setAttribute('aria-label',t(voiceOn?'voice_listening':'voice_prompt')); b.title=t(voiceOn?'voice_listening':'voice_prompt'); title.textContent=t(voiceOn?'voice_listening':'voice_prompt'); hint.textContent=t(voiceOn?'voice_hint_listening':'voice_hint'); }
function updateInputModeUI(){ const textMode=inputMode==='text'; $('#composer').classList.toggle('text-mode',textMode); $('#keyboardBtn').innerHTML=textMode?MIC_ICON:KEYBOARD_ICON; $('#keyboardBtn').setAttribute('aria-label',t(textMode?'switch_voice':'switch_text')); $('#keyboardBtn').title=t(textMode?'switch_voice':'switch_text'); }
function setInputMode(mode){ inputMode=mode; if(mode==='voice') voiceOn=false; updateVoiceUI(); updateInputModeUI(); if(mode==='text') setTimeout(()=>$('#ta').focus(),0); }
function toggleInputMode(){ setInputMode(inputMode==='voice'?'text':'voice'); }
function toggleVoice(){ if(inputMode!=='voice') setInputMode('voice'); voiceOn=!voiceOn; updateVoiceUI(); toast(t(voiceOn?'voice_start':'voice_stop')); }
function simPhoto(){ clearQuick(); photos++; const m=ui==='zh'?'[照片]':'[photo]'; record('cust',m,''); add(`<div class="msg me">${m}<div class="meta" style="color:rgba(255,255,255,.7)">${T0('c_photo',1)}</div></div>`); if(ticket.status==='human'){ typing(()=>{ aiMsg(t('c_noted'),'已有人工接手，照片附到工单'); add(quick([[t('q_save'),'go(4)']])); }); return; } typing(()=>respond(ticket.transcript.filter(x=>x.who==='cust'&&!/^\[/.test(x.text)).map(x=>x.text).join(' ')),900); }
function simVideo(){ clearQuick(); videos++; const m=ui==='zh'?'[视频]':'[video]'; record('cust',m,''); add(`<div class="msg me">${m}<div class="meta" style="color:rgba(255,255,255,.7)">${t('c_video')}</div></div>`); if(ticket.status==='human'){ typing(()=>{ aiMsg(t('c_noted'),'已有人工接手，视频附到工单'); add(quick([[t('q_save'),'go(4)']])); }); return; } typing(()=>respond(ticket.transcript.filter(x=>x.who==='cust'&&!/^\[/.test(x.text)).map(x=>x.text).join(' ')),900); }
function userSay(s){ $('#ta').value=s; sendMsg(); }
function sendMsg(){ const ta=$('#ta'); const s=ta.value.trim(); if(!s||!ticket) return; ta.value=''; ta.style.height='auto'; clearQuick();
  if(!ticket.issue) ticket.issue=s.slice(0,120);   // 工单先建、标题后补：客户说的第一句就是问题描述
  record('cust',s,''); add(`<div class="msg me">${esc(s)}</div>`); chatStep++;
  const intent=s===t('q_person')||s===t('q_tech')?'human':s===t('q_solved')?'solved':s===t('q_notfixed')?'notfixed':Engine.detectConfirm(s);   // 否定优先：“谢谢，但还是不行”不会被当成已解决
  if(intent==='solved'){ typing(()=>{ ticket.status='done'; lastAction=null; syncInbox(); aiMsg(t('c_solved'),'客户确认已解决'); add(quick([[t('q_save'),'go(4)']])); }); return; }
  if(ticket.status==='human'){ typing(()=>{ aiMsg(t('c_noted'),'已有人工接手，新消息附到工单'); add(quick([[t('q_save'),'go(4)']])); }); return; }   // 已转人工：AI 不再接话
  if(s===t('q_tech')){ typing(()=>{ ticket.status='human'; lastAction='hold'; syncInbox(); aiMsg(T0('c_tech',routeName(),routeHours()),'客户要求技术人员上门'); add(quick([[t('q_save'),'go(4)']])); }); return; }
  if(intent==='human'){ typing(()=>{ record('sys','客户要求转人工',''); handover('客户要求人工'); }); return; }
  if(intent==='notfixed'&&lastAction==='reply'){ typing(()=>{ ticket.status='human'; lastAction='hold'; syncInbox(); aiMsg(T0('c_notfixed',routeName(),routeHours()),'建议无效，不再重复猜测，转人工'); add(`<div class="human">${t('human_tag')}</div>`); add(quick([[t('q_save'),'go(4)']])); }); return; }   // 只有在给过方案之后，“还是不行”才算方案无效
  if(s===t('q_more')){ typing(()=>{ aiMsg(t('c_more'),''); }); return; }
  // 其他内容（包括追问后的补充说明）：重新评估
  typing(()=>respond(ticket.transcript.filter(x=>x.who==='cust'&&!/^\[/.test(x.text)).slice(-2).map(x=>x.text).join(' ')),900); }
function rerenderChat(){ $('#chat').innerHTML=''; add(`<div class="sysnote">${T0('c_sys',serial)}</div>`); add(ticketCard()); for(const m of ticket.transcript){ if(m.who==='sys') continue; if(m.who==='cust') add(`<div class="msg me">${esc(m.text)}</div>`); else add(`<div class="msg ai">${esc(m.text)}</div>`); } if(ticket.transcript.filter(m=>m.who==='cust').length===0) chatIdle(); }

/* ---------- 收尾 ---------- */
function saveEmail(){ const e=$('#email').value.trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){ toast(t('email_bad')); return; } ticket.email=e; ticket.name=e.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); syncInbox(); toast(t('saved')+e); }
function rate(n){ document.querySelectorAll('#stars button').forEach((b,i)=>b.classList.toggle('on',i<n)); if(ticket){ ticket.rating=n; syncInbox(); } toast(t('thanks')); }

/* ---------- 查询进度 ---------- */
function track(){ const id=$('#trackInput').value.trim().toUpperCase(); let found=null; try{ const box=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'); found=box.find(x=>x.id===id); if(adminState){ const at=adminState.tickets.find(x=>x.id===id); if(at) found={id:at.id,status:at.status,createdAt:at.createdAt,issue:at.issue,transcript:at.timeline.filter(e=>e.who!=='sys').map(e=>({who:e.who==='cust'?'cust':'ai',text:e.text,t:e.t}))}; } }catch(e){} const box=$('#trackResult'); if(!found){ box.innerHTML=`<div class="card" style="color:var(--muted)">${t('track_none')}</div>`; return; } const st=t('st')[found.status]||found.status; box.innerHTML=`<div class="card"><div class="row-sp"><b>${found.id}</b><span class="tag ${found.status}">${st}</span></div><div class="muted small" style="margin:4px 0 10px">${new Date(found.createdAt).toLocaleString()} · ${esc(found.issue||'')}</div>${(found.transcript||[]).filter(m=>m.who!=='sys').slice(-3).map(m=>`<div class="small" style="padding:6px 0;border-top:1px solid var(--line)"><b>${m.who==='cust'?(ui==='zh'?'你':'You'):(m.who==='human'||m.who==='fact')?'IronPeak':(ui==='zh'?'助手':'Assistant')}</b> · ${esc(m.text.length>140?m.text.slice(0,140)+'…':m.text)}</div>`).join('')}</div>`; }

/* ---------- 说明书 ---------- */
function manualEntries(){ return Engine.KB.filter(k=>k.product===product.id||k.product==='*'); }
function manualVideoCard(kb){ const sl=ui==='zh'?'zh':'en'; return `<button type="button" class="manual-video" onclick="playVideo()" aria-label="${t('manual_video')}: ${kb.stepTitle[sl]}"><span class="thumb"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span class="duration">${kb.video||t('manual_video_short')}</span></span><span class="copy"><b>${t('manual_video')}</b><small>${kb.stepTitle[sl]}</small></span></button>`; }
function renderManual(){ const sl=ui==='zh'?'zh':'en'; const list=manualEntries(); $('#manualList').innerHTML=list.map(k=>`<details class="man"><summary>${k.cat[sl]}${k.video?` <span class="muted small">▶ ${k.video}</span>`:''}</summary>${manualVideoCard(k)}<ol>${k.steps[sl].map(s=>`<li>${s}</li>`).join('')}</ol>${k.part?`<div class="muted small">${ui==='zh'?'相关零件':'Part'}: ${k.partName[sl]} ${k.part}</div>`:''}</details>`).join(''); }
function renderManualDoc(resetChat=true){ const sl=ui==='zh'?'zh':'en'; const list=manualEntries(); const meta=T0('doc_meta',`${product.series[sl]} ${product.id}`,serial&&serial.sn); $('#manualDoc').innerHTML=`<div class="doc-cover"><span class="doc-kicker">IronPeak · ${product.id}</span><h1>${t('doc_heading')}</h1><p>${meta}</p><div class="doc-toc"><div class="small muted" style="font-weight:600;margin-bottom:2px">${t('doc_contents')}</div>${list.map((k,i)=>`<button onclick="scrollManualDoc('${k.id}')">${String(i+1).padStart(2,'0')} · ${k.cat[sl]}</button>`).join('')}</div></div>${list.map((k,i)=>`<section class="doc-section" id="doc-${k.id}"><div class="doc-section-count">${String(i+1).padStart(2,'0')}</div><h2>${k.cat[sl]}</h2><h3>${t('doc_steps')}</h3>${manualVideoCard(k)}<ol>${k.steps[sl].map(s=>`<li>${s}</li>`).join('')}</ol><div class="doc-note">${t('doc_note')}</div></section>`).join('')}<div class="doc-footer">IronPeak Fitness · ${product.id} · ${serial?serial.sn:''}</div>`; $('#manualAsk').placeholder=t('doc_ask_ph'); if(resetChat){ $('#manualChat').innerHTML=''; addManualMsg('ai',t('doc_ai_hello')); } }
function scrollManualDoc(id){ const el=document.getElementById('doc-'+id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
function addManualMsg(who,text){ const box=$('#manualChat'); box.insertAdjacentHTML('beforeend',`<div class="doc-msg ${who}">${esc(text).replace(/\n/g,'<br>')}</div>`); box.scrollTop=box.scrollHeight; }
function askManual(){ const input=$('#manualAsk'); const q=input.value.trim(); if(!q) return; input.value=''; addManualMsg('user',q); const sl=ui==='zh'?'zh':'en'; const match=Engine.matchKB(q,product.id); const box=$('#manualChat'); box.insertAdjacentHTML('beforeend',`<div class="doc-msg ai typing" id="docTyping">${ui==='zh'?'正在查说明书…':'Checking the manual…'}</div>`); box.scrollTop=box.scrollHeight; setTimeout(()=>{ if(v!=='d') return; const ty=$('#docTyping'); if(ty) ty.remove(); const e=match&&match.entry; addManualMsg('ai',e?T0('doc_ai_found',e.cat[sl],e.steps[sl],!!e.video):t('doc_ai_none')); },650); }
function openManualDoc(){ renderManualDoc(true); go('d'); const sc=$('#docScroll'); if(sc) sc.scrollTop=0; }
function contactSupportFromManual(){ const existing=ticket; startChat(); clearQuick(); if(!existing||existing.status!=='human') handover('用户从说明书页联系客服'); else add(quick([[t('q_save'),'go(4)']])); }

/* ---------- 启动 ---------- */
$('#stars').innerHTML=[1,2,3,4,5].map(i=>`<button onclick="rate(${i})">★</button>`).join('');
setLang('zh');
go(0,false);   // 首帧就把进度条和步骤条摆到第 1 步
// 演示用直链：?go=chat 直接落到对话（可选 &sn=序列号、&demo=video 自动发送一个带视频卡的问题），方便演示/截图，不影响正常路径
if(qs.get('go')==='chat'){ const sn=qs.get('sn')||`${product.snPrefix}-${(productOrders[0]||{batches:['24B']}).batches[0]}-00955`; if(!applySerial(sn,false)) resetLabel(); startChat();
  if(qs.get('demo')==='video'){ const demoQ={belt:'跑带偏了，怎么润滑',e07:'跑步机报 E07 了',motor:'阻力电机有异响',assembly:'安装不会装'}; const demoKb=Engine.KB.find(k=>k.id==='belt'&&k.video&&(k.product===product.id||k.product==='*'))||Engine.KB.find(k=>k.video&&!k.safety&&(k.product===product.id||k.product==='*')); const question=demoKb&&demoQ[demoKb.id]; if(question) setTimeout(()=>{ const ta=$('#ta'); if(v!==3||!ticket||!ta) return; ta.value=question; sendMsg(); },300); }
}
if(qs.get('go')==='manual'){ const sn=qs.get('sn')||`${product.snPrefix}-${(productOrders[0]||{batches:['24B']}).batches[0]}-00955`; if(!applySerial(sn,false)) resetLabel(); go('m'); openManualDoc(); }
if(qs.get('go')==='manual-list'){ const sn=qs.get('sn')||`${product.snPrefix}-${(productOrders[0]||{batches:['24B']}).batches[0]}-00955`; if(!applySerial(sn,false)) resetLabel(); go('m'); }
