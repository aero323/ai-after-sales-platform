const QR=require('./qr.js'); const fs=require('fs');
const tests=['https://h5.ironpeak.support/s/sm-900','https://h5.ironpeak.support/s/tr-650?v=1&src=label','IronPeak 售后 中文测试 https://example.com/很长的一段路径用来触发更高的版本号/1234567890/abcdefghij','T-2611-0312','https://h5.ironpeak.support/s/cb-1200?v=1&batch=24B&campaign=eu-launch-2026&ref=manual-page-12&utm=qr&extra=padding-to-reach-version-seven-or-more-chars'];
tests.forEach((t,i)=>{ const r=QR.encode(t); const s=10; const n=r.size+8; const rows=[]; for(let y=0;y<n;y++){ let line=''; for(let x=0;x<n;x++){ const yy=y-4,xx=x-4; const d=yy>=0&&xx>=0&&yy<r.size&&xx<r.size&&r.modules[yy][xx]; line+=d?'0':'1'; } rows.push(line); }
  // write PGM scaled
  let out=`P2\n${n*s} ${n*s}\n255\n`; for(const line of rows){ let px=''; for(const c of line) px+=(c==='0'?'0 ':'255 ').repeat(s); for(let k=0;k<s;k++) out+=px+'\n'; } fs.writeFileSync(`qr${i}.pgm`,out); console.log(i,'ver',r.version,'mask',r.mask,'size',r.size); });
