/* 纯 JS QR 编码器：字节模式，版本 1-10，纠错等级 L/M。返回 size×size 的布尔矩阵。 */
const QR = (() => {
  const ECC = { L: { fb: 1, perBlock: [0,7,10,15,20,26,18,20,24,30,18], blocks: [0,1,1,1,1,1,2,2,2,2,4] },
                M: { fb: 0, perBlock: [0,10,16,26,18,24,16,18,22,22,26], blocks: [0,1,1,1,2,2,4,4,4,5,5] } };
  function rawModules(ver){ let r=(16*ver+128)*ver+64; if(ver>=2){ const n=Math.floor(ver/7)+2; r-=(25*n-10)*n-55; if(ver>=7) r-=36; } return r; }
  function rawCodewords(ver){ return Math.floor(rawModules(ver)/8); }
  function dataCodewords(ver, ecl){ return rawCodewords(ver) - ECC[ecl].perBlock[ver]*ECC[ecl].blocks[ver]; }
  // GF(256)
  function gfMul(x,y){ let z=0; for(let i=7;i>=0;i--){ z=(z<<1)^((z>>>7)*0x11D); z^=((y>>>i)&1)*x; } return z&0xFF; }
  function rsGen(deg){ let c=new Array(deg).fill(0); c[deg-1]=1; let root=1; for(let i=0;i<deg;i++){ for(let j=0;j<deg;j++){ c[j]=gfMul(c[j],root); if(j+1<deg) c[j]^=c[j+1]; } root=gfMul(root,2);} return c; }
  function rsRem(data, gen){ const res=new Array(gen.length).fill(0); for(const b of data){ const f=b^res.shift(); res.push(0); gen.forEach((g,i)=>{ res[i]^=gfMul(g,f); }); } return res; }
  function utf8(str){ const out=[]; for(const ch of str){ let c=ch.codePointAt(0); if(c<0x80) out.push(c); else if(c<0x800) out.push(0xC0|c>>6,0x80|c&63); else if(c<0x10000) out.push(0xE0|c>>12,0x80|c>>6&63,0x80|c&63); else out.push(0xF0|c>>18,0x80|c>>12&63,0x80|c>>6&63,0x80|c&63); } return out; }
  function alignPos(ver){ if(ver===1) return []; const n=Math.floor(ver/7)+2, size=ver*4+17; const step=Math.trunc((ver*8+n*3+5)/(n*4-4))*2; const r=[]; for(let p=size-7;r.length<n-1;p-=step) r.unshift(p); r.unshift(6); return r; }

  function encode(text, ecl='M'){
    const bytes=(typeof TextEncoder!=='undefined')?new TextEncoder().encode(text):utf8(text);
    let ver=-1; for(let v=1;v<=10;v++){ const cc=v<=9?8:16; if(4+cc+bytes.length*8 <= dataCodewords(v,ecl)*8){ ver=v; break; } }
    if(ver<0) throw new Error('内容过长');
    const cap=dataCodewords(ver,ecl)*8; const bits=[];
    const push=(val,n)=>{ for(let i=n-1;i>=0;i--) bits.push((val>>>i)&1); };
    push(4,4); push(bytes.length, ver<=9?8:16); for(const b of bytes) push(b,8);
    push(0, Math.min(4, cap-bits.length)); while(bits.length%8) bits.push(0);
    for(let pad=0xEC; bits.length<cap; pad^=0xEC^0x11) push(pad,8);
    const data=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; data.push(b); }
    // 分块 + 纠错 + 交织
    const nb=ECC[ecl].blocks[ver], el=ECC[ecl].perBlock[ver], raw=rawCodewords(ver);
    const nShort=nb-raw%nb, shortLen=Math.floor(raw/nb); const gen=rsGen(el); const blocks=[];
    for(let i=0,k=0;i<nb;i++){ const dl=shortLen-el+(i<nShort?0:1); const dat=data.slice(k,k+dl); k+=dl; const ecc=rsRem(dat,gen); if(i<nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
    const cw=[]; for(let i=0;i<blocks[0].length;i++) blocks.forEach((b,j)=>{ if(i!==shortLen-el || j>=nShort) cw.push(b[i]); });
    // 画功能图形
    const size=ver*4+17; const m=Array.from({length:size},()=>new Array(size).fill(false)); const fn=Array.from({length:size},()=>new Array(size).fill(false));
    const set=(x,y,d)=>{ m[y][x]=d; fn[y][x]=true; };
    for(let i=0;i<size;i++){ set(6,i,i%2===0); set(i,6,i%2===0); }
    const finder=(cx,cy)=>{ for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){ const x=cx+dx,y=cy+dy; if(x<0||y<0||x>=size||y>=size) continue; const d=Math.max(Math.abs(dx),Math.abs(dy)); set(x,y,d!==2&&d!==4); } };
    finder(3,3); finder(size-4,3); finder(3,size-4);
    const ap=alignPos(ver);
    for(let i=0;i<ap.length;i++) for(let j=0;j<ap.length;j++){ if((i===0&&j===0)||(i===0&&j===ap.length-1)||(i===ap.length-1&&j===0)) continue; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) set(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1); }
    const drawFormat=(mask)=>{ const d=(ECC[ecl].fb<<3)|mask; let rem=d; for(let i=0;i<10;i++) rem=(rem<<1)^((rem>>>9)*0x537); const b=((d<<10)|rem)^0x5412; const g=i=>((b>>>i)&1)===1;
      for(let i=0;i<=5;i++) set(8,i,g(i)); set(8,7,g(6)); set(8,8,g(7)); set(7,8,g(8)); for(let i=9;i<15;i++) set(14-i,8,g(i));
      for(let i=0;i<8;i++) set(size-1-i,8,g(i)); for(let i=8;i<15;i++) set(8,size-15+i,g(i)); set(8,size-8,true); };
    drawFormat(0);
    if(ver>=7){ let rem=ver; for(let i=0;i<12;i++) rem=(rem<<1)^((rem>>>11)*0x1F25); const b=(ver<<12)|rem; for(let i=0;i<18;i++){ const c=((b>>>i)&1)===1, a=size-11+i%3, q=Math.floor(i/3); set(a,q,c); set(q,a,c); } }
    // 放数据
    let i=0; for(let right=size-1;right>=1;right-=2){ if(right===6) right=5; for(let v=0;v<size;v++) for(let j=0;j<2;j++){ const x=right-j, up=((right+1)&2)===0, y=up?size-1-v:v; if(!fn[y][x] && i<cw.length*8){ m[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)===1; i++; } } }
    // 选掩码
    const maskFn=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>(x*y)%2+(x*y)%3===0,(x,y)=>((x*y)%2+(x*y)%3)%2===0,(x,y)=>((x+y)%2+(x*y)%3)%2===0];
    const apply=k=>{ for(let y=0;y<size;y++) for(let x=0;x<size;x++) if(!fn[y][x]&&maskFn[k](x,y)) m[y][x]=!m[y][x]; };
    const penalty=()=>{ let p=0; const run=arr=>{ let s=0,c=arr[0],n=0; for(const v of arr){ if(v===c){ n++; } else { if(n>=5) s+=3+(n-5); c=v; n=1; } } if(n>=5) s+=3+(n-5); return s; };
      for(let y=0;y<size;y++) p+=run(m[y]); for(let x=0;x<size;x++) p+=run(m.map(r=>r[x]));
      for(let y=0;y<size-1;y++) for(let x=0;x<size-1;x++){ const c=m[y][x]; if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1]) p+=3; }
      const pat=[true,false,true,true,true,false,true]; const chk=arr=>{ let s=0; for(let i=0;i+6<arr.length;i++){ let ok=true; for(let k=0;k<7;k++) if(arr[i+k]!==pat[k]){ ok=false; break; } if(!ok) continue; const l=i>=4&&!arr[i-1]&&!arr[i-2]&&!arr[i-3]&&!arr[i-4]; const r=i+10<arr.length&&!arr[i+7]&&!arr[i+8]&&!arr[i+9]&&!arr[i+10]; if(l||r) s+=40; } return s; };
      for(let y=0;y<size;y++) p+=chk(m[y]); for(let x=0;x<size;x++) p+=chk(m.map(r=>r[x]));
      let dark=0; for(const r of m) for(const v of r) if(v) dark++; const total=size*size; const k=Math.ceil(Math.abs(dark*20-total*10)/total)-1; return p+k*10; };
    let best=0,bp=Infinity; for(let k=0;k<8;k++){ apply(k); drawFormat(k); const p=penalty(); if(p<bp){ bp=p; best=k; } apply(k); }
    apply(best); drawFormat(best);
    return { size, modules:m, version:ver, mask:best };
  }
  function svg(text, opts={}){ const {size,modules}=encode(text, opts.ecl||'M'); const q=opts.quiet??2; const n=size+q*2; let d=''; for(let y=0;y<size;y++) for(let x=0;x<size;x++) if(modules[y][x]) d+=`M${x+q} ${y+q}h1v1h-1z`; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"${opts.width?` width="${opts.width}" height="${opts.width}"`:''}><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="${opts.color||'#171C22'}"/></svg>`; }
  return { encode, svg };
})();
if (typeof module !== 'undefined') module.exports = QR;
