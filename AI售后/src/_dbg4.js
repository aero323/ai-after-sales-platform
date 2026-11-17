const {JSDOM}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync('../原型_H5扫码端.html','utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=TR-650',pretendToBeVisual:true});
  const w=dom.window; const E=c=>w.eval(c);
  w.pickLang('en','DE','de');
  const a=E("JSON.stringify((()=>{const x=assessNow('安装不会装');return {route:x.route,action:x.action,conf:x.confidence,th:x.threshold,reasons:x.reasons.map(r=>r.k),kb:x.match&&x.match.entry.id};})())");
  console.log(a);
  const b=E("JSON.stringify((()=>{const x=Engine.assess({text:'安装不会装',product:'TR-650',serial:null,photos:0,email:'',settings:settings});return {route:x.route,action:x.action,conf:x.confidence,th:x.threshold,reasons:x.reasons.map(r=>r.k),kb:x.match&&x.match.entry.id};})())");
  console.log(b);
  process.exit(0);
})();
