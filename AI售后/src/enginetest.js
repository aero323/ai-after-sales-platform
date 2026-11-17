const E=require('./engine.js');
const S={threshold:85,rules:{safety:true,refund:true,negative:true,b2b:false},promise:{smallParts:true,bigParts:false}};
const cases=[
 ['en',"Hi, the cable on my SM-900 is fraying near the top pulley after 3 months. Serial SM9-24B-00931.", 'm.reynolds@gmail.com'],
 ['de',"Hallo, mein Laufband TR-650 stoppt nach 10 Minuten mit Fehlercode E07. Was kann ich tun?", 'lena.h@web.de'],
 ['es',"Falta el tornillo M10 del paquete de montaje, paso 7. Máquina Smith.", 'carlos.m@outlook.com'],
 ['en',"Resistance motor noise on 6 units in the same batch, rowing machines RW3-24A-00210", 'ops@gympro.ae'],
 ['fr',"Bonjour, comment lubrifier la bande de course de mon tapis TR-650 ?", 'sophie@orange.fr'],
 ['en',"Safety catch does not lock on the left side, it slips when I rack the bar", 'jaket@yahoo.com'],
 ['sv',"Displayen visar fel enhet, miles istället för km på min roddmaskin", 'anna@telia.se'],
 ['en',"This is unacceptable, I want a refund or I will post a review", 'x@gmail.com'],
 ['en',"it makes a weird thing sometimes", 'y@gmail.com'],
 ['zh',"我的史密斯机钢缆起毛了，序列号 SM9-24B-00877", 'z@qq.com'],
];
for(const [exp,txt,mail] of cases){
  const lang=E.detectLang(txt), prod=E.detectProduct(txt), sn=E.parseSerial(txt);
  const a=E.assess({text:txt,product:prod||(sn&&sn.product),serial:sn,photos:0,email:mail,settings:S});
  console.log(`[${lang===exp?'ok':'LANG?'+exp}] lang=${lang} prod=${prod||(sn&&sn.product)||'-'} sn=${sn?sn.sn+'/'+sn.order:'-'} kb=${a.match?a.match.entry.id:'-'} conf=${a.confidence} route=${a.route}/${a.action} reasons=${a.reasons.map(r=>r.k).join(',')||'-'} ship=${a.canShip}`);
}
console.log('---- compose sample (de, e07):');
const a=E.assess({text:cases[1][1],product:'TR-650',serial:null,settings:S}); console.log(E.compose(a,{lang:'de',name:'Lena',dealer:'FitHaus GmbH',city:'Hamburg'}).slice(0,120)+'…');
console.log(E.summarizeZh(a,{}));
