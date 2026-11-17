const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync('../原型_H5扫码端.html','utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  // 先跑一个完整的第一个 DOM（和测试一样，走完 startChat/相机/文本），再跑第二个
  const vc=new VirtualConsole(); const errs=[]; vc.on('jsdomError',e=>errs.push('D1 '+e.message)); vc.on('error',(...a)=>errs.push('D1 console '+a.join(' ')));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=TR-650',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window; w.URL.createObjectURL=()=>'blob:x'; w.URL.revokeObjectURL=()=>{};
  w.pickLang('en','DE','de'); w.go(2); w.skipLabel();
  w.startChat(); w.enterCamera('video'); w.recordClip(); w.clipStop(); w.setCamMode('photo'); w.shoot(); w.startAnalyze();
  await wait(2400);
  w.exitCamera(); w.openText();
  const d=w.document; d.getElementById('ta').value='Laufband stoppt nach 10 Minuten mit Fehlercode E07'; w.sendMsg();
  await wait(900);
  const vc2=new VirtualConsole(); const errs2=[]; vc2.on('jsdomError',e=>errs2.push('D2 '+e.message)); vc2.on('error',(...a)=>errs2.push('D2 console '+a.join(' ')));
  const dom2=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900&go=chat&sn=SM9-24B-00955',pretendToBeVisual:true,virtualConsole:vc2});
  await wait(150);
  dom2.window.openText();
  dom2.window.document.getElementById('ta').value='跑带偏了，怎么润滑';
  dom2.window.sendMsg();
  await wait(1400);
  console.log('kb:',dom2.window.eval('ticket.kbId'),'errs2:',errs2);
  console.log(dom2.window.document.getElementById('chat').textContent.slice(0,200));
  console.log('errs1:',errs.slice(0,5));
  process.exit(0);
})();
