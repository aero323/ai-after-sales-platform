const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync('../原型_H5扫码端.html','utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const vc=new VirtualConsole(); vc.on('jsdomError',e=>console.log('ERR',e.message));
  const dom=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=TR-650',pretendToBeVisual:true,virtualConsole:vc});
  const w=dom.window,d=w.document; const E=c=>w.eval(c);
  w.pickLang('en','DE','de');
  E("ticket=null; asks=0; lastAction=null; serial=null");
  w.startChat(); w.openText();
  console.log('before:',E('stage'), E('ticket')&&E('ticket').id, 'asks',E('asks'));
  d.getElementById('ta').value='安装不会装'; w.sendMsg();
  await wait(1500);
  console.log('after: lastAction',E('lastAction'),'asks',E('asks'),'status',E('ticket').status);
  console.log(E("ticket.transcript.map(m=>m.who+':'+m.text.slice(0,40)).join(' | ')"));
  process.exit(0);
})();
