/* ================= 状态、种子数据、持久化、工具 ================= */
const DAY=86400000, HR=3600000, MIN=60000;
const SEED_VERSION='v6';
const STORE_KEY='as_state', INBOX_KEY='as_h5_inbox';
const $ = s=>document.querySelector(s);
const esc = s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pick=(r,arr)=>arr[Math.floor(r()*arr.length)];
const weighted=(r,obj)=>{const tot=Object.values(obj).reduce((a,b)=>a+b,0);let x=r()*tot;for(const [k,w] of Object.entries(obj)){x-=w;if(x<=0)return k}return Object.keys(obj)[0]};
const pad=n=>String(n).padStart(2,'0');
function fmt(t){ if(!t) return '—'; const d=new Date(t), n=new Date(); const same=(a,b)=>a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); const y=new Date(n); y.setDate(n.getDate()-1); const hm=`${pad(d.getHours())}:${pad(d.getMinutes())}`; if(same(d,n)) return `今天 ${hm}`; if(same(d,y)) return `昨天 ${hm}`; return `${pad(d.getMonth()+1)}-${pad(d.getDate())} ${hm}`; }
function dur(ms){ if(ms<HR) return `${Math.max(1,Math.round(ms/MIN))} 分钟`; if(ms<DAY) return `${(ms/HR).toFixed(ms<3*HR?1:0)} 小时`; return `${(ms/DAY).toFixed(1)} 天`; }
function uid(){ return Math.random().toString(36).slice(2,8); }

const NAMES = { en:['Mark Reynolds','Jake Thompson','Emily Carter','Liam O\'Brien','Olivia Bennett','Noah Fischer','Ava Mitchell','Ethan Hughes','Grace Walker'], de:['Lena Hoffmann','Jonas Weber','Mia Schulz','Felix Braun','Laura Keller','Paul Richter'], es:['Carlos Mendes','Lucía García','Diego Torres','Marta Ruiz','Pablo Navarro'], fr:['Sophie Martin','Hugo Lefèvre','Camille Dubois','Louis Moreau'], sv:['Anna Lindqvist','Erik Johansson','Sara Nilsson'] };
const MAIL_DOM = { en:['gmail.com','yahoo.com','outlook.com'], de:['web.de','gmx.de','t-online.de'], es:['outlook.com','gmail.com'], fr:['orange.fr','gmail.com'], sv:['telia.se','gmail.com'] };
const ISSUES = {
  cable:{en:'Cable fraying near the top pulley',de:'Seilzug an der oberen Umlenkrolle ausgefranst',es:'El cable de la polea superior está deshilachado',fr:'Le câble de la poulie supérieure s\'effiloche',sv:'Vajern vid övre trissan är sliten'},
  catch:{en:'Safety catch does not lock on the left side',de:'Sicherheitsraste rastet links nicht ein',es:'El seguro no bloquea en el lado izquierdo',fr:'Le verrou de sécurité ne bloque pas à gauche',sv:'Säkerhetsspärren låser inte på vänster sida'},
  bolts:{en:'Missing M10 bolts from the assembly pack, step 7',de:'M10-Schrauben fehlen im Montagebeutel, Schritt 7',es:'Faltan tornillos M10 del paquete de montaje, paso 7',fr:'Vis M10 manquantes dans le sachet de montage, étape 7',sv:'M10-skruvar saknas i monteringspåsen, steg 7'},
  e07:{en:'Treadmill stops after 10 minutes with error E07',de:'Laufband stoppt nach 10 Minuten, Fehlercode E07',es:'La cinta se para a los 10 minutos con error E07',fr:'Le tapis s\'arrête après 10 minutes, erreur E07',sv:'Löpbandet stannar efter 10 minuter, fel E07'},
  belt:{en:'How do I lubricate the running belt? It drifts to the left',de:'Wie schmiere ich das Laufband? Es verrutscht nach links',es:'¿Cómo lubrico la cinta? Se desvía a la izquierda',fr:'Comment lubrifier la bande ? Elle dérive à gauche',sv:'Hur smörjer jag bandet? Det drar åt vänster'},
  motor:{en:'Humming noise from the resistance motor',de:'Brummendes Geräusch vom Widerstandsmotor',es:'Zumbido del motor de resistencia',fr:'Bruit de bourdonnement du moteur de résistance',sv:'Brummande ljud från motståndsmotorn'},
  units:{en:'Display shows miles instead of km',de:'Anzeige zeigt Meilen statt Kilometer',es:'La pantalla muestra millas en vez de km',fr:'L\'affichage indique des miles au lieu de km',sv:'Displayen visar miles istället för km'},
  assembly:{en:'Which step attaches the pulley arm? Stuck at step 12',de:'Welcher Schritt befestigt den Umlenkarm? Hänge bei Schritt 12',es:'¿En qué paso se monta el brazo de la polea? Atascado en el paso 12',fr:'Quelle étape fixe le bras de poulie ? Bloqué à l\'étape 12',sv:'Vilket steg fäster trissarmen? Fast på steg 12'},
};
const KB_PRODUCT = { cable:'SM-900', catch:'SM-900', bolts:'SM-900', e07:'TR-650', belt:'TR-650', motor:'RW-300', units:'RW-300' };

let state = null;
let role = 'brand';
const ROLE = { brand:{name:'品牌方管理员',org:'IronPeak Fitness',av:'杨',person:'杨梦',email:'yang.meng@ironpeak.com'}, factory:{name:'工厂销售',org:'宁波力健机械',av:'李',person:'李工',email:'li.gong@lijian.cn'}, dealer:{name:'分销商',org:'NordicGym AB',av:'E',person:'Erik S.',email:'erik@nordicgym.se'} };

function defaultSettings(){ return { mailboxes:[{addr:'support@ironpeak.com',provider:'Microsoft 365',connectedAt:Date.now()-9*DAY,imported:1842}], signature:'IronPeak Support', ccBrand:true, mergeThreads:true,
  notify:['邮件','后台通知'], h5Langs:['en','de','es','fr','it','sv'], serviceLang:'zh+en', brandColor:'#0E7A6C', h5Email:true, h5App:false }; }
// 政策（阈值 / 规则开关 / 承诺上限 / SLA 时限 / 合并窗口…）不在 settings 里，见 policy.config.json 与 Policy.get()

function newTicket(o){ return Object.assign({ collab:[], suggest:null, assignee:null, id:null, tag:null, createdAt:Date.now(), updatedAt:Date.now(), statusSince:Date.now(), resolvedAt:null, status:'ai', resolvedBy:null, cust:{name:'',email:'',lang:'en'}, product:null, sn:null, batch:null, order:null, dealer:null, channel:'email', issue:'', kbId:null, confidence:null, reasons:[], timeline:[], rating:null, photos:0, pending:null, asks:0, issues:[], shipments:[], capa:null, guideDue:null }, o); }
function ctxFor(t){ const o=Engine.ORDERS.find(x=>x.id===t.order); const anon=!t.cust.name||/^H5 用户$/.test(t.cust.name); return { lang:t.cust.lang, name:anon?'':(t.cust.name||'').split(' ')[0], dealer:(o&&o.dealer)||t.dealer||'our warehouse', city:(o&&o.dealerCity)||'Europe', hasSerial:!!t.sn, hasPhotos:(t.photos||0)>0, hours:Policy.get('routing.l1.hours') }; }
// 寄件来源：有订单 → 订单的分销商仓；没有 → 库存记录里的仓
function shipFrom(t,part){ const o=(state?state.orders:Engine.ORDERS).find(x=>x.id===t.order); if(o&&o.dealer&&o.dealer!=='—') return o.dealer; const inv=state.inventory.find(i=>i.part===part); return inv?inv.loc:'品牌方仓'; }

/* ---------- 生成种子数据 ---------- */
function seed(){
  const r=mulberry32(20261103); const now=Date.now();
  const s={ v:SEED_VERSION, seededAt:now, seq:{ticket:180,manual:34}, settings:defaultSettings(), policy:{values:{},log:[]}, tickets:[], manuals:[], kbFiles:[], terms:[], orders:[], qrs:{}, inventory:[], importedH5:[], notes:[] };
  s.products = Engine.PRODUCTS.map(p=>({ id:p.id, series:p.series.zh, seriesEn:p.series.en, sku:p.sku, snPrefix:p.snPrefix, has3d:p.has3d, maxUserWeight:p.maxUserWeight, manualLangs:[...p.manualLangs], qr:['SM-900','SM-700','TR-650'].includes(p.id) }));
  // 合作方（组织）与联系人：组织级默认接口人覆盖该组织全部订单；订单级覆盖只对单张订单生效
  s.partners=[
    {name:'宁波力健机械',type:'factory',contacts:[{name:'李工',email:'li.gong@lijian.cn',title:'外贸销售',status:'active',defaultAll:true,since:now-40*DAY}]},
    {name:'东莞健步工业',type:'factory',contacts:[{name:'王工',email:'wang@jianbu.cn',title:'销售经理',status:'active',defaultAll:true,since:now-60*DAY}]},
    {name:'青岛迈动器械',type:'factory',contacts:[]},
    {name:'NordicGym AB',type:'dealer',contacts:[{name:'Erik S.',email:'erik@nordicgym.se',title:'Service lead',status:'active',defaultAll:true,since:now-50*DAY}]},
    {name:'FitHaus GmbH',type:'dealer',contacts:[{name:'Hanna K.',email:'service@fithaus.de',title:'Kundendienst',status:'pending',defaultAll:true,since:now-2*DAY}]},
    {name:'GymPro Ltd',type:'dealer',contacts:[]},
    {name:'山东宝力龙健身器材',type:'factory',contacts:[{name:'Andy',email:'andy@bodylonger.com',title:'外贸 / 物流',status:'active',defaultAll:true,since:now-30*DAY}]},
    {name:'Fitshop EU',type:'dealer',contacts:[{name:'Fitshop Service',email:'info@fitshop.de',title:'Logistikzentrum',status:'active',defaultAll:true,since:now-40*DAY}]},
  ];
  s.orders = Engine.ORDERS.map(o=>({ ...o, source:'ERP 导入', createdAt:new Date(o.ship).getTime()-20*DAY, overrides:[], excluded:[] }));
  s.kbFiles=[
    {id:uid(),n:'SM-900 用户手册 中文草版 v3.pdf',t:'说明书',src:'工厂上传',st:'已入库',at:now-6*DAY,p:'SM-900',size:'4.2 MB'},
    {id:uid(),n:'SM-900 爆炸图与零件清单.xlsx',t:'零件结构',src:'工厂上传',st:'已入库',at:now-6*DAY,p:'SM-900',size:'310 KB'},
    {id:uid(),n:'SM-900 装配模型.STEP',t:'3D 模型',src:'工厂上传',st:'已入库',at:now-6*DAY,p:'SM-900',size:'58 MB'},
    {id:uid(),n:'2024-2025 售后邮件归档（1,842 封）.mbox',t:'历史客诉',src:'品牌方导入',st:'已入库',at:now-9*DAY,p:'全部',size:'96 MB'},
    {id:uid(),n:'健身器材术语表 中-英-德-西.csv',t:'术语表',src:'品牌方上传',st:'已入库',at:now-9*DAY,p:'全部',size:'18 KB'},
    {id:uid(),n:'TR-650 电机故障代码表.docx',t:'故障代码',src:'工厂上传',st:'已入库',at:now-2*DAY,p:'TR-650',size:'120 KB'},
    {id:uid(),n:'TR-650 用户手册 中文草版 v2.pdf',t:'说明书',src:'工厂上传',st:'已入库',at:now-15*DAY,p:'TR-650',size:'3.6 MB'},
    {id:uid(),n:'TR-650 爆炸图与零件清单.xlsx',t:'零件结构',src:'工厂上传',st:'已入库',at:now-15*DAY,p:'TR-650',size:'280 KB'},
    {id:uid(),n:'SM-700 用户手册 中文草版 v2.pdf',t:'说明书',src:'工厂上传',st:'已入库',at:now-14*DAY,p:'SM-700',size:'3.9 MB'},
    {id:uid(),n:'SM-700 装配模型.STEP',t:'3D 模型',src:'工厂上传',st:'已入库',at:now-14*DAY,p:'SM-700',size:'51 MB'},
    {id:uid(),n:'RW-300 用户手册 中文草版 v1.pdf',t:'说明书',src:'工厂上传',st:'已入库',at:now-8*DAY,p:'RW-300',size:'2.4 MB'},
    {id:uid(),n:'RW-300 爆炸图与零件清单.xlsx',t:'零件结构',src:'工厂上传',st:'已入库',at:now-8*DAY,p:'RW-300',size:'190 KB'},
    {id:uid(),n:'RW-300 装配模型.STEP',t:'3D 模型',src:'工厂上传',st:'已入库',at:now-8*DAY,p:'RW-300',size:'44 MB'},
    {id:uid(),n:'RW-300 安装视频脚本.docx',t:'安装指导',src:'工厂上传',st:'待确认',at:now-3*HR,p:'RW-300',size:'44 KB'},
    {id:uid(),n:'F-C20 爆炸图与零件清单.xlsx',t:'零件结构',src:'工厂上传',st:'已入库',at:now-10*DAY,p:'F-C20',size:'260 KB'},
  ];
  s.terms=[ {zh:'安全锁扣',en:'safety catch',de:'Sicherheitsraste',es:'seguro de bloqueo',fr:'',it:'',note:'禁用 "safety lock"'},{zh:'钢缆',en:'cable',de:'Seilzug',es:'cable de acero',fr:'',it:'',note:''},{zh:'配重片',en:'weight plate',de:'Gewichtsscheibe',es:'disco de peso',fr:'',it:'',note:''},{zh:'跑带',en:'running belt',de:'Laufband',es:'cinta de correr',fr:'',it:'',note:'DE 注意与"跑步机"同词'},{zh:'上滑轮',en:'top pulley',de:'obere Umlenkrolle',es:'polea superior',fr:'',it:'',note:''},{zh:'减震垫',en:'damper pad',de:'Dämpfungspad',es:'almohadilla amortiguadora',fr:'',it:'',note:''} ];
  s.manuals=[
    {id:'M-0038',product:'RW-300',langs:['EN'],market:'北美',template:'IronPeak 2025 Letter 模板',outputs:['pdf','docx','3d'],status:'delivered',progress:100,createdAt:now-4*DAY,doneAt:now-4*DAY+40*MIN,reviewer:'杨梦'},
    {id:'M-0035',product:'SM-700',langs:['EN','DE'],market:'欧盟',template:'IronPeak 2025 A4 模板',outputs:['pdf','docx'],status:'delivered',progress:100,createdAt:now-12*DAY,doneAt:now-12*DAY+35*MIN,reviewer:'杨梦'},
    {id:'M-0040',product:'TR-650',langs:['ES','PT'],market:'拉美',template:'IronPeak 2025 A4 模板',outputs:['pdf','docx'],status:'generating',progress:64,createdAt:now-50*MIN,reviewer:'杨梦'},
    {id:'M-0041',product:'SM-900',langs:['DE','FR','IT'],market:'欧盟',template:'IronPeak 2025 A4 模板',outputs:['pdf','docx','3d'],status:'review',progress:100,createdAt:now-3*HR,reviewer:'杨梦'},
  ];
  s.manuals.forEach(m=>{ if(m.status!=='generating') m.checks=manualChecks(m,s); });
  s.inventory=[ {part:'ST-SM9-021',name:'钢缆（SM-900）',qty:4,safe:6,loc:'NordicGym 瑞典仓'},{part:'SC-SM9-004',name:'安全锁扣总成',qty:9,safe:3,loc:'NordicGym 瑞典仓'},{part:'M10x60-PK',name:'M10×60 螺栓包',qty:23,safe:5,loc:'NordicGym 瑞典仓'},{part:'RB-RW3-010',name:'减震垫（RW-300）',qty:7,safe:4,loc:'NordicGym 瑞典仓'},{part:'PCB-TR6-04',name:'电机控制板（TR-650）',qty:2,safe:2,loc:'FitHaus 德国仓'},
    {part:'FT-FC20-74',name:'配重片存放杆（F-C20 · 74 号件）',qty:6,safe:2,loc:'Fitshop 德国仓'},{part:'FT-FC20-6',name:'M10×25 螺栓（F-C20 · 6 号件）',qty:40,safe:10,loc:'Fitshop 德国仓'},{part:'FT-FC20-20',name:'滑轮架总成（F-C20 · 20 号件）',qty:0,safe:2,loc:'Fitshop 德国仓'} ];
  s.qrs={ 'SM-900':{scans:412,createdAt:now-20*DAY}, 'SM-700':{scans:96,createdAt:now-20*DAY}, 'TR-650':{scans:587,createdAt:now-20*DAY} };

  // ---- 生成 110 条历史工单 ----
  // 批次分布故意不均匀：钢缆 / 锁扣集中在 SM-900 的 24B，电机异响集中在 RW-300 的 24B（GymPro 批次），其余在该型号各订单间均匀分布
  const HOT_BATCH={ cable:'24B', catch:'24B', motor:'24B' }; const rr={};
  const list=[];
  for(let i=0;i<110;i++){
    const kb=weighted(r,{cable:24,e07:20,motor:14,bolts:10,belt:9,catch:5,units:5,assembly:13});
    const product=KB_PRODUCT[kb]||pick(r,['SM-900','TR-650','RW-300','SM-700']);
    const lang=weighted(r,{en:44,de:23,es:14,fr:11,sv:8});
    const name=pick(r,NAMES[lang]); const email=name.toLowerCase().replace(/[^a-z]+/g,'.').replace(/\.$/,'')+'@'+pick(r,MAIL_DOM[lang]);
    const age=r()*30*DAY; const createdAt=now-age;
    const channel=weighted(r,{email:60,h5:33,manual:7});
    // 没有序列号就没有订单归属（不猜）；H5 来的大多拍了标签
    const hasSn=r()<(channel==='h5'?0.85:0.5);
    const candidates=Engine.ordersFor(product); const hot=HOT_BATCH[kb]&&candidates.find(o=>o.batches.includes(HOT_BATCH[kb]));
    rr[product+kb]=(rr[product+kb]||0)+1; const spread=candidates.filter(o=>o!==hot); const even=spread.length?spread[rr[product+kb]%spread.length]:candidates[0];
    const order=hasSn?((hot&&r()<0.8)?hot:even):null;   // 热点故障 8 成落在热点批次，其余故障在各订单间轮流
    const sn=order?`${Engine.PRODUCTS.find(p=>p.id===product).snPrefix}-${order.batches[0]}-${pad(Math.floor(r()*1200)).padStart(5,'0')}`:null;
    const entry=Engine.KB.find(k=>k.id===kb);
    const t=newTicket({ createdAt, updatedAt:createdAt, statusSince:createdAt, cust:{name,email,lang}, product, sn, batch:order?order.batches[0]:null, order:order?order.id:null, dealer:order?order.dealer:null, channel, issue:ISSUES[kb][lang], kbId:kb, photos:channel==='h5'?1:(r()<0.3?1:0) });
    const a=Engine.assess({text:t.issue+' '+product,product,serial:sn?{valid:true}:null,photos:t.photos,email,settings:s.settings});
    t.confidence=a.confidence; t.reasons=a.reasons.map(x=>x.k);
    t.timeline.push({t:createdAt,who:'cust',text:t.issue+(sn?`\nS/N ${sn}`:''),tr:entry.cat.zh});
    const firstReply=Engine.compose(a,ctxFor(t)); t.timeline.push({t:createdAt+2*MIN,who:'ai',text:firstReply,tr:Engine.summarizeZh(a,{})});
    if(age>3*DAY){
      // 已结案
      let by = entry.safety ? weighted(r,{brand:80,factory:20}) : weighted(r,{ai:70,brand:20,factory:7,dealer:3});
      if(a.route==='human' && by==='ai') by='brand';
      t.status='done'; t.resolvedBy=by;
      const dt = by==='ai'?(10*MIN+r()*2*HR): by==='brand'?(3*HR+r()*16*HR): by==='dealer'?(2*HR+r()*10*HR):(1*DAY+r()*3*DAY);
      t.resolvedAt=createdAt+dt; t.updatedAt=t.resolvedAt; t.statusSince=t.resolvedAt;
      if(by==='brand') t.timeline.push({t:createdAt+1*HR+r()*HR,who:'human',text:`已确认处置方案：${entry.part?'免费补发 '+entry.partName.zh+'（'+entry.part+'）':'按知识库指引处理'}，AI 已用客户语言回复。`});
      if(by==='factory') t.timeline.push({t:createdAt+5*HR,who:'human',text:'需要工厂确认是否为批次问题，升级给工厂销售。'},{t:createdAt+1*DAY,who:'fact',text:'工厂检查：同批次抽检 5 台未复现，判定为个案，按正常保修更换。'});
      if(by==='dealer') t.timeline.push({t:t.resolvedAt-10*MIN,who:'dealer',text:'分销商门店已就近处理（扫码打点），同步回平台。'});
      t.timeline.push({t:t.resolvedAt,who:'sys',text:by==='ai'?'客户确认问题已解决，工单自动关闭。':'工单已关闭。'});
      if(r()<0.55) t.rating= r()<0.7?5:(r()<0.8?4:3);
    } else {
      const st=weighted(r,{ai:35,human:15,factory:8,done:42});
      if(st==='done'){ t.status='done'; t.resolvedBy=entry.safety?'brand':'ai'; t.resolvedAt=createdAt+(entry.safety?4*HR:30*MIN); t.statusSince=t.resolvedAt; t.timeline.push({t:t.resolvedAt,who:'sys',text:'客户确认问题已解决，工单自动关闭。'}); }
      else if(st==='human'){ t.status='human'; t.statusSince=Math.max(createdAt+20*MIN, now-r()*3.5*HR); t.timeline.push({t:t.statusSince,who:'sys',text:'AI 无法判断，已转品牌方售后（一级）。'}); }
      else if(st==='factory'){ t.status='factory'; t.statusSince=Math.max(createdAt+6*HR, now-r()*20*HR); t.timeline.push({t:createdAt+2*HR,who:'human',text:'需要工厂判断，升级给工厂销售。'},{t:t.statusSince,who:'sys',text:'已升级到工厂销售（二级）。'}); }
      else { t.status=a.route==='human'?'human':'ai'; if(t.status==='human'){ t.statusSince=Math.max(createdAt+2*MIN, now-r()*3*HR); t.timeline.push({t:createdAt+2*MIN,who:'sys',text:'触发规则，暂停自动回复，等待品牌方售后。'}); } }
      t.updatedAt=t.statusSince;
    }
    list.push(t);
  }
  // ---- 7 条精选工单（带完整对话） ----
  const F=(o)=>list.push(newTicket(o));
  F({ tag:'cable', createdAt:now-2*HR, cust:{name:'Mark Reynolds',email:'m.reynolds@gmail.com',lang:'en'}, product:'SM-900', sn:'SM9-24B-00931', batch:'24B', order:'PO-24118', dealer:'NordicGym AB', channel:'email', issue:'Cable fraying near the top pulley after 3 months', kbId:'cable', confidence:87, reasons:['safety'], status:'human', statusSince:now-2*HR+3*MIN, photos:1,
    timeline:[{t:now-2*HR,who:'cust',text:"Hi, the cable on my Smith machine is fraying near the top pulley, bought 3 months ago from NordicGym. Serial SM9-24B-00931. Photo attached.",tr:'钢缆在上滑轮处起毛，3 个月前购于 NordicGym，附照片。'},{t:now-2*HR+2*MIN,who:'ai',text:"Thanks, Mark. From your photo this is wear on the top-pulley cable. Please stop using the machine until it's replaced — a frayed cable can fail under load. Because this is a safety part, a person on our team will confirm the replacement within 4 hours; you'll get an email as soon as they do.",tr:'匹配知识库「钢缆磨损（上滑轮处）」；置信度 87%；触发规则：涉及安全件 → 暂停自动承诺，转品牌方售后'},{t:now-2*HR+3*MIN,who:'sys',text:'触发规则「涉及安全件」，等待品牌方售后确认处置方案。'}] });
  F({ tag:'e07', createdAt:now-3*HR, cust:{name:'Lena Hoffmann',email:'lena.h@web.de',lang:'de'}, product:'TR-650', sn:'TR6-24A-01107', batch:'24A', order:'PO-24097', dealer:'FitHaus GmbH', channel:'h5', issue:'Laufband stoppt nach 10 Minuten, Fehlercode E07', kbId:'e07', confidence:85, reasons:[], status:'human', statusSince:now-80*MIN, photos:1, asks:2,
    timeline:[{t:now-3*HR,who:'cust',text:'Laufband stoppt nach 10 Minuten, Fehlercode E07. Habe es gestern schon geschmiert.',tr:'跑步机 10 分钟后停机，报 E07。昨天已经润滑过了。'},{t:now-3*HR+1*MIN,who:'ai',text:'Danke, Lena. E07 bedeutet Überhitzung der Motorsteuerung. Da Sie bereits geschmiert haben: Bitte 30 Minuten vom Netz trennen und dann 10 Minuten bei 4 km/h testen. Tritt E07 erneut auf?',tr:'E07 为电机控制器过热。客户已润滑，建议断电 30 分钟后 4 km/h 测试。'},{t:now-100*MIN,who:'cust',text:'Ja, nach 8 Minuten wieder E07.',tr:'是的，8 分钟后又报 E07。'},{t:now-98*MIN,who:'ai',text:'Verstanden. Dann ist vermutlich die Steuerplatine betroffen; das bestätigt ein Kollege innerhalb von 4 Stunden und wir tauschen sie auf Garantie.',tr:'润滑后仍 E07，疑似控制板故障，需人工确认换板。'},{t:now-80*MIN,who:'sys',text:'AI 两轮追问后仍无法闭环，转品牌方售后（一级）。建议：更换控制板 PCB-TR6-04，FitHaus 德国仓有 2 块。'}] });
  F({ tag:'bolts', createdAt:now-14*HR, cust:{name:'Carlos Mendes',email:'carlos.m@outlook.com',lang:'es'}, product:'SM-900', sn:'SM9-24B-00877', batch:'24B', order:'PO-24118', dealer:'NordicGym AB', channel:'h5', issue:'Falta el tornillo M10 del paquete de montaje, paso 7', kbId:'bolts', confidence:93, reasons:[], status:'ai', statusSince:now-14*HR+8*MIN, photos:2, pending:{type:'ship',part:'M10x60-PK',from:'NordicGym 门店'},
    timeline:[{t:now-14*HR,who:'cust',text:'Falta el tornillo M10 del paquete de montaje, paso 7.',tr:'安装包里缺少第 7 步用的 M10 螺栓。'},{t:now-14*HR+1*MIN,who:'ai',text:'Gracias, Carlos. He comprobado tu pedido: el paso 7 usa 4 tornillos M10×60 (bolsa C). ¿Cuántos faltan? Envíame una foto de la bolsa C.',tr:'已查订单：第 7 步用 4 颗 M10×60（C 袋）。请确认缺几颗并拍 C 袋。'},{t:now-14*HR+7*MIN,who:'cust',text:'Faltan 2. [foto_bolsa_c.jpg]',tr:'缺 2 颗。'},{t:now-14*HR+8*MIN,who:'ai',text:'Perfecto. NordicGym (tu tienda) tiene tornillos en stock y puede enviártelos en 2 días laborables. Mientras tanto puedes continuar con los pasos 8–10.',tr:'同批次已有 3 起 C 袋缺件。NordicGym 门店有库存，建议门店就近补发，等品牌方确认出货。'}] });
  F({ tag:'motor', assignee:{name:'王工',email:'wang@jianbu.cn',org:'东莞健步工业',status:'active'}, collab:[{name:'赵工',email:'zhao@jianbu.cn',org:'东莞健步工业',role:'eng',status:'pending',by:'王工',at:now-17*HR}], createdAt:now-22*HR, cust:{name:'GymPro Ltd (Ahmed)',email:'ops@gympro.ae',lang:'en'}, product:'RW-300', sn:'RW3-24B-00210', batch:'24B', order:'PO-24088', dealer:'GymPro Ltd', channel:'email', issue:'Resistance motor noise on 6 units in the same batch', kbId:'motor', confidence:87, reasons:[], status:'factory', statusSince:now-18*HR, photos:0,
    timeline:[{t:now-22*HR,who:'cust',text:'We have 6 RW-300 units from batch 24B with a humming noise from the resistance motor after ~2 weeks of gym use. Serial of one: RW3-24B-00210.',tr:'同批次 6 台划船机阻力电机嗡鸣，商用健身房约 2 周后出现。'},{t:now-22*HR+2*MIN,who:'ai',text:'Thanks, Ahmed. A humming noise from the RW-300 resistance unit is usually the damper pads under the motor bracket. With 6 units in the same batch I\'m also flagging this to the factory to check the batch. We\'ll send damper pad sets for all 6 units meanwhile.',tr:'匹配「阻力电机异响」；同批次 ≥ 3 起 → 触发二级路由条件，升级工厂。'},{t:now-20*HR,who:'human',text:'同意先寄 6 套减震垫。请工厂确认 24B 批次电机支架减震垫是否批量老化。'},{t:now-18*HR,who:'sys',text:'已升级到工厂销售 王工（东莞健步工业，二级，24 小时）。'}] });
  F({ tag:'belt', createdAt:now-27*HR, cust:{name:'Sophie Martin',email:'sophie.martin@orange.fr',lang:'fr'}, product:'TR-650', sn:'TR6-24A-00988', batch:'24A', order:'PO-24097', dealer:'FitHaus GmbH', channel:'email', issue:'Comment lubrifier la bande de course ?', kbId:'belt', confidence:85, reasons:[], status:'done', resolvedBy:'ai', resolvedAt:now-26*HR, statusSince:now-26*HR, photos:1, rating:5,
    timeline:[{t:now-27*HR,who:'cust',text:'Bonjour, comment lubrifier la bande de course de mon tapis TR-650 ? Photo de l\'étiquette jointe.',tr:'如何给跑步机跑带润滑？附标签照片。'},{t:now-27*HR+1*MIN,who:'ai',text:'Merci, Sophie. Lubrifiez tous les 3 mois ou 100 km : soulevez le bord de la bande et appliquez une ligne de lubrifiant silicone de chaque côté. Je vous envoie la vidéo de 38 secondes.',tr:'匹配「跑带偏移 / 润滑」；置信度 85% ≥ 阈值 → AI 直接回复并附视频。'},{t:now-26*HR,who:'cust',text:'Parfait, merci, c\'est fait !',tr:'太好了，谢谢，已完成。'},{t:now-26*HR,who:'sys',text:'客户确认问题已解决，工单自动关闭。评分 5。'}] });
  F({ tag:'catch', createdAt:now-50*HR, cust:{name:'Jake Thompson',email:'jaket@yahoo.com',lang:'en'}, product:'SM-900', sn:'SM9-24B-00902', batch:'24B', order:'PO-24118', dealer:'NordicGym AB', channel:'email', issue:'Safety catch does not lock on the left side', kbId:'catch', confidence:71, reasons:['safety'], status:'human', statusSince:now-29*HR, photos:2,
    timeline:[{t:now-50*HR,who:'cust',text:"Hi, the safety catch on the left side of my Smith machine (SM-900) doesn't lock anymore. It slips when I rack the bar. Bought 2 months ago from NordicGym.",tr:'史密斯机左侧安全锁扣锁不住，挂杆时滑脱。2 个月前购于 NordicGym。'},{t:now-50*HR+1*MIN,who:'ai',text:'Thanks Jake — sorry about that. Could you send a short video of the catch when you rack the bar, and a photo of the label on the rear upright so I can confirm the batch?',tr:'要求客户拍锁扣视频和标签照片。'},{t:now-48*HR,who:'cust',text:'[video_0923.mp4] [IMG_4471.jpg] Here you go.',tr:'已附视频与照片。'},{t:now-48*HR+1*MIN,who:'ai',text:'(internal) 识别序列号 SM9-24B-00902，批次 24B，订单 PO-24118。视频中锁扣回弹不足，疑似扭簧失效。安全件，按设置暂停自动回复。',tr:'匹配「安全锁扣失效」；触发规则：涉及安全件 → 转品牌方售后'},{t:now-29*HR,who:'human',text:'已查看。24B 批次锁扣扭簧有过一次来料问题。建议：免费寄新锁扣总成，并指导客户停用左侧直到更换。请工厂确认该批次是否需要批量排查。'}] });
  F({ tag:'units', createdAt:now-3*DAY-5*HR, cust:{name:'Anna Lindqvist',email:'anna.l@telia.se',lang:'sv'}, product:'RW-300', sn:'RW3-24A-00188', batch:'24A', order:'PO-24076', dealer:'NordicGym AB', channel:'h5', issue:'Display shows wrong distance units', kbId:'units', confidence:85, reasons:[], status:'done', resolvedBy:'dealer', resolvedAt:now-3*DAY-2*HR, statusSince:now-3*DAY-2*HR, photos:1, rating:4,
    timeline:[{t:now-3*DAY-5*HR,who:'cust',text:'Displayen visar miles istället för km.',tr:'显示屏显示英里而不是公里。'},{t:now-3*DAY-5*HR+1*MIN,who:'ai',text:'Tack, Anna. Håll MODE i 3 sekunder tills displayen blinkar, tryck + för att byta enhet, tryck MODE igen för att spara.',tr:'匹配「显示单位错误」→ AI 直接回复。'},{t:now-3*DAY-2*HR,who:'dealer',text:'客户到 NordicGym 门店，店员现场重置设置并打点"已处理"。'},{t:now-3*DAY-2*HR,who:'sys',text:'工单已关闭（分销商处理）。评分 4。'}] });
  F({ tag:'cb', suggest:{type:'factory',reason:'疑似批次 25A 加工尺寸偏差（孔距 118 mm vs 120 mm），需工厂确认',at:now-4*HR-40*MIN}, createdAt:now-5*HR, cust:{name:'Paul Richter',email:'paul.r@gmx.de',lang:'de'}, product:'CB-1200', sn:'CB1-25A-00012', batch:'25A', order:'PO-24131', dealer:'FitHaus GmbH', channel:'email', issue:'Querstrebe passt nicht in die Aufnahme, Schritt 9 – Bohrungen versetzt?', kbId:'assembly', confidence:72, reasons:[], status:'human', statusSince:now-4*HR-40*MIN, photos:2, asks:2,
    timeline:[{t:now-5*HR,who:'cust',text:'Hallo, beim Aufbau des Cable Crossover CB-1200 passt die Querstrebe in Schritt 9 nicht in die Aufnahme, die Bohrungen scheinen versetzt zu sein. Seriennummer CB1-25A-00012. Fotos anbei.',tr:'龙门架第 9 步横梁装不进安装座，孔位似乎偏移。附 2 张照片。'},{t:now-5*HR+1*MIN,who:'ai',text:'Danke, Paul. Können Sie bitte ein Foto der Bohrungen mit einem Maßband und die Teilenummer auf der Querstrebe senden?',tr:'追问：孔位尺寸照片与横梁零件号。'},{t:now-4*HR-50*MIN,who:'cust',text:'[IMG_1.jpg] [IMG_2.jpg] Teil Nr. CB12-07, Abstand 118 mm statt 120 mm laut Anleitung.',tr:'零件号 CB12-07，孔距 118 mm，说明书为 120 mm。'},{t:now-4*HR-40*MIN,who:'sys',text:'AI 两轮追问后判断疑似加工尺寸问题，需要工厂确认；但订单 PO-24131 的工厂（青岛迈动器械）没有接口人，无法升级，先转品牌方售后。'}] });
  // ---- 真实案例 FWT-61：Force（品牌，AFS 售后代为跟进）→ Bodylonger（工厂）+ 贸易对接 Nandy，14 封邮件 21 天 ----
  // 一封信拆成 3 个子问题（技术问答 / 缺件补发 / 条件备件），各自闭环；质量事件（CAPA）挂 10-14 工厂口头承诺的换胶方案
  { const TS=s=>new Date(s).getTime();
    F({ tag:'fwt61', ext:{ref:'22574701',ticket:'FWT-61'}, createdAt:TS('2026-10-13T07:09:00+08:00'), statusSince:now-3*HR,
      cust:{name:'Fitshop 终端消费者（经 Force / AFS 转述）',email:'max.m@australianfitnesssupplies.com.au',lang:'en'},
      product:'F-C20', sn:'20251042535', batch:'25K', order:'PO-25087', dealer:'Fitshop EU', channel:'email', photos:2,
      issue:'FWT-61 · 20 号件粘接失效（胶水问题复发）+ 缺 1×74 号配重片存放杆、1×6 号 M10×25 螺栓',
      kbId:'glue', confidence:74, reasons:['refund'], status:'human',
      issues:[
        {type:'tech',title:'20 号件粘接失效：胶水型号 + 消费者可安全使用的溶剂',status:'closed',owner:'factory',asker:'Max（Force）',
          checklist:[{q:'粘接用的是哪种胶水',done:false,ans:'未披露'},{q:'有没有消费者可安全使用的溶剂 / 拆解办法',done:true,ans:'吹风机加热 2–3 分钟；Loctite SF 7063 清洁剂（10-15 给出）'}],
          note:'10-14 工厂口头承诺“查找新型胶水做固定”，之后再无答复；10-15 给出替代方案。按平台规则“不披露”记为正式结案结论，并开 CAPA 跟踪换胶。'},
        {type:'parts',title:'缺件：1×74 号配重片存放杆 + 1×6 号 M10×25（一颗拧不进）',status:'shipped',owner:'factory',
          checklist:[{q:'确认缺件件号与数量（消费者反馈图）',done:true},{q:'工厂确认现货 / 生产周期（74、6 现货，20 需 10 天生产）',done:true},{q:'承诺发运日 10-30，空运至 Fitshop 德国仓',done:true},{q:'运单号回填',done:true,ans:'879545895350（11-04 才给，已超时）'}],
          note:'Max 提醒“发货后请给运单号”两次，11-02 再次催促，运单 11-04 才到。'},
        {type:'spare',title:'条件备件：20 号件是否随发（观察 / 备货 / 取消）',status:'done',owner:'brand',
          checklist:[{q:'品牌确认消费者自行修复结果后再定',done:true},{q:'无反馈则只发 74+6（10-20 拍板三件齐发，20 号件作备件）',done:true}],note:''}],
      shipments:[{parts:'74 号件 ×1 · 6 号件 ×1 · 20 号件 ×1（备件）',to:'Fitshop EU（Fitshop Logistikzentrum）',addr:'Gustav-Robert-Kirchhoffstr. 14, 24783 Osterrönfeld, Germany',method:'空运快递',
        promisedAt:TS('2026-10-30T00:00:00+08:00'), shippedAt:TS('2026-10-31T20:05:00+08:00'), tracking:'879545895350', trackingAt:TS('2026-11-04T09:00:00+08:00')}],
      capa:{title:'20 号件粘接工艺：换用新型胶水并做批次验证',owner:'Andy（山东宝力龙）',due:'2026-11-20',status:'open',at:TS('2026-10-14T09:41:00+08:00'),
        note:'10-14 工厂口头承诺“查找新型胶水做固定”，此后无验证记录。按平台规则，口头措施不结案，必须有主责人与截止日。'},
      timeline:[
        {t:TS('2026-10-13T07:09:00+08:00'),who:'cust',text:'Hey Andy, Another issue with a part sticking and appears to be an issue with the glue again. Can you confirm the type of glue used for these components as we need to get a quicker solution to this for customers that can save you having to send out a part. Serial number: 20251042535\n\n- What type of glue is used\n- Is there a solvent that can be safely used by the customer to resolve this?\n\nThey are also missing a screw which I am confirming with them and will get back to you on this.',tr:'Force 转述消费者反馈：20 号件粘接处卡滞，疑似胶水问题复发（“glue again”）。两问：①胶水型号 ②客户可自行使用的安全溶剂。另提缺螺丝，待消费者确认。'},
        {t:TS('2026-10-13T08:10:00+08:00'),who:'ai',text:'邮件解析：外部单号 FWT-61 / ref 22574701 / F-C20 / SN 20251042535（12 位数字序列号）。一封信拆成 2 个开放子问题：①粘接技术咨询 ②缺件（待消费者确认件号）。命中「again / Another issue」→ 疑似复发，系统内无同 SN 同部位历史工单，标记“复发风险，无档案”。知识库无 F-C20 粘接工艺条目 → 技术子问题派工厂，AI 不猜。',tr:'建单并拆子问题；复发标记。'},
        {t:TS('2026-10-14T09:41:00+08:00'),who:'fact',text:'Hi Team, as we talk on the wechat. We will try to find a new type of glue for fixation. about this customer complaint, send a new pulley frame to customer?',tr:'工厂：微信上已讨论，将找新型胶水；问是否寄新的滑轮架。'},
        {t:TS('2026-10-14T09:45:00+08:00'),who:'sys',text:'技术子问题答复要点核销：提问 2 点，已答 0 点（未给胶水型号，也未给溶剂）。未通过核销，不能放行对客。工厂“换新型胶水”写入 CAPA 建议。',tr:'O4 要点核销拦截。'},
        {t:TS('2026-10-14T11:45:00+08:00'),who:'cust',text:'If sending a replacement part is the only option, we will proceed with that. However, could you please confirm which glue is used so we can explore other possibilities? Sending a part will cause further delays for the customer, so we would prefer to find a simpler, faster solution for them if possible. I checked the WeChat messages, but the glue type was not specified.',tr:'品牌坚持技术优先：寄件是最后选项，请先确认胶水型号（翻了微信也没有）。'},
        {t:TS('2026-10-14T17:02:00+08:00'),who:'fact',text:'Hi Max, I do agree with your approach, Andy is still checking on what type of chemicals (maybe alcohol) could be used to remove the glue, will keep you posted.',tr:'贸易对接 Nandy：工厂还在查可用化学品（可能是酒精）。'},
        {t:TS('2026-10-15T06:51:00+08:00'),who:'cust',text:'Customer has confirmed they also have an issue with 1x 74 weight Storage and 1x 6 M10x25mm confirming that just one of them is not screwing in. Would it be possible to send a repalcement to them? Please dispatch this via air freight to Fitshop EU (Fitshop Logistikzentrum), Gustav-Robert-Kirchhoffstr. 14, 24783 Osterrönfeld, Germany.',tr:'缺件子问题确认：1×74 号件 + 1×6 号 M10×25，指定空运至 Fitshop 德国仓。'},
        {t:TS('2026-10-15T21:08:00+08:00'),who:'fact',text:'Hi Max, I reckon you could try with below 2 approaches: 1. Using a hair dryer to heat up the glued section to see whether it would come loose or not 2. Using the Loctite SF 7063 Cleaner (image attached)',tr:'技术子问题：给出替代方案（吹风机加热 + Loctite SF 7063），仍未给胶水型号。'},
        {t:TS('2026-10-15T21:20:00+08:00'),who:'sys',text:'技术子问题核销：溶剂问题已答（替代方案），胶水型号记为“工厂未披露”。子问题按“结论闭环”结案，CAPA 跟踪根因。',tr:'O4：不披露也是结论。'},
        {t:TS('2026-10-16T05:44:00+08:00'),who:'cust',text:'Thank you for the suggestions on FWT-61. I will pass the hair dryer and Loctite SF 7063 Cleaner options on to the customer and let you know the result. @Andy, please also confirm whether 1x Part 74 and 1x Part 6 can be dispatched, along with the expected dispatch date.',tr:'方案转消费者验证；催工厂确认 74/6 发运。'},
        {t:TS('2026-10-17T16:11:00+08:00'),who:'fact',text:'Hi Max, Does the customer require a 20# parts? if three parts all send out, we need 10days to production.',tr:'工厂反问是否需要 20 号件；三件齐发需 10 天生产。'},
        {t:TS('2026-10-20T07:23:00+08:00'),who:'cust',text:'The customer\'s current request is 1x Part 74 and 1x Part 6. On Part 20: Can we look into producing this so we can have it ready in case they do need it? We are awaiting the customer confirming if the troubleshooting resolved the issue. If I dont hear form them by tomorrow we can proceed with just oart 74 & 6.',tr:'拍板：74+6 照发；20 号件先备产；明天无消费者消息就只发 74+6。'},
        {t:TS('2026-10-20T11:50:00+08:00'),who:'fact',text:'OK, Three parts will all production. we will finished on 30th this month.',tr:'三件都排产，10-30 完工。'},
        {t:TS('2026-10-20T12:00:00+08:00'),who:'sys',text:'承诺日期入库：10-30 完工（寄件承诺日期字段）。备件子问题转“备货”，若消费者反馈已修复可取消；未反馈按品牌规则执行。',tr:'O6：承诺日期字段化。'},
        {t:TS('2026-10-31T20:05:00+08:00'),who:'fact',text:'we send it. maybe next monday have the tracking number.',tr:'工厂：已发货，下周一给运单号。'},
        {t:TS('2026-11-02T10:40:00+08:00'),who:'cust',text:'Thank you for confirming this information. If you could also provide the tracking details, that would be greatly appreciated.',tr:'品牌催运单。'},
        {t:TS('2026-11-04T09:00:00+08:00'),who:'fact',text:'Hi Max, 879545895350',tr:'运单号：879545895350。'},
        {t:TS('2026-11-04T09:10:00+08:00'),who:'sys',text:'运单回填（超承诺 +2 天，平台应发货当日自动推送、超 24h 自动催办）。缺件子问题结案。CAPA 到期 2026-11-20 前需工厂提交换胶验证结果。',tr:'O5：运单必填与催办。'}
      ] });
  }
  // 批次聚集：对进行中的工单，若其 (型号, 批次, 故障) 明显高于其他批次，AI 给出升级建议（只建议，不自动升级）
  for(const t of list){ if(t.status==='done'||t.status==='factory'||!t.sn||!t.kbId||t.suggest) continue; const c=batchCluster(list,t.kbId,t.product,t.batch,t); if(c.hot) t.suggest={type:'factory',reason:clusterReason(c),at:t.createdAt+5*MIN}; }
  list.sort((a,b)=>a.createdAt-b.createdAt);
  for(const t of list){ const d=new Date(t.createdAt); t.id=`T-${String(d.getFullYear()).slice(2)}${pad(d.getMonth()+1)}-${pad(++s.seq.ticket).padStart(4,'0')}`; if(!t.updatedAt) t.updatedAt=t.statusSince; }
  s.tickets=list;
  return s;
}

/* ---------- 同批次聚集判定（相对其他批次，而不是绝对数） ---------- */
// same ≥ 3 且 same ≥ 2 × 其他批次合计 → 认为该批次异常。返回 {same, others, hot, batch, cat}
function batchCluster(tickets, kbId, product, batch, self){ const rel=tickets.filter(t=>t!==self&&t.kbId===kbId&&t.product===product&&t.batch); const same=rel.filter(t=>t.batch===batch).length; const others=rel.length-same; const hot=Policy.isBatchHot(same,others); const kb=Engine.KB.find(k=>k.id===kbId); return { same, others, hot, batch, cat:kb?kb.cat.zh:kbId }; }
function clusterReason(c){ return `批次 ${c.batch} 已有 ${c.same} 起「${c.cat}」，其他批次合计 ${c.others} 起，疑似批次问题`; }

/* ---------- 说明书合规检查（按市场、产品档案、知识库资料与条目计算） ---------- */
// 术语表有哪些语种列（与可选语种对齐；没有列的语种不做术语一致性检查）
const TERM_LANGS=['en','de','es','fr','it'];
// 每一项要么从数据算出来（src:'data'），要么是品牌模板自带、默认通过（src:'template'）—— 审核页会把两类分开显示
function manualChecks(m, st){
  const s=st||state; const p=s.products.find(x=>x.id===m.product)||{};
  const eu=m.market==='欧盟'||m.market==='英国'; const na=m.market==='北美';
  const files=s.kbFiles.filter(f=>(f.p===m.product)&&f.st==='已入库');
  const kb=Engine.KB.filter(k=>k.product===m.product);
  const hasSrc=files.some(f=>f.t==='说明书');                              // 有中文原稿才有章节可译
  const hasParts=files.some(f=>f.t==='零件结构');                          // 爆炸图 / BOM → 装配章节与零件号
  const hasCodes=files.some(f=>f.t==='故障代码')||kb.some(k=>/E\d\d/.test(k.cat.en));  // 故障代码表 → 故障排除章节
  const safetyParts=kb.filter(k=>k.safety);                               // 安全件条目 → 安全须知里的专项警告
  const torqueSteps=kb.filter(k=>k.steps.zh.some(x=>/N·m|N\.m|扭矩/.test(x)));  // 条目步骤里有扭矩值
  const maint=kb.filter(k=>/润滑|保养|lubric/i.test(k.cat.zh+k.cat.en+k.steps.zh.join('')));
  const checkable=m.langs.filter(l=>TERM_LANGS.includes(l.toLowerCase()));
  const missingTerms=checkable.filter(l=>s.terms.some(t=>!t[l.toLowerCase()]));
  const uncheckable=m.langs.filter(l=>!TERM_LANGS.includes(l.toLowerCase()));
  const list=[
    {k:'src',src:'data',ok:hasSrc,label:hasSrc?`中文原稿：${files.find(f=>f.t==='说明书').n}`:'中文原稿缺失 — 知识库里没有该型号的说明书文件，章节无法翻译',fix:'upload'},
    {k:'weight',src:'data',ok:!!p.maxUserWeight,label:'最大用户体重'+(p.maxUserWeight?`（${p.maxUserWeight} kg，来自产品档案）`:' — 产品档案缺失，需确认数值'),fix:'weight'},
    {k:'safety',src:'data',ok:true,na:!safetyParts.length,label:safetyParts.length?`安全须知含 ${safetyParts.length} 项安全件专项警告（${safetyParts.map(k=>k.partName.zh).join('、')}）`:'安全须知 — 该型号没有标记安全件的知识条目，只含模板通用警示'},
    {k:'parts',src:'data',ok:hasParts,label:hasParts?'装配章节带零件号（来自爆炸图 / BOM）':'装配章节无零件号 — 缺爆炸图 / 零件清单，客户报修时无法对零件号',fix:'upload'},
    {k:'torque',src:'data',ok:torqueSteps.length>0||!hasParts,na:!torqueSteps.length&&!hasParts,label:torqueSteps.length?`装配说明含扭矩值（${torqueSteps.length} 处）`:hasParts?'装配说明无扭矩值 — 条目步骤未提供':'装配说明扭矩值 — 待零件清单入库后检查'},
    {k:'maint',src:'data',ok:maint.length>0||!/TR|RW/.test(m.product),na:!maint.length&&!/TR|RW/.test(m.product),label:maint.length?'维护与润滑周期（来自知识条目）':/TR|RW/.test(m.product)?'维护与润滑周期 — 该型号没有润滑 / 保养条目':'维护与润滑周期 — 无传动部件，不要求'},
    {k:'codes',src:'data',ok:hasCodes||!/TR/.test(m.product),na:!hasCodes&&!/TR/.test(m.product),label:hasCodes?'故障代码表（来自工厂资料）':/TR/.test(m.product)?'故障代码表缺失 — 带电机的型号应提供':'故障代码表 — 无电控，不要求'},
    {k:'terms',src:'data',ok:missingTerms.length===0,label:missingTerms.length?`术语表一致性 — ${missingTerms.join('、')} 列缺失，AI 推断术语已高亮`:checkable.length?`术语表一致性 100%（${checkable.join('、')}）`:'术语表一致性 — 所选语种均无术语列，未检查',fix:missingTerms.length?'terms':undefined},
  ];
  if(uncheckable.length) list.push({k:'termsNA',src:'data',ok:true,na:true,label:`${uncheckable.join('、')} 没有术语列，不做术语检查（正式版可在术语表新增列）`});
  // 模板自带项：由品牌模板保证，默认通过
  list.push(
    {k:'ce',src:'template',ok:true,label:eu?'CE 标志与制造商信息':na?'制造商信息与产地（ASTM）':'制造商信息与产地'},
    {k:'class',src:'template',ok:true,label:eu?'EN 957-1 使用等级声明':na?'ASTM F2276 适用声明':'使用等级声明'},
    {k:'symbols',src:'template',ok:true,label:'警示符号 ISO 7010'},
    {k:'font',src:'template',ok:true,label:'字号 ≥ 8pt'},
    {k:'estop',src:'template',ok:true,label:'紧急停止说明'},
    {k:'toc',src:'template',ok:true,label:'页码与目录'});
  if(eu) list.push({k:'weee',src:'template',ok:true,label:'废弃与回收信息（WEEE）'});
  if(m.outputs.includes('3d')) list.push({k:'3d',src:'data',ok:!!p.has3d,label:p.has3d?'3D 安装动画已生成（基于 STEP 模型）':'3D 安装动画 — 无 STEP 模型，已跳过',fix:'3d'});
  return list;
}

/* ---------- 持久化 ---------- */
function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){} }
function load(){ try{ const raw=localStorage.getItem(STORE_KEY); if(raw){ const s=JSON.parse(raw); if(s.v===SEED_VERSION) return s; } }catch(e){} return null; }
function syncEngineOrders(){ Engine.setOrders(state.orders); }
function resetAll(){ try{ localStorage.removeItem(STORE_KEY); localStorage.removeItem(INBOX_KEY); }catch(e){} state=seed(); syncEngineOrders(); save(); go('agent'); toast('演示数据已重置'); }

/* ---------- 工单相关工具 ---------- */
const ST = { ai:['AI处理中','ai'], guiding:['修复指导中','amber'], human:['待品牌方售后','amber'], factory:['已升级工厂','violet'], done:['已解决','green'], late:['SLA超时','red'] };
function slaDeadline(t){ if(t.status==='human') return t.statusSince+Policy.slaHours('l1')*HR; if(t.status==='factory') return t.statusSince+Policy.slaHours('l2')*HR; if(t.status==='guiding'&&t.guideDue) return t.guideDue; return null; }
function isLate(t){ const d=slaDeadline(t); return d!==null && Date.now()>d; }
function viewStatus(t){ return isLate(t)?'late':t.status; }
function slaText(t){ if(t.status==='done') return '已完成'; const d=slaDeadline(t); if(d===null) return t.status==='ai'&&t.pending?'等你确认':'—'; const r=d-Date.now(); return r<0?`超时 ${dur(-r)}`:dur(r); }
function tagOf(t){ const [l,c]=ST[viewStatus(t)]; return `<span class="tag ${c}"><span class="dot"></span>${l}</span>`; }
function tById(id){ return state.tickets.find(t=>t.id===id); }
function tByTag(tag){ return state.tickets.find(t=>t.tag===tag); }
function partnerOf(name){ return state.partners.find(p=>p.name===name)||null; }
function orderMembers(o){ const list=[{role:'b',name:'杨梦',email:'yang.meng@ironpeak.com',org:'IronPeak Fitness',status:'active',scope:'brand'}];
  for(const orgName of [o.factory,o.dealer]){ const p=partnerOf(orgName); if(!p) continue; for(const c of p.contacts) if(c.defaultAll&&!(o.excluded||[]).includes(c.email)) list.push({role:p.type==='factory'?'f':'d',name:c.name,email:c.email,org:p.name,status:c.status,scope:'org',title:c.title}); }
  for(const m of (o.overrides||[])) if(!list.some(x=>x.email===m.email)) list.push({...m,scope:'order'});
  return list; }
function factoryContact(o){ const ms=orderMembers(o).filter(m=>m.role==='f'); return ms.find(m=>m.status==='active')||ms[0]||null; }
function me(){ return ROLE[role].email; }
function isMember(o,email){ return orderMembers(o).some(m=>m.email===email&&m.status==='active'); }
function myOrders(){ if(role==='brand') return state.orders; return state.orders.filter(o=>isMember(o,me())); }
function visibleTickets(){ const ids=new Set(myOrders().map(o=>o.id)); return state.tickets.filter(t=>role==='brand'||ids.has(t.order)||(t.collab||[]).some(c=>c.email===me()&&c.status==='active')).sort((a,b)=>b.updatedAt-a.updatedAt); }
function ordersWithoutFactory(){ return state.orders.filter(o=>!factoryContact(o)); }
// 订单号与种子一致：PO-YY + 三位流水（PO-24118 → 下一张 PO-24132 之后）
function nextOrderId(){ const d=new Date(); const yy=String(d.getFullYear()).slice(2); const nums=state.orders.map(o=>(o.id.match(/^PO-\d{2}(\d{3})$/)||[])[1]).filter(Boolean).map(Number); const n=(nums.length?Math.max(...nums):100)+1; return `PO-${yy}${String(n).padStart(3,'0')}`; }
// 新建 / CSV 导入共用的校验与构造；返回 {ok, error} 或 {ok, order}
function buildOrder(f){ const id=(f.id||'').trim().toUpperCase(); if(!/^PO-\d{3,6}$/.test(id)) return {ok:false,error:`订单号 ${id||'(空)'} 格式应如 PO-24140`}; if(state.orders.some(o=>o.id===id)) return {ok:false,error:`订单号 ${id} 已存在`};
  const product=(f.product||'').trim().toUpperCase(); if(!state.products.some(p=>p.id===product)) return {ok:false,error:`型号 ${product||'(空)'} 不存在`};
  const batch=(f.batch||'').trim().toUpperCase(); if(!/^\d{2}[A-Z]$/.test(batch)) return {ok:false,error:`批次 ${batch||'(空)'} 格式应如 25B`};
  const dup=state.orders.find(o=>o.product===product&&(o.batches||[]).includes(batch)); if(dup) return {ok:false,error:`${product} 的批次 ${batch} 已属于订单 ${dup.id}，序列号会解析到那张订单；一个批次只能属于一张订单`};
  const factory=(f.factory||'').trim(); if(!factory) return {ok:false,error:'工厂不能为空'};
  const ship=/^\d{4}-\d{2}-\d{2}$/.test(f.ship||'')?f.ship:new Date().toISOString().slice(0,10); const warrantyUntil=ship.slice(0,7).replace(/^(\d{4})/,(m)=>String(+m+2));
  const order={id,product,qty:+f.qty||0,brand:'IronPeak Fitness',factory,dealer:(f.dealer||'').trim()||'—',dealerCity:(f.city||'').trim()||'—',batches:[batch],ship,warrantyUntil,source:f.source||'手动创建',createdAt:Date.now(),overrides:[],excluded:[]};
  return {ok:true,order}; }
function addOrder(order){ if(!partnerOf(order.factory)) state.partners.push({name:order.factory,type:'factory',contacts:[]}); if(order.dealer&&order.dealer!=='—'&&!partnerOf(order.dealer)) state.partners.push({name:order.dealer,type:'dealer',contacts:[]}); state.orders.push(order); syncEngineOrders(); }
// 接口人失去某订单（撤销 / 关掉默认覆盖 / 单订单移除）后，其名下该范围的工厂工单退回品牌方
function recallFrom(email, orderIds, why){ let n=0; for(const t of state.tickets){ if(t.status==='factory'&&t.assignee&&t.assignee.email===email&&(!orderIds||orderIds.includes(t.order))){ setStatus(t,'human'); t.assignee=null; addEntry(t,'sys',`${why}，工单退回品牌方售后。`); n++; } } return n; }
function openTickets(){ return visibleTickets().filter(t=>t.status!=='done'); }
function touch(t){ t.updatedAt=Date.now(); save(); }
function addEntry(t,who,text,tr){ t.timeline.push({t:Date.now(),who,text,tr}); touch(t); }
function setStatus(t,st,by){ t.status=st; t.statusSince=Date.now(); if(st==='done'){ t.resolvedAt=Date.now(); t.resolvedBy=by||'brand'; } touch(t); }
function nextTicketId(){ const d=new Date(); return `T-${String(d.getFullYear()).slice(2)}${pad(d.getMonth()+1)}-${pad(++state.seq.ticket).padStart(4,'0')}`; }
function shipPart(partId, qty=1){ const inv=state.inventory.find(i=>i.part===partId); if(inv){ inv.qty=Math.max(0,inv.qty-qty); save(); return inv; } return null; }

/* ---------- 客诉处理流水线（邮件 / H5 / 代录入 共用） ---------- */
// 输入：{from, name, lang?, subject, body, channel, photos, sn?, product?, transcript?} → 返回 {ticket, steps[], merged, assessment}
// 原则：订单归属只来自序列号（不猜）；已经有人接手的工单，客户再来信只记录、提醒接手人，不重置状态与 SLA，AI 不再重复发模板
const WHO_HANDLES={ human:()=>Policy.get('routing.l1.name')+'（品牌方售后）', factory:(t)=>(t.assignee?t.assignee.name+'（'+t.assignee.org+'）':'工厂接口人') };
function runPipeline(input){
  const steps=[]; const text=[input.subject||'',input.body||''].join('\n'); const body=(input.subject?input.subject+'\n':'')+(input.body||'');
  const lang=input.lang||Engine.detectLang(text); steps.push({k:'lang',text:`识别语言：${Engine.LANG_NAME[lang]||lang}`});
  // 线程合并：同一发件人的进行中工单；7 天内关闭的工单再来信也归到原工单
  let existing=null; if(state.settings.mergeThreads&&input.from){ const mail=input.from.toLowerCase(); existing=state.tickets.find(t=>t.status!=='done'&&t.cust.email.toLowerCase()===mail)||state.tickets.find(t=>t.status==='done'&&t.resolvedAt>Date.now()-Policy.mergeReopenMs()&&t.cust.email.toLowerCase()===mail)||null; }
  let serial=Engine.parseSerial(input.sn||text); if(!serial&&existing&&existing.sn) serial=Engine.parseSerial(existing.sn); const product=input.product||(serial&&serial.valid?serial.product:null)||Engine.detectProduct(text)||(existing&&existing.product)||null;
  steps.push({k:'product',text:product?`识别产品：${Engine.productName(product)}${serial&&serial.valid?` · 序列号 ${serial.sn}（批次 ${serial.batch}）`:serial?` · 序列号 ${serial.sn} 格式无效`:' · 未提供序列号'}`:'未识别出产品型号'});
  // 订单归属只认序列号
  const order=serial&&serial.order?Engine.ORDERS.find(o=>o.id===serial.order):(existing&&existing.order?Engine.ORDERS.find(o=>o.id===existing.order):null);
  if(order) steps.push({k:'order',text:`匹配订单 ${order.id} · 分销商 ${order.dealer}（${order.dealerCity}）· 工厂 ${order.factory}${serial&&serial.warrantyUntil?` · 保修至 ${serial.warrantyUntil}`:''}`});
  else if(product) steps.push({k:'order',text:serial&&serial.valid?`序列号 ${serial.sn} 的批次 ${serial.batch} 不在任何订单里 → 订单待定，保修情况需人工核实`:`没有序列号 → 不猜订单；分销商 / 工厂待定，升级前需补序列号（${Engine.ordersFor(product).length} 张 ${product} 订单可能相关）`});
  const confirm=existing?Engine.detectConfirm(input.body||''):null;
  const name=input.name||(input.from||'').split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());

  /* ---- A. 已关闭 7 天内再来信 ---- */
  if(existing&&existing.status==='done'){
    const t=existing; addEntry(t,'cust',body,confirm==='solved'?'客户致谢':'客户在关闭后再次来信');
    if(confirm==='solved'){ steps.push({k:'merge',text:`归入已关闭的工单 ${t.id}（同一发件人，${dur(Date.now()-t.resolvedAt)}前关闭）`},{k:'decision',text:'决策：客户致谢，工单保持关闭，不回复'}); }
    else { t.resolvedAt=null; t.resolvedBy=null; setStatus(t,'human'); addEntry(t,'sys',`客户在工单关闭后再次来信，重新打开并转 ${Policy.get('routing.l1.name')}（品牌方售后）。`); steps.push({k:'merge',text:`归入已关闭的工单 ${t.id}（同一发件人）`},{k:'decision',text:'决策：关闭后再来信 → 重新打开，直接给人看，AI 不再自动回复'}); }
    steps.push({k:'ticket',text:`工单 ${t.id} 已更新`}); touch(t); return { ticket:t, steps, merged:true, assessment:null, reopened:confirm!=='solved' };
  }
  /* ---- B. 已由人工 / 工厂接手的工单：只记录并提醒，不改状态 ---- */
  if(existing&&(existing.status==='human'||existing.status==='factory')){
    const t=existing; const who=WHO_HANDLES[t.status](t);
    addEntry(t,'cust',body,confirm==='solved'?'客户确认问题已解决':confirm==='notfixed'?'客户反馈仍未解决':confirm==='human'?'客户要求人工':'客户追加来信');
    t.photos+=input.photos||0; if(serial&&serial.valid&&!t.sn){ t.sn=serial.sn; t.batch=serial.batch; if(order){ t.order=order.id; t.dealer=order.dealer; } }
    steps.push({k:'merge',text:`与进行中的工单 ${t.id} 合并（同一发件人），当前由 ${who} 处理`});
    if(confirm==='solved'){ setStatus(t,'done',t.status==='factory'?'factory':'brand'); addEntry(t,'sys','客户确认问题已解决，工单关闭。'); steps.push({k:'decision',text:'决策：客户确认解决 → 关闭工单'}); }
    else { addEntry(t,'sys',`客户追加来信，已提醒 ${who}；工单状态与 SLA 不变，AI 不重复发送安抚模板。`); steps.push({k:'decision',text:`决策：工单已有人接手，AI 不自动回复，只把新来信附到工单并提醒 ${who}（SLA 继续计时）`}); }
    steps.push({k:'ticket',text:`工单 ${t.id} 已更新`}); touch(t); return { ticket:t, steps, merged:true, assessment:null };
  }

  /* ---- C. 新工单，或 AI 仍在处理中的工单 ---- */
  const a=Engine.assess({text,product,serial,photos:(input.photos||0)+(existing?existing.photos:0),email:input.from||'',settings:state.settings});
  if(existing){
    if(confirm==='solved'){ const t=existing; addEntry(t,'cust',body,'客户确认问题已解决'); setStatus(t,'done','ai'); addEntry(t,'sys','客户确认问题已解决，工单自动关闭。'); steps.push({k:'merge',text:`与进行中的工单 ${t.id} 合并（同一发件人）`},{k:'decision',text:'决策：客户确认 AI 的方案有效 → 自动关闭'},{k:'ticket',text:`工单 ${t.id} 已更新`}); touch(t); return { ticket:t, steps, merged:true, assessment:a }; }
    if(confirm==='human'){ a.route='human'; a.action='hold'; a.humanRequest=true; }
    else if(confirm==='notfixed'||(a.match&&existing.kbId===a.match.entry.id&&a.route==='ai'&&existing.timeline.some(e=>e.who==='ai'))){ a.route='human'; a.action='hold'; a.followUp=true; }
  }
  steps.push({k:'kb',text:a.match?`检索知识库：「${a.match.entry.cat.zh}」命中 ${a.match.hits} 个关键词${a.match.ambiguous?`（与「${a.match.runnerUp.cat.zh}」得分相同）`:''}`:'检索知识库：无匹配条目（置信度封顶 45%，不会直接回复）'});
  steps.push({k:'conf',text:`置信度 ${a.confidence}%，阈值 ${a.threshold}%`});
  steps.push({k:'rules',text:a.reasons.length?`规则检查：${a.reasons.map(r=>r.zh).join('、')} → 一律先给人看`:'规则检查：未触发'});
  if(a.followUp) steps.push({k:'follow',text:confirm==='notfixed'?'客户明确反馈方案无效 → 不再重复猜测，转人工':'客户就同一问题再次来信，说明 AI 的建议未解决 → 不再重复建议，转人工'});
  if(a.humanRequest) steps.push({k:'follow',text:'客户要求真人处理 → 转人工'});
  // 同批次聚集（相对其他批次）
  let cluster=null; if(a.match&&serial&&serial.valid&&order){ cluster=batchCluster(state.tickets,a.match.entry.id,product,serial.batch,existing); if(cluster.hot) steps.push({k:'batch',text:`${clusterReason(cluster)} → AI 建议升级工厂（需品牌方确认，不自动升级）`}); else if(cluster.same) steps.push({k:'batch',text:`批次 ${serial.batch} 此前 ${cluster.same} 起「${a.match.entry.cat.zh}」，其他批次 ${cluster.others} 起，未达到批次异常判定`}); }
  let t=existing;
  if(t){ steps.push({k:'merge',text:`与进行中的工单 ${t.id} 合并（同一发件人）`}); addEntry(t,'cust',body,a.match?a.match.entry.cat.zh:'（未匹配知识条目）'); t.photos+=input.photos||0; if(serial&&serial.valid&&!t.sn){ t.sn=serial.sn; t.batch=serial.batch; if(order){ t.order=order.id; t.dealer=order.dealer; } } }
  else { t=newTicket({ id:input.id||nextTicketId(), cust:{name,email:input.from||'',lang}, product, sn:serial&&serial.valid?serial.sn:null, batch:serial&&serial.valid?serial.batch:null, order:order?order.id:null, dealer:order?order.dealer:null, channel:input.channel||'email', issue:(input.subject||input.body||'').slice(0,120), kbId:a.match?a.match.entry.id:null, confidence:a.confidence, reasons:a.reasons.map(r=>r.k), photos:input.photos||0 });
    const tr=a.match?a.match.entry.cat.zh:'（未匹配知识条目）';
    if(input.transcript&&input.transcript.length){ input.transcript.forEach(m=>t.timeline.push({t:m.t||Date.now(),who:m.who,text:m.text,tr:m.tr||(m.who==='cust'?tr:'')})); t.h5Seen=input.transcript.length; } else t.timeline.push({t:Date.now(),who:'cust',text:body,tr});
    state.tickets.push(t); }
  t.confidence=a.confidence; t.reasons=a.reasons.map(r=>r.k); if(a.match) t.kbId=a.match.entry.id;
  if(cluster&&cluster.hot&&t.status!=='factory') t.suggest={type:'factory',reason:clusterReason({...cluster,same:cluster.same+1}),at:Date.now()};
  if(input.skipReply){ t.status=input.status||(a.route==='human'?'human':'ai'); t.statusSince=Date.now(); if(t.status==='done'){ t.resolvedAt=Date.now(); t.resolvedBy='ai'; } }
  else if(a.route==='ai'){
    if(a.action==='ask' && t.asks>=Policy.maxAskRounds()){ setStatus(t,'human'); addEntry(t,'sys',`AI 已追问 ${Policy.maxAskRounds()} 轮仍无法判断，转品牌方售后（一级）。`); steps.push({k:'decision',text:'决策：追问次数用尽 → 转品牌方售后'}); }
    else { const reply=Engine.compose(a,ctxFor(t)); addEntry(t,'ai',reply,Engine.summarizeZh(a,{})); if(a.action==='ask') t.asks=(t.asks||0)+1;
      // 修复优先：条目声明 repairFirst → 进入「指导中」，给客户 N 天自修窗口，到期自动追问；反馈“没修好”走已有 notfixed 分支转寄件确认
      const repairFirst=a.action==='reply'&&a.match&&a.match.entry.repairFirst;
      t.status=repairFirst?'guiding':'ai'; t.statusSince=Date.now();
      if(repairFirst&&!t.guideDue){ t.guideDue=Date.now()+Policy.repairGuideMs(); addEntry(t,'sys',`按「修复优先」处理：已发送自修指引（${a.match.entry.stepTitle.zh}），约定 ${Policy.get('guard.repairGuideDays')} 天内跟进客户结果；确认没修好则转寄件确认。`); steps.push({k:'guide',text:'修复优先：AI 发送自修指引，2 天跟进窗口内等客户反馈；未反馈自动追问，没修好转寄件确认'}); }
      if(a.action==='reply'&&Engine.offersPart(a)){ const e=a.match.entry;
        if(a.canShip){ const inv=shipPart(e.part); t.pending=null; t.shipped=true; addEntry(t,'sys',`AI 已承诺免费寄送 ${e.partName.zh}（${e.part}），${inv?`${inv.loc} 库存扣减至 ${inv.qty}`:'无库存记录'}。`); steps.push({k:'ship',text:`承诺寄件：${e.partName.zh}${e.partValue<=50?' ≤ 50 美元':' > 50 美元'}，按设置 AI 可直接承诺；库存已扣减`}); }
        else { t.pending={type:'ship',part:e.part,from:shipFrom(t,e.part),value:e.partValue,at:Date.now()}; addEntry(t,'sys',`${e.partName.zh}（${e.part}，约 ${e.partValue} 美元）${e.partValue>Policy.get('shipping.autoCommitLimitUsd')?'超过 AI 可自行承诺的 '+Policy.get('shipping.autoCommitLimitUsd')+' 美元':'按设置 AI 不可自行承诺'}，已告知客户“同事会在 ${Policy.get('routing.l1.hours')} 小时内确认”，等品牌方确认补发。`); steps.push({k:'ship',text:`寄件需确认：${e.partName.zh} 约 ${e.partValue} 美元，${e.partValue>Policy.get('shipping.autoCommitLimitUsd')?'> '+Policy.get('shipping.autoCommitLimitUsd')+' 美元':'小件承诺已关闭'} → AI 不承诺，生成"等你确认补发"，客户已收到说明`}); } }
      steps.push({k:'decision',text:a.action==='reply'?`决策：AI 用${Engine.LANG_NAME[lang]}直接回复${state.settings.ccBrand?'，抄送品牌方售后邮箱':''}`:'决策：信息不足，AI 向客户追问（第 '+t.asks+' 轮）'}); }
  } else { const reply=Engine.compose(a,ctxFor(t)); addEntry(t,'ai',reply,Engine.summarizeZh(a,{})); setStatus(t,'human'); addEntry(t,'sys',`已转 ${Policy.get('routing.l1.name')}（品牌方售后，一级，${Policy.get('routing.l1.hours')} 小时）。`); steps.push({k:'decision',text:`决策：暂停自动承诺，AI 先安抚并转 ${Policy.get('routing.l1.name')}（${Policy.get('routing.l1.hours')} 小时内）`}); }
  steps.push({k:'ticket',text:existing?`工单 ${t.id} 已更新`:`已创建工单 ${t.id}`});
  touch(t); return { ticket:t, steps, merged:!!existing, assessment:a };
}

/* ---------- 读取 H5 收件箱（增量：首次建单，之后同一工单的新消息 / 邮箱 / 评分 / 状态 / 寄件都会合并进来） ---------- */
function importInbox(){
  let inbox=[]; try{ inbox=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'); }catch(e){ return 0; }
  let created=0, updated=0;
  for(const it of inbox){ if(!it.id) continue; const isNew=!state.importedH5.includes(it.id);
    if(isNew){
      if(it.product&&state.qrs[it.product]) state.qrs[it.product].scans++;
      runPipeline({ id:it.id, from:it.email||`h5-${it.id.toLowerCase()}@anonymous`, name:it.name||'H5 用户', lang:it.lang, subject:'', body:[it.chips,it.issue].filter(Boolean).join('\n'), channel:'h5', photos:it.photos||0, sn:it.sn, product:it.product, transcript:it.transcript, skipReply:true, status:it.status });
      state.importedH5.push(it.id); created++;
    }
    const t=state.tickets.find(x=>x.id===it.id); if(!t) continue;   // 被合并进其他工单的情况不做增量
    let changed=false; const tr=t.kbId?(Engine.KB.find(k=>k.id===t.kbId)||{cat:{zh:''}}).cat.zh:'（未匹配知识条目）';
    const seen=t.h5Seen||0; const tx=it.transcript||[];
    if(tx.length>seen){ for(const m of tx.slice(seen)) t.timeline.push({t:m.t||Date.now(),who:m.who,text:m.text,tr:m.tr||(m.who==='cust'?tr:'')}); t.h5Seen=tx.length; changed=true; }
    if(it.photos&&it.photos>t.photos){ t.photos=it.photos; changed=true; }
    if(it.email&&t.cust.email!==it.email){ t.cust.email=it.email; t.cust.name=it.name||t.cust.name; t.timeline.push({t:Date.now(),who:'sys',text:`客户在 H5 留下邮箱 ${it.email}，后续进度将邮件通知。`}); changed=true; }
    if(it.rating&&t.rating!==it.rating){ t.rating=it.rating; t.timeline.push({t:Date.now(),who:'sys',text:`客户在 H5 评分 ${it.rating} / 5。`}); changed=true; }
    if(it.ship&&!t.shipped){ const inv=shipPart(it.ship); t.shipped=true; t.pending=null; t.timeline.push({t:Date.now(),who:'sys',text:`H5 对话中 AI 已承诺免费寄送 ${inv?inv.name:it.ship}，${inv?`${inv.loc} 库存扣减至 ${inv.qty}`:'无库存记录'}。`}); changed=true; }
    if(it.pendingShip&&!t.shipped&&!t.pending){ const kb=Engine.KB.find(k=>k.part===it.pendingShip); t.pending={type:'ship',part:it.pendingShip,from:shipFrom(t,it.pendingShip),value:kb?kb.partValue:null,at:Date.now()}; t.timeline.push({t:Date.now(),who:'sys',text:`H5 对话中 AI 判断需要 ${kb?kb.partName.zh:it.pendingShip}（${it.pendingShip}${kb?'，约 '+kb.partValue+' 美元':''}），超出 AI 可承诺范围，等品牌方确认补发。`}); changed=true; }
    if(it.status==='done'&&t.status!=='done'){ setStatus(t,'done','ai'); t.timeline.push({t:Date.now(),who:'sys',text:'客户在 H5 确认问题已解决，工单关闭。'}); changed=true; }
    else if(it.status==='human'&&t.status==='ai'){ setStatus(t,'human'); t.timeline.push({t:Date.now(),who:'sys',text:`H5 对话转人工，已转 ${Policy.get('routing.l1.name')}（品牌方售后，一级）。`}); changed=true; }
    if(changed){ t.updatedAt=Date.now(); if(!isNew) updated++; }
  }
  if(created||updated) save(); return created+updated;
}
