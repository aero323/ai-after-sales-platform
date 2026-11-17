global.document={querySelector:()=>null}; global.localStorage={_:{},getItem(k){return this._[k]||null},setItem(k,v){this._[k]=v},removeItem(k){delete this._[k]}};
global.Engine=require('./engine.js'); global.Policy=require('./policy.js');
const fs=require('fs'); eval(fs.readFileSync('app_state.js','utf8')+'\nglobal.seed=seed;global.runPipeline=runPipeline;global.setState=s=>{state=s};global.getState=()=>state;global.visibleTickets=visibleTickets;global.setRole=r=>{role=r};global.isLate=isLate;global.manualChecks=manualChecks;global.importInbox=importInbox;');
const s=seed(); setState(s);
console.log('tickets',s.tickets.length,'ids',s.tickets[0].id,'…',s.tickets.at(-1).id);
const by={}; for(const t of s.tickets){ const k=t.status+(isLate(t)?'/late':''); by[k]=(by[k]||0)+1; } console.log('status',by);
const rb={}; for(const t of s.tickets.filter(t=>t.status==='done')){ rb[t.resolvedBy]=(rb[t.resolvedBy]||0)+1 } console.log('resolvedBy',rb);
console.log('featured ids', s.tickets.filter(t=>t.tag).map(t=>t.tag+':'+t.id).join(' '));
console.log('checks M-0041', s.manuals.find(m=>m.id==='M-0041').checks.filter(c=>!c.ok).map(c=>c.label));
setRole('dealer'); console.log('dealer sees',visibleTickets().length); setRole('factory'); console.log('factory sees',visibleTickets().length); setRole('brand');
const r=runPipeline({from:'new.customer@gmail.com',subject:'Treadmill E07 after 10 min',body:'Hi, my TR-650 stops after 10 minutes with E07. Serial TR6-24A-00450. Photo attached.',photos:1});
console.log(r.steps.map(x=>x.text).join('\n')); console.log('status',r.ticket.status,'timeline',r.ticket.timeline.length);
const r2=runPipeline({from:'new.customer@gmail.com',subject:'Re: E07',body:'Still E07 after lubricating and 30 min unplugged.'});
console.log('--merge--\n'+r2.steps.map(x=>x.text).join('\n'),'asks',r2.ticket.asks,'status',r2.ticket.status);
const r3=runPipeline({from:'angry@gmail.com',subject:'Refund',body:'This is unacceptable, I want a refund or I will post a review on trustpilot'});
console.log('--refund--',r3.ticket.status,r3.steps.at(-2).text);
// inbox import
localStorage.setItem('as_h5_inbox',JSON.stringify([{id:'T-2611-9001',createdAt:Date.now(),lang:'en',product:'SM-900',sn:'SM9-24B-00999',issue:'cable fraying at top pulley',chips:'Cable or pulley',photos:1,email:'h5user@gmail.com',name:'H5 User',status:'human',transcript:[{who:'cust',text:'cable fraying'},{who:'ai',text:'...'}]}]));
console.log('imported',importInbox(), getState().tickets.find(t=>t.id==='T-2611-9001').status);
