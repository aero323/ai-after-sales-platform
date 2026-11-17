/* ============================================================
   AI售后 共享引擎（后台与 H5 共用，不依赖 DOM）
   - 产品目录、订单/批次、知识库条目（多语言关键词 + 回复模板 + 步骤）
   - 语言识别、产品识别、序列号提取、知识库匹配、置信度、路由规则、回复生成

   【LLM 边界】下面这些函数在正式版由 LLM 承担，原型里只是"够演示"的桩，不追求词表完备：
     detectLang（语言识别）· matchKB（知识检索 → 向量检索 + 重排）· detectConfirm（客户回信意图）
     · compose（回复生成 → 以条目 steps/part 为依据生成）· 规则词表 SAFETY/REFUND/NEGATIVE（→ 分类器）
   【保留的硬逻辑】parseSerial、订单/批次归属、assess 的路由与承诺规则、置信度阈值与追问上限、
     canShip 判定 —— 这些是业务规则，LLM 替代不了，正式版原样保留。
   ============================================================ */
const Engine = (() => {

  /* ---------- 产品 ---------- */
  const PRODUCTS = [
    { id:'SM-900', series:{zh:'史密斯机',en:'Smith Machine'}, sku:'IP-SM900-BK', snPrefix:'SM9', has3d:true,  maxUserWeight:150, manualLangs:['EN','DE','ES'] },
    { id:'SM-700', series:{zh:'史密斯机',en:'Smith Machine'}, sku:'IP-SM700-BK', snPrefix:'SM7', has3d:true,  maxUserWeight:130, manualLangs:['EN'] },
    { id:'TR-650', series:{zh:'跑步机',en:'Treadmill'},       sku:'IP-TR650-GR', snPrefix:'TR6', has3d:false, maxUserWeight:140, manualLangs:['EN','DE','FR'] },
    { id:'RW-300', series:{zh:'划船机',en:'Rowing Machine'},  sku:'IP-RW300-WD', snPrefix:'RW3', has3d:true,  maxUserWeight:null, manualLangs:['EN'] },
    { id:'CB-1200',series:{zh:'龙门架',en:'Cable Crossover'}, sku:'IP-CB1200-BK',snPrefix:'CB1', has3d:false, maxUserWeight:null, manualLangs:[] },
    { id:'F-C20',  series:{zh:'多功能训练架',en:'Functional Trainer'}, sku:'FT-FC20-BK', snPrefix:'FC2', has3d:false, maxUserWeight:120, manualLangs:['EN','DE'] },
  ];
  const productName = (id, lang='zh') => { const p=PRODUCTS.find(x=>x.id===id); return p ? `${p.series[lang==='zh'?'zh':'en']} ${p.id}` : id; };

  /* ---------- 订单与批次（序列号中段 = 批次） ---------- */
  // 同一型号有多个批次 / 多张订单，这样"同批次聚集"才是一个有区分度的信号
  let ORDERS = [
    { id:'PO-24118', product:'SM-900', qty:120, brand:'IronPeak Fitness', factory:'宁波力健机械', dealer:'NordicGym AB',  dealerCity:'Stockholm', batches:['24B'], ship:'2026-09-14', warrantyUntil:'2028-09' },
    { id:'PO-24060', product:'SM-900', qty:90,  brand:'IronPeak Fitness', factory:'宁波力健机械', dealer:'GymPro Ltd',    dealerCity:'Dubai',     batches:['24A'], ship:'2026-07-20', warrantyUntil:'2028-07' },
    { id:'PO-24097', product:'TR-650', qty:80,  brand:'IronPeak Fitness', factory:'宁波力健机械', dealer:'FitHaus GmbH',  dealerCity:'Hamburg',   batches:['24A'], ship:'2026-08-30', warrantyUntil:'2028-08' },
    { id:'PO-24122', product:'TR-650', qty:60,  brand:'IronPeak Fitness', factory:'宁波力健机械', dealer:'NordicGym AB',  dealerCity:'Stockholm', batches:['24C'], ship:'2026-09-25', warrantyUntil:'2028-09' },
    { id:'PO-24076', product:'RW-300', qty:200, brand:'IronPeak Fitness', factory:'东莞健步工业', dealer:'NordicGym AB',  dealerCity:'Stockholm', batches:['24A'], ship:'2026-08-02', warrantyUntil:'2028-08' },
    { id:'PO-24088', product:'RW-300', qty:80,  brand:'IronPeak Fitness', factory:'东莞健步工业', dealer:'GymPro Ltd',    dealerCity:'Dubai',     batches:['24B'], ship:'2026-08-15', warrantyUntil:'2028-08' },
    { id:'PO-24052', product:'SM-700', qty:60,  brand:'IronPeak Fitness', factory:'宁波力健机械', dealer:'GymPro Ltd',    dealerCity:'Dubai',     batches:['24A'], ship:'2026-07-11', warrantyUntil:'2028-07' },
    { id:'PO-24131', product:'CB-1200',qty:40,  brand:'IronPeak Fitness', factory:'青岛迈动器械', dealer:'FitHaus GmbH',  dealerCity:'Hamburg',   batches:['25A'], ship:'2026-10-28', warrantyUntil:'2028-10' },
    { id:'PO-25087', product:'F-C20', qty:150, brand:'IronPeak Fitness', factory:'山东宝力龙健身器材', dealer:'Fitshop EU', dealerCity:'Osterrönfeld', batches:['25K'], ship:'2025-10-02', warrantyUntil:'2027-10' },
  ];
  const setOrders = (list) => { ORDERS = list; api.ORDERS = list; };

  // 中文称呼：有名字 →「Mark，你好。」；没有名字 →「你好。」（H5 匿名用户不再出现“你好，你好”）。tail 为称呼后的接续语
  const hi=(n,tail='你好。')=>(n?`${n}，`:'')+tail;

  /* ---------- 知识库条目 ---------- */
  // keywords 按语言；safety=true 表示安全件（按设置一律先给人看）；part 为可寄送零件；shipOnReply=false 表示首次回复不涉及寄件（先排查）
  const KB = [
    { id:'cable', product:'SM-900', cat:{zh:'钢缆磨损（上滑轮处）',en:'Cable fraying at top pulley'}, part:'ST-SM9-021', partName:{zh:'钢缆',en:'cable'}, partValue:38, safety:true, video:'0:42',
      kw:{ en:['cable','fray','frayed','pulley','wire','strand'], de:['seil','seilzug','umlenkrolle','ausgefranst','draht'], es:['cable','polea','deshilach','hilo'], fr:['câble','cable','poulie','effiloch'], sv:['vajer','kabel','trissa'], zh:['钢缆','钢丝','滑轮','磨损','起毛','断丝'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. From your description this is wear on the top-pulley cable, which takes the most load. Please stop using the machine until the cable is replaced — a frayed cable can fail under load.\n\nYour unit is under warranty, so the cable (part ST-SM9-021) is free. ${c.shipText} If you'd like to swap it yourself, it takes about 15 minutes with the included hex keys — I'll send the step-by-step video.`,
              de:(c)=>`Danke, ${c.name}. Nach Ihrer Beschreibung ist der Seilzug an der oberen Umlenkrolle verschlissen. Bitte benutzen Sie das Gerät nicht weiter, bis der Seilzug ersetzt ist.\n\nIhr Gerät ist in der Garantie, der Seilzug (Teil ST-SM9-021) ist kostenlos. ${c.shipText} Den Austausch können Sie in ca. 15 Minuten selbst durchführen – ich sende Ihnen das Schritt-für-Schritt-Video.`,
              es:(c)=>`Gracias, ${c.name}. Por tu descripción, el cable de la polea superior está desgastado. Por favor, no uses la máquina hasta sustituirlo.\n\nTu equipo está en garantía: el cable (pieza ST-SM9-021) es gratuito. ${c.shipText} El cambio lleva unos 15 minutos con las llaves incluidas; te envío el vídeo paso a paso.`,
              fr:(c)=>`Merci, ${c.name}. D'après votre description, le câble de la poulie supérieure est usé. Merci de ne plus utiliser l'appareil tant que le câble n'est pas remplacé.\n\nVotre appareil est sous garantie : le câble (pièce ST-SM9-021) est gratuit. ${c.shipText} Le remplacement prend environ 15 minutes avec les clés fournies ; je vous envoie la vidéo.`,
              zh:(c)=>`${hi(c.name)}从描述看是上滑轮处钢缆磨损，这是受力最大的位置。请先停止使用，等钢缆更换后再用。\n\n你的设备在保修期内，钢缆（零件 ST-SM9-021）免费。${c.shipText}想自己换的话大约 15 分钟，我把分步视频发给你。` },
      steps:{ zh:['取下所有配重片，把杠铃杆降到安全挡上。','拧下滑轮盖（2 颗 M6 内六角）。','先松开滑架端的钢缆头，再松开滑轮端。','按原路穿入新钢缆，卡扣朝外。'], en:['Remove all weight plates and lower the bar to the safety stops.','Unscrew the pulley cover (2 × M6 hex).','Release the cable end at the carriage, then at the pulley.','Thread the new cable the same way — the clip faces outward.'] },
      stepTitle:{zh:'更换上滑轮钢缆',en:'Replace the top pulley cable'} },
    { id:'catch', product:'SM-900', cat:{zh:'安全锁扣失效',en:'Safety catch not locking'}, part:'SC-SM9-004', partName:{zh:'安全锁扣总成',en:'safety catch assembly'}, partValue:62, safety:true, video:'0:55',
      kw:{ en:['safety catch','catch','lock','latch','hook','slips','rack the bar'], de:['sicherheitsraste','raste','verriegel','haken','rutscht'], es:['seguro','bloqueo','gancho','pestillo'], fr:['verrou','crochet','sécurité','bloque'], sv:['spärr','lås','krok'], zh:['锁扣','安全锁','挂钩','卡不住','锁不住','滑脱'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. From your video the catch isn't springing back fully, which points to a worn torsion spring in the catch assembly. Please don't rack the bar on that side until it's replaced — keep the safety stops set.\n\nThe safety catch assembly (part SC-SM9-004) is covered under warranty. ${c.shipText} Swapping it takes about 10 minutes with the included hex keys; I'll send the video.`,
              de:(c)=>`Danke, ${c.name}. Im Video federt die Raste nicht vollständig zurück – das spricht für eine verschlissene Torsionsfeder in der Rastenbaugruppe. Bitte die Stange auf dieser Seite nicht mehr ablegen, bis sie ersetzt ist; Sicherheitsstopper gesetzt lassen.\n\nDie Sicherheitsraste (Teil SC-SM9-004) ist von der Garantie abgedeckt. ${c.shipText} Der Austausch dauert ca. 10 Minuten; ich sende Ihnen das Video.`,
              es:(c)=>`Gracias, ${c.name}. En el vídeo el seguro no vuelve del todo: apunta a un muelle de torsión desgastado en el conjunto del seguro. No apoyes la barra en ese lado hasta sustituirlo y mantén los topes de seguridad.\n\nEl conjunto del seguro (pieza SC-SM9-004) está cubierto por la garantía. ${c.shipText} El cambio lleva unos 10 minutos; te envío el vídeo.`,
              fr:(c)=>`Merci, ${c.name}. Sur la vidéo, le verrou ne revient pas complètement : cela indique un ressort de torsion usé dans l'ensemble verrou. Ne posez plus la barre de ce côté avant le remplacement et gardez les butées de sécurité.\n\nL'ensemble verrou de sécurité (pièce SC-SM9-004) est couvert par la garantie. ${c.shipText} Le remplacement prend environ 10 minutes ; je vous envoie la vidéo.`,
              zh:(c)=>`${hi(c.name)}从视频看锁扣回弹不足，是锁扣总成里的扭簧失效。更换前请不要在这一侧挂杆，并保持安全挡在位。\n\n安全锁扣总成（零件 SC-SM9-004）在保修范围内。${c.shipText}自己更换约 10 分钟，我把视频发你。` },
      steps:{ zh:['停止使用该侧锁扣，保持安全挡在位。','拆下锁扣盖板（2 颗 M6）。','整体更换锁扣总成，按原扭矩拧紧。','挂杆 3 次确认回弹到位。'], en:['Stop using that side; keep the safety stops set.','Remove the catch cover (2 × M6).','Replace the whole catch assembly and re-tighten.','Rack the bar 3 times to confirm it springs back.'] }, stepTitle:{zh:'更换安全锁扣总成',en:'Replace the safety catch assembly'} },
    { id:'bolts', product:'SM-900', cat:{zh:'安装包缺件（M10 螺栓）',en:'Missing M10 bolts in assembly pack'}, part:'M10x60-PK', partName:{zh:'M10 螺栓包',en:'M10 bolt pack'}, partValue:6, safety:false, video:null,
      kw:{ en:['missing','bolt','screw','bolts','screws','pack','bag','step 7','hardware'], de:['fehlt','fehlen','schraube','schrauben','beutel'], es:['falta','faltan','tornillo','tornillos','bolsa'], fr:['manque','manquant','vis','boulon','sachet'], sv:['saknas','skruv','bult'], zh:['缺','少','螺栓','螺丝','配件包','没有'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. Step 7 uses 4 × M10×60 bolts (bag C). ${c.shipText} Meanwhile you can continue with steps 8–10, which don't depend on those bolts.`,
              de:(c)=>`Danke, ${c.name}. Schritt 7 verwendet 4 × M10×60 (Beutel C). ${c.shipText} Die Schritte 8–10 können Sie schon weitermachen.`,
              es:(c)=>`Gracias, ${c.name}. El paso 7 usa 4 tornillos M10×60 (bolsa C). ${c.shipText} Mientras tanto puedes continuar con los pasos 8–10.`,
              fr:(c)=>`Merci, ${c.name}. L'étape 7 utilise 4 vis M10×60 (sachet C). ${c.shipText} Vous pouvez continuer les étapes 8 à 10 en attendant.`,
              zh:(c)=>`${hi(c.name)}第 7 步使用 4 颗 M10×60（C 袋）。${c.shipText}你可以先继续第 8 到 10 步，这几步不需要这些螺栓。` },
      steps:{ zh:['核对 C 袋：应有 4 颗 M10×60。','先做第 8 到 10 步。','螺栓到货后回到第 7 步，扭矩 35 N·m。'], en:['Check bag C: should contain 4 × M10×60.','Do steps 8–10 first.','When the bolts arrive, return to step 7 and torque to 35 N·m.'] }, stepTitle:{zh:'补发螺栓包',en:'Bolt pack replacement'} },
    { id:'e07', product:'TR-650', cat:{zh:'E07 电机过热停机',en:'E07 motor overheat stop'}, part:'PCB-TR6-04', partName:{zh:'电机控制板',en:'motor control board'}, partValue:120, safety:false, video:'1:10', shipOnReply:false,   // 首次回复只给排查步骤，零件在排查无效后才涉及
      kw:{ en:['e07','error','stops','stopped','overheat','motor','shuts'], de:['e07','fehlercode','stoppt','motor','überhitz'], es:['e07','error','se para','motor','calienta'], fr:['e07','erreur','arrête','moteur','chauffe'], sv:['e07','fel','stannar','motor'], zh:['e07','报错','停机','过热','电机','跑了一会'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. E07 means the motor controller detected overheating. Nine times out of ten it's the running belt needing lubrication, which makes the motor work harder. Please: 1) unplug for 30 minutes, 2) apply the included silicone lubricant under the belt, 3) run 10 minutes at 4 km/h. If E07 returns, reply here and we'll replace the control board under warranty.`,
              de:(c)=>`Danke, ${c.name}. E07 bedeutet, dass die Motorsteuerung Überhitzung erkannt hat. Meist fehlt dem Laufband Schmierung. Bitte: 1) 30 Minuten vom Netz trennen, 2) das mitgelieferte Silikonöl unter das Laufband geben, 3) 10 Minuten bei 4 km/h laufen lassen. Kommt E07 wieder, antworten Sie hier – dann tauschen wir die Steuerplatine auf Garantie.`,
              es:(c)=>`Gracias, ${c.name}. E07 significa que el controlador detectó sobrecalentamiento; casi siempre la cinta necesita lubricación. Por favor: 1) desenchufa 30 minutos, 2) aplica el lubricante de silicona incluido bajo la cinta, 3) usa 10 minutos a 4 km/h. Si E07 vuelve, responde aquí y cambiamos la placa en garantía.`,
              fr:(c)=>`Merci, ${c.name}. E07 signifie que le contrôleur moteur a détecté une surchauffe ; le plus souvent la bande manque de lubrification. Merci de : 1) débrancher 30 minutes, 2) appliquer le lubrifiant silicone fourni sous la bande, 3) marcher 10 minutes à 4 km/h. Si E07 revient, répondez ici et nous remplacerons la carte sous garantie.`,
              zh:(c)=>`${hi(c.name)}E07 表示电机控制器检测到过热，十有八九是跑带缺润滑导致电机负载偏高。请：1）断电 30 分钟；2）在跑带下涂抹随机附带的硅油；3）以 4 km/h 跑 10 分钟。如果 E07 再出现，回复我，我们在保修内更换控制板。` },
      steps:{ zh:['断电 30 分钟。','掀起跑带边缘，在跑板上涂硅油（两侧各一条）。','通电后 4 km/h 运行 10 分钟。'], en:['Unplug for 30 minutes.','Lift the belt edge and apply silicone lubricant to the deck (one line each side).','Power on and run 10 minutes at 4 km/h.'] }, stepTitle:{zh:'E07 排查',en:'E07 troubleshooting'} },
    { id:'belt', product:'TR-650', cat:{zh:'跑带偏移 / 润滑',en:'Belt drifting / lubrication'}, part:null, partName:null, partValue:0, safety:false, video:'0:38',
      kw:{ en:['belt','drift','lubricat','lubricate','slips','off-center','centre'], de:['laufband','schmier','verrutscht','mittig'], es:['cinta','lubric','descentr'], fr:['bande','lubrif','décentr','tapis'], sv:['band','smörj'], zh:['跑带','偏','润滑','打滑','硅油'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. Belt drift is adjusted with the two rear bolts: turn the bolt on the side the belt drifts toward a quarter turn clockwise, run at 4 km/h for a minute, repeat if needed. Lubricate every 3 months or 100 km — I'll send the short video.`,
              de:(c)=>`Danke, ${c.name}. Das Laufband wird mit den beiden hinteren Schrauben justiert: die Schraube auf der Seite, zu der das Band wandert, eine Vierteldrehung im Uhrzeigersinn, dann eine Minute bei 4 km/h laufen lassen. Alle 3 Monate oder 100 km schmieren – ich sende das Video.`,
              es:(c)=>`Gracias, ${c.name}. La cinta se centra con los dos tornillos traseros: gira un cuarto de vuelta en sentido horario el del lado hacia el que se desvía, usa un minuto a 4 km/h y repite si hace falta. Lubrica cada 3 meses o 100 km; te envío el vídeo.`,
              fr:(c)=>`Merci, ${c.name}. La bande se recentre avec les deux vis arrière : un quart de tour dans le sens horaire du côté où elle dérive, puis une minute à 4 km/h. Lubrifiez tous les 3 mois ou 100 km ; je vous envoie la vidéo.`,
              zh:(c)=>`${hi(c.name)}跑带偏移用后端两颗调节螺栓校正：偏向哪一侧，就把那一侧顺时针拧四分之一圈，4 km/h 跑一分钟，必要时重复。每 3 个月或 100 公里润滑一次，我把短视频发你。` },
      steps:{ zh:['找到后端两颗调节螺栓。','偏向侧顺时针拧 1/4 圈。','4 km/h 运行 1 分钟观察。'], en:['Locate the two rear adjustment bolts.','Turn the drift-side bolt 1/4 turn clockwise.','Run 1 minute at 4 km/h and check.'] }, stepTitle:{zh:'跑带校正',en:'Belt alignment'} },
    { id:'motor', product:'RW-300', cat:{zh:'阻力电机异响',en:'Resistance motor noise'}, part:'RB-RW3-010', partName:{zh:'减震垫',en:'damper pad'}, partValue:9, safety:false, video:'0:50',
      kw:{ en:['noise','noisy','grinding','rattle','humming','resistance','motor','clunk'], de:['geräusch','laut','brummt','rattert','widerstand'], es:['ruido','zumbido','vibra','resistencia'], fr:['bruit','grince','vibre','résistance'], sv:['ljud','oljud','skrammel','motstånd'], zh:['异响','噪音','响','咔','嗡','阻力'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. A humming or rattling from the resistance unit on the RW-300 is almost always the damper pads under the motor bracket — they compress over time. The damper pad set (part RB-RW3-010) is free under warranty. ${c.shipText} Swapping them takes 10 minutes. If the noise is a grinding sound, please send a short video so we can check the flywheel.`,
              de:(c)=>`Danke, ${c.name}. Ein Brummen oder Rattern aus der Widerstandseinheit des RW-300 kommt fast immer von den Dämpfungspads unter der Motorhalterung. Das Pad-Set (Teil RB-RW3-010) ist auf Garantie kostenlos. ${c.shipText} Der Tausch dauert 10 Minuten. Bei einem schleifenden Geräusch bitte ein kurzes Video senden.`,
              es:(c)=>`Gracias, ${c.name}. Un zumbido o traqueteo de la unidad de resistencia del RW-300 casi siempre son las almohadillas bajo el soporte del motor. El juego de almohadillas (pieza RB-RW3-010) es gratuito en garantía. ${c.shipText} El cambio lleva 10 minutos. Si es un ruido de roce, envía un vídeo corto.`,
              fr:(c)=>`Merci, ${c.name}. Un bourdonnement ou un cliquetis de l'unité de résistance du RW-300 vient presque toujours des patins amortisseurs sous le support moteur. Le jeu de patins (pièce RB-RW3-010) est gratuit sous garantie. ${c.shipText} Le remplacement prend 10 minutes. Si c'est un grincement, envoyez une courte vidéo.`,
              zh:(c)=>`${hi(c.name)}RW-300 阻力单元的嗡鸣或咔哒声，基本都是电机支架下的减震垫老化压扁了。减震垫一套（零件 RB-RW3-010）保修内免费。${c.shipText}更换 10 分钟。如果是金属摩擦声，请拍一段短视频，我们要检查飞轮。` },
      steps:{ zh:['拆下阻力单元护罩（4 颗螺丝）。','松开电机支架两颗螺栓，取出旧减震垫。','装入新垫，按原扭矩拧紧。'], en:['Remove the resistance unit cover (4 screws).','Loosen the two bracket bolts and take out the old pads.','Fit the new pads and re-tighten.'] }, stepTitle:{zh:'更换减震垫',en:'Replace damper pads'} },
    { id:'units', product:'RW-300', cat:{zh:'显示单位错误',en:'Wrong display units'}, part:null, partName:null, partValue:0, safety:false, video:null,
      kw:{ en:['units','km','miles','metres','meters','display','distance','wrong'], de:['einheit','kilometer','meilen','anzeige'], es:['unidades','millas','kilómetros','pantalla'], fr:['unités','miles','kilomètres','affichage'], sv:['enhet','miles','display'], zh:['单位','英里','公里','显示屏','显示'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. Hold the MODE button for 3 seconds until the display blinks, then press + to switch between metres and miles. Press MODE again to save.`,
              de:(c)=>`Danke, ${c.name}. Halten Sie MODE 3 Sekunden gedrückt, bis die Anzeige blinkt, dann mit + zwischen Metern und Meilen wechseln. MODE erneut drücken zum Speichern.`,
              es:(c)=>`Gracias, ${c.name}. Mantén MODE 3 segundos hasta que la pantalla parpadee, luego pulsa + para cambiar entre metros y millas. Pulsa MODE de nuevo para guardar.`,
              fr:(c)=>`Merci, ${c.name}. Maintenez MODE 3 secondes jusqu'au clignotement, puis + pour passer de mètres à miles. MODE à nouveau pour enregistrer.`,
              zh:(c)=>`${hi(c.name)}长按 MODE 键 3 秒直到显示屏闪烁，再按 + 在米和英里之间切换，再按 MODE 保存。` },
      steps:{ zh:['长按 MODE 3 秒。','按 + 切换单位。','按 MODE 保存。'], en:['Hold MODE for 3 s.','Press + to switch units.','Press MODE to save.'] }, stepTitle:{zh:'切换显示单位',en:'Switch display units'} },
    { id:'assembly', product:'*', cat:{zh:'安装求助',en:'Assembly help'}, part:null, partName:null, partValue:0, safety:false, video:'4:12',
      kw:{ en:['assemble','assembly','install','instructions','manual','how do i','which step','put together'], de:['aufbau','montage','anleitung','zusammenbau','wie'], es:['montaje','montar','instrucciones','manual','cómo'], fr:['montage','assembler','notice','manuel','comment'], sv:['montera','montering','instruktion'], zh:['安装','组装','怎么装','说明书','第几步','哪一步'] },
      reply:{ en:(c)=>`Happy to help with assembly, ${c.name}. Tell me which step you're on (the number in the manual) and, if you can, send a photo of the parts in front of you — I'll match them to the step and send the animation for that part.`,
              de:(c)=>`Gern helfe ich beim Aufbau, ${c.name}. Sagen Sie mir, bei welchem Schritt Sie sind, und schicken Sie nach Möglichkeit ein Foto der Teile – ich ordne sie dem Schritt zu und sende die Animation dazu.`,
              es:(c)=>`Con gusto te ayudo con el montaje, ${c.name}. Dime en qué paso estás y, si puedes, envía una foto de las piezas: las identifico y te mando la animación de ese paso.`,
              fr:(c)=>`Avec plaisir pour le montage, ${c.name}. Indiquez-moi l'étape où vous êtes et, si possible, envoyez une photo des pièces : je les associe à l'étape et vous envoie l'animation.`,
              zh:(c)=>`${hi(c.name,"")}安装问题我来帮你。告诉我你在说明书的第几步，最好拍一张手边零件的照片，我会对应到步骤并把那一步的动画发你。` },
      steps:{ zh:['告诉我步骤编号。','拍一张零件照片。'], en:['Tell me the step number.','Send a photo of the parts.'] }, stepTitle:{zh:'安装指导',en:'Assembly guidance'} },
    // 修复优先型条目：粘接失效先用加热/清洁剂软化胶层，无效再换件（shipOnReply:false → 首次回复不承诺寄件）
    // 零件信息来自爆炸图：20 号件（滑轮架粘接处）、74 号件（配重片存放杆）、6 号件（M10×25 螺栓）
    { id:'glue', product:'F-C20', cat:{zh:'粘接部件脱胶 / 卡滞（20 号件）',en:'Glued part detached / sticking (part 20)'}, part:'FT-FC20-20', partName:{zh:'滑轮架总成（20 号件）',en:'pulley bracket assembly (part 20)'}, partValue:26, safety:false, shipOnReply:false, repairFirst:true, video:null,
      kw:{ en:['glue','glued','gluing','bond','bonded','adhesive','stuck','sticking','detach','come loose','comes loose','solvent','heat gun','hair dryer'], de:['kleber','geklebt','klebstoff','löst sich','abgelöst','festgeklebt','klebt'], es:['pegamento','pegado','pegada','despeg','se despega','adhesivo','atorado'], fr:['colle','collé','collage','décoll','se décolle','adhésif','bloqué'], sv:['lim','limmat','limmade','lossnar','fastnar'], zh:['胶水','胶','脱胶','粘住','粘死','卡住','粘接','粘合','溶剂'] },
      reply:{ en:(c)=>`Thanks, ${c.name}. For ${c.product} the bracket is bonded at the factory, and if it has come loose or is sticking, try this first: 1) warm the joint for 2–3 minutes with a hair dryer (not a heat gun or naked flame), 2) clean the residue with Loctite SF 7063 cleaner and a cloth. If it still won't come apart, reply here — we'll replace the bracket.`,
              de:(c)=>`Danke, ${c.name}. Beim ${c.product} ist der Halter werkseitig verklebt. Wenn er sich gelöst hat oder klemmt, versuchen Sie zuerst: 1) die Klebestelle 2–3 Minuten mit einem Haartrockner erwärmen (kein Heißluftgerät, keine offene Flamme), 2) die Rückstände mit Loctite SF 7063 und einem Tuch reinigen. Löst er sich weiterhin nicht, antworten Sie hier – dann tauschen wir den Halter.`,
              es:(c)=>`Gracias, ${c.name}. En el ${c.product} el soporte va pegado de fábrica. Si se ha soltado o se atasca, pruebe primero: 1) caliente la unión 2–3 minutos con un secador de pelo (no pistola de calor ni llama), 2) limpie los restos con Loctite SF 7063 y un paño. Si sigue sin separarse, responda aquí y sustituiremos el soporte.`,
              fr:(c)=>`Merci, ${c.name}. Sur le ${c.product}, le support est collé en usine. S'il s'est décollé ou qu'il grippe, essayez d'abord : 1) chauffez la jonction 2–3 minutes avec un sèche-cheveux (pas de pistolet thermique ni de flamme), 2) nettoyez les résidus avec Loctite SF 7063 et un chiffon. Si cela ne se décolle toujours pas, répondez ici : nous remplacerons le support.`,
              sv:(c)=>`Tack, ${c.name}. På ${c.product} är fästet fabrikslimmat. Om det lossnat eller kärvar: 1) värm fogen 2–3 minuter med hårtork (inte värmepistol eller öppen låga), 2) rengör resterna med Loctite SF 7063 och en trasa. Lossnar det fortfarande inte, svara här så byter vi fästet.`,
              zh:(c)=>`${hi(c.name)}${c.product} 的滑轮架是出厂粘接的。如果已经脱胶或卡住，请先这样试：1）用吹风机加热粘接处 2–3 分钟（不要用热风枪或明火）；2）用 Loctite SF 7063 清洁剂配合抹布清理残胶。如果还是拆不开，回复我，我们给你更换滑轮架。` },
      steps:{ zh:['断电并卸下负载。','吹风机中档距离 10 cm 加热粘接处 2–3 分钟。','用 Loctite SF 7063 清理残胶，擦拭后通风静置。','装回并测试；仍卡滞则申请换件。'], en:['Power off and unload the machine.','Warm the joint 2–3 minutes with a hair dryer from ~10 cm.','Clean residue with Loctite SF 7063 and let it air.','Refit and test; if still stuck, request a replacement.'], de:['Gerät ausschalten und entlasten.','Die Klebestelle 2–3 Minuten mit einem Haartrockner aus ~10 cm erwärmen.','Rückstände mit Loctite SF 7063 reinigen und ablüften lassen.','Wieder montieren und testen; klemmt es weiter, Ersatz anfordern.'] }, stepTitle:{zh:'处理脱胶部件',en:'Free a bonded part'} },
  ];

  /* ---------- 规则词表 ---------- */
  const SAFETY_WORDS = /\b(safety|catch|cable|fray\w*|snapped|broke|broken|collapse\w*|fell|injur\w*|hurt|seilzug|seil|gerissen|riss|sicherheit\w*|verletz\w*|seguro|roto|rota|herid\w*|sécurité|câble|cassé|bless\w*)\b|锁扣|钢缆|断裂|受伤|砸|摔/i;
  const REFUND_WORDS = /refund|return|money back|chargeback|replace the whole|rückgabe|erstattung|geld zurück|reembolso|devolver|remboursement|retour|退货|退款|赔偿|换货/i;
  const NEGATIVE_WORDS = /lawyer|attorney|review|trustpilot|facebook|instagram|unacceptable|ridiculous|terrible|scam|anwalt|bewertung|unverschämt|abogado|reseña|inaceptable|avocat|avis|inacceptable|律师|投诉|差评|曝光|垃圾/i;
  const FREE_MAIL = /gmail|yahoo|outlook|hotmail|icloud|web\.de|gmx|orange\.fr|telia|live\.|me\.com|qq\.com|163\.com/i;

  /* ---------- 语言识别 ---------- */
  const LANG_HINTS = { de:[' der ',' die ',' das ',' und ',' nicht ',' ist ',' ich ',' nach ',' bei ',' mit ',' hallo ',' mein ',' kann ',' was '], es:[' el ',' que ',' no ',' es ',' un ',' una ',' los ',' del ',' hola ',' falta ',' mi ',' cómo ',' puedo ',' tengo '], fr:[' le ',' les ',' est ',' pas ',' une ',' des ',' je ',' ne ',' comment ',' bonjour ',' mon ',' ma ',' vous ',' merci ',' votre '], sv:[' och ',' att ',' det ',' är ',' inte ',' jag ',' på ',' med ',' den ',' hej ',' min ',' fel '], it:[' il ',' che ',' non ',' una ',' per ',' con ',' sono ',' ciao ',' mio '], en:[' the ',' is ',' and ',' not ',' it ',' my ',' on ',' after ',' does ',' i ',' hi ',' can '] };
  const ACCENTS = { de:/[äöüß]/g, es:/[ñ¿¡]/g, fr:/[çèêàù]/g, sv:/[å]/g };
  function detectLang(text){
    if(/[一-鿿]/.test(text)) return 'zh';
    const t=' '+text.toLowerCase().replace(/[.,!?;:()\n]/g,' ')+' ';
    const score={}; for(const [l,ws] of Object.entries(LANG_HINTS)) score[l]=ws.reduce((a,w)=>a+(t.split(w).length-1),0);
    for(const [l,re] of Object.entries(ACCENTS)){ const n=(t.match(re)||[]).length; if(n) score[l]=(score[l]||0)+n*2; }
    let best='en', bs=0; for(const [l,s] of Object.entries(score)) if(s>bs){ bs=s; best=l; }
    return best;
  }

  /* ---------- 产品 / 序列号 ---------- */
  const PRODUCT_WORDS = { 'SM-900':['smith machine','smith','multipresse','máquina smith','smith machine','史密斯','龙门史密斯'], 'TR-650':['treadmill','laufband','cinta de correr','tapis de course','löpband','跑步机'], 'RW-300':['rowing','rower','rudergerät','remo','rameur','roddmaskin','划船机'], 'SM-700':[], 'CB-1200':['cable crossover','crossover','龙门架'], 'F-C20':['f-c20','fc20','f c20','functional trainer','funktionstrainer','multi gym','多功能训练架'] };
  function detectProduct(text){
    const m=text.match(/\b(SM-?900|SM-?700|TR-?650|RW-?300|CB-?1200)\b/i); if(m) return m[1].toUpperCase().replace(/^(\w{2})-?(\d+)$/,'$1-$2');
    const t=text.toLowerCase(); for(const [id,ws] of Object.entries(PRODUCT_WORDS)) if(ws.some(w=>t.includes(w))) return id; return null;
  }
  const SN_RE=/\b([A-Z]{2}\d)-?(\d{2}[A-Z])-?(\d{5})\b/i;
  function parseSerial(text){
    // 部分工厂（如 Bodylonger）用纯数字 11 位序列号：识别为原始号，批次/订单无法从中解析，订单由调用方按产品与已知订单补全
    const raw=(text||'').match(/\b(\d{11})\b/); if(raw && !(text||'').match(SN_RE)) return { sn:raw[1], valid:true, product:null, batch:null, order:null, raw:true };
    const m=(text||'').toUpperCase().match(SN_RE); if(!m) return null;
    const prefix=m[1], batch=m[2], num=m[3]; const p=PRODUCTS.find(x=>x.snPrefix===prefix); if(!p) return { sn:`${prefix}-${batch}-${num}`, valid:false };
    const o=ORDERS.find(x=>x.product===p.id && x.batches.includes(batch));
    return { sn:`${prefix}-${batch}-${num}`, valid:true, product:p.id, batch, order:o?o.id:null, dealer:o?o.dealer:null, city:o?o.dealerCity:null, factory:o?o.factory:null, warrantyUntil:o?o.warrantyUntil:null };
  }
  const orderFor = (product) => ORDERS.find(o=>o.product===product) || null;   // 仅用于演示性回退（H5 模拟 OCR 选批次），不用于判定工单归属
  const ordersFor = (product) => ORDERS.filter(o=>o.product===product);

  /* ---------- 客户回信意图：否定优先 ---------- */
  // 返回 'human'（要求真人）| 'notfixed'（方案无效）| 'solved'（确认解决）| null（普通来信，交给流水线重新评估）
  const RE_HUMAN=/\b(human|real person|a person|someone|agent|technician|mitarbeiter|mensch|techniker|persona|humano|técnico|quelqu'un|conseiller|technicien|människa|tekniker)\b|人工|真人|客服|技术人员|上门/i;
  const RE_NOTFIXED=/\b(still|again|same (problem|issue|error|noise)|not (working|fixed|solved|helping)|(doesn'?t|didn'?t|does not|did not|won'?t) (work|help|fit|lock|stop|start)|no (luck|change|difference)|came back|noch immer|immer noch|wieder|funktioniert nicht|hat nicht geholfen|sigue|otra vez|no funciona|no ha funcionado|todavía|toujours|encore|ne fonctionne pas|n'a pas marché|fortfarande|igen|fungerar inte)\b|还是|仍然|依旧|依然|没用|不管用|没解决|不行|又出现|又报/i;
  // 强确认词（说明问题已解决）与弱确认词（仅致谢）；致谢只有在短消息里才算确认，带问句的一律不算
  const RE_SOLVED_STRONG=/\b(fixedok|fixed|solved|resolved|sorted|works now|working now|it works|that worked|that did it|all good|funktioniert( jetzt)?|gelöst|behoben|resuelto|solucionado|funciona|résolu|réglé|fonctionne|löst|fungerar)\b|解决了|好了|可以了|搞定|正常了|修好了/i;
  const RE_THANKS=/\b(thanks?|thank you|cheers|perfect|great|danke|vielen dank|super|gracias|perfecto|merci|parfait|tack)\b|谢谢|感谢|多谢/i;
  const RE_CONTRAST=/\b(but|however|although|aber|jedoch|pero|aunque|mais|men|fast)\b|但|不过|可是|然而/i;
  const RE_QUESTION=/[?？]|\b(can you|could you|when|how|what|why|where|wann|wie|warum|können sie|cuándo|cómo|puede|quand|comment|pouvez|när|hur)\b|什么时候|怎么|为什么|吗/i;
  function detectConfirm(text){
    let t=' '+(text||'').toLowerCase()+' ';
    t=t.replace(/\b(funktioniert wieder|geht wieder|läuft wieder|works again|working again|fonctionne à nouveau|marche à nouveau|funciona de nuevo|fungerar igen)\b|又好了|又能用了/g,' fixedok ').replace(/\b(no more|no longer|nicht mehr|ya no|plus de|inte längre)\b|不再|没有再|没再|没问题/g,' ');
    if(RE_HUMAN.test(t)) return 'human';
    if(RE_NOTFIXED.test(t)) return 'notfixed';
    const neg=RE_CONTRAST.test(t)||/\b(not|n't|nicht|kein|pas|inte)\b|没|未/.test(t)||RE_QUESTION.test(t);
    if(neg) return null;
    if(RE_SOLVED_STRONG.test(t)) return 'solved';
    if(RE_THANKS.test(t) && t.trim().split(/\s+/).length<=6 && t.replace(/[^一-鿿]/g,'').length<=8) return 'solved';
    return null;
  }

  /* ---------- 知识库匹配 ---------- */
  function matchKB(text, product){
    const t=(text||'').toLowerCase(); const scored=[];
    for(const e of KB){ if(product && e.product!=='*' && e.product!==product) continue; let hits=0; for(const ws of Object.values(e.kw)) for(const w of ws) if(t.includes(w.toLowerCase())) hits++; if(hits) scored.push({ entry:e, hits:hits+(e.product===product?1:0) }); }
    scored.sort((a,b)=>b.hits-a.hits);
    return scored.length ? { entry:scored[0].entry, hits:scored[0].hits, runnerUp:scored[1]?scored[1].entry:null, ambiguous: scored[1] && scored[1].hits===scored[0].hits } : null;
  }

  /* ---------- 置信度 + 规则 + 路由 ---------- */
  // 政策（阈值 / 规则开关 / 承诺上限 / 追问区间 / 无匹配封顶）统一从 Policy 读，见 policy.config.json。
  // 传入 settings 仍然兼容（测试和 H5 里没有 state 时用），但优先读 Policy。
  const P = (path, fallback) => {
    if(typeof Policy!=='undefined'){ const v=Policy.get(path); if(v!==undefined && v!==null) return v; }
    return fallback;
  };
  // 置信度表达"AI 有多确定自己知道怎么修"：没有知识库匹配时封顶（型号 / 序列号 / 照片只是加分，不能把一个不认识的问题堆成"可直接回复"）
  function assess({ text, product, serial, photos=0, email='', settings }){
    const m = matchKB(text, product);
    let conf = 35;
    if(m){ conf += Math.min(30, m.hits*10); if(m.ambiguous) conf -= 10; }
    if(product) conf += 12; if(serial && serial.valid) conf += 10; if(photos>0) conf += 8;
    const NO_MATCH_CAP = P('autoReply.noMatchCap', 45);
    if(!m) conf = Math.min(conf, NO_MATCH_CAP);
    conf = Math.max(10, Math.min(98, conf));
    const reasons=[];
    const on = (name, dflt) => { const v=P('hardRules.'+name, dflt); return v!==false; };
    // 词表在 policy.config.json → hardRuleWords（设置页可编辑；伤害描述词锁定）。没有 Policy 时回落内置正则（仅 Node 单测引擎时出现）
    const hit = (rule, re) => (typeof Policy!=='undefined' && Policy.matchesHardRule) ? Policy.matchesHardRule(rule, text, email) : re.test(text);
    const hitWords = (rule) => (typeof Policy!=='undefined' && Policy.hitWords) ? Policy.hitWords(rule, text) : [];
    if(on('safety',true) && ((m&&m.entry.safety) || hit('safety', SAFETY_WORDS))) reasons.push({k:'safety', zh:'涉及安全件', en:'Safety-related part', words: m&&m.entry.safety?['知识条目标记为安全件']:hitWords('safety')});
    if(on('refund',true) && hit('refund', REFUND_WORDS)) reasons.push({k:'refund', zh:'退换货 / 赔偿', en:'Refund or return', words:hitWords('refund')});
    if(on('negative',true) && hit('negative', NEGATIVE_WORDS)) reasons.push({k:'negative', zh:'情绪负面 / 提及律师或公开评价', en:'Negative tone or public review', words:hitWords('negative')});
    if(P('hardRules.b2b',false)===true && email && hit('b2b', FREE_MAIL)) reasons.push({k:'b2b', zh:'B 端客户邮箱', en:'Business customer', words:[email]});
    const threshold = P('autoReply.threshold', 85);
    const askBand = P('autoReply.askBand', 25);
    let route, action;
    if(reasons.length){ route='human'; action='hold'; }
    else if(m && conf>=threshold){ route='ai'; action='reply'; }          // 直接回复必须有知识条目可依
    else if(conf>=threshold-askBand){ route='ai'; action='ask'; }
    else { route='human'; action='hold'; }
    // 是否可承诺寄件：金额上限与开关都来自政策
    let canShip=false; if(m && m.entry.part && m.entry.shipOnReply!==false){
      const limit = P('shipping.autoCommitLimitUsd', 50);
      canShip = m.entry.partValue<=limit ? P('shipping.smallParts',true)!==false : P('shipping.bigParts',false)===true;
    }
    return { match:m, confidence:conf, reasons, route, action, canShip, threshold };
  }

  /* ---------- 回复生成 ---------- */
  // ctx: {lang, name, dealer, city, hasSerial, hasPhotos} —— 追问 / 安抚文案按已有信息裁剪（已识别序列号就不再要标签照片）
  const ASK = { en:(n,c)=>`Thanks, ${n}. To make sure I point you to the right fix, could you tell me which part of the machine this concerns${c.hasPhotos?' and what happens exactly':' and, if possible, send a photo or short video of it'}?${c.hasSerial?'':" If you can also photograph the label on the rear upright, I'll pick up the serial number from it."}`,
                de:(n,c)=>`Danke, ${n}. Damit ich die richtige Lösung finde: Um welchen Teil des Geräts geht es${c.hasPhotos?' und was genau passiert':', und können Sie ein Foto oder kurzes Video schicken'}?${c.hasSerial?'':' Ein Foto des Typenschilds an der hinteren Säule hilft mir, die Seriennummer zu übernehmen.'}`,
                es:(n,c)=>`Gracias, ${n}. Para indicarte la solución correcta, ¿puedes decirme a qué parte de la máquina se refiere${c.hasPhotos?' y qué ocurre exactamente':' y enviar una foto o un vídeo corto'}?${c.hasSerial?'':' Si fotografías la etiqueta del poste trasero, tomo el número de serie de ahí.'}`,
                fr:(n,c)=>`Merci, ${n}. Pour vous indiquer la bonne solution, pouvez-vous préciser quelle partie de l'appareil est concernée${c.hasPhotos?' et ce qui se passe exactement':' et envoyer une photo ou une courte vidéo'} ?${c.hasSerial?'':" Une photo de l'étiquette sur le montant arrière me permettra de relever le numéro de série."}`,
                sv:(n,c)=>`Tack, ${n}. För att hitta rätt lösning: vilken del av maskinen gäller det${c.hasPhotos?' och vad händer exakt':', och kan du skicka ett foto eller en kort video'}?${c.hasSerial?'':' Ett foto av etiketten på bakre stolpen hjälper mig läsa serienumret.'}`,
                zh:(n,c)=>`${hi(n)}为了给你准确的处理办法，能说一下是设备的哪个部位${c.hasPhotos?'、具体是什么现象吗？':'吗？最好拍一张照片或短视频。'}${c.hasSerial?'':'如果能拍一下后立柱上的标签，我可以直接读出序列号。'}` };
  const LOGGED = { en:(c)=>c.hasPhotos||c.hasSerial?` Your request is logged${c.hasPhotos&&c.hasSerial?' with your photos and serial number':c.hasPhotos?' with your photos':' with your serial number'}, so you won't need to repeat anything.`:' Your request is logged, so you won\'t need to repeat anything.',
                   de:(c)=>c.hasPhotos||c.hasSerial?` Ihre Anfrage ist${c.hasPhotos?' mit Fotos':''}${c.hasPhotos&&c.hasSerial?' und':''}${c.hasSerial?' mit Seriennummer':''} erfasst.`:' Ihre Anfrage ist erfasst.',
                   es:(c)=>c.hasPhotos||c.hasSerial?` Tu solicitud queda registrada${c.hasPhotos?' con fotos':''}${c.hasPhotos&&c.hasSerial?' y':''}${c.hasSerial?' con número de serie':''}.`:' Tu solicitud queda registrada.',
                   fr:(c)=>c.hasPhotos||c.hasSerial?` Votre demande est enregistrée${c.hasPhotos?' avec photos':''}${c.hasPhotos&&c.hasSerial?' et':''}${c.hasSerial?' avec numéro de série':''}.`:' Votre demande est enregistrée.',
                   sv:(c)=>c.hasPhotos||c.hasSerial?` Ditt ärende är registrerat${c.hasPhotos?' med foton':''}${c.hasPhotos&&c.hasSerial?' och':''}${c.hasSerial?' med serienummer':''}.`:' Ditt ärende är registrerat.',
                   zh:(c)=>c.hasPhotos||c.hasSerial?`你的${c.hasPhotos?'照片':''}${c.hasPhotos&&c.hasSerial?'和':''}${c.hasSerial?'序列号':''}${c.hasPhotos&&c.hasSerial?'都':''}已记录，不需要再重复说明。`:'你的问题已记录，不需要再重复说明。' };
  const HOLD = { en:(n,c)=>`Thanks, ${n}. I've passed this to our support team so a person can confirm the right fix — they usually reply within 4 hours and you'll get an email as soon as they do.${LOGGED.en(c)}`,
                 de:(n,c)=>`Danke, ${n}. Ich habe den Fall an unser Support-Team übergeben, damit eine Person die Lösung bestätigt – in der Regel innerhalb von 4 Stunden, Sie erhalten dann eine E-Mail.${LOGGED.de(c)}`,
                 es:(n,c)=>`Gracias, ${n}. He pasado tu caso a nuestro equipo para que una persona confirme la solución; suelen responder en menos de 4 horas y recibirás un correo.${LOGGED.es(c)}`,
                 fr:(n,c)=>`Merci, ${n}. J'ai transmis votre demande à notre équipe pour qu'une personne confirme la solution ; réponse sous 4 heures en général, par e-mail.${LOGGED.fr(c)}`,
                 sv:(n,c)=>`Tack, ${n}. Jag har lämnat ärendet till vårt supportteam så att en person kan bekräfta lösningen – svar inom 4 timmar som regel, via e-post.${LOGGED.sv(c)}`,
                 zh:(n,c)=>`${hi(n)}我已把问题转给售后团队，由专人确认处理方案，通常 4 小时内回复，届时会邮件通知你。${LOGGED.zh(c)}` };
  // 寄件句：AI 有权承诺 → "将从 X 寄出"；无权（> 50 美元且未开 bigParts）→ "同事会在 N 小时内确认补发"；人工放行后也用 SHIP 句通知客户
  const SHIP = { en:(c)=>`We'll ship it from ${c.dealer} in ${c.city}, usually 2–4 working days, and email you the tracking number.`,
                 de:(c)=>`Versand von ${c.dealer} in ${c.city}, in der Regel 2–4 Werktage; die Sendungsnummer erhalten Sie per E-Mail.`,
                 es:(c)=>`Lo enviamos desde ${c.dealer} en ${c.city}, normalmente en 2–4 días laborables, y te mandamos el número de seguimiento por correo.`,
                 fr:(c)=>`Expédition depuis ${c.dealer} à ${c.city}, en général sous 2 à 4 jours ouvrés ; vous recevrez le numéro de suivi par e-mail.`,
                 sv:(c)=>`Vi skickar den från ${c.dealer} i ${c.city}, normalt inom 2–4 arbetsdagar, och mejlar spårningsnumret.`,
                 zh:(c)=>`将从 ${c.dealer}（${c.city}）寄出，通常 2 到 4 个工作日，物流单号会邮件发你。` };
  const PENDING = { en:(c)=>`A colleague will confirm the replacement within ${c.hours} hours and you'll get an email with the shipping details.`,
                    de:(c)=>`Ein Kollege bestätigt den Ersatz innerhalb von ${c.hours} Stunden; Sie erhalten dann eine E-Mail mit den Versanddetails.`,
                    es:(c)=>`Un compañero confirmará el envío en menos de ${c.hours} horas y recibirás un correo con los detalles.`,
                    fr:(c)=>`Un collègue confirmera l'envoi sous ${c.hours} heures et vous recevrez un e-mail avec les détails.`,
                    sv:(c)=>`En kollega bekräftar utbytet inom ${c.hours} timmar och du får ett mejl med leveransuppgifterna.`,
                    zh:(c)=>`同事会在 ${c.hours} 小时内确认补发，确认后邮件通知你寄送信息。` };
  function shipLine(lang, canShip, c){ return (canShip?SHIP:PENDING)[lang](c); }
  // 这次回复是否涉及寄件：有零件且该条目首次回复就承诺零件
  function offersPart(assessment){ const e=assessment.match&&assessment.match.entry; return e&&e.part&&e.shipOnReply!==false ? e : null; }
  function compose(assessment, ctx){
    const lang = ['en','de','es','fr','sv','zh'].includes(ctx.lang)?ctx.lang:'en';
    const c = { name:ctx.name||(lang==='zh'?'':'there'), dealer:ctx.dealer||'our warehouse', city:ctx.city||'Europe', hasSerial:!!ctx.hasSerial, hasPhotos:!!ctx.hasPhotos, hours:ctx.hours||4 };
    c.shipText = offersPart(assessment) ? shipLine(lang, assessment.canShip!==false, c) : '';
    if(assessment.action==='reply' && assessment.match) return assessment.match.entry.reply[lang] ? assessment.match.entry.reply[lang](c) : assessment.match.entry.reply.en(c);
    if(assessment.action==='ask') return ASK[lang](c.name,c);
    return HOLD[lang](c.name,c);
  }
  // 系统译文（给服务端看的中文摘要）
  function summarizeZh(assessment, ctx){
    const m=assessment.match; const parts=[];
    parts.push(m?`匹配知识库「${m.entry.cat.zh}」（命中 ${m.hits} 个关键词${m.ambiguous?'，与「'+m.runnerUp.cat.zh+'」得分相同':''}）`:'未匹配到知识库条目');
    parts.push(`置信度 ${assessment.confidence}%（阈值 ${assessment.threshold}%）`);
    if(assessment.reasons.length) parts.push('触发规则：'+assessment.reasons.map(r=>r.zh).join('、'));
    parts.push(assessment.route==='ai'?(assessment.action==='reply'?'→ AI 直接回复':'→ AI 追问补充信息'):'→ 暂停自动回复，转品牌方售后');
    return parts.join('；');
  }

  const LANG_NAME = { en:'English', de:'Deutsch', es:'Español', fr:'Français', it:'Italiano', sv:'Svenska', zh:'中文' };
  const api = { PRODUCTS, ORDERS, KB, productName, detectLang, detectProduct, parseSerial, orderFor, ordersFor, setOrders, matchKB, assess, compose, shipLine, offersPart, summarizeZh, detectConfirm, LANG_NAME, SN_RE };
  return api;
})();
if (typeof module !== 'undefined') module.exports = Engine;
