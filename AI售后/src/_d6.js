const {JSDOM,VirtualConsole}=require('jsdom'); const fs=require('fs');
const html=fs.readFileSync('../原型_H5扫码端.html','utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const vc2=new VirtualConsole(); vc2.on('jsdomError',e=>console.log('ERR',e.message));
  const dom2=new JSDOM(html,{runScripts:'dangerously',url:'http://localhost/h5.html?m=SM-900&go=chat&sn=SM9-24B-00955',pretendToBeVisual:true,virtualConsole:vc2});
  await wait(300);
  dom2.window.openText();
  console.log('status',dom2.window.eval('ticket.status'),'stage',dom2.window.eval('stage'),'kbId0',dom2.window.eval('ticket.kbId'));
  dom2.window.document.getElementById('ta').value='跑带偏了，怎么润滑';
  dom2.window.sendMsg();
  await wait(300);
  console.log('after300 tb',dom2.window.eval('JSON.stringify((ticket.transcript||[]).map(m=>[m.who,String(m.text).slice(0,25)]))'));
  await wait(1200);
  console.log('after1500 kb',dom2.window.eval('ticket.kbId'),'tb',dom2.window.eval('JSON.stringify((ticket.transcript||[]).map(m=>[m.who,String(m.text).slice(0,25)]))'));
  process.exit(0);
})();
