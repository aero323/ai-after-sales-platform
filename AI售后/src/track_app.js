/* ============================================================
   客户追踪页 · track_app.js
   客户从售后邮件里的链接进来，看到"自己邮箱名下全部工单"的实时进度。
   设计：设计_客户追踪页_v1.md（下文 §x 指该文档章节）

   本文件分五块：
     1) 基础工具：esc / 时间格式化 / token / 语言
     2) 数据层：读 as_state + as_h5_inbox → 合并 → 按邮箱过滤 → 对客投影（§3）
     3) 派生层：状态文案、承诺时间（Policy）、里程碑轨道（§4）
     4) 渲染：列表 / 详情 / 过期 / 空态 / 演示选择器（§5）
     5) 轮询与状态保持（§7）

   约束提醒：
     · 所有来自数据的字符串必须过 esc()。
     · 不渲染 tr / confidence / reasons / kbId / assignee / pending.from 等内部字段。
     · 不硬编码任何客户名/邮箱，一律按 cust.email 小写全等匹配。
   ============================================================ */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE_KEY='as_state', INBOX_KEY='as_h5_inbox', LANG_KEY='as_track_lang', MAIL_SUPPORT='service@ironpeak.com';
const H5_URL='原型_H5扫码端.html';
const MIN=60000, HR=3600000, DAY=86400000;
const DEMO_CUSTOMER_LIMIT=7;

/* ---------- 品牌色（与 h5_head 同一套 shade/tint 写法） ---------- */
function shade(hex,p){ const n=parseInt(String(hex).replace('#','').slice(0,6),16); let r=(n>>16)+Math.round(255*p/100),g=((n>>8)&255)+Math.round(255*p/100),b=(n&255)+Math.round(255*p/100); const c=v=>Math.max(0,Math.min(255,v)); return '#'+[c(r),c(g),c(b)].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function tint(hex){ const n=parseInt(String(hex).replace('#','').slice(0,6),16); const r=n>>16,g=(n>>8)&255,b=n&255; return `rgba(${r},${g},${b},.12)`; }

/* ---------- 状态与 token ---------- */
const OPEN_STATES=['ai','guiding','human','factory'];
const isOpen=t=>OPEN_STATES.includes(t.status);

// 确定性哈希（原型代替服务端签名；正式版 HMAC 短链 + 7 天有效 + 可吊销）
function fnv1a(str){ let h=0x811c9dc5; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h+((h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)))>>>0; } return h>>>0; }
function tokenFor(email){ const h=fnv1a(String(email||'').trim().toLowerCase()+'|ironpeak-track-v1'); return h.toString(36).padStart(8,'0'); }

/* ---------- 语言：chrome 三语，其余回落 en（§4） ---------- */
const CHROME=['en','de','zh'];
const L={
 en:{
  brand:'IronPeak Support', live:'Live updates', justNow:'Updated just now', newUpdate:'New update: {title}', upToDate:'Updates every few seconds',
  hello:'Hi {name}', helloAnon:'Hi there',
  intro:'Here are all your support requests with us. Progress updates automatically.',
  masked:'Requests for {email}',
  open:'In progress', resolved:'Resolved', resolvedN:'Resolved requests ({n})', openN:'In progress ({n})',
  tkt:'Ticket {id}', submitted:'submitted {when}', updated:'updated {when}',
  tracking:'Tracking {no}',
  back:'All requests', ticketNo:'Ticket',
  nowAi:'Our assistant is working on your request', nowGuiding:'Waiting for you to try the fix', nowHuman:'A support engineer is working on it', nowFactory:'Confirming details with the factory', nowDone:'Resolved', nowLate:'In progress — past the promised time, escalated',
  pAi:'Assistant on it', pGuiding:'Your turn to try', pHuman:'Engineer on it', pFactory:'With the factory', pDone:'Resolved', pLate:'Expediting',
  labelNow:'Right now',
  promiseAi:'No action needed from you. If we need anything we will email you.',
  promiseHuman:'We will get back to you by <b>{at}</b>.', promiseFactory:'We are checking with the factory and will update you by <b>{at}</b>.',
  promiseGuiding:'Try the steps we sent. We will check in with you by <b>{at}</b>.', promiseDone:'Closed. Nothing further is needed.',
  promiseLate:'This is taking longer than promised. We have escalated it internally — no action needed from you.',
  promiseUnknown:'We will update you here as soon as there is news.',
  issueLabel:'What you told us',
  progress:'Progress',
  mSubmitted:'Request received', mFirstReply:'First reply from our team', mHuman:'Support engineer assigned', mFactory:'Escalated to the factory',
  mGuiding:'Repair guide sent', mParts:'Replacement part requested', mPromiseShip:'Dispatch promised', mShipped:'Dispatched',
  mTracking:'Tracking number added', mArrived:'Delivered', mResolved:'Resolved', mRated:'You rated this {n}/5', mYourTurn:'Waiting for your reply',
  /* 里程碑下的一句话概括（只从结构字段拼，见 milestoneDesc） */
  dReply:'Looks like “{cat}”. We sent the steps to fix it{video}{part}.', dReplyVideo:' with a short video', dReplyPart:' and offered a free {part}',
  dReplyNoKb:'We sent first guidance on what to check.',
  dAsk:'Received. Our assistant asked you for a few details so we can point you to the right fix.',
  dHold:'Received{cat}. This needs a person to confirm, so it went straight to a support engineer.', dHoldCat:' — looks like “{cat}”', dHoldSafety:' (safety-related)',
  dHuman:'A support engineer has taken over and is working out the fix.',
  dFactory:'We asked the factory to check. You will hear from us as soon as they confirm.',
  dGuiding:'“{title}” — {n} steps. Let us know how it goes.', dGuidingNoKb:'Try the steps and let us know how it goes.',
  dParts:'A free {part} is being arranged for dispatch.',
  dShipped:'{method}to {to}', dArrived:'Delivered to {to}',
  dDoneArrived:'The replacement part was delivered and the issue is closed.',
  dDoneAi:'You confirmed the issue is fixed{after}.', dDoneAfter:' after “{title}”',
  dDoneBrand:'Our support engineer resolved it.', dDoneFactory:'Resolved after the factory confirmed the cause.', dDoneDealer:'Handled on site by your local dealer.',
  doneAt:'{when}', dueBy:'by {at}', waiting:'waiting', nextStep:'Next',
  shipment:'Shipment', parts:'Parts', shippedTo:'To', method:'Method', sPromised:'Promised', sShipped:'Dispatched', sTracking:'Tracking', sArrived:'Delivered',
  waitingDash:'— waiting', copy:'Copy', copied:'Copied',
  conversation:'Conversation', older:'Show earlier messages ({n})', you:'You', team:'IronPeak Support',
  rating:'Your rating', reply:'Reply by email',
  moreOne:'You have 1 other request', moreN:'You have {n} other requests',
  expiredT:'This link has expired', expiredP:'Enter the email address you used when you wrote to us and we will send you a fresh link.',
  emailPh:'you@example.com', sendLink:'Send me a new link', badEmail:'Please enter a valid email address.',
  expiredNote:'Demo: in the real product we email you a new link. Here we open your requests right away.',
  emptyT:'No requests for this address yet', emptyP:'Nothing has come in under {email} so far. If you wrote to us from a different address, open the link from that email.',
  goSubmit:'Report a problem', orReply:'or simply reply to any email from us.', demoPicker:'Demo customer picker',
  pickerEmptyT:'No demo data in this browser yet', pickerEmptyP:'Open the back-office prototype once in the same browser (it creates the demo data), then come back here.', openBackOffice:'Open the back-office prototype',
  pickerT:'Demo: choose a customer', pickerP:'Only shown with ?demo=1 or when the page is opened with no parameters. Emails are listed in clear text for the demo — a real link never exposes another customer.',
  demoBar:'Demo mode · ',
  allDone:'All clear',
  shipFrom:'Ships from', arrivedOn:'Delivered {when}',
  langName:'Language'
 },
 de:{
  brand:'IronPeak Support', live:'Live-Aktualisierung', justNow:'Gerade aktualisiert', newUpdate:'Neue Aktualisierung: {title}', upToDate:'Aktualisiert sich alle paar Sekunden',
  hello:'Hallo {name}', helloAnon:'Hallo',
  intro:'Hier sind alle Ihre Serviceanfragen. Der Fortschritt aktualisiert sich automatisch.',
  masked:'Anfragen für {email}',
  open:'In Bearbeitung', resolved:'Erledigt', resolvedN:'Erledigte Anfragen ({n})', openN:'In Bearbeitung ({n})',
  tkt:'Vorgang {id}', submitted:'eingereicht {when}', updated:'aktualisiert {when}',
  tracking:'Sendung {no}',
  back:'Alle Anfragen', ticketNo:'Vorgang',
  nowAi:'Unser Assistent bearbeitet Ihre Anfrage', nowGuiding:'Wir warten auf Ihr Testergebnis', nowHuman:'Ein Servicetechniker bearbeitet Ihre Anfrage', nowFactory:'Wir klären Details mit dem Werk', nowDone:'Erledigt', nowLate:'In Bearbeitung — über der zugesagten Zeit, eskaliert',
  pAi:'Assistent aktiv', pGuiding:'Bitte testen', pHuman:'Techniker aktiv', pFactory:'Beim Werk', pDone:'Erledigt', pLate:'Eskaliert',
  labelNow:'Aktuell',
  promiseAi:'Sie müssen nichts tun. Falls wir etwas brauchen, schreiben wir Ihnen.',
  promiseHuman:'Wir melden uns bis <b>{at}</b>.', promiseFactory:'Wir klären es mit dem Werk und melden uns bis <b>{at}</b>.',
  promiseGuiding:'Bitte testen Sie die Schritte. Wir fragen bis <b>{at}</b> nach.', promiseDone:'Abgeschlossen. Es ist nichts weiter zu tun.',
  promiseLate:'Das dauert länger als zugesagt. Wir haben intern eskaliert — Sie müssen nichts tun.',
  promiseUnknown:'Wir aktualisieren hier, sobald es Neues gibt.',
  issueLabel:'Ihre Angabe',
  progress:'Fortschritt',
  mSubmitted:'Anfrage eingegangen', mFirstReply:'Erste Antwort von uns', mHuman:'Servicetechniker übernommen', mFactory:'An das Werk eskaliert',
  mGuiding:'Reparaturanleitung gesendet', mParts:'Ersatzteil angefordert', mPromiseShip:'Versand zugesagt', mShipped:'Versendet',
  mTracking:'Sendungsnummer erfasst', mArrived:'Zugestellt', mResolved:'Erledigt', mRated:'Ihre Bewertung {n}/5', mYourTurn:'Antwort von Ihnen ausstehend',
  dReply:'Vermutlich „{cat}“. Wir haben die Schritte zur Behebung geschickt{video}{part}.', dReplyVideo:' – mit kurzem Video', dReplyPart:' und ein kostenloses Ersatzteil ({part}) angeboten',
  dReplyNoKb:'Wir haben erste Hinweise geschickt, was zu prüfen ist.',
  dAsk:'Eingegangen. Unser Assistent hat ein paar Details erfragt, um die passende Lösung zu finden.',
  dHold:'Eingegangen{cat}. Das muss ein Mensch prüfen, daher direkt an einen Servicetechniker.', dHoldCat:' – vermutlich „{cat}“', dHoldSafety:' (sicherheitsrelevant)',
  dHuman:'Ein Servicetechniker hat übernommen und klärt die Lösung.',
  dFactory:'Wir haben das Werk um Prüfung gebeten und melden uns, sobald es bestätigt ist.',
  dGuiding:'„{title}“ – {n} Schritte. Sagen Sie uns, wie es lief.', dGuidingNoKb:'Probieren Sie die Schritte aus und geben Sie uns Bescheid.',
  dParts:'Ein kostenloses Ersatzteil ({part}) wird zum Versand vorbereitet.',
  dShipped:'{method}an {to}', dArrived:'Zugestellt an {to}',
  dDoneArrived:'Das Ersatzteil wurde zugestellt, der Fall ist abgeschlossen.',
  dDoneAi:'Sie haben bestätigt, dass das Problem{after} behoben ist.', dDoneAfter:' nach „{title}“',
  dDoneBrand:'Unser Servicetechniker hat es gelöst.', dDoneFactory:'Nach Prüfung durch das Werk gelöst.', dDoneDealer:'Vor Ort durch Ihren Händler erledigt.',
  doneAt:'{when}', dueBy:'bis {at}', waiting:'ausstehend', nextStep:'Als Nächstes',
  shipment:'Sendung', parts:'Teile', shippedTo:'An', method:'Art', sPromised:'Zugesagt', sShipped:'Versendet', sTracking:'Sendungsnr.', sArrived:'Zugestellt',
  waitingDash:'— ausstehend', copy:'Kopieren', copied:'Kopiert',
  conversation:'Verlauf', older:'Frühere Nachrichten zeigen ({n})', you:'Sie', team:'IronPeak Support',
  rating:'Ihre Bewertung', reply:'Per E-Mail antworten',
  moreOne:'Sie haben 1 weitere Anfrage', moreN:'Sie haben {n} weitere Anfragen',
  expiredT:'Dieser Link ist abgelaufen', expiredP:'Geben Sie die E-Mail-Adresse ein, mit der Sie uns geschrieben haben — wir senden Ihnen einen neuen Link.',
  emailPh:'name@beispiel.de', sendLink:'Neuen Link senden', badEmail:'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  expiredNote:'Demo: Im echten Produkt erhalten Sie einen neuen Link per E-Mail. Hier öffnen wir Ihre Anfragen sofort.',
  emptyT:'Noch keine Anfragen für diese Adresse', emptyP:'Unter {email} ist bisher nichts eingegangen. Wenn Sie uns von einer anderen Adresse geschrieben haben, öffnen Sie den Link aus dieser E-Mail.',
  goSubmit:'Ein Problem melden', orReply:'oder antworten Sie einfach auf eine unserer E-Mails.', demoPicker:'Demo-Kundenauswahl',
  pickerEmptyT:'Noch keine Demo-Daten in diesem Browser', pickerEmptyP:'Öffnen Sie das Backoffice-Prototyp einmal im selben Browser (dort entstehen die Demo-Daten), dann hierher zurück.', openBackOffice:'Backoffice-Prototyp öffnen',
  pickerT:'Demo: Kunde wählen', pickerP:'Nur mit ?demo=1 sichtbar. Adressen stehen im Klartext — ein echter Link zeigt nie andere Kunden.',
  demoBar:'Demo-Modus · ',
  allDone:'Alles erledigt',
  shipFrom:'Versand ab', arrivedOn:'Zugestellt {when}',
  langName:'Sprache'
 },
 zh:{
  brand:'IronPeak Support', live:'实时更新', justNow:'刚刚更新', newUpdate:'有新进展：{title}', upToDate:'每几秒自动更新',
  hello:'你好，{name}', helloAnon:'你好',
  intro:'这里是你名下的全部售后请求，进度会自动更新。',
  masked:'{email} 名下的请求',
  open:'进行中', resolved:'已解决', resolvedN:'已解决的请求 ({n})', openN:'进行中 ({n})',
  tkt:'工单 {id}', submitted:'{when}提交', updated:'{when}更新',
  tracking:'运单 {no}',
  back:'全部请求', ticketNo:'工单',
  nowAi:'助理正在跟进你的请求', nowGuiding:'等你的试机结果', nowHuman:'售后工程师处理中', nowFactory:'正在与工厂确认', nowDone:'已解决', nowLate:'处理中（已超过承诺时间，正在加急）',
  pAi:'助理处理中', pGuiding:'等你试一下', pHuman:'工程师处理中', pFactory:'工厂确认中', pDone:'已解决', pLate:'加急中',
  labelNow:'现在',
  promiseAi:'你这边无需操作。需要你时我们会发邮件。',
  promiseHuman:'我们会在 <b>{at}</b> 前给你答复。', promiseFactory:'我们在和工厂确认，<b>{at}</b> 前给你更新。',
  promiseGuiding:'按我们给的步骤试一下，<b>{at}</b> 前我们会来问你结果。', promiseDone:'已结案，无需再做任何操作。',
  promiseLate:'这件事超过了我们承诺的时间，已在内部加急，你不需要做什么。',
  promiseUnknown:'有进展我们会在这里更新。',
  issueLabel:'你反馈的问题',
  progress:'进度',
  mSubmitted:'请求已提交', mFirstReply:'我们首次回复', mHuman:'已转售后工程师', mFactory:'已升级工厂确认',
  mGuiding:'已给出修复步骤', mParts:'备件补发申请中', mPromiseShip:'承诺发出日期', mShipped:'已发出',
  mTracking:'运单号已回填', mArrived:'已签收', mResolved:'已解决', mRated:'你的评分 {n}/5', mYourTurn:'等你的回复',
  dReply:'初步判断为「{cat}」，已发送处理步骤{video}{part}。', dReplyVideo:'和演示视频', dReplyPart:'，并可免费补发{part}',
  dReplyNoKb:'已发送初步的排查建议。',
  dAsk:'已收到。助理向你确认了几个细节，以便给出准确的处理方法。',
  dHold:'已收到{cat}。这类问题需要人工确认，已直接转给售后工程师。', dHoldCat:'，初步判断为「{cat}」', dHoldSafety:'（涉及安全部件）',
  dHuman:'售后工程师已接手，正在核实处理方案。',
  dFactory:'已请生产工厂核实，有结论我们第一时间告诉你。',
  dGuiding:'「{title}」共 {n} 步，试完告诉我们结果。', dGuidingNoKb:'按步骤试一下，然后告诉我们结果。',
  dParts:'{part}将免费补发，正在安排寄出。',
  dShipped:'{method}寄往 {to}', dArrived:'已送达 {to}',
  dDoneArrived:'补发的备件已签收，问题处理完成。',
  dDoneAi:'你确认{after}问题已解决。', dDoneAfter:'按「{title}」处理后',
  dDoneBrand:'售后工程师已处理完成。', dDoneFactory:'经工厂核实后处理完成。', dDoneDealer:'由当地经销商门店就近处理完成。',
  doneAt:'{when}', dueBy:'{at} 前', waiting:'等待中', nextStep:'下一步',
  shipment:'寄件', parts:'件号', shippedTo:'目的地', method:'方式', sPromised:'承诺', sShipped:'已发出', sTracking:'运单', sArrived:'签收',
  waitingDash:'— 等待中', copy:'复制', copied:'已复制',
  conversation:'对话', older:'查看更早的对话 ({n})', you:'你', team:'IronPeak Support',
  rating:'你的评分', reply:'回复这封邮件',
  moreOne:'你还有 1 个请求', moreN:'你还有 {n} 个请求',
  expiredT:'链接已失效', expiredP:'输入下单或来信时用的邮箱，我们给你发一个新的链接。',
  emailPh:'you@example.com', sendLink:'发给我新链接', badEmail:'请输入有效的邮箱地址。',
  expiredNote:'演示：正式版会发一封带新链接的邮件，这里直接打开你的请求。',
  emptyT:'这个邮箱名下还没有售后请求', emptyP:'{email} 名下暂时没有记录。如果你用的是另一个邮箱，请从那封邮件里的链接打开。',
  goSubmit:'去提交一个问题', orReply:'或者直接回复我们的任意一封邮件。', demoPicker:'演示客户选择器',
  pickerEmptyT:'这个浏览器里还没有演示数据', pickerEmptyP:'先在同一个浏览器里打开一次品牌方后台原型（演示数据由它生成），再回到这里。', openBackOffice:'打开品牌方后台原型',
  pickerT:'演示：选择客户', pickerP:'仅在 ?demo=1 时显示。邮箱是明文，只用于演示——真实链接绝不会暴露其他客户。',
  demoBar:'演示模式 · ',
  allDone:'全部处理完',
  shipFrom:'发货方', arrivedOn:'{when}签收',
  langName:'语言'
 }
};
let lang='en';
function T(k,vars){ const d=L[lang]||L.en; let s=(d[k]!=null?d[k]:(L.en[k]!=null?L.en[k]:k)); if(vars) s=s.replace(/\{(\w+)\}/g,(m,g)=>vars[g]!=null?vars[g]:''); return s; }
const LANG_LABEL={en:'EN',de:'DE',zh:'中文'};

/* ---------- 时间 ---------- */
const rtf=new Intl.RelativeTimeFormat('en',{numeric:'auto'});
function relTime(ms){ if(!ms) return ''; const diff=ms-Date.now(); const a=Math.abs(diff);
  if(a<MIN) return lang==='zh'?'刚刚':(lang==='de'?'gerade eben':'just now');
  const [n,u]= a<HR?[Math.round(diff/MIN),'minute'] : a<DAY?[Math.round(diff/HR),'hour'] : [Math.round(diff/DAY),'day'];
  if(lang==='zh'){ const s=n<0?'前':'后'; return `${Math.abs(n)} ${u==='minute'?'分钟':u==='hour'?'小时':'天'}${s}`; }
  if(lang==='de'){ const w=u==='minute'?'Min.':u==='hour'?'Std.':'Tg.'; return n<0?`vor ${Math.abs(n)} ${w}`:`in ${n} ${w}`; }
  return rtf.format(n,u);
}
function fmtFull(ms){ if(!ms) return ''; const loc=lang==='zh'?'zh-CN':lang==='de'?'de-DE':'en-GB';
  return new Intl.DateTimeFormat(loc,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ms)); }
function fmtDay(ms){ if(!ms) return ''; const loc=lang==='zh'?'zh-CN':lang==='de'?'de-DE':'en-GB';
  return new Intl.DateTimeFormat(loc,{day:'numeric',month:'short',year:'numeric'}).format(new Date(ms)); }
// 承诺时间在 24h 内时用"今天/明天 18:40"这种客户直接能读懂的说法
function fmtPromise(ms){ if(!ms) return '';
  const loc=lang==='zh'?'zh-CN':lang==='de'?'de-DE':'en-GB'; const d=new Date(ms), now=new Date();
  const t=new Intl.DateTimeFormat(loc,{hour:'2-digit',minute:'2-digit'}).format(d);
  const sameDay=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
  const tom=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  if(sameDay(d,now)) return (lang==='zh'?'今天 ':lang==='de'?'heute ':'today ')+t;
  if(sameDay(d,tom)) return (lang==='zh'?'明天 ':lang==='de'?'morgen ':'tomorrow ')+t;
  return fmtFull(ms);
}
function maskEmail(e){ const s=String(e||''); const at=s.lastIndexOf('@'); if(at<1) return s;
  const u=s.slice(0,at), d=s.slice(at); return u[0]+'***'+u.slice(-1)+d; }

/* ============================================================
   2) 数据层
   ============================================================ */
/* Policy 内部先看全局 state、再看 adminState。这里把后台状态同时挂到两处：
   本文件不声明名为 state 的 let（避免与后台变量语义混淆），只把解析结果赋给全局。 */
var adminState=null, settings={brandColor:'#0E7A6C'};
try{ adminState=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch(e){ adminState=null; }
window.adminState=adminState;
let rawStore=null; try{ rawStore=localStorage.getItem(STORE_KEY); }catch(e){}
var state=adminState || undefined;              // 仅供 Policy.overrides() 读取（不参与本页任何逻辑）
if(adminState&&adminState.settings) settings=Object.assign({},settings,adminState.settings);
if(typeof Engine!=='undefined'&&adminState&&Array.isArray(adminState.orders)) Engine.setOrders(adminState.orders);

function readInbox(){ try{ const a=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }

/* H5 记录 → 工单视图（§7.3）。只取对客需要的字段，不把 transcript 以外的内部字段带进来。
   kbId / route / pendingShip 是结构字段（H5 已写进 inbox），里程碑的一句话概括要用。 */
function fromH5(rec){
  const tx=(rec.transcript||[]).map(m=>({t:m.t||rec.createdAt||Date.now(),who:m.who,text:m.text}));
  const firstAi=tx.find(m=>m.who==='ai');
  const done=rec.status==='done';
  return { id:rec.id, product:rec.product||null, sn:rec.sn||null, issue:rec.issue||'', status:rec.status||'ai',
    createdAt:rec.createdAt||Date.now(), updatedAt:rec.updatedAt||(tx.length?tx[tx.length-1].t:rec.createdAt)||Date.now(),
    statusSince:rec.createdAt||Date.now(), resolvedAt:done?(rec.updatedAt||Date.now()):null,
    resolvedBy:done?'ai':null,                       // H5 只有一种关单方式：客户自己确认已解决
    rating:rec.rating||null, cust:{name:rec.name||'',email:rec.email||'',lang:rec.lang||'en'},
    kbId:rec.kbId||null, route:rec.route||null, reasons:[],
    pending:(rec.pendingShip&&!rec.ship)?{type:'ship',part:rec.pendingShip,at:rec.updatedAt||rec.createdAt||null}:null,
    timeline:tx, shipments:[], guideDue:null, channel:'h5', _fromH5:true, _firstAiAt:firstAi?firstAi.t:null };
}

/* 合并：后台工单为主；同 id 的 H5 记录取较新状态，并把超出 h5Seen 的尾巴补成 cust/ai 事件（§7.2） */
function mergeTicket(t,rec){
  const out=Object.assign({},t,{timeline:(t.timeline||[]).slice()});
  const upd=rec.updatedAt||rec.createdAt||0;
  if(upd>(t.updatedAt||0)){ if(rec.status) out.status=rec.status; out.updatedAt=upd; }
  if(rec.status==='done'&&t.status!=='done'){ out.status='done'; out.resolvedAt=out.resolvedAt||upd; out.resolvedBy=out.resolvedBy||'ai'; }
  if(rec.rating&&!out.rating) out.rating=rec.rating;
  const seen=t.h5Seen||0, tx=rec.transcript||[];
  if(tx.length>seen){ for(const m of tx.slice(seen)) out.timeline.push({t:m.t||upd,who:m.who,text:m.text}); }
  out.timeline.sort((a,b)=>(a.t||0)-(b.t||0));
  return out;
}

/* 按邮箱取该客户全部工单（§7.4）：小写全等，不做模糊匹配、不按姓名匹配 */
function ticketsFor(email){
  const e=normEmail(email); if(!e) return [];
  let list=((adminState&&adminState.tickets)||[]).filter(t=>t&&t.cust&&normEmail(t.cust.email)===e);
  const inbox=readInbox(); const byId=new Map(list.map(t=>[t.id,t]));
  for(const rec of inbox){
    if(!rec||!rec.id||!rec.email) continue;
    if(normEmail(rec.email)!==e) continue;
    const cur=byId.get(rec.id);
    if(cur) byId.set(rec.id, mergeTicket(cur,rec));
    else byId.set(rec.id, fromH5(rec));
  }
  list=[...byId.values()].map(t=>{ const c=Object.assign({},t); c.cust=Object.assign({name:'',email:'',lang:'en'},t.cust||{}); return c; });
  list.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  return list;
}
function normEmail(s){ return String(s==null?'':s).trim().toLowerCase(); }

/* 产品名：走 Engine.PRODUCTS 的系列名（与 H5/后台同一来源），型号单独拼 */
function productLabel(id){ if(!id) return '—';
  if(typeof Engine!=='undefined'){
    const p=Engine.PRODUCTS.find(x=>x.id===id);
    if(p) return `${p.series[lang==='zh'?'zh':'en']} ${p.id}`;
  }
  return String(id);
}
function productShort(id){ const p=(typeof Engine!=='undefined')?Engine.PRODUCTS.find(x=>x.id===id):null; return p?p.series.en+' '+p.id:id||'—'; }

/* 客户名：只取名（隐私），没有就用掩码邮箱 */
function firstName(t){ const n=String((t.cust&&t.cust.name)||'').trim(); if(!n||/^H5\s*用户$/.test(n)) return ''; return n.split(/\s+/)[0]; }

/* ============================================================
   3) 对客投影（§3）
   ============================================================ */
const INTERNAL_AI=[/^\(internal\)/i,/^邮件解析[：:]/];
/* 内部前缀是结构标记（不是语义猜测）：种子数据里 ai 条目以这两个前缀开头的是解析笔记 */
function projectEvent(ev){
  if(!ev||typeof ev.text!=='string'||!ev.text.trim()) return null;
  const who=ev.who;
  if(who==='cust') return {kind:'cust',text:ev.text,t:ev.t};
  if(who==='ai'){ if(INTERNAL_AI.some(re=>re.test(ev.text))) return null; return {kind:'ai',text:ev.text,t:ev.t}; }
  return null;   // human / fact / dealer / sys 一律不外泄
}
function projectTimeline(t){ return (t.timeline||[]).map(projectEvent).filter(Boolean).sort((a,b)=>(a.t||0)-(b.t||0)); }
function firstVisibleAi(t){ const p=projectTimeline(t); const a=p.find(x=>x.kind==='ai'); return a?a.t:null; }
/* 摘要：优先用客户自己说过的第一句（客户语言原文），issue 只是后台内部摘要（常为中文），仅作兜底。
   这样英文客户不会在页面上看到后台的中文标题（FWT-61 种子即如此）。 */
function summaryOf(t){
  const first=(projectTimeline(t).find(m=>m.kind==='cust')||{}).text||'';
  const line=first.split('\n').map(s=>s.trim()).filter(Boolean)[0]||'';
  if(line) return line.length>140?line.slice(0,139)+'…':line;
  return (t.issue||'').trim();
}
/* cust 消息与 issue 重复时不重复展示（建单即抄送） */
function convoFor(t){
  const issue=(t.issue||'').trim(); const list=[];
  for(const m of projectTimeline(t)){
    if(m.kind==='cust'&&issue&&String(m.text).trim()===issue) continue;
    list.push(m);
  }
  return list;
}

/* ============================================================
   3) 派生：状态文案 / 承诺 / 里程碑
   ============================================================ */
function policyNum(path,fallback){ try{ const v=(typeof Policy!=='undefined')?Policy.get(path):undefined; const n=+v; return isFinite(n)?n:fallback; }catch(e){ return fallback; } }

/* 承诺时间：只用结构字段 + 政策层（§4） */
function deadlineOf(t){
  if(t.status==='human') return (t.statusSince||t.updatedAt||0)+policyNum('routing.l1.hours',4)*HR;
  if(t.status==='factory') return (t.statusSince||t.updatedAt||0)+policyNum('routing.l2.hours',24)*HR;
  if(t.status==='guiding') return t.guideDue||((t.statusSince||t.updatedAt||0)+policyNum('guard.repairGuideDays',2)*DAY);
  return null;
}
function isLate(t){ const d=deadlineOf(t); return !!(d&&t.status!=='done'&&Date.now()>d); }
function statusKey(t){ if(t.status==='done') return 'done'; if(isLate(t)) return 'late'; return t.status||'ai'; }
function statusText(t){
  const late=isLate(t);
  if(t.status==='done') return T('nowDone');
  if(late) return T('nowLate');
  return T({ai:'nowAi',guiding:'nowGuiding',human:'nowHuman',factory:'nowFactory'}[t.status]||'nowAi');
}
function pillText(t){ return T({ai:'pAi',guiding:'pGuiding',human:'pHuman',factory:'pFactory',done:'pDone',late:'pLate'}[statusKey(t)]||'pAi'); }
function promiseHtml(t){
  const d=deadlineOf(t);
  if(t.status==='done') return T('promiseDone');
  if(isLate(t)) return T('promiseLate');
  if(!d) return T('promiseAi');
  const at=esc(fmtPromise(d));
  if(t.status==='human') return T('promiseHuman',{at});
  if(t.status==='factory') return T('promiseFactory',{at});
  if(t.status==='guiding') return T('promiseGuiding',{at});
  return T('promiseUnknown',{at});
}

/* 里程碑只从结构字段算（§3 表格 + §5.2 的「实际发生与未来承诺」）
   每条：{key, at(ms|null), state:'done'|'current'|'future', tone?:'warn'|'late', extra?}
   不读 issue / 邮件正文，也不用关键词匹配。 */
function milestones(t){
  const ms=[]; const add=(key,at,extra)=>ms.push({key,at:at||null,extra});
  if(t.createdAt) add('mSubmitted',t.createdAt);
  const fa=firstVisibleAi(t); if(fa) add('mFirstReply',fa);
  if(t.status==='human') add('mHuman',t.statusSince||t.updatedAt);
  if(t.status==='factory') add('mFactory',t.statusSince||t.updatedAt);
  if(t.status==='guiding'||t.guideDue) add('mGuiding',t.guideDue||t.statusSince||t.updatedAt);
  const ships=t.shipments||[];
  const firstShipped=!!(ships[0]&&(ships[0].shippedAt||ships[0].tracking));
  if(t.pending&&!firstShipped) add('mParts',t.pending.at||t.statusSince||t.updatedAt);
  ships.forEach((sp,i)=>{ if(sp.promisedAt) add('mPromiseShip',sp.promisedAt,{i}); });
  ships.forEach((sp,i)=>{ if(sp.shippedAt) add('mShipped',sp.shippedAt,{i}); });
  ships.forEach((sp,i)=>{ if(sp.tracking) add('mTracking',sp.trackingAt||sp.shippedAt,{i,tracking:sp.tracking}); });
  ships.forEach((sp,i)=>{ if(sp.arrivedAt) add('mArrived',sp.arrivedAt,{i}); });
  const closed=t.status==='done';
  if(closed) add('mResolved',t.resolvedAt||t.statusSince||t.updatedAt);
  if(closed&&t.rating) add('mRated',t.resolvedAt||null,{n:t.rating});

  // 排序后标注：已发生 = done；最后一个已发生项 = current（未结案时）；其余 = future
  ms.sort((a,b)=>(a.at||9e15)-(b.at||9e15));
  const happened=ms.filter(m=>m.at&&m.at<=Date.now());
  ms.forEach(m=>{ m.state=(m.at&&m.at<=Date.now())?'done':'future'; });
  if(!closed&&happened.length){
    const cur=happened[happened.length-1];
    if(cur.key!=='mResolved'&&cur.key!=='mRated'){
      cur.state='current';
      if(cur.key==='mHuman'||cur.key==='mFactory'||cur.key==='mGuiding') cur.tone='warn';
      if(isLate(t)) cur.tone='late';
    }
  }
  // 未来占位（status=ai 时的"下一步"）：还没首次回复 → 等我们回复；已回复且在等备件确认 → 等发出；已回复 → 等你的回复。
  // 之前无论如何都补 mFirstReply，助理已回复时会出现两条「我们首次回复」。
  if(!closed&&t.status==='ai'){
    const next=!fa?'mFirstReply':(t.pending&&!firstShipped?'mShipped':'mYourTurn');
    ms.push({key:next,at:null,state:'future'});
  }
  return ms;
}

/* 同一里程碑的身份：用于实时更新时只强调“这次新出现的项”。 */
function msIdentity(m){ const x=(m&&m.extra)||{}; return [m&&m.key||'',m&&m.at||'',x.i==null?'':x.i,x.n==null?'':x.n,x.tracking||''].join('|'); }
function activeTicket(tickets){ if(!tickets||!tickets.length) return null; if(routeId) return tickets.find(t=>t.id===routeId)||null; return tickets.length===1?tickets[0]:null; }

/* ---------- 里程碑下的一句话概括 ----------
   只从结构字段拼：kbId → 知识条目（类别 / 步骤数 / 视频 / 备件），confidence + reasons + 政策阈值 → 首次回复是
   「直接给方案 / 追问 / 转人工」，resolvedBy → 怎么解决的，shipments / pending → 寄件。
   不读邮件正文、不做关键词匹配；正式版这一句由 LLM 基于真实回复生成，这里的结构拼法只是原型替身。
   文案是页面语言（en/de/zh），知识条目只有 zh/en 两套名字，de 回落 en（与 productLabel 同一做法）。 */
function kbOf(t){ if(!t||!t.kbId||typeof Engine==='undefined') return null; return Engine.KB.find(k=>k.id===t.kbId)||null; }
function kbByPart(code){ if(!code||typeof Engine==='undefined') return null; return Engine.KB.find(k=>k.part===code)||null; }
function kbWord(obj){ if(!obj) return ''; return obj[lang==='zh'?'zh':'en']||obj.en||obj.zh||''; }
function kbSteps(kb){ if(!kb||!kb.steps) return 0; const s=kb.steps[lang]||kb.steps.en||kb.steps.zh||[]; return s.length; }
/* 首次回复属于哪一种：与 Engine.assess 的路由规则同一套（触发规则 → 转人工；有条目且过阈值 → 直接回复；阈值下带宽内 → 追问；否则转人工） */
function replyKind(t){
  const kb=kbOf(t);
  if(t._fromH5) return kb?'reply':(t.status==='human'||t.route==='engineer'?'hold':'ask');
  if((t.reasons||[]).length) return 'hold';
  const conf=+t.confidence;
  if(!isFinite(conf)) return kb?'reply':'hold';          // 人工录入等没有置信度的单：有条目就当作给了方案
  const th=policyNum('autoReply.threshold',85), band=policyNum('autoReply.askBand',25);
  if(kb&&conf>=th) return 'reply';
  if(conf>=th-band) return 'ask';
  return 'hold';
}
function milestoneDesc(t,m){
  if(!m||m.state==='future') return '';
  const kb=kbOf(t), cat=kbWord(kb&&kb.cat), ships=t.shipments||[], sp=(m.extra&&m.extra.i!=null)?ships[m.extra.i]:null;
  switch(m.key){
    case 'mFirstReply':{
      const kind=replyKind(t);
      if(kind==='reply'){
        if(!kb) return T('dReplyNoKb');
        const offers=kb.part&&kb.shipOnReply!==false, part=kbWord(kb.partName);
        const gap=(lang==='zh'&&/^[A-Za-z0-9]/.test(part))?' ':'';           // 中文里 CJK 与 "M10 螺栓包" 之间留半角空格
        return T('dReply',{cat, video:kb.video?T('dReplyVideo'):'', part:offers?T('dReplyPart',{part:gap+part}):''});
      }
      if(kind==='ask') return T('dAsk');
      return T('dHold',{cat:cat?T('dHoldCat',{cat})+(kb.safety?T('dHoldSafety'):''):''});
    }
    case 'mHuman': return T('dHuman');
    case 'mFactory': return T('dFactory');
    case 'mGuiding':{ const n=kbSteps(kb); return (kb&&n)?T('dGuiding',{title:kbWord(kb.stepTitle)||cat,n}):T('dGuidingNoKb'); }
    case 'mParts':{ const code=t.pending&&t.pending.part; const pk=kbByPart(code)||kb; const part=(pk&&pk.part===code)?kbWord(pk.partName):(code||''); return part?T('dParts',{part}):''; }
    case 'mPromiseShip': return sp?[shipText(sp.parts),shipText(sp.method)].filter(Boolean).join(' · '):'';
    case 'mShipped': return (sp&&sp.to)?T('dShipped',{method:sp.method?shipText(sp.method)+' · ':'',to:sp.to}):'';
    case 'mArrived': return (sp&&sp.to)?T('dArrived',{to:sp.to}):'';
    case 'mResolved':{
      if(ships.some(s=>s.arrivedAt)) return T('dDoneArrived');
      const by=t.resolvedBy||'ai';
      if(by==='brand') return T('dDoneBrand');
      if(by==='factory') return T('dDoneFactory');
      if(by==='dealer') return T('dDoneDealer');
      const title=kb?(kbWord(kb.stepTitle)||cat):'';
      return T('dDoneAi',{after:title?T('dDoneAfter',{title}):''});
    }
    default: return '';
  }
}

/* ============================================================
   4) 渲染
   ============================================================ */
let view='loading';       // loading | list | detail | expired | empty | picker
let routeEmail='';        // 当前客户邮箱（小写）
let routeId=null;         // 详情页工单 id
let demoMode=false;
let gateEmail='';         // 过期页提交后的邮箱
const ui={ showOlder:false, showDone:false, copied:false, renderedAt:0, lastSig:'', lastTicketSigs:null, lastMs:[], highlightKeys:[], liveTimer:0, dockCleanup:null, langManual:false};
try{ const s=localStorage.getItem(LANG_KEY); if(s&&CHROME.includes(s)){ lang=s; ui.langManual=true; } }catch(e){}

function setLang(l,persist){ if(!CHROME.includes(l)) l='en'; lang=l; if(persist){ ui.langManual=true; try{ localStorage.setItem(LANG_KEY,l); }catch(e){} } render(true); }
function syncDocumentLang(){ document.documentElement.lang=lang==='zh'?'zh-CN':lang; }

function applyBrand(){
  const c=(settings&&settings.brandColor)||'#0E7A6C';
  const r=document.documentElement.style;
  r.setProperty('--brand',c); r.setProperty('--brand-ink',shade(c,-18)); r.setProperty('--brand-soft',tint(c));
}

/* 顶部品牌栏（所有视图共用） */
function topbar(){
  const opts=CHROME.map(l=>`<button type="button" id="lang-${l}" data-lang="${l}" aria-pressed="${l===lang}" aria-label="${esc(T('langName'))}: ${esc(LANG_LABEL[l])}">${esc(LANG_LABEL[l])}</button>`).join('');
  return `<header class="top"><div class="in">
    <a class="brandmark" href="#/" aria-label="${esc(T('brand'))}"><i></i><b>${esc(T('brand'))}</b></a>
    <span class="sp"></span>
    <span class="live" id="live" title="${esc(T('upToDate'))}" aria-label="${esc(T('live'))}"><i></i><span>${esc(T('live'))}</span></span>
    <div class="langs" role="group" aria-label="${esc(T('langName'))}">${opts}</div>
  </div></header><div class="update-flag" id="updateFlag" hidden aria-hidden="true"></div>`;
}
function demoBar(){
  if(!demoMode) return '';
  return `<div class="demo-bar">${esc(T('demoBar'))}<a href="?demo=1#/">${esc(T('demoPicker'))}</a></div>`;
}
function stars(n){ let h='<span class="stars" aria-hidden="true">'; for(let i=1;i<=5;i++) h+=`<svg width="13" height="13" viewBox="0 0 20 20" class="${i<=n?'':'off'}" fill="currentColor"><path d="M10 1.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 15l-5.2 2.7 1-5.8L1.5 7.8l5.9-.9z"/></svg>`; return h+'</span>'; }
const chev=()=>'<svg class="chev" width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5"/></svg>';
const down=()=>'<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 7.5l5 5 5-5"/></svg>';
const tick=()=>'<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg>';
const left=()=>'<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5"/></svg>';
const clock=()=>'<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.4l2.8 1.8"/></svg>';

/* ---- 列表卡片 ---- */
function cardHtml(t){
  const pl=productLabel(t.product);
  const trk=(t.shipments||[]).map(s=>s.tracking).filter(Boolean)[0]||'';
  const sk=statusKey(t);
  return `<li><a class="tcard${t.status==='done'?' done':''}" href="#/t/${encodeURIComponent(t.id)}" data-id="${esc(t.id)}">
    <div class="l1"><b title="${esc(pl)}">${esc(pl)}</b><span class="pill st-${esc(sk)}" title="${esc(statusText(t))}">${esc(pillText(t))}</span></div>
    <p class="iss" title="${esc(summaryOf(t))}">${esc(summaryOf(t))}</p>
    ${trk?`<span class="trk"><span class="mono">${esc(T('tracking',{no:trk}))}</span></span>`:''}
    <div class="meta">
      <span>${esc(T('tkt',{id:t.id}))}</span>
      <span>${esc(T('submitted',{when:relTime(t.createdAt)}))}</span>
      <span class="upd">${esc(T('updated',{when:relTime(t.updatedAt)}))}</span>
      ${t.status==='done'&&t.rating?`<span>${stars(t.rating)}<span class="sr">${esc(T('mRated',{n:t.rating}))}</span></span>`:''}
    </div>
    ${chev()}
  </a></li>`;
}

/* ---- 列表页 ---- */
function renderList(tickets){
  const open=tickets.filter(isOpen), done=tickets.filter(t=>t.status==='done');
  const name=firstName(tickets[0]);
  const email=routeEmail;
  const body=`
  <section class="hello">
    <h1>${esc(name?T('hello',{name}):T('helloAnon'))}</h1>
    <p>${esc(T('intro'))}</p>
    <span class="who"><svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2.2"/><path d="M3 6l7 5 7-5"/></svg><span class="mono">${esc(maskEmail(email))}</span></span>
  </section>
  ${open.length?`<section class="sec">
    <div class="sec-h"><h2>${esc(T('open'))}</h2><span class="n">${open.length}</span></div>
    <ul class="cards">${open.map(cardHtml).join('')}</ul>
  </section>`:`<section class="sec"><div class="sec-h"><h2>${esc(T('open'))}</h2><span class="n">0</span></div><p class="empty-line">${esc(T('allDone'))}</p></section>`}
  ${done.length?`<section class="sec">
    <button type="button" class="fold" id="foldDone" aria-expanded="${ui.showDone}" aria-controls="doneList">
      <span>${esc(T('resolvedN',{n:done.length}))}</span>${down()}
    </button>
    <ul class="cards" id="doneList" ${ui.showDone?'':'hidden'}>${done.map(cardHtml).join('')}</ul>
  </section>`:''}
  <p class="foot">${esc(T('upToDate'))}</p>`;
  return body;
}

/* ---- 进度轨道 ---- */
function trackHtml(t){
  const ms=milestones(t);
  const items=ms.map(m=>{
    const isNew=ui.highlightKeys.includes(msIdentity(m));
    const cls=[m.state==='future'?'future':'',m.state==='current'?'current':'',m.tone==='warn'?'warn':'',m.tone==='late'?'late':'',isNew?'is-new':''].filter(Boolean).join(' ');
    let when='';
    if(m.key==='mTracking'&&m.extra&&m.extra.tracking) when=`<span class="when mono">${esc(m.extra.tracking)}</span>`;
    else if(m.key==='mRated'&&m.extra&&m.extra.n) when=`<span class="when">${stars(m.extra.n)}</span>`;
    else if(m.at) when=`<span class="when">${esc(fmtFull(m.at))}</span>`;
    else when=`<span class="when">${esc(T('waiting'))}</span>`;
    const desc=milestoneDesc(t,m);
    return `<li class="${cls}" role="listitem"><span class="dot" aria-hidden="true"></span><b>${esc(T(m.key,m.extra||{}))}</b>${desc?`<span class="desc">${esc(desc)}</span>`:''}${when}</li>`;
  }).join('');
  return `<section class="sec"><div class="sec-h"><h2>${esc(T('progress'))}</h2></div>
    <div class="panel"><ul class="track" role="list">${items}</ul></div></section>`;
}

/* ---- 寄件卡 ---- */
function shipmentHtml(t){
  const ships=(t.shipments||[]); if(!ships.length) return '';
  return ships.map((s,si)=>{
    const rows=[
      {k:'sPromised',v:s.promisedAt?esc(fmtDay(s.promisedAt)):null,wait:!s.promisedAt},
      {k:'sShipped',v:s.shippedAt?esc(fmtDay(s.shippedAt)):null,wait:!s.shippedAt},
      {k:'sTracking',v:s.tracking?`<span class="mono trackno" id="tk${si}">${esc(s.tracking)}</span><button type="button" class="copy" data-copy="${esc(s.tracking)}" aria-label="${esc(T('copy')+' '+s.tracking)}">${ui.copied===s.tracking?tick():'<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="7" y="7" width="9.5" height="9.5" rx="2"/><path d="M13 7V5.5A2 2 0 0 0 11 3.5H5.5A2 2 0 0 0 3.5 5.5V11a2 2 0 0 0 2 2H7"/></svg>'}<span>${esc(ui.copied===s.tracking?T('copied'):T('copy'))}</span></button>`:null,wait:!s.tracking},
      {k:'sArrived',v:s.arrivedAt?esc(fmtDay(s.arrivedAt)):null,wait:!s.arrivedAt}
    ];
    return `<section class="sec ship"><div class="sec-h"><h2>${esc(T('shipment'))}</h2></div>
      <div class="panel">
        ${s.parts?`<div class="parts"><span class="muted" style="font-size:12.5px">${esc(T('parts'))}</span><br>${esc(shipText(s.parts))}</div>`:''}
        ${(s.to||s.addr||s.method)?`<div class="dest">${[s.to,s.addr,shipText(s.method)].filter(Boolean).map(esc).join(' · ')}</div>`:''}
        <div class="srows">${rows.map(r=>`<div class="srow${r.wait?' wait':''}"><span class="ic" aria-hidden="true">${r.wait?'':tick()}</span><span class="lb">${esc(T(r.k))}</span><span class="v">${r.v||esc(T('waitingDash'))}</span></div>`).join('')}</div>
      </div></section>`;
  }).join('');
}

/* ---- 对话 ---- */
const CONVO_MAX=6;
function convoHtml(t){
  const all=convoFor(t);
  const hidden=Math.max(0,all.length-CONVO_MAX);
  const shown=(hidden&&!ui.showOlder)?all.slice(-CONVO_MAX):all;
  const body=shown.map(m=>`<div class="msg ${m.kind}"><div class="bub">${esc(m.text)}</div><div class="by">${esc(m.kind==='cust'?T('you'):T('team'))} · ${esc(fmtFull(m.t))}</div></div>`).join('');
  return `<section class="sec"><div class="sec-h"><h2>${esc(T('conversation'))}</h2></div>
    <div class="panel" style="padding-bottom:16px">
      ${hidden&&!ui.showOlder?`<button type="button" class="older" id="showOlder" style="display:block;margin:12px auto 2px">${esc(T('older',{n:hidden}))} ▾</button>`:''}
      <div class="convo">${body||`<p class="empty-line">${esc(T('promiseUnknown'))}</p>`}</div>
    </div></section>`;
}

/* ---- 详情页 ---- */
function renderDetail(t,tickets){
  const sk=statusKey(t), pl=productLabel(t.product);
  const others=tickets.filter(x=>x.id!==t.id);
  const mail=`mailto:${MAIL_SUPPORT}?subject=${encodeURIComponent('Re: '+t.id)}`;
  const showBack=tickets.length>1;
  const body=`
  <div class="dhead">
    ${showBack?`<a class="backlink" href="#/">${left()}<span>${esc(T('back'))}</span></a>`:'<span></span>'}
    <span class="tid">${esc(T('ticketNo'))} <span class="mono">${esc(t.id)}</span> <span class="who-inline">${esc(maskEmail(routeEmail))}</span></span>
  </div>
  <section class="banner st-${esc(sk)} enter" aria-label="${esc(T('labelNow'))}">
    <div class="k">${esc(T('labelNow'))}</div>
    <h1>${esc(pl)}</h1>
    <p class="now"><b>${esc(statusText(t))}</b>${t.sn?` · <span class="mono">SN ${esc(t.sn)}</span>`:''}</p>
    <p class="promise">${clock()}<span>${promiseHtml(t)}</span></p>
  </section>
  ${(()=>{ const s=summaryOf(t); return s?`<div class="issue"><small>${esc(T('issueLabel'))}</small>${esc(s)}</div>`:''; })()}
  ${trackHtml(t)}
  ${shipmentHtml(t)}
  ${convoHtml(t)}
  ${t.status==='done'&&t.rating?`<section class="sec"><div class="sec-h"><h2>${esc(T('rating'))}</h2></div><div class="panel"><div class="rate">${stars(t.rating)}<span class="muted">${t.rating}/5</span></div></div></section>`:''}
  <div class="actions">
    <a class="btn" href="${esc(mail)}"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2.2"/><path d="M3 6l7 5 7-5"/></svg><span>${esc(T('reply'))}</span></a>
  </div>
  ${others.length?`<a class="more" href="#/">${esc(others.length===1?T('moreOne'):T('moreN',{n:others.length}))}<span>${esc(others.slice(0,3).map(o=>productShort(o.product)).join(' · '))}</span></a>`:''}
  <p class="foot">${esc(T('brand'))} · ${esc(T('upToDate'))}</p>
  <div class="reply-dock" id="replyDock" aria-hidden="true">
    <a class="btn" href="${esc(mail)}" tabindex="-1" aria-label="${esc(T('reply')+' '+t.id)}"><svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2.2"/><path d="M3 6l7 5 7-5"/></svg><span>${esc(T('reply'))}</span></a>
  </div>`;
  return body;
}

/* ---- 过期链接页 ---- */
function renderExpired(){
  return `<main>
  <div class="gate">
    <div class="ico"><svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.5M10 13.6v.01"/></svg></div>
    <h1>${esc(T('expiredT'))}</h1>
    <p>${esc(T('expiredP'))}</p>
    <form id="gateForm" novalidate>
      <input class="inp" id="gateEmail" type="email" inputmode="email" autocomplete="email" placeholder="${esc(T('emailPh'))}" aria-label="Email" value="${esc(gateEmail)}">
      <p class="err" id="gateErr" role="alert"></p>
      <button class="btn" type="submit">${esc(T('sendLink'))}</button>
    </form>
    <p class="note">${esc(T('expiredNote'))}</p>
    <p class="note"><a href="?demo=1#/">${esc(T('demoPicker'))}</a></p>
  </div>
  <p class="foot">${esc(T('brand'))}</p>
  </main>`;
}

/* ---- 空态 ---- */
function renderEmpty(){
  return `<main>
  <div class="gate ok">
    <div class="ico"><svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg></div>
    <h1>${esc(T('emptyT'))}</h1>
    <p>${esc(T('emptyP',{email:maskEmail(routeEmail)}))}</p>
    <div class="actions" style="margin-top:0">
      <a class="btn" href="${esc(H5_URL)}">${esc(T('goSubmit'))}</a>
      <a class="btn sec" href="mailto:${MAIL_SUPPORT}?subject=${encodeURIComponent('Support request')}">${esc(T('reply'))}</a>
    </div>
    <p class="note">${esc(T('orReply'))}</p>
    ${demoMode?`<p class="note"><a href="?demo=1#/">${esc(T('demoPicker'))}</a></p>`:''}
  </div>
  <p class="foot">${esc(T('brand'))}</p>
  </main>`;
}

/* ---- 演示选择器（只 ?demo=1 或裸打开） ---- */
function renderPicker(){
  const rows=demoCustomers();
  if(!rows.length) return `<main>
  <section class="hello"><h1>${esc(T('pickerT'))}</h1></section>
  <div class="gate ok">
    <div class="ico"><svg width="22" height="22" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.5M10 13.6v.01"/></svg></div>
    <h1>${esc(T('pickerEmptyT'))}</h1>
    <p>${esc(T('pickerEmptyP'))}</p>
    <a class="btn" href="../原型_品牌方后台.html">${esc(T('openBackOffice'))}</a>
    <p class="note">${esc(T('demoBar'))}</p>
  </div>
  </main>`;
  return `<main>
  <section class="hello"><h1>${esc(T('pickerT'))}</h1><p>${esc(T('pickerP'))}</p></section>
  <ul class="picker">${rows.map(r=>`<li><a href="?e=${encodeURIComponent(r.email)}&k=${tokenFor(r.email)}&demo=1#/">
      <span class="em">${esc(r.email)}</span>
      <span class="ex">${esc(r.product)}</span>
      <span class="cnt"><span class="${r.open?'on':''}">${r.open} ${esc(T('open'))}</span><span>${r.total-r.open} ${esc(T('resolved'))}</span></span>
    </a></li>`).join('')}</ul>
  </main>`;
}
function demoCustomers(){
  const map=new Map();
  const push=(email,t)=>{ const e=normEmail(email); const k=e; if(!map.has(k)) map.set(k,{email:e,total:0,open:0,sample:t.id,product:'',_u:0}); const r=map.get(k);
    r.total++; if(isOpen(t)) r.open++; if((t.updatedAt||0)>r._u){ r._u=t.updatedAt||0; r.product=productShort(t.product); r.sample=t.id; } };
  ((adminState&&adminState.tickets)||[]).forEach(t=>{ if(t&&t.cust&&t.cust.email) push(t.cust.email,t); });
  readInbox().forEach(rec=>{ if(rec&&rec.email&&!((adminState&&adminState.tickets)||[]).some(t=>t.id===rec.id&&normEmail(t.cust.email)===normEmail(rec.email))) push(rec.email,fromH5(rec)); });
  return [...map.values()].sort((a,b)=>(b.total-a.total)||(b.open-a.open)||a.email.localeCompare(b.email)).slice(0,DEMO_CUSTOMER_LIMIT);
}

/* ============================================================
   hash 路由 + 主渲染
   ============================================================ */
function parseHash(){ const h=String(location.hash||'').replace(/^#/,''); const m=h.match(/^\/t\/(.+)$/); return m?{id:decodeURIComponent(m[1])}:{id:null}; }

function timelineSig(t){ return (t.timeline||[]).map(e=>[e.t||0,e.who||'',String(e.text||'')].join('~')).join('|'); }
// 寄件卡里的 parts / method 是后台中文数据；英文界面上做最小本地化（号件 / 备件 / 运输方式）
function shipText(v){ if(!v||lang==='zh') return v; return String(v)
  .replace(/(\d+)\s*号件/g,(m,n)=>'Part '+n)
  .replace(/（备件）/g,' (spare)')
  .replace(/空运快递/g,'Air express').replace(/海运/g,'Sea freight').replace(/快递/g,'Courier')
  .replace(/；/g,'; ').replace(/、/g,', ').replace(/，/g,', '); }
function shipmentSig(t){ return (t.shipments||[]).map(s=>[s.promisedAt||'',s.shippedAt||'',s.trackingAt||'',s.tracking||'',s.arrivedAt||'',s.parts||'',s.to||'',s.addr||'',s.method||''].join('~')).join('|'); }
function ticketSig(t){
  return [t.id,t.status||'',t.statusSince||'',t.updatedAt||'',t.resolvedAt||'',t.guideDue||'',t.rating||'',t.product||'',t.sn||'',t.issue||'',
    JSON.stringify(t.pending||null),timelineSig(t),shipmentSig(t)].join(';');
}
function dataSig(tickets){ return (tickets||[]).map(ticketSig).join('||'); }

function render(force){
  applyBrand(); syncDocumentLang();
  const appEl=$('#app'); if(!appEl) return;
  const scrollY=window.scrollY||0;
  let html='', viewName='', activeT=null;
  ui.lastTicketSigs={};
  if(!routeEmail){
    viewName=demoMode?'picker':'expired';
    html=topbar()+demoBar()+(demoMode?renderPicker():renderExpired());
    ui.lastSig='';
  }else{
    const tickets=ticketsFor(routeEmail);
    tickets.forEach(t=>{ ui.lastTicketSigs[t.id]=ticketSig(t); });
    ui.lastSig=dataSig(tickets);
    if(!tickets.length){ viewName='empty'; html=topbar()+demoBar()+renderEmpty(); }
    else{
      const single=tickets.length===1;
      let t=null;
      if(routeId) t=tickets.find(x=>x.id===routeId)||null;
      if(!t&&single) t=tickets[0];
      if(t){ viewName='detail'; activeT=t; html=topbar()+demoBar()+`<main>${renderDetail(t,tickets)}</main>`; }
      else { viewName='list'; html=topbar()+demoBar()+`<main>${renderList(tickets)}</main>`; }
    }
  }
  view=viewName;
  document.body.classList.toggle('has-reply-dock',viewName==='detail');
  const prevFocus=document.activeElement&&document.activeElement.id;
  appEl.innerHTML=html;
  keepScroll(scrollY);
  wire();
  if(prevFocus&&document.getElementById(prevFocus)) document.getElementById(prevFocus).focus();
  ui.lastMs=activeT?milestones(activeT).map(msIdentity):[];
  ui.renderedAt=Date.now();
}

/* 详情页滚动过状态横幅后出现轻量回复条；滚到底部时让位给页面内主按钮。 */
function wireReplyDock(){
  if(ui.dockCleanup){ ui.dockCleanup(); ui.dockCleanup=null; }
  const dock=$('#replyDock'); if(!dock) return;
  const banner=$('.banner'), bottom=$('.actions .btn'), link=dock.querySelector('a');
  let raf=0, timer=0;
  const sync=()=>{
    raf=0; timer=0;
    const b=banner?banner.getBoundingClientRect():null;
    const a=bottom?bottom.getBoundingClientRect():null;
    const vh=window.innerHeight||0;
    const bottomVisible=!!a&&a.top<vh-12&&a.bottom>0;
    const show=!!b&&b.bottom<-2&&!bottomVisible;
    dock.classList.toggle('show',show);
    dock.setAttribute('aria-hidden',show?'false':'true');
    if(link) link.tabIndex=show?0:-1;
    if(!show&&dock.contains(document.activeElement)&&bottom&&bottom.focus) bottom.focus();
  };
  const schedule=()=>{
    if(raf||timer) return;
    if(window.requestAnimationFrame) raf=window.requestAnimationFrame(sync);
    else timer=setTimeout(sync,16);
  };
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  sync();
  ui.dockCleanup=()=>{
    window.removeEventListener('scroll',schedule);
    window.removeEventListener('resize',schedule);
    if(raf&&window.cancelAnimationFrame) window.cancelAnimationFrame(raf);
    if(timer) clearTimeout(timer);
  };
}

/* 事件绑定：语言切换、折叠、展开更早、复制、过期页表单 */
function wire(){
  wireReplyDock();
  const appEl=$('#app');
  appEl.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>setLang(b.dataset.lang,true)));
  const fold=$('#foldDone');
  if(fold) fold.addEventListener('click',()=>{ ui.showDone=!ui.showDone; render(true); });
  const so=$('#showOlder');
  if(so) so.addEventListener('click',()=>{ ui.showOlder=true; render(true); });
  appEl.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{
    const v=b.dataset.copy||'';
    try{ if(navigator.clipboard&&navigator.clipboard.writeText) await navigator.clipboard.writeText(v); else legacyCopy(v); }catch(e){ legacyCopy(v); }
    ui.copied=v; const keepY=window.scrollY||0; render(true); keepScroll(keepY);
    setTimeout(()=>{ if(ui.copied){ ui.copied=false; render(true); } },1800);
    announce(T('copied'));
  }));
  const form=$('#gateForm');
  if(form) form.addEventListener('submit',ev=>{
    ev.preventDefault();
    const v=String(($('#gateEmail')||{}).value||'').trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ const e=$('#gateErr'); if(e) e.textContent=T('badEmail'); return; }
    gateEmail=v; routeEmail=normEmail(v); routeId=null; demoMode=true;
    /* 演示：正式版发信，这里直接把 e 写进 URL。
       注意 file:// 下（双击打开）部分浏览器让 replaceState 抛 SecurityError——
       地址栏更新失败不能连带中止后面的渲染，否则表现就是"输入邮箱没反应"。 */
    try{
      const u=new URL(location.href); u.searchParams.set('e',v); u.searchParams.set('k',tokenFor(v)); u.hash='#/';
      history.replaceState(null,'',u.pathname+u.search+u.hash);
    }catch(err){ /* 地址栏保持原样，页面照常进入 */ }
    render(true);
  });
}
/* 恢复滚动位置：直接写滚动容器的 scrollTop（等价于 scrollTo，且不依赖实现细节） */
function keepScroll(y){ const t=y||0; ui.scrollTarget=t; try{ if(document.scrollingElement) document.scrollingElement.scrollTop=t; document.documentElement.scrollTop=t; if(document.body) document.body.scrollTop=t; }catch(e){} }
function legacyCopy(v){ try{ const ta=document.createElement('textarea'); ta.value=v; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }catch(e){} }
function announce(msg){ const a=$('#announce'); if(a) a.textContent=msg; }

/* ============================================================
   启动：token 校验 → 路由 → 渲染 → 轮询
   ============================================================ */
function boot(){
  const qs=new URLSearchParams(location.search);
  demoMode=qs.get('demo')==='1';
  const e=String(qs.get('e')||'').trim(), k=String(qs.get('k')||'').trim();
  if(e){
    const ok = !!k && k===tokenFor(e);                // demo 选择器生成的也是合法 token，不开后门
    if(ok){ routeEmail=normEmail(e); if(!ui.langManual){ /* 语言跟随工单，见 syncLangToTicket */ } }
  } else {
    /* 直接双击打开文件（没有 e）→ 演示选择器。
       正式版里裸访问一个无参链接没有意义；原型上团队每次演示都要跳过"链接已失效"页，故默认给选择器。
       带 e 但 token 不对的仍然进过期页（那才是真"链接失效"的语义）。 */
    demoMode=true;
  }
  const r=parseHash(); routeId=r.id;
  syncLangToTicket();
  render(true);
  window.addEventListener('hashchange',()=>{ const x=parseHash(); if(x.id!==routeId){ routeId=x.id; ui.showOlder=false; render(true); } });
  setInterval(refresh,4000);
  window.addEventListener('storage',ev=>{ if(!ev||ev.key===STORE_KEY||ev.key===INBOX_KEY||ev.key===null) refresh(); });
}
/* 语言默认跟随工单 cust.lang（首个工单；用户手动切过就不再跟随） */
function syncLangToTicket(){
  if(ui.langManual) return;
  if(!routeEmail) return;
  const t=(adminState&&adminState.tickets||[]).find(x=>x&&x.cust&&normEmail(x.cust.email)===routeEmail);
  let cl=t&&t.cust&&t.cust.lang;
  if(!cl){ const rec=readInbox().find(r=>normEmail(r.email)===routeEmail); cl=rec&&rec.lang; }
  lang=CHROME.includes(cl)?cl:'en';
}

/* 重新读 localStorage；只在数据签名变化时重渲染，并保住滚动位置与展开状态 */
function refresh(){
  let raw=null; try{ raw=localStorage.getItem(STORE_KEY); }catch(e){}
  if(raw===rawStore&&routeEmail&&dataSig(ticketsFor(routeEmail))===ui.lastSig){ return; }   // 没有变化就不重渲染
  const prevSigs=Object.assign({},ui.lastTicketSigs||{});
  const prevMs=(ui.lastMs||[]).slice();
  let next=null; try{ next=JSON.parse(raw||'null'); }catch(e){}
  const changedStore=raw!==rawStore; rawStore=raw;
  adminState=next; window.adminState=next; state=next||undefined;
  if(next&&next.settings) settings=Object.assign({},settings,next.settings);
  if(typeof Engine!=='undefined'&&next&&Array.isArray(next.orders)) Engine.setOrders(next.orders);
  syncLangToTicket();
  const tickets=routeEmail?ticketsFor(routeEmail):[];
  const sig=dataSig(tickets);
  const changed=tickets.find(t=>prevSigs[t.id]!==ticketSig(t))||null;
  const active=activeTicket(tickets);
  const fresh=(changed&&active&&changed.id===active.id)?milestones(active).filter(m=>m.at&&!prevMs.includes(msIdentity(m))):[];
  if(!routeEmail||sig!==ui.lastSig||changedStore){
    ui.highlightKeys=fresh.map(msIdentity);
    const y=window.scrollY||0;
    render(true);
    keepScroll(y);
    if(changed) showLiveNotice(fresh,changed);
  }
}
function showLiveNotice(fresh,t){
  if(ui.liveTimer) clearTimeout(ui.liveTimer);
  const titles=(fresh||[]).slice(0,2).map(m=>T(m.key,m.extra||{}));
  const title=titles.length?titles.join(' · '):statusText(t);
  const live=$('#live'); if(live){ const label=live.querySelector('span'); if(label) label.textContent=T('justNow'); live.title=T('justNow'); }
  const flag=$('#updateFlag'); if(flag){ flag.textContent=T('justNow')+' · '+title; flag.hidden=false; }
  pulse();
  announce(T('newUpdate',{title}));
  ui.liveTimer=setTimeout(()=>{
    ui.highlightKeys=[];
    document.querySelectorAll('.track li.is-new').forEach(li=>li.classList.remove('is-new'));
    const el=$('#live'); if(el){ const label=el.querySelector('span'); if(label) label.textContent=T('live'); el.title=T('upToDate'); }
    const f=$('#updateFlag'); if(f) f.hidden=true;
    ui.liveTimer=0;
  },5200);
}
function pulse(){ const el=$('#live'); if(!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'),1000); }

window.__refresh=refresh;
window.__track={ get view(){return view;}, get email(){return routeEmail;}, get scrollTarget(){return ui.scrollTarget==null?null:ui.scrollTarget;},
  get showOlder(){return ui.showOlder;}, tickets:()=>routeEmail?ticketsFor(routeEmail):[], tokenFor, setLang, projectEvent, milestones, milestoneDesc, replyKind, deadlineOf };

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
