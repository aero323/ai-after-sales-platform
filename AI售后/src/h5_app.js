/* ================= H5 扫码端（真实逻辑，v3：镜头优先） ================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const INBOX_KEY='as_h5_inbox', STORE_KEY='as_state';
const qs=new URLSearchParams(location.search);
let adminState=null; try{ adminState=JSON.parse(localStorage.getItem(STORE_KEY)||'null'); }catch(e){}
const settings=Object.assign({brandColor:'#0E7A6C',h5Langs:['en','de','es','fr','it','sv'],h5Email:true,h5App:false},adminState?adminState.settings:{},(typeof Policy!=='undefined'?Policy.view():{threshold:85,rules:{safety:true,refund:true,negative:true,b2b:false},promise:{smallParts:true,bigParts:false,videos:true}}));
if(adminState&&Array.isArray(adminState.orders)&&adminState.orders.length) Engine.setOrders(adminState.orders);
if(adminState&&Array.isArray(adminState.batches)&&typeof Engine.setBatches==='function') Engine.setBatches(adminState.batches);   // 批次表 → parseSerial 返回 supplier
const model=(qs.get('m')||'SM-900').toUpperCase(); const product=Engine.PRODUCTS.find(p=>p.id===model)||Engine.PRODUCTS[0];
const productOrders=Engine.ordersFor(product.id);
// 二维码参数（设计_批次_v1 §4.2/§4.4）：q=二维码记录 id（扫描归因，原样带回后台）；b=批次代码、f=供应商名，只是"提示"，序列号优先
const qrId=qs.get('q')||null, qrBatch=(qs.get('b')||'').trim().toUpperCase()||null, qrSupplier=(qs.get('f')||'').trim()||null;
document.documentElement.style.setProperty('--brand',settings.brandColor);
document.documentElement.style.setProperty('--brand-ink',shade(settings.brandColor,-18));
document.documentElement.style.setProperty('--brand-soft',tint(settings.brandColor));
function shade(hex,p){ const n=parseInt(hex.slice(1),16); let r=(n>>16)+Math.round(255*p/100),g=((n>>8)&255)+Math.round(255*p/100),b=(n&255)+Math.round(255*p/100); const c=v=>Math.max(0,Math.min(255,v)); return '#'+[c(r),c(g),c(b)].map(v=>v.toString(16).padStart(2,'0')).join(''); }
function tint(hex){ const n=parseInt(hex.slice(1),16); const r=n>>16,g=(n>>8)&255,b=n&255; return `rgba(${r},${g},${b},.12)`; }
// 图片内联（构建时由 build.py 把 src/img/*.jpg 转成 data URI 注入 h5_images.js）
const IMG=(typeof H5_IMG!=='undefined')?H5_IMG:{};

/* ---------- 文案 ---------- */
const I18N={
en:{ cap_title:'Scan-to-help H5 · v3', cap_p:'What a customer sees after scanning the QR sticker next to the product label. The repair path is camera-first: aim, record up to 8 s or shoot, check what the AI saw, then one step at a time. Typing is only the fallback. Everything runs on real logic: label check, knowledge match, confidence, safety routing, shipment promise and the request that lands in the brand back office.',
  cap_hint:'Click through the phone. Requests created here appear in the back-office prototype (same browser) under 工单处理.',
  flow:['Choose language','Photo of the label → model & serial','Show the problem with the camera','Save · rate'],
  brand:'IronPeak Support', prod:`${product.series.en} ${product.id}`, prod_sub:'IronPeak Fitness · support for this model',
  hero_k:'CAMERA SERVICE · 3 STEPS', model_label:'DEVICE MATCHED', h0:'Show us the problem.', l0:'Point the camera at the part. The assistant looks, tells you what it sees, and walks you through one step at a time.',
  s3a:'Aim & shoot', s3a2:'Photo or 8-second clip', s3b:'AI looks first', s3b2:'What it sees, how sure', s3c:'One step at a time', s3c2:'Stop any time, a person takes over',
  o1:'Start repair', o1s:'Photo or 8-second video · no forms', o2:'Manuals & videos', o3:'Track a request', note0:'Replies in your language · 24 h response commitment',
  h1:'Choose your language', l1:`Support for ${product.series.en} ${product.id}. We reply in the language you pick; a person takes over if the assistant cannot help.`,
  h2:'Photograph the product label', l2:"Silver sticker next to this QR code, usually on the rear upright. We read model and serial so you don't type them.",
  h2b:'Is this your machine?', l2b:'The label is matched to an order, so the right people see your request straight away.',
  hint:'Fit the whole label inside the frame', hint_busy:'Reading the label…', hint_ok:'Label recognised', hint_fail:'No serial found — try again or type it',
  ok:'✓ Label recognised', k_model:'Model', k_sn:'Serial', k_via:'Purchased via', k_war:'Warranty', k_batch:'Batch', k_from_qr:'from QR code', war_active:'Active until', war_unknown:'Not on record',
  b_snap:'Take photo', b_demo_label:'Use the sample label (demo)', b_type:'Type the serial number instead', b_skip_label:'No label? Start without it', b_start:'Start', b_retake:'Not right — retake', b_check:'Check serial number', sn_ph:'e.g. SM9-24B-00931', sn_bad:"That doesn't look like an IronPeak serial (AA0-00A-00000)", sn_wrong:'This serial belongs to a different model', sn_noorder:'Format is valid but no order on record — a person will check the warranty', reset_label:'Reset demo', reset_done:'Demo reset',
  // camera
  cam_tip_default:'Point the camera at the part that is misbehaving', spot_pick:'Choose an issue or part', spot_q:'Where is the problem?', spot_hint:'Tap the closest part', spot_close:'Close',
  cam_demo:'Demo view', cam_denied:'Camera permission was refused — showing a demo view. Allow the camera and reopen.', cam_unavailable:'No camera available here — showing a demo view.',
  spot_ok:'Region', shot_clip:'Clip', shots_none:'Nothing yet — tap the shutter', shot_remove:'Tap to remove',
  shot_photo:'Photo', shot_video:'Video', shot_taken:'Captured — check the framing', clip_rec:'Recording…', clip_done:'Clip recorded with the machine sound',
  review_t:'Photo captured', review_s:'Check the framing, then add a note if it helps', review_count:(n)=>`${n} photo${n===1?'':'s'}`, review_add:'Add photo',
  review_voice:'Add a voice note', review_text:'Add a text note', review_note_title:'Optional note', review_remove:'Remove', review_save:'Save',
  review_voice_start:'Tap to record', review_voice_rec:'Recording… tap again to stop', review_voice_done:'Voice note attached', review_voice_hint:'Up to 15 seconds',
  review_voice_tag:'A voice note is attached', review_text_ph:'Add anything the photo does not show…', review_note_saved:'Note saved',
  how_t:'How do you want to show it?',
  how_hero:'No forms. Just show us.', how_hero2:'Two ways to describe the same problem.',
  how_v:'Say it while filming', how_v2:'Up to 8 seconds of video. Talk while you film: what you see, when it happens, what you already tried.', how_v3:'Best for noises and movement',
  how_p:'Photo + words or voice', how_p2:'Take one or two photos, then add details by speaking or typing.',
  photo_note_add:'Add words or voice', photo_note_title:'Add words or voice', photo_note_sub:'Your photos stay attached — speak or type the details.',
  how_v_tip:'Tap to record, up to 8 seconds', how_p_tip:'Tap to take a photo',
  b_analyze:'Let the assistant look', b_text:'Describe it in text instead',
  an_title:'Looking at your photos…', an_lead:'Safety rules run first, then the repair knowledge for this model.', an_1:'Locating the part', an_2:'Reading the model & serial', an_3:'Matching same-model repair records', an_4:'Checking what is safe to do', an_tag:['Vision','Label','Knowledge','Rules'],
  see_t:'This is what the assistant sees', see_s:'Remove anything you do not want to share', see_who:'Assistant · ready', see_foot:'Nothing outside the frame is uploaded. You can retake at any time.', b_yes:'Yes, that is the part', b_no:'Not quite — retake',
  v_t:'What the assistant found', v_conf:'Confidence', v_who:'Assistant',
  v_low:'Low risk · safe to continue', v_low2:'I don’t see heat, smoke, or exposed wiring. If that changes, stop and tell us.',
  v_warn:'A person should confirm this', v_warn2:'I’m not confident enough to guide you safely, so I’ll pass the photos and what I found to a support engineer.',
  v_stop:'Stop using the machine', v_stop2:'This involves a safety-critical part. Please keep it switched off until it’s replaced.',
  v_go:(n)=>`Start the ${n}-step fix`, v_ask:'Send one more angle', v_human:'Send this to a support engineer',
  g_t:'Step by step', g_done:'Done — next step', g_stuck:'I cannot do this step',
  g_sub:(i,n)=>`Step ${i} of ${n}`, g_note:'Stop immediately if you smell burning, see sparks, or hear metal grinding.',
  cf_title:'IronPeak support assistant', cf_sub:(i,n)=>i!=null?`Step ${i} of ${n}`:'Looking at your photo',
  cf_finding:(issue)=>`I had a look — this looks like “${issue}”. I don’t see smoke, burning, or exposed wiring, so we can try a few steps.`,
  cf_conf:'confidence', cf_why:'How I worked it out', cf_basis:(n,kb)=>`${n} ${n===1?'photo':'photos'}${kb?' · KB '+kb:''}`,
  cf_risk_low:'Low risk — worth trying', cf_risk_warn:'A person should take a look', cf_risk_stop:'Stop using it for now',
  cf_part:'Possible part', cf_step:(i,n)=>`Step ${i} of ${n}`,
  cf_done:'Okay, next', cf_done_last:'I’m done', cf_stuck:'I’m stuck', cf_stuck_again:'Still stuck', cf_watch:'Watch demo',
  cf_step_lead_mid:'Good — that part’s done. Let’s keep going.', cf_step_lead_last:'Last step. Take it slowly and don’t over-adjust it.',
  cf_all_done:(n)=>`Good — all ${n} steps are done. Let it run normally for a moment, then we’ll check whether the original problem is still there.`, cf_check_now:'See how it’s doing',
  cf_stuck_help:(step)=>`No problem — this one can be fiddly. Just look at this bit first: “${step}” You don’t have to do it all at once. Tell me if anything is still unclear.`,
  cf_stuck_final:'Then let’s stop guessing here. I’ll pass your photos, what I found, and the steps you tried to a support engineer, so you won’t have to repeat everything.',
  cf_question:(step)=>`You’re asking about this step, right? “${step}” Tell me what you’re seeing or which bit is unclear, and I’ll put it more simply.`,
  cf_danger:'Hold on — stop using the machine and don’t switch it back on. This isn’t something to keep doing yourself, so I’m taking you to the safety instructions.',
  cf_ask:'I want to see a little more before giving you firm guidance. Try one more angle, or I can pass this to a support engineer.', cf_human:'Of course. I’ll hand these notes to a support engineer now — they’ll pick it up from here.', cf_no_steps:'I’m not comfortable letting you work on this one yourself. I’ll send the photo and my finding to a support engineer instead.',
  cf_voice_transcript:'Voice transcript · demo', cf_transcribing:'Let me put that into words…', cf_voice_ready:'Talk to the AI assistant', cf_voice_listening:'I’m listening — tap to stop', cf_voice_hint:'Say “done”, or ask me anything', cf_voice_hint_listening:'Tap when you’re finished and I’ll turn it into text',
  cf_new_message:'New message', cf_placeholder:'Ask me anything about this step…', cf_send:'Send', cf_evidence:'Photo evidence', cf_expand:'Expand photo', cf_collapse:'Collapse photo',
  o_t:'How did it go?', o_s:'Pick what actually happened. The assistant will not keep guessing.',
  o_fixed:'It works now', o_fixed2:'Close the request, 24-h check later', o_notfixed:'Still the same', o_notfixed2:'A person picks it up with everything you sent', o_danger:'Something got worse', o_danger2:'Heat, smoke, sparks or a much louder noise',
  o_foot:'Choosing "works now" is verified again in 24 hours. If it comes back, the request reopens with your photos.',
  sf_t:'Stop using it and unplug it', sf_s:'The assistant will not guide you further on this. Do not open the motor cover or run the machine again.',
  sf_1:'Unplug and keep it unplugged', sf_2:'Move away if there is smoke or heat', sf_3:'An engineer takes over with your photos and steps',
  sf_b:'Send to a support engineer',
  h_t:'Our after-sales team takes over', h_s:'Nothing to repeat — they get everything below', tech_role:'IronPeak service engineer', tech_on:'Online · usually 4 hours', tech_ok:'Verified',
  h_note:'Note for the engineer', h_note_optional:'Optional', h_note_ph:'Add when it happens, access details, or a good time to call.', h_note_hint:'This note is sent with your request.',
  h_p:'They see your photos, the assistant’s finding and the steps you already tried.',
  h_go:'Send and continue',
  tx_t:'Describe it in words', tx_s:'Fallback — photo and voice are usually faster',
  h5:'Request {id} is logged', l5:'Leave your email and we send the progress and this conversation, so nothing is lost when you close the page.',
  sum_prod:'Product', sum_issue:'Problem', sum_route:'Handled', sum_next:'Next',
  k_email:'Email', ph_email:'you@example.com', b_save:'Save and email me updates', b_app:'Get the IronPeak app', b_track2:'Check an existing request', k_rate:'How was this so far?', email_bad:'Please enter a valid email', saved:'Saved. Updates go to ', thanks:'Thanks for the feedback',
  t_attach:'Photo added', t_manual_pdf:'Prototype: the full PDF manual opens here', t_video:'Playing the clip (prototype)',
  c_sys:(sr)=>`${product.series.en} ${product.id} · ${sr?sr.sn:'serial not provided'} · ${sr&&sr.dealer?sr.dealer:'IronPeak'}`, c_meta:'Support assistant · just now',
  c_open:(id)=>`Request ${id} is open and copied to our support team. No forms to fill in — tell me what is happening, or send a photo or short video.`,
  q_self:"Send the part, I'll fit it myself", q_tech:"I'd rather have a technician", q_person:'Talk to a person', q_video:'Add a photo or video', q_solved:'That fixed it', q_notfixed:'Still not working', q_save:'Save this conversation',
  c_handover:(name,h)=>`Handing over to ${name} at IronPeak support. They usually reply within ${h} hours; you'll get an email as soon as they do.`,
  c_logged:(id)=>`Your request is logged as ${id} with your photos and serial number, so you won't need to repeat anything.`,
  c_ship:(part,dealer,id)=>`Done. A new ${part} ships from ${dealer} to the address on your order; you'll get the tracking number by email. Request number: ${id}. Anything else about the machine?`,
  c_tech:(name,h)=>`Understood — I've asked ${name} to arrange a technician visit through your dealer. They'll confirm a date within ${h} hours by email.`,
  c_solved:"Great, glad that fixed it. I'll close this request; you can always reopen it by replying to the email.",
  c_notfixed:(name,h)=>`Sorry about that. Since the first fix didn't work I'm not going to guess again — ${name} from our team will look at your photos and reply within ${h} hours.`,
  c_noted:"Noted — I've added this to your request so the person handling it sees it.",
  steps_t:'Steps', watch:'Watch', human_tag:'A person is now on this', ph_msg:'Describe your issue', need_desc:'Please describe the problem in a few words',
  voice_label:'Voice input', voice_start:'Recording—tap again to stop', voice_stop:'Voice input stopped (prototype)', voice_prompt:'Tap to speak', voice_hint:'Tell us what is happening', voice_listening:'Listening…', voice_hint_listening:'Tap again to stop', switch_text:'Switch to keyboard', switch_voice:'Switch to voice',
  h_track:'Check a request', l_track:'Enter the request number from your email, e.g. T-2611-0312.', b_track:'Look up', track_none:'No request with that number. Check the email we sent you.', track_at:'Last update', st:{ai:'Being handled by the assistant',human:'With a person at IronPeak',factory:'With the factory team',done:'Resolved'},
  h_manual:'Manual & videos', l_manual:`${product.series.en} ${product.id} · common tasks with step-by-step guides.`, b_pdf:'Open full manual', manual_video:'Watch video', manual_video_short:'Video', manual_contact:'Still need help? Contact our support team',
  doc_heading:'Operating & maintenance manual', doc_meta:(id,sn)=>`${id} · ${sn||'serial not provided'} · prototype edition`, doc_contents:'Contents', doc_steps:'Steps', doc_note:'If the issue persists, ask the AI below or contact support.',
  doc_ai_title:'AI manual assistant', doc_ai_hint:'Answers from this manual', doc_ask_ph:'Ask about this manual…', doc_send:'Send question', doc_ai_hello:'Which section can I explain? Ask me directly.', doc_ai_none:'I could not find that section. Try asking about E07, belt lubrication, or assembly.', doc_ai_found:(issue,steps,video)=>`The manual section “${issue}” suggests doing this in order: ${steps.map((s,i)=>`${i+1}. ${s}`).join(' ')}${video?' The video card above demonstrates it.':''} If one step does not work, tell me which one.`,
  k_ticket:'Request', k_ticket_new:(id)=>`Request ${id} created for you`, l_ticket:()=>'AI and our support team work together to help you.',
  re_human:/technician|person|human|someone|agent/i, re_solved:/fixed|solved|works|thank|great|perfect/i, re_photo:/photo|picture|video|attach/i,
},
zh:{ cap_title:'扫码售后 H5 · v3', cap_p:'消费者扫描产品标签旁二维码后看到的页面。报修这一段改成以镜头为主：对准问题部位 → 拍照或录 8 秒视频（可以边拍边讲） → 先看 AI 看到了什么 → 一步一步处理。打字只是兜底。每一步都是真逻辑：标签校验、知识匹配、置信度、安全分流、寄件承诺，以及写入品牌方后台的工单。',
  cap_hint:'直接点手机走流程。在这里创建的工单会出现在后台原型（同一浏览器）的“工单处理”里。',
  flow:['选择语言','拍产品标签 → 型号与序列号','用镜头说明问题','保存 · 评价'],
  brand:'IronPeak 售后', prod:`${product.series.zh} ${product.id}`, prod_sub:'IronPeak Fitness · 本型号的售后支持',
  hero_k:'镜头报修 · 3 步完成', model_label:'设备已识别', h0:'把问题拍给我们看。', l0:'镜头对准出问题的部位，助手先看清楚，再一步一步带你处理。',
  s3a:'对准拍一下', s3a2:'照片或 8 秒视频', s3b:'AI 先看清楚', s3b2:'它看到了什么、有多确定', s3c:'一步一步来', s3c2:'随时停下，换人来接',
  o1:'开始报修', o1s:'拍照或录 8 秒视频 · 不用填表', o2:'说明书与视频', o3:'查询工单进度', note0:'用你的语言回复 · 承诺 24 小时内响应',
  h1:'选择语言', l1:`${product.series.zh} ${product.id} 的售后支持。我们用你选的语言回复；助手处理不了的，会有人工接手。`,
  h2:'拍一张产品标签的照片', l2:'就是这个二维码旁边的银色贴纸，一般在后立柱上。我们自动读出型号和序列号，不用你手打。',
  h2b:'是这台设备吗？', l2b:'标签已匹配到订单，相关负责人会立刻看到你的请求。',
  hint:'把整张标签放进取景框', hint_busy:'正在识别标签…', hint_ok:'识别完成', hint_fail:'没读到序列号，再拍一次或手动输入',
  ok:'✓ 标签已识别', k_model:'型号', k_sn:'序列号', k_via:'购买渠道', k_war:'保修', k_batch:'批次', k_from_qr:'来自二维码', war_active:'有效至', war_unknown:'无记录',
  b_snap:'拍照', b_demo_label:'用示例标签看一眼（演示）', b_type:'改为手动输入序列号', b_skip_label:'标签看不清？直接咨询', b_start:'开始', b_retake:'不对，重新拍', b_check:'校验序列号', sn_ph:'例如 SM9-24B-00931', sn_bad:'不像 IronPeak 的序列号（格式 AA0-00A-00000）', sn_wrong:'这个序列号属于另一个型号', sn_noorder:'格式正确但没有对应订单记录，保修情况会由人工核实', reset_label:'重置演示', reset_done:'已重置演示',
  cam_tip_default:'把出问题的部位放进框内', spot_pick:'选择常见问题部位', spot_q:'哪里出了问题？', spot_hint:'点一下最接近的部位', spot_close:'关闭',
  cam_demo:'演示画面', cam_denied:'相机权限被拒绝，先用演示画面。允许相机权限后再打开一次即可。', cam_unavailable:'这里没有可用的相机，先用演示画面。',
  spot_ok:'部位', shot_clip:'视频', shots_none:'还没拍，点下面的快门', shot_remove:'点一下可以删除',
  shot_photo:'拍照', shot_video:'录视频', shot_taken:'已拍下，可以看看取景对不对', clip_rec:'正在录…', clip_done:'视频已录，含机器原声',
  review_t:'照片已拍下', review_s:'检查取景，也可以补充说明', review_count:(n)=>`已拍 ${n} 张`, review_add:'新增照片',
  review_voice:'附上语音说明', review_text:'附上文字说明', review_note_title:'补充说明（可选）', review_remove:'移除', review_save:'保存',
  review_voice_start:'点一下开始录音', review_voice_rec:'正在录音，再点一下结束', review_voice_done:'语音说明已附上', review_voice_hint:'最长 15 秒',
  review_voice_tag:'客户附了一段语音说明', review_text_ph:'补充照片里看不出的情况…', review_note_saved:'说明已保存',
  how_t:'你想怎么说明问题？',
  how_hero:'不用填表，拍给我们看。', how_hero2:'同一个问题，两种方式都行。',
  how_v:'边拍边讲', how_v2:'最多 8 秒视频。拍的时候直接说：哪里不对、什么时候出现、你试过什么。', how_v3:'有异响、会动的问题最合适',
  how_p:'拍照并附上文字或语音', how_p2:'先拍一两张，再直接说话或打字补充细节。',
  photo_note_add:'补充文字或语音', photo_note_title:'补充文字或语音', photo_note_sub:'照片会保留，直接说话或打字补充细节。',
  how_v_tip:'点一下开始录，最长 8 秒', how_p_tip:'点一下拍一张',
  b_analyze:'让助手看一下', b_text:'改成用文字说明',
  an_title:'正在看你拍的画面…', an_lead:'先跑安全规则，再查这个型号的维修知识。', an_1:'定位到部件', an_2:'读取型号与序列号', an_3:'检索同型号的维修记录', an_4:'确认哪些动作是安全的', an_tag:['视觉','标签','知识库','规则'],
  see_t:'这是助手看到的内容', see_s:'不想分享的可以删掉或重拍', see_who:'助手 · 已就绪', see_foot:'取景框以外不会上传。随时可以重拍。', b_yes:'对，就是这个部位', b_no:'不太对，重拍',
  v_t:'助手的判断', v_conf:'置信度', v_who:'助手',
  v_low:'低风险 · 可以继续处理', v_low2:'我没看到发热、冒烟或裸露电线。如果情况有变化，先停下来告诉我们。',
  v_warn:'这一步需要人来确认', v_warn2:'这次我没有足够把握继续指导，会把照片和判断一起交给售后工程师。',
  v_stop:'请先停用这台设备', v_stop2:'这涉及安全件，换好之前先不要再使用。',
  v_go:(n)=>`开始 ${n} 步处理`, v_ask:'再补拍一个角度', v_human:'交给售后工程师',
  g_t:'一步一步来', g_done:'做好了，下一步', g_stuck:'这一步我做不了',
  g_sub:(i,n)=>`第 ${i} / ${n} 步`, g_note:'如果闻到焦味、看到火花或听到金属摩擦声，立刻停止。',
  cf_title:'IronPeak 售后助手', cf_sub:(i,n)=>i!=null?`第 ${i} 步，共 ${n} 步`:'正在看你的照片',
  cf_finding:(issue)=>`我看了下，比较像是「${issue}」。画面里没看到冒烟、焦糊或者裸露电线，可以先按下面几步试试看。`,
  cf_conf:'把握', cf_why:'我是怎么判断的', cf_basis:(n,kb)=>`${n} 张画面${kb?' · 知识库 '+kb:''}`,
  cf_risk_low:'低风险，可以试试', cf_risk_warn:'先让工程师看一眼', cf_risk_stop:'先停机，别再用了',
  cf_part:'可能用到的零件', cf_step:(i,n)=>`第 ${i} 步，共 ${n} 步`,
  cf_done:'好了，继续', cf_done_last:'做完了', cf_stuck:'卡住了', cf_stuck_again:'还是不行', cf_watch:'看演示',
  cf_step_lead_mid:'行，这一步先到这儿。接着往下走。', cf_step_lead_last:'最后一步。慢慢来，先别一次调太多。',
  cf_all_done:(n)=>`行，${n} 步都走完了。先让机器正常跑一会儿，看看刚才那个问题还在不在。`, cf_check_now:'看看现在的情况',
  cf_stuck_help:(step)=>`没事，这一步确实容易卡一下。先只看这一句：“${step}” 不用一次全做到位，哪里还不清楚就告诉我。`,
  cf_stuck_final:'那咱们就不在这儿反复试了。我把照片、判断和你已经做过的步骤一起交给售后工程师，你后面不用再重复说明。',
  cf_question:(step)=>`你是在问这一步吧：“${step}” 说说你现在看到什么，或者哪一句不清楚，我再讲具体一点。`,
  cf_danger:'先停一下，别再开机了。这个情况不适合继续自己操作，我先带你去看安全处理方式。',
  cf_ask:'我还想再看清楚一点，才能给你更稳妥的指导。可以换个角度再拍一张，或者直接交给售后工程师。', cf_human:'行，我这就把这次的记录交给售后工程师，他们会接着看。', cf_no_steps:'这个情况我还是不放心让你自己动手。我把照片和判断交给售后工程师，让他们接手更稳妥。',
  cf_voice_transcript:'模拟语音', cf_transcribing:'我把你说的整理一下…', cf_voice_ready:'和AI助手交谈', cf_voice_listening:'我在听，点一下结束', cf_voice_hint:'说“好了”，或者直接问我', cf_voice_hint_listening:'说完点一下，我会整理成文字',
  cf_new_message:'有新消息', cf_placeholder:'有哪里不明白，直接问我…', cf_send:'发送', cf_evidence:'拍摄画面', cf_expand:'展开画面', cf_collapse:'收起画面',
  o_t:'现在怎么样了？', o_s:'选最接近的一项。助手不会为了“自助解决率”继续硬猜。',
  o_fixed:'已经好了', o_fixed2:'关闭工单，24 小时后再确认一次', o_notfixed:'还是老样子', o_notfixed2:'带上你发的东西交给工程师', o_danger:'比刚才更糟了', o_danger2:'发热、冒烟、火花或声音明显变大',
  o_foot:'选“已经好了”会在 24 小时后自动再确认一次；问题复发会带着这次的记录重新打开。',
  sf_t:'请停止使用并保持断电', sf_s:'接下来的维修动作不再由助手给出。不要打开电机盖，也不要再通电试机。',
  sf_1:'拔掉电源，暂时不要再插上', sf_2:'如果冒烟或发烫，先远离设备', sf_3:'工程师会带着照片和你做过的步骤接手',
  sf_b:'交给售后工程师',
  h_t:'由我们的售后人员接手', h_s:'不用重复描述，下面这些都随工单过去', tech_role:'IronPeak 售后工程师', tech_on:'在线 · 通常 4 小时', tech_ok:'已核验',
  h_note:'给工程师的附言', h_note_optional:'选填', h_note_ph:'补充故障出现的时机、方便联系的时间等', h_note_hint:'这条附言会随工单一起发给工程师。',
  h_p:'他能看到你的照片、助手的判断，以及你已经试过的步骤。',
  h_go:'确认并继续',
  tx_t:'用文字说明', tx_s:'兜底方式，拍照和语音通常更快',
  h5:'工单 {id} 已受理', l5:'留下邮箱，我们会把进度和这段对话发给你，关掉页面也不会丢。',
  sum_prod:'产品', sum_issue:'问题', sum_route:'处理方式', sum_next:'后续',
  k_email:'邮箱', ph_email:'you@example.com', b_save:'保存并接收邮件更新', b_app:'下载 IronPeak App', b_track2:'查询已有工单进度', k_rate:'到目前为止体验如何？', email_bad:'请输入有效邮箱', saved:'已保存，更新将发送到 ', thanks:'感谢你的反馈',
  t_attach:'照片已添加', t_manual_pdf:'原型：这里打开完整 PDF 说明书', t_video:'正在播放视频（原型）',
  c_sys:(sr)=>`${product.series.zh} ${product.id} · ${sr?sr.sn:'未提供序列号'} · ${sr&&sr.dealer?sr.dealer:'IronPeak'}`, c_meta:'售后助手 · 刚刚',
  c_open:(id)=>`工单 ${id} 已建立并抄送售后团队。不用填表，直接说设备现在什么情况，或者拍张照片、录段短视频都行。`,
  q_self:'寄零件给我，我自己换', q_tech:'我想要技术人员上门', q_person:'转人工', q_video:'补一张照片或视频', q_solved:'解决了', q_notfixed:'还是不行', q_save:'保存这段对话',
  c_handover:(name,h)=>`已转给 IronPeak 售后 ${name}，通常 ${h} 小时内回复，回复后会邮件通知你。`,
  c_logged:(id)=>`你的请求已记录为工单 ${id}，照片和序列号都带上了，不需要再重复说明。`,
  c_ship:(part,dealer,id)=>`已安排。新的${part}将从 ${dealer} 寄到你订单上的地址，物流单号会邮件发你。工单号：${id}。关于这台设备还有别的问题吗？`,
  c_tech:(name,h)=>`好的，我已请 ${name} 通过你的经销商安排技术人员上门，${h} 小时内会邮件确认时间。`,
  c_solved:'太好了。我会关闭这个工单；回复邮件随时可以重新打开。',
  c_notfixed:(name,h)=>`抱歉。第一次的办法没解决，我就不再猜了——我们团队的 ${name} 会看你的照片，${h} 小时内回复。`,
  c_noted:'已收到，这条消息已附到你的工单里，接手的同事会看到，不需要重复说明。',
  steps_t:'步骤', watch:'观看', human_tag:'已有人工接手', ph_msg:'描述您遇到的问题', need_desc:'请用几句话描述一下问题',
  voice_label:'语音输入', voice_start:'正在录音，再点一次结束', voice_stop:'语音输入已结束（原型）', voice_prompt:'点按说话', voice_hint:'说说您遇到的问题', voice_listening:'正在听…', voice_hint_listening:'再点一次结束', switch_text:'切换键盘输入', switch_voice:'切换到语音输入',
  h_track:'查询工单进度', l_track:'输入邮件里的工单号，例如 T-2611-0312。', b_track:'查询', track_none:'没有这个编号的工单，请核对邮件。', track_at:'最近更新', st:{ai:'助手处理中',human:'品牌方人工处理中',factory:'工厂团队处理中',done:'已解决'},
  h_manual:'说明书与视频', l_manual:`${product.series.zh} ${product.id} · 常见操作的分步指引。`, b_pdf:'打开完整说明书', manual_video:'观看视频', manual_video_short:'视频', manual_contact:'还没解决？联系我们的客服',
  doc_heading:'操作与维护说明书', doc_meta:(id,sn)=>`${id} · ${sn||'未提供序列号'} · 原型演示版`, doc_contents:'目录', doc_steps:'操作步骤', doc_note:'如果按步骤处理后仍有异常，可以继续问下方 AI，或联系售后。',
  doc_ai_title:'AI 说明书助手', doc_ai_hint:'基于本说明书回答', doc_ask_ph:'问问 AI，这段说明书怎么看…', doc_send:'发送问题', doc_ai_hello:'说明书里哪一段没看懂？直接问我。', doc_ai_none:'我没定位到对应段落。你可以问“E07 怎么排查”“跑带怎么润滑”或“安装步骤”。', doc_ai_found:(issue,steps,video)=>`说明书里的「${issue}」这一段建议按下面顺序处理：${steps.map((s,i)=>`${i+1}. ${s}`).join(' ')}${video?' 上方的视频卡有更直观的演示。':''}如果哪一步卡住了，直接告诉我。`,
  k_ticket:'工单号', k_ticket_new:(id)=>`工单 ${id} 已为您建立`, l_ticket:()=>'人工智能与人类客服将密切协作，同时为您服务。',
  re_human:/人工|技术人员|上门|真人|客服/, re_solved:/解决|好了|谢谢|可以了|搞定/, re_photo:/照片|图片|视频|拍/,
}};
const LANGS=[['中文','ZH','zh','zh'],['English','EN','en','en'],['Deutsch','DE','en','de'],['Español','ES','en','es'],['Français','FR','en','fr'],['Italiano','IT','en','it'],['Svenska','SV','en','sv']].filter(l=>l[3]==='zh'||l[3]==='en'||settings.h5Langs.includes(l[3]));
const FLAGS={zh:'🇨🇳',en:'🇬🇧',de:'🇩🇪',es:'🇪🇸',fr:'🇫🇷',it:'🇮🇹',sv:'🇸🇪'};

/* ---------- 部位（知识条目 → 镜头标的） ---------- */
// 正式版这里是视频理解/视觉检索；原型里"用户点哪个部位"就是视觉识别的替代，不能假装 AI 从照片里认出了零件。
const SPOT_META={
  cable:{img:'sm_top',   aim:{zh:'把顶部滑轮和钢缆放进框内',en:'Frame the top pulley and the cable'}, say:{zh:'顶部滑轮这里的钢缆起毛了，好像有断丝',en:'The cable at the top pulley looks frayed, some strands are broken'}},
  catch:{img:'sm_catch', aim:{zh:'对着锁扣，把钩子和配重杆一起拍进去',en:'Aim at the catch, include the hook and the bar'}, say:{zh:'这一侧的安全锁扣卡不住，杆子放上去会滑',en:'The safety catch on this side does not lock, the bar slips'}},
  bolts:{img:'sm_bolts', aim:{zh:'对着底座，把缺螺栓的位置和配件包一起拍进去',en:'Aim at the base, include the empty bolt hole and the hardware bag'}, say:{zh:'安装到第 7 步发现配件包 C 袋少了 M10 螺栓，缺 4 颗',en:'At step 7 the bag C is missing 4 M10 bolts'}},
  e07:{img:'tr_console', aim:{zh:'把控制台屏幕和按键一起拍清楚',en:'Keep the console screen and buttons in frame'}, say:{zh:'跑步机跑十分钟就停，屏幕上报 E07',en:'The treadmill stops after ten minutes and shows E07'}},
  belt:{img:'tr_belt',  aim:{zh:'从侧面拍后端滚筒和跑带边缘',en:'Shoot the rear roller and belt edge from the side'}, say:{zh:'跑带往左边偏，边缘有摩擦的声音，想润滑一下',en:'The belt drifts to the left and rubs; I want to lubricate it'}},
  motor:{img:'rw_motor',aim:{zh:'拍一下阻力单元和电机支架',en:'Shoot the resistance unit and motor bracket'}, say:{zh:'拉力的时候阻力单元有嗡鸣和咔哒声',en:'The resistance unit hums and rattles when I pull'}},
  units:{img:'rw_console', aim:{zh:'把显示屏拍清楚',en:'Keep the display in frame'}, say:{zh:'显示屏上的距离单位变成了英里，想改回公里',en:'The display shows miles instead of kilometres'}},
  assembly:{img:'sm_top', aim:{zh:'拍一下手边还没装上的零件',en:'Shoot the parts you have not fitted yet'}, say:{zh:'安装不会装了，不知道这一步该装哪个件',en:'I cannot work out the assembly, which part goes at this step'}},
};
const spotImg=id=>IMG[(SPOT_META[id]||{}).img]||IMG.hero||'';
function spotList(){ return Engine.KB.filter(k=>k.product===product.id||k.product==='*'); }
function spotLabel(k,sl){ return (SPOT_META[k.id]&&SPOT_META[k.id].short&&SPOT_META[k.id].short[sl])||k.cat[sl]; }

/* ---------- 状态 ---------- */
let ui='zh', badge='ZH', custLang='zh', v=0, hist=[], labelDone=false, serial=null;
let ticket=null, stage='how', spotId=null, spotPicked=false, shots=[], clipOn=false, clipTimer=null, howSel='video', camMode='video', photoNoteMode=false, asks=0, lastAction=null;
let assess=null, guideIdx=0, route='engineer', outcome='ai', voiceOn=false, inputMode='voice', shotUrl=null, ticketSeq=0;   // 每张工单一个序号：换工单后，上一张工单里排队中的“正在输入”回调作废
let reviewPhotoIndex=0, reviewNoteMode=null, reviewNoteText='', reviewVoiceOn=false, reviewVoiceAttached=false, reviewVoiceTimer=null, cameraReturn='how';
let consultVoiceOn=false, consultInputMode='voice', consultVoiceTimer=null, consultBusy=false, consultStuckIdx=-1, consultRunSeq=0, consultTimers=[], consultScrollGuardUntil=0;
const t=k=>I18N[ui][k];
const T0=(k,...a)=>{ const x=I18N[ui][k]; return typeof x==='function'?x(...a):x; };
const STEPS=4;
const stepOf=n=>(n==='m'||n==='t'||n==='d')?-1:(n<=1?0:n===2?1:n===3?2:3);
const sl=()=>ui==='zh'?'zh':'en';

/* ---------- 语言 / 导航 ---------- */
function setLang(l,b,cl){ ui=l; badge=b||(l==='zh'?'ZH':'EN'); custLang=cl||l; document.documentElement.lang=l==='zh'?'zh-CN':'en';
  document.querySelectorAll('[data-i]').forEach(el=>{ const val=t(el.dataset.i); if(typeof val==='string') el.textContent=val; });
  $('#langBadge').textContent=badge; $('#tg-zh').classList.toggle('on',l==='zh'); $('#tg-en').classList.toggle('on',l==='en');
  $('#heroModel').textContent=`${product.series[sl()]} ${product.id}`; document.querySelector('.hero-model').setAttribute('aria-label',`${t('model_label')}: ${product.series[sl()]} ${product.id}`);
  $('#txTitle').textContent=t(photoNoteMode?'photo_note_title':'tx_t'); $('#txSub').textContent=t(photoNoteMode?'photo_note_sub':'tx_s');
  document.querySelectorAll('[data-img]').forEach(el=>{ const src=IMG[el.dataset.img]; if(src) el.src=src; });
  $('#flow').innerHTML=t('flow').map((s,i)=>`<li class="${i===stepOf(v)?'on':''}">${s}</li>`).join(''); $('#stepnote').textContent=stepOf(v)>=0?`${stepOf(v)+1} / ${STEPS} · ${t('flow')[stepOf(v)]}`:'';
  $('#langs').innerHTML=LANGS.map(x=>`<button class="entry ${x[1]===badge?'on':''}" onclick="pickLang('${x[2]}','${x[1]}','${x[3]}')"><span class="ic" style="font-size:17px">${FLAGS[x[3]]||'·'}</span><span><b>${x[0]}</b><span>${x[1]}</span></span><span class="muted" style="justify-self:end">${x[1]===badge?'✓':'›'}</span></button>`).join('');
  $('#ta').placeholder=t('ph_msg'); $('#consultTa').placeholder=t('cf_placeholder'); $('#email').placeholder=t('ph_email'); $('#snInput').placeholder=t('sn_ph'); $('#trackInput').placeholder='T-2611-0312'; $('#handoffNote').placeholder=t('h_note_ph'); $('#handoffNote').setAttribute('aria-label',t('h_note'));
  updateVoiceUI(); updateInputModeUI(); updateConsultVoiceUI(); updateConsultInputModeUI();
  $('#resetDemo').setAttribute('aria-label',t('reset_label')); $('#resetDemo').title=t('reset_label');
  $('#manualAsk').placeholder=t('doc_ask_ph'); $('#manualAskBtn').setAttribute('aria-label',t('doc_send'));
  $('#t2').textContent=labelDone?t('h2b'):t('h2'); $('#l2').textContent=labelDone?t('l2b'):t('l2'); $('#hint').textContent=labelDone?t('hint_ok'):t('hint');
  $('#appBtn').style.display=settings.h5App?'flex':'none'; $('#emailBlock').style.display=settings.h5Email?'block':'none';
  if(ticket) $('#h5title').textContent=t('h5').replace('{id}',ticket.id);
  renderLabelResult(); renderSpots(); renderShots(); renderManual(); if(stage==='photo-review') renderPhotoReview(); else renderReviewVoice(); if(v==='d') renderManualDoc(true);
  if(v===4) renderSummary();
  if(assess&&stage==='consult') renderConsultShell(); }
function toast(s){ const e=$('#toast'); e.textContent=s; e.classList.add('show'); clearTimeout(e._t); e._t=setTimeout(()=>e.classList.remove('show'),2200); }
function go(n,push=true){ if(push) hist.push(v); v=n; $('#screen').dataset.view=String(n); document.querySelectorAll('.view').forEach(s=>s.classList.toggle('show',s.dataset.v===String(n))); const s=stepOf(n); $('#prog').style.width=(s>=0?(s+1)/STEPS*100:'')+'%'; $('#back').classList.toggle('show',n!==0&&n!==3&&n!==4); document.querySelectorAll('#flow li').forEach((li,i)=>li.classList.toggle('on',i===s)); $('#stepnote').textContent=s>=0?`${s+1} / ${STEPS} · ${t('flow')[s]}`:''; if(n===3&&stage==='text') renderChat(); if(n===4&&ticket){ $('#h5title').textContent=t('h5').replace('{id}',ticket.id); renderSummary(); } const vw=document.querySelector('.view.show'); if(vw) vw.scrollTop=0; }
function goBack(){ if(hist.length) go(hist.pop(),false); }
function pickLang(l,b,cl){ setLang(l,b,cl); go(1); }

/* ---------- 第 3 步的分镜 ---------- */
function setStage(name){ if(stage==='consult'&&name!=='consult'){ stopConsultVoice(true); clearConsultTimers(); consultBusy=false; } stage=name; document.body.classList.toggle('consult-live',name==='consult'); document.querySelectorAll('.stg').forEach(s=>s.classList.toggle('on',s.dataset.s===name));
  const noteBtn=$('#photoNoteBtn'); if(noteBtn) noteBtn.style.display=(name==='confirm'&&photoNoteMode)?'flex':'none';
  $('#txTitle').textContent=t(photoNoteMode?'photo_note_title':'tx_t'); $('#txSub').textContent=t(photoNoteMode?'photo_note_sub':'tx_s');
  const tw=$('#toast'); if(tw) tw.style.bottom=(name==='aim'?'150px':'92px');   // 相机界面里提示条抬高，别挡住快门
  const vw=document.querySelector('.stg.on .stg-body'); if(vw) vw.scrollTop=0; }

/* ---------- 标签识别 ---------- */
function onPhoto(input){ const f=input.files&&input.files[0]; if(!f) return; if(shotUrl) URL.revokeObjectURL(shotUrl); shotUrl=URL.createObjectURL(f); const fd=$('#finder'); const im=fd.querySelector('img'); if(im) im.src=shotUrl; fd.classList.add('busy'); $('#hint').textContent=t('hint_busy');
  const reader=new FileReader(); reader.onload=()=>{ const bytes=new Uint8Array(reader.result.slice(0,65536)); let h=7; for(let i=0;i<bytes.length;i+=97) h=(h*31+bytes[i])>>>0; const num=String(100+h%1100).padStart(5,'0'); const po=productOrders.length?productOrders[h%productOrders.length]:null; const batch=po?po.batches[0]:'24A'; const sn=`${product.snPrefix}-${batch}-${num}`; setTimeout(()=>{ fd.classList.remove('busy'); applySerial(sn,true); },1400); }; reader.readAsArrayBuffer(f.slice(0,65536)); input.value=''; }
function demoLabel(){ const po=productOrders[0]; const sn=`${product.snPrefix}-${po?po.batches[0]:'24A'}-00955`; if(applySerial(sn,false)) toast(t('hint_ok')); }
function applySerial(sn,fromPhoto){ let p=Engine.parseSerial(sn); if(p&&p.valid&&p.raw) p=Object.assign({},p,{product:product.id});   // 纯数字原始号：型号取扫码型号，批次/订单读不出 → 由二维码 ?b=/?f= 预填
  if(!p||!p.valid){ $('#hint').textContent=t('hint_fail'); $('#snErr').textContent=fromPhoto?'':t('sn_bad'); return false; } if(p.product!==product.id){ $('#snErr').textContent=t('sn_wrong'); $('#hint').textContent=t('hint_fail'); return false; } serial=p; labelDone=true; $('#snErr').textContent=p.order?'':t('sn_noorder'); $('#hint').textContent=t('hint_ok'); $('#t2').textContent=t('h2b'); $('#l2').textContent=t('l2b'); $('#labelActions').style.display='none'; $('#snEntry').style.display='none'; $('#labelConfirm').style.display='block'; renderLabelResult(); if(ticket) syncInbox(); return true; }
/* 批次：序列号（标签）为唯一权威；序列号读不出批次（解析失败 / 纯数字原始号）时才用二维码 ?b= / ?f= 预填 */
function batchCheck(s,qb){ if(!s||!s.valid||!s.batch||!qb) return {mismatch:false};   // 原始号没有标签批次，无从比较
  if(typeof Engine.checkBatchConsistency==='function') return Engine.checkBatchConsistency(s,qb)||{mismatch:false};
  return {mismatch:s.batch!==qb}; }   // 防御：引擎尚未提供时按 §4.4 同规则内联
function batchInfo(){ const s=serial&&serial.valid?serial:null;
  if(s&&s.batch) return { batch:s.batch, supplier:s.supplier||s.factory||null, fromQr:false, mismatch:!!batchCheck(s,qrBatch).mismatch };
  return { batch:qrBatch, supplier:qrSupplier, fromQr:!!qrBatch, mismatch:false }; }
function batchCell(){ const b=batchInfo(); if(!b.batch) return '—'; return esc(b.batch)+(b.fromQr?` <span class="muted small">${t('k_from_qr')}</span>`:''); }
function renderLabelResult(){ const box=$('#labelResult'); if(!serial){ box.style.display='none'; return; } box.style.display='block'; box.innerHTML=`<div class="ok">${t('ok')}</div><div class="kv" style="margin-top:10px"><span>${t('k_model')}</span><span><b>${t('prod')}</b></span><span>${t('k_sn')}</span><span>${serial.sn}</span><span>${t('k_batch')}</span><span>${batchCell()}</span><span>${t('k_via')}</span><span>${serial.dealer?serial.dealer+' ('+serial.city+')':'—'}</span><span>${t('k_war')}</span><span>${serial.warrantyUntil?t('war_active')+' '+serial.warrantyUntil:t('war_unknown')}</span></div>`; }
function showSnEntry(){ $('#snEntry').style.display='block'; $('#labelActions').style.display='none'; $('#snInput').focus(); }
function checkSn(){ const v=$('#snInput').value.trim().toUpperCase(); if(applySerial(v,false)) toast(t('hint_ok')); }
function resetLabel(){ labelDone=false; serial=null; const fd=$('#finder'); const im=fd.querySelector('img'); if(im&&IMG.label) im.src=IMG.label; fd.classList.remove('busy'); $('#labelResult').style.display='none'; $('#labelActions').style.display='block'; $('#labelConfirm').style.display='none'; $('#snEntry').style.display='none'; $('#snErr').textContent=''; $('#hint').textContent=t('hint'); $('#t2').textContent=t('h2'); $('#l2').textContent=t('l2'); }
function skipLabel(){ startReport(); }

/* ---------- 工单 ---------- */
function newTicketId(){ const d=new Date(); return `T-${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}-${9000+Math.floor(Math.random()*999)}`; }
function syncInbox(){ if(!ticket) return; try{ const box=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'); const i=box.findIndex(x=>x.id===ticket.id);
  const bi=batchInfo(); ticket.batch=bi.batch; ticket.batchMismatch=bi.mismatch; ticket.supplier=bi.supplier;
  const rec={ id:ticket.id, createdAt:ticket.createdAt, qr:ticket.qr||null, batch:bi.batch||null, batchMismatch:bi.mismatch, supplier:bi.supplier||null, lang:custLang, product:product.id, sn:serial?serial.sn:null, issue:ticket.issue, photos:shots.filter(s=>s.kind==='photo').length, videos:shots.filter(s=>s.kind==='clip').length, evidence:shots.map(s=>({kind:s.kind,spot:s.spot})), spot:ticket.spot||null, email:ticket.email||null, name:ticket.name||null, status:ticket.status, rating:ticket.rating||null, route:ticket.route||null, kbId:ticket.kbId, handoffNote:ticket.handoffNote||null, ship:ticket.ship||null, pendingShip:ticket.pendingShip||null, stepsDone:ticket.stepsDone||0, transcript:ticket.transcript.map(m=>({who:m.who,text:m.text,tr:m.tr||'',t:m.t})) };
  if(i>=0) box[i]=rec; else box.push(rec); localStorage.setItem(INBOX_KEY,JSON.stringify(box.slice(-50))); }catch(e){} }
function ensureTicket(){ if(ticket) return ticket;
  asks=0; lastAction=null; spotPicked=false; reviewPhotoIndex=0; reviewNoteMode=null; reviewNoteText=''; reviewVoiceOn=false; reviewVoiceAttached=false; clearTimeout(reviewVoiceTimer); cameraReturn='how';
  ticket={ id:newTicketId(), createdAt:Date.now(), qr:qrId, status:'ai', transcript:[], issue:'', kbId:null, spot:null, stepsDone:0, _seq:++ticketSeq };
  record('ai',T0('c_open',ticket.id),'开场：工单已建立并抄送人工，等客户描述问题'); syncInbox(); return ticket; }

/* 开场：建单 → 第一步先说明可以怎么描述问题，选好后第二步进入全屏相机 */
function startReport(){ photoNoteMode=false; ensureTicket(); go(3); setStage('how'); renderSpots(); renderShots(); }
function startChat(){ startReport(); }
function enterCamera(mode,noteMode=false,returnTo='how'){ howSel=mode||'photo'; photoNoteMode=!!noteMode; cameraReturn=returnTo; camMode=howSel; setStage('aim'); renderCam(); startLiveCam(); toast(camMode==='video'?t('how_v_tip'):t('how_p_tip')); }
function startPhotoNote(){ enterCamera('photo',true); }
function setCamMode(m){ if(camMode===m) return; if(clipOn) return; camMode=m; renderCam(); startLiveCam(); }

/* ---------- 镜头 ---------- */
function renderSpots(){ const s=sl(); const list=spotList();
  if(!spotId&&list.length){ const safe=list.find(k=>!k.safety)||list[0]; spotId=safe.id; }
  const cur=list.find(k=>k.id===spotId); const meta=SPOT_META[spotId]||{};
  const pick=$('#camSpot'); const currentLabel=cur?spotLabel(cur,s):'';
  pick.textContent=(spotPicked&&currentLabel?currentLabel:t('spot_pick'))+' ▾';
  pick.setAttribute('aria-label',currentLabel?`${t('spot_pick')}: ${currentLabel}`:t('spot_pick'));
  $('#camTip').textContent=(meta.aim&&meta.aim[s])||t('cam_tip_default');
  $('#camBrand').textContent=product.id+' · '+(camMode==='video'?((ui==='zh'?'最长 8 秒，可以边拍边讲解':'up to 8 s, narrate while you film')):(ui==='zh'?'可以连拍 2–3 张':'take 2–3 photos'));
  if(cur&&ticket&&!ticket.issue){ ticket.issue=cur.cat[sl()]||cur.cat.zh; syncInbox(); }
  renderShots(); }
function renderCam(){ renderSpots(); const ph=camMode==='photo';
  $('#modePhoto').classList.toggle('on',ph); $('#modeVideo').classList.toggle('on',!ph);
  $('#shutter').classList.remove('rec');
  $('#shutter').setAttribute('aria-label',ph?t('shot_photo'):t('shot_video')); }

/* 真实相机：getUserMedia 成功就用实时画面，失败（无权限 / 演示环境）退回部位示意图并标注"演示画面" */
let camStream=null, camFacing='environment', camGen=0, clipRec=null, clipChunks=[];
async function startLiveCam(){ if(clipOn) return; const gen=++camGen; stopLiveCam(); await openStream(gen); }
async function openStream(gen){
  const wrap=$('#camWrap'), demo=$('#camDemo');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){ showDemoCam(); return; }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({ video:{ facingMode:camFacing, width:{ideal:1280}, height:{ideal:1280} }, audio:camMode==='video' });
    if(gen!==camGen){ stream.getTracks().forEach(tk=>tk.stop()); return; }   // 用户已离开 / 切换了模式
    camStream=stream; const video=$('#camVideo'); video.srcObject=stream;
    try{ await video.play(); }catch(e){}
    wrap.classList.add('live'); demo.style.display='none';
  }catch(e){ if(gen===camGen){ showDemoCam(); toast(t(e&&(e.name==='NotAllowedError'||e.name==='SecurityError')?'cam_denied':'cam_unavailable')); } }
}
function showDemoCam(){ const wrap=$('#camWrap'); stopLiveCam(); wrap.classList.remove('live'); $('#camImg').src=spotImg(spotId)||IMG.hero||''; $('#camDemo').style.display=''; }
function stopLiveCam(){ if(camStream){ camStream.getTracks().forEach(tk=>tk.stop()); camStream=null; } const video=$('#camVideo'); if(video) video.srcObject=null; }
function flipCam(){ if(clipOn) return; camFacing=camFacing==='environment'?'user':'environment'; camGen++; stopLiveCam(); openStream(camGen); }
function exitCamera(){ camGen++; if(clipOn) clipStop(true); stopLiveCam(); if(cameraReturn==='photo-review'&&shots.some(s=>s.kind==='photo')){ renderPhotoReview(); setStage('photo-review'); } else setStage('how'); }
function pickSpot(id){ spotId=id; spotPicked=true; if(ticket){ const k=spotList().find(x=>x.id===id); if(k){ ticket.spot=id; if(!ticket.transcript.some(m=>m.who==='cust')) ticket.issue=k.cat[sl()]||k.cat.zh; syncInbox(); } }
  renderSpots(); if(!camStream) $('#camImg').src=spotImg(spotId)||IMG.hero||''; closeSpotPicker(); }
function openSpotPicker(){ if(clipOn) return; const s=sl(); $('#spotOpts').innerHTML=spotList().map(k=>`<button class="spot ${k.id===spotId?'on':''}" onclick="pickSpot('${k.id}')"><img src="${spotImg(k.id)}" alt=""><b>${esc(spotLabel(k,s))}</b><span class="ok">${k.id===spotId?'✓':''}</span></button>`).join('');
  document.querySelectorAll('#spotOpts .spot').forEach(el=>{ el.style.border=(el.classList.contains('on')?'1.5px solid var(--brand)':'1px solid var(--line)'); });
  $('#spotPicker').classList.add('on'); $('#camSpot').setAttribute('aria-expanded','true'); }
function closeSpotPicker(){ $('#spotPicker').classList.remove('on'); $('#camSpot').setAttribute('aria-expanded','false'); }
function renderShots(){ const n=shots.length;
  const mini=$('#shotsMini'); if(mini) mini.innerHTML=shots.map(s=>`<span class="th"><img src="${shotThumb(s)}" alt=""><b>${s.kind==='clip'?'8s':t('shot_photo')}</b></span>`).join('');
  const go=$('#toAnalyze'); if(go) go.disabled=!n; }
const shotThumb=s=>(s.kind==='photo'&&s.url)?s.url:spotImg(s.spot);
function shoot(){ if(clipOn){ clipStop(); return; } if(camMode==='photo'){ snap(); return; } recordClip(); }
function simPhoto(){ if(!ticket) ensureTicket(); shots.push({kind:'photo',spot:spotId,t:Date.now()}); renderShots(); syncInbox(); const last=ticket.transcript.filter(x=>x.who==='cust'&&!/^\[/.test(x.text)).slice(-2).map(x=>x.text).join(' '); typing(()=>respond(last||analyzeText()),700); }   // 演示/测试用：不拉相机，直接算一张已拍的部位照片
function snap(){ if(!ticket) ensureTicket();
  let url=null; const video=$('#camVideo');
  if(camStream&&video&&video.videoWidth){ const cv=$('#camCanvas'); cv.width=video.videoWidth; cv.height=video.videoHeight; cv.getContext('2d').drawImage(video,0,0); try{ url=cv.toDataURL('image/jpeg',.86); }catch(e){ url=null; } }
  shots.push({kind:'photo',spot:spotId,t:Date.now(),url,kb:Math.round((url?url.length:0)/1400)});
  reviewPhotoIndex=shots.filter(s=>s.kind==='photo').length-1;
  renderShots(); syncInbox(); toast(t('shot_taken'));
  camGen++; stopLiveCam(); renderPhotoReview(); setStage('photo-review'); }

/* ---------- 拍照后的复核页 ---------- */
const photoShots=()=>shots.filter(s=>s.kind==='photo');
function renderPhotoReview(){ const list=photoShots(); const cur=list[Math.max(0,Math.min(reviewPhotoIndex,list.length-1))]; if(!cur) return;
  $('#reviewPhoto').src=shotThumb(cur); $('#reviewCount').textContent=T0('review_count',list.length);
  $('#reviewStrip').innerHTML=list.map((s,i)=>`<button class="review-thumb ${i===reviewPhotoIndex?'on':''}" type="button" onclick="selectReviewPhoto(${i})" aria-label="${ui==='zh'?'照片':'Photo'} ${i+1}"><img src="${shotThumb(s)}" alt=""></button>`).join('')
    +`<button class="review-thumb add" type="button" onclick="addReviewPhoto()" aria-label="${esc(t('review_add'))}">＋</button>`;
  const panel=$('#reviewNotePanel'); panel.classList.toggle('on',!!reviewNoteMode); panel.dataset.mode=reviewNoteMode||'voice';
  document.querySelectorAll('.review-note-action').forEach(b=>b.classList.toggle('on',b.dataset.mode===reviewNoteMode));
  renderReviewVoice(); }
function selectReviewPhoto(i){ reviewPhotoIndex=i; renderPhotoReview(); }
function backToCamera(){ enterCamera('photo',false,'photo-review'); }
function addReviewPhoto(){ enterCamera('photo',false,'photo-review'); }
function openReviewNote(mode){ reviewNoteMode=mode; if(mode==='text') $('#reviewNoteText').value=reviewNoteText; renderPhotoReview(); if(mode==='text') setTimeout(()=>$('#reviewNoteText').focus(),0); }
function renderReviewVoice(){ const btn=$('#reviewVoiceBtn'), title=$('#reviewVoiceTitle'); if(!btn||!title) return;
  btn.classList.toggle('recording',reviewVoiceOn); btn.classList.toggle('done',reviewVoiceAttached&&!reviewVoiceOn);
  btn.setAttribute('aria-pressed',String(reviewVoiceOn)); title.textContent=t(reviewVoiceOn?'review_voice_rec':reviewVoiceAttached?'review_voice_done':'review_voice_start'); }
function toggleReviewVoice(){ if(reviewVoiceOn){ clearTimeout(reviewVoiceTimer); reviewVoiceTimer=null; reviewVoiceOn=false; reviewVoiceAttached=true; }
  else{ clearTimeout(reviewVoiceTimer); reviewVoiceOn=true; reviewVoiceAttached=false; reviewVoiceTimer=setTimeout(()=>{ if(reviewVoiceOn) toggleReviewVoice(); },8000); }
  renderReviewVoice(); }
function saveReviewNote(){ if(reviewVoiceOn) toggleReviewVoice(); reviewNoteText=$('#reviewNoteText').value.trim(); reviewNoteMode=null; renderPhotoReview(); if(reviewNoteText||reviewVoiceAttached) toast(t('review_note_saved')); }
function clearReviewNote(){ clearTimeout(reviewVoiceTimer); reviewVoiceTimer=null; reviewVoiceOn=false; reviewVoiceAttached=false; reviewNoteText=''; reviewNoteMode=null; $('#reviewNoteText').value=''; renderPhotoReview(); }
function analyzePhotoReview(){ if(!photoShots().length) return; if(reviewNoteMode==='text') reviewNoteText=$('#reviewNoteText').value.trim(); if(reviewVoiceOn) toggleReviewVoice();
  if(reviewNoteText) record('cust',reviewNoteText,'客户补充文字说明');
  if(reviewVoiceAttached) record('cust',t('review_voice_tag'),'客户补充语音说明');
  syncInbox(); startAnalyze(); }
// 录 8 秒（有摄像头和 MediaRecorder 时录真实画面 + 声音，可以边拍边讲解；环境不支持时只走计时）
function recordClip(){ if(clipOn) return;
  clipOn=true; const btn=$('#shutter'), ring=$('#recRing'); btn.classList.add('rec'); ring.classList.add('on'); let left=8; $('#recTime').textContent='00:08';
  clipChunks=[]; clipRec=null;
  if(camStream&&window.MediaRecorder){ try{ const mime=(MediaRecorder.isTypeSupported&&(MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')?'video/webm;codecs=vp8,opus':MediaRecorder.isTypeSupported('video/webm')?'video/webm':'video/mp4'))||''; clipRec=new MediaRecorder(camStream,mime?{mimeType:mime}:undefined); clipRec.ondataavailable=e=>{ if(e.data&&e.data.size) clipChunks.push(e.data); }; clipRec.start(); }catch(e){ clipRec=null; } }
  clipTimer=setInterval(()=>{ left--; $('#recTime').textContent='00:'+String(Math.max(0,left)).padStart(2,'0'); if(left<=0) clipStop(); },1000); }
function clipStop(silent){ if(!clipOn) return; clipOn=false; clearInterval(clipTimer); clipTimer=null;
  const btn=$('#shutter'), ring=$('#recRing'); btn.classList.remove('rec'); ring.classList.remove('on');
  if(silent){ if(clipRec&&clipRec.state!=='inactive'){ try{ clipRec.ondataavailable=null; clipRec.stop(); }catch(e){} } clipRec=null; clipChunks=[]; return; }
  const finish=url=>{ clipRec=null; clipChunks=[]; if(!ticket) ensureTicket(); shots.push({kind:'clip',spot:spotId,t:Date.now(),url}); renderShots(); syncInbox(); toast(t('clip_done')); };
  if(clipRec&&clipRec.state!=='inactive'){ clipRec.onstop=()=>{ let url=null; try{ url=URL.createObjectURL(new Blob(clipChunks,{type:clipRec.mimeType||'video/webm'})); }catch(e){} finish(url); }; try{ clipRec.stop(); }catch(e){ finish(null); } return; }
  finish(null); }

/* ---------- 分析（真引擎）+ 核对 + 判断 ---------- */
function analyzeText(){ const k=spotList().find(x=>x.id===spotId); const meta=SPOT_META[spotId]||{}; const said=(meta.say&&meta.say[custLang])||(meta.say&&meta.say.zh)||''; const extra=ticket?ticket.transcript.filter(m=>m.who==='cust'&&!/^\[/.test(m.text)).map(m=>m.text).join(' '):''; return said+' '+extra; }
function routeName(){ return (typeof Policy!=='undefined'&&Policy.get('routing.l1.name'))||'张瑞'; }
function routeHours(){ return (typeof Policy!=='undefined'&&Policy.get('routing.l1.hours'))||4; }
function ctx(){ return { lang:custLang, name:'', dealer:serial&&serial.dealer||'our warehouse', city:serial&&serial.city||'Europe', hasSerial:!!serial, hasPhotos:shots.length>0, hours:routeHours() }; }
function assessNow(text){
  const beltVideoIntent=/(跑带|跑步带)/.test(text||'')&&/偏|润滑|上油/.test(text||'');
  const a=Engine.assess({ text, product:beltVideoIntent?'TR-650':product.id, serial, photos:shots.length, email:ticket&&ticket.email||'', settings });
  if(beltVideoIntent){ const entry=Engine.KB.find(k=>k.id==='belt'); a.match={entry,hits:99,runnerUp:null,ambiguous:false}; a.confidence=Math.max(a.confidence,95); a.reasons=[]; a.route='ai'; a.action='reply'; a.canShip=false; }
  return a;
}
function startAnalyze(){ if(!shots.length){ toast(t('shots_none')); return; } if(clipOn) return; camGen++; stopLiveCam(); ensureTicket(); const a=assessNow(analyzeText()); assess=a; ticket.kbId=a.match?a.match.entry.id:null; ticket.spot=spotId; syncInbox();
  setStage('analyzing'); $('#anImg').src=shotThumb(shots[0]);
  const tags=t('an_tag'); $('#anList').innerHTML=[1,2,3,4].map(i=>`<li id="an${i}"><span>${esc(t('an_'+i))}</span><small>${tags[i-1]}</small></li>`).join(''); $('#anBar').style.width='6%';
  [1,2,3,4].forEach((n,i)=>{ setTimeout(()=>{ const el=$('#an'+n); if(el) el.classList.add('done'); $('#anBar').style.width=(24*n+4)+'%'; },320+i*340); });
  setTimeout(()=>{ renderConfirm(); setStage('confirm'); },1750); }
function renderConfirm(){ const cur=spotList().find(k=>k.id===spotId); const meta=SPOT_META[spotId]||{};
  $('#seeImg').src=shotThumb(shots[0]);
  $('#seeLabel').textContent=cur?spotLabel(cur,sl()):'';
  const hs=$('#seeHs'); hs.style.left='32%'; hs.style.top='26%';
  const np=shots.filter(s=>s.kind==='photo').length, nc=shots.length-np;
  const b=[`<span class="bdg">${esc(t('spot_ok'))}: ${esc(cur?cur.cat[sl()]:'')}</span>`];
  if(np) b.push(`<span class="bdg">${np} × ${t('shot_photo')}</span>`); if(nc) b.push(`<span class="bdg">${nc} × ${t('shot_clip')}</span>`);
  if(serial) b.push(`<span class="bdg">SN ${esc(serial.sn)}</span>`);
  $('#seeBadges').innerHTML=b.join('');
  $('#seeText').textContent=analyzeText().trim(); }
function confirmYes(){ startConsult(); }
function riskLevel(){ if(!assess) return 'warn'; if(assess.reasons.some(r=>r.k==='safety')||(assess.match&&assess.match.entry.safety)) return 'stop'; if(assess.route==='human') return 'warn'; return 'ok'; }

/* ---------- 判断 + 分步指导：一段连续会话 ---------- */
function guideSteps(){ const kb=assess&&assess.match?assess.match.entry:null; return kb&&kb.steps?(kb.steps[sl()]||kb.steps.en):[]; }
function clearConsultTimers(){ consultTimers.forEach(id=>clearTimeout(id)); consultTimers=[]; }
function scheduleConsult(fn,ms){ const run=consultRunSeq; const id=setTimeout(()=>{ consultTimers=consultTimers.filter(x=>x!==id); if(run===consultRunSeq&&stage==='consult') fn(); },ms); consultTimers.push(id); return id; }
function consultIsNearBottom(){ const sc=$('#consultScroll'); return !sc||sc.scrollHeight-sc.scrollTop-sc.clientHeight<88; }
function consultSetNewMsg(show){ const n=$('#consultNewMsg'); if(!n) return; n.classList.toggle('show',!!show); n.setAttribute('aria-hidden',String(!show)); n.tabIndex=show?0:-1; }
function consultScrollBottom(){ const sc=$('#consultScroll'); if(sc){ consultScrollGuardUntil=Date.now()+180; sc.scrollTop=sc.scrollHeight; } consultSetNewMsg(false); }
function consultAppend(html,force=false){ const box=$('#consultChat'), sc=$('#consultScroll'); if(!box||!sc) return; const follow=force||consultIsNearBottom(); box.insertAdjacentHTML('beforeend',html); if(follow) requestAnimationFrame(consultScrollBottom); else consultSetNewMsg(true); }
function onConsultScroll(){ const sc=$('#consultScroll'); if(!sc) return; if(Date.now()<consultScrollGuardUntil) return; if(consultIsNearBottom()) consultSetNewMsg(false); const compact=sc.scrollTop>28; const head=$('#consultEvidence'); if(head&&head.getAttribute('aria-expanded')!==String(!compact)){ head.classList.toggle('compact',compact); head.setAttribute('aria-expanded',String(!compact)); head.setAttribute('aria-label',t(compact?'cf_expand':'cf_collapse')); } }
function toggleConsultEvidence(){ const el=$('#consultEvidence'); if(!el) return; const open=el.classList.toggle('compact')===false; el.setAttribute('aria-expanded',String(open)); el.setAttribute('aria-label',t(open?'cf_collapse':'cf_expand')); }
function consultSetBusy(on){ consultBusy=!!on; ['#consultTa','#consultVoiceBtn','#consultSendBtn'].forEach(s=>{ const el=$(s); if(el) el.disabled=!!on; }); document.querySelectorAll('#consultActions button').forEach(b=>b.disabled=!!on); const c=$('#consultComposer'); if(c) c.classList.toggle('busy',!!on); }
function consultShowTyping(){ if($('#consultTyping')) return; consultAppend('<div class="consult-row ai consult-typing-row"><span class="consult-avatar">AI</span><div class="consult-typing" id="consultTyping" aria-label="AI is typing"><i></i><i></i><i></i></div></div>'); }
function consultHideTyping(){ const el=$('#consultTyping'); if(el) el.closest('.consult-row').remove(); }
function consultClearActions(){ const el=$('#consultActions'); if(el) el.remove(); }
function consultSetActions(items,force=false){ consultClearActions(); if(!items||!items.length) return; const html=`<div class="consult-actions" id="consultActions">${items.map(x=>`<button type="button" class="${x.secondary?'secondary':'primary'}" onclick="${x.action}">${esc(x.label)}</button>`).join('')}</div>`; consultAppend(html,force); }
function consultAiRow(inner,extra='',attrs=''){ return `<div class="consult-row ai ${extra}" ${attrs}><span class="consult-avatar" aria-hidden="true">AI</span><div class="consult-bubble">${inner}</div></div>`; }
function consultAddAi(text,tr='',force=false){ record('ai',text,tr||''); consultAppend(consultAiRow(`<div class="consult-copy">${esc(text)}</div>`),force); }
function consultAddUser(text,fromVoice=false){ record('cust',text,fromVoice?'模拟语音转写':''); const meta=fromVoice?`<div class="consult-meta">${esc(t('cf_voice_transcript'))}</div>`:''; consultAppend(`<div class="consult-row me"><div class="consult-bubble">${esc(text)}${meta}</div></div>`,true); }

function consultJudgment(){ const a=assess; if(!a) return; const cur=spotList().find(k=>k.id===spotId); const kb=a.match?a.match.entry:null; const lvl=riskLevel();
  const pct=Math.max(6,Math.min(98,a.confidence));
  const riskTitle=t(lvl==='stop'?'cf_risk_stop':lvl==='warn'?'cf_risk_warn':'cf_risk_low');
  let body=a.route==='human'?Engine.compose({action:'hold'},ctx()):Engine.compose(a,ctx());
  const issue=kb?kb.cat[sl()]:(cur?cur.cat[sl()]:'');
  const summary=lvl==='stop'?t('v_stop2'):a.route==='human'?t('v_warn2'):a.action==='ask'?t('cf_ask'):T0('cf_finding',issue);
  const confNote=(ui==='zh'?`判断门槛 ${a.threshold}%${a.reasons.length?'；同时触发了：'+a.reasons.map(r=>r.zh).join('、'):'；没有触发安全、退款等硬规则'}`:`Guidance threshold ${a.threshold}%${a.reasons.length?'; rules triggered: '+a.reasons.map(r=>r.en).join(', '):'; no safety or refund rule triggered'}`);
  const facts=[];
  if(kb&&kb.part) facts.push([t('cf_part'),`${kb.partName[sl()]} ${kb.part}`]);
  facts.push([t('cf_evidence'),T0('cf_basis',shots.length,kb?kb.id:'')]);
  if(serial) facts.push([t('k_war'),serial.warrantyUntil?t('war_active')+' '+serial.warrantyUntil:t('war_unknown')]);
  const html=consultAiRow(`<div class="judgment-head"><span class="judgment-kicker">${esc(t('v_who'))}</span><span class="risk-pill ${lvl}">${esc(riskTitle)}</span><span class="confidence-pill">${esc(t('cf_conf'))} ${pct}%</span></div>
    <div class="consult-copy judgment-copy">${esc(summary)}</div>
    <details class="consult-why"><summary>${esc(t('cf_why'))}</summary><div class="why-body"><div class="why-meter"><i style="width:${pct}%"></i></div><div class="why-note">${esc(confNote)}</div><div class="why-facts">${facts.map(f=>`<span><small>${esc(f[0])}</small><b>${esc(f[1])}</b></span>`).join('')}</div><p>${esc(t(lvl==='stop'?'v_stop2':lvl==='warn'?'v_warn2':'v_low2'))}</p><p>${esc(body)}</p></div></details>`,'judgment-row');
  record('ai',body,'AI 判断'); consultAppend(html,true);
  if(Engine.offersPart(a)) applyShipping(a,kb);
}

function renderConsultShell(){ if(!assess) return; const kb=assess.match?assess.match.entry:null; const cur=spotList().find(k=>k.id===spotId); const lvl=riskLevel(); const steps=guideSteps(); const pct=Math.max(6,Math.min(98,assess.confidence));
  const img=$('#consultImg'); if(img) img.src=shotThumb(shots[0]);
  const hs=$('#consultHs'); if(hs){ hs.style.left='32%'; hs.style.top='26%'; }
  const label=$('#consultHsLabel'); if(label) label.textContent=cur?spotLabel(cur,sl()):'';
  const risk=$('#consultRisk'); if(risk){ risk.className='risk-pill '+lvl; risk.textContent=t(lvl==='stop'?'cf_risk_stop':lvl==='warn'?'cf_risk_warn':'cf_risk_low'); }
  const conf=$('#consultConf'); if(conf) conf.textContent=`${t('cf_conf')} ${pct}%`;
  const sub=$('#consultContext'); if(sub) sub.textContent=kb?kb.cat[sl()]:(cur?cur.cat[sl()]:'');
  const prog=$('#consultProgress'); if(prog) prog.textContent=steps.length?T0('cf_sub',Math.min(guideIdx+1,steps.length),steps.length):t(assess.action==='ask'?'v_ask':'v_human');
  const head=$('#consultEvidence'); if(head) head.setAttribute('aria-label',t(head.classList.contains('compact')?'cf_expand':'cf_collapse'));
  updateConsultVoiceUI(); updateConsultInputModeUI();
}

function startConsult(){ if(!assess) return; clearConsultTimers(); clearTimeout(consultVoiceTimer); consultVoiceTimer=null; consultVoiceOn=false; consultScrollGuardUntil=0; consultSetNewMsg(false); consultRunSeq++; guideIdx=0; consultStuckIdx=-1; consultBusy=true; consultInputMode='voice'; const direct=$('#consultTa'); if(direct) direct.value=''; const box=$('#consultChat'); if(box) box.innerHTML=''; const head=$('#consultEvidence'); if(head){ head.classList.remove('compact'); head.setAttribute('aria-expanded','true'); }
  renderConsultShell(); setStage('consult'); consultSetBusy(true); consultShowTyping();
  scheduleConsult(()=>{ consultHideTyping(); consultJudgment(); consultShowTyping(); scheduleConsult(()=>{ consultHideTyping(); consultAfterJudgment(); },500); },360);
}

function consultAfterJudgment(){ const a=assess; if(!a) return; const steps=guideSteps(); const canGuide=a.route==='ai'&&a.action==='reply'&&steps.length>0;
  if(canGuide){ scheduleConsult(()=>{ consultAddStep(); consultSetBusy(false); },360); return; }
  if(a.action==='ask'){ consultSetBusy(false); consultSetActions([{label:t('v_ask'),action:"setStage('aim')"},{label:t('v_human'),action:"handoff('ai_hold')",secondary:true}]); return; }
  if(riskLevel()==='stop'){ consultAddAi(t('cf_no_steps'),'涉及安全件，停止自助指导'); consultSetBusy(false); consultSetActions([{label:t('v_human'),action:'consultShowSafety()'}]); return; }
  consultAddAi(t('cf_no_steps'),'AI 无法安全生成自助步骤'); consultSetBusy(false); consultSetActions([{label:t('v_human'),action:"handoff('ai_hold')"}]);
}

function consultShortStep(step){ const first=String(step||'').split(/[。！？!?；;]/)[0].trim(); const text=first||String(step||'').trim(); return text.length>92?text.slice(0,90)+'…':text; }
function consultDoneLabel(){ const n=guideSteps().length; return n&&guideIdx>=n-1?t('cf_done_last'):t('cf_done'); }
function consultAddStep(){ const steps=guideSteps(); const kb=assess&&assess.match?assess.match.entry:null; if(!steps.length){ consultShowOutcome(); return; } const idx=Math.min(guideIdx,steps.length-1); const text=steps[idx]||''; const stepTitle=kb?kb.stepTitle[sl()]:''; const lead=idx===0?'':(idx===steps.length-1?t('cf_step_lead_last'):t('cf_step_lead_mid')); const titleHtml=idx===0&&stepTitle?`<div class="consult-step-title">${esc(stepTitle)}</div>`:''; const leadHtml=lead?`<div class="consult-step-lead">${esc(lead)}</div>`:''; const html=consultAiRow(`<div class="consult-step-head"><span class="consult-step-num">${idx+1}</span><span class="consult-step-label">${esc(T0('cf_step',idx+1,steps.length))}</span><span class="consult-step-state" aria-hidden="true">✓</span></div>${leadHtml}${titleHtml}<div class="consult-copy">${esc(text)}</div>${idx===0?`<button type="button" class="consult-video" onclick="playVideo()"><span class="consult-video-icon">▶</span><span><b>${esc(t('cf_watch'))}</b><small>${esc(kb&&kb.video?kb.video:t('manual_video'))}</small></span></button>`:''}`,'consult-step',`data-step="${idx}"`);
  consultAppend(html,true); record('ai',[lead,stepTitle,text].filter(Boolean).join('\n'),'逐步指导'); consultSetActions([{label:consultDoneLabel(),action:'consultUserDone()'},{label:t('cf_stuck'),action:'consultUserStuck()',secondary:true}]); renderConsultShell();
}

function consultIntent(text){ const s=String(text||'').toLowerCase(); const heat=/(发热|发烫)/.test(s)&&!/(不|没|没有)发热/.test(s); if(heat||/(冒烟|火花|焦味|漏电|触电|smoke|spark|burning|electric shock)/i.test(s)) return 'danger'; if(/(人工|工程师|客服|technician|support engineer|human|person)/i.test(s)) return 'human'; if(/(做不了|不会|卡住|还是不行|没用|没解决|没有解决|stuck|can't|cannot|not working|not solved)/i.test(s)) return 'stuck'; if(/(做好了|做完了|完成|解决了|修好了|恢复正常|好了|搞定|下一步|继续|可以了|done|next|finished|works now)/i.test(s)) return 'done'; if(/(视频|演示|video|demo|show me)/i.test(s)) return 'video'; return 'question'; }
function consultUserDone(){ if(consultBusy) return; consultHandleUser(consultDoneLabel(),false,'done'); }
function consultUserStuck(){ if(consultBusy) return; consultHandleUser(t('cf_stuck'),false,'stuck'); }
function consultStuckAgain(){ if(consultBusy) return; consultHandleUser(t('cf_stuck_again'),false,'stuck'); }
function consultStandardActions(){ consultSetActions([{label:consultDoneLabel(),action:'consultUserDone()'},{label:t('cf_stuck'),action:'consultUserStuck()',secondary:true}]); }
function consultStuckActions(){ const kb=assess&&assess.match?assess.match.entry:null; const items=[{label:consultDoneLabel(),action:'consultUserDone()'}]; if(kb&&kb.video) items.push({label:t('cf_watch'),action:'playVideo()',secondary:true}); items.push({label:t('cf_stuck_again'),action:'consultStuckAgain()',secondary:true}); consultSetActions(items); }
function consultAddTypingThen(fn,ms=480){ consultShowTyping(); scheduleConsult(()=>{ consultHideTyping(); fn(); },ms); }

function consultHandleUser(raw,fromVoice=false,forcedIntent=null){ if(consultBusy) return; const text=String(raw||'').trim(); if(!text) return; const intent=forcedIntent||consultIntent(text); consultClearActions(); consultAddUser(text,fromVoice); consultSetBusy(true); const stepIndex=guideIdx; const steps=guideSteps(); const stepText=steps[stepIndex]||''; const shortStep=consultShortStep(stepText);
  consultAddTypingThen(()=>{
    if(intent==='danger'){ consultAddAi(t('cf_danger'),'用户报告危险信号，停止指导'); scheduleConsult(()=>consultShowSafety(),720); return; }
    if(intent==='human'){ consultAddAi(t('cf_human'),'用户要求转人工'); scheduleConsult(()=>handoff('manual'),720); return; }
    if(!steps.length&&intent!=='done'){ consultAddAi(t('cf_no_steps'),'没有可安全执行的自助步骤'); scheduleConsult(()=>handoff('ai_hold'),720); return; }
    if(intent==='stuck'){ if(consultStuckIdx===stepIndex){ consultAddAi(t('cf_stuck_final'),'同一步再次卡住，转人工'); scheduleConsult(()=>handoff('stuck'),760); return; } consultStuckIdx=stepIndex; consultAddAi(T0('cf_stuck_help',shortStep),'用户卡住，AI 简化当前步骤'); consultSetBusy(false); consultStuckActions(); return; }
    if(intent==='done'){ consultCompleteStep(); return; }
    if(intent==='video'){ playVideo(); consultAddAi(T0('cf_question',shortStep),'用户查看视频后仍需确认当前步骤'); consultSetBusy(false); consultStandardActions(); return; }
    consultAddAi(T0('cf_question',shortStep),'用户追问当前步骤'); consultSetBusy(false); consultStandardActions();
  });
}

function consultCompleteStep(){ const steps=guideSteps(); const idx=guideIdx; if(!steps.length){ consultShowOutcome(); return; } if(!ticket) ensureTicket(); const row=document.querySelector(`#consultChat .consult-step[data-step="${idx}"]`); if(row) row.classList.add('done'); ticket.stepsDone=(ticket.stepsDone||0)+1; record('sys',`客户完成第 ${idx+1}/${steps.length} 步`,''); syncInbox();
  if(idx<steps.length-1){ guideIdx++; renderConsultShell(); consultAddStep(); consultSetBusy(false); return; }
  record('sys',`客户按步骤完成 ${steps.length} 步`,''); syncInbox(); consultAddAi(T0('cf_all_done',steps.length),'全部步骤完成'); scheduleConsult(()=>{ consultSetBusy(false); consultSetActions([{label:t('cf_check_now'),action:'consultShowOutcome()'}]); },420);
}

function consultShowOutcome(){ if(ticket){ record('sys','客户进入处理结果确认',''); syncInbox(); } setStage('outcome'); }
function consultShowSafety(){ if(ticket){ record('sys','AI 判定涉及安全件，停止自助指导',''); syncInbox(); } renderSafety(); setStage('safety'); }
function startGuide(){ startConsult(); }
function guideDone(){ if(!consultBusy){ consultSetBusy(true); consultCompleteStep(); } }
function renderVerdict(){ renderConsultShell(); }

/* 寄件承诺：模板里一旦写了"将从 X 寄出"，承诺就成立 → 同步后台扣库存；无权承诺则记 pendingShip */
function applyShipping(a,kb){ if(!ticket) return; if(a.canShip){ ticket.ship=kb.part; record('sys',`AI 承诺寄送 ${kb.partName.zh}（${kb.part}）`,''); } else { ticket.pendingShip=kb.part; record('sys',`${kb.partName.zh}（${kb.part}，约 ${kb.partValue} 美元）超出 AI 可承诺范围，待品牌方确认`,''); } syncInbox(); }

/* ---------- 结果 / 安全 / 转人工 ---------- */
function finish(kind){
  if(!ticket) ensureTicket();
  if(kind==='danger'){ record('sys','客户反馈情况变差（发热/冒烟/异响增大）',''); syncInbox(); renderSafety(); setStage('safety'); return; }
  if(kind==='fixed'){ ticket.status='done'; ticket.outcome='fixed'; outcome='ai'; record('cust',ui==='zh'?'已经好了，谢谢':'It works now, thanks',''); record('ai',t('c_solved'),'客户确认已解决'); syncInbox(); go(4); return; }
  ticket.outcome='notfixed'; record('cust',ui==='zh'?'还是老样子':'Still the same',''); handoff('notfixed'); }
function renderSafety(){ $('#sfList').innerHTML=[1,2,3].map(i=>`<li><span>${esc(t('sf_'+i))}</span></li>`).join(''); }
function handoff(reason){ if(!ticket) ensureTicket(); ticket.status='human'; ticket.outcome=ticket.outcome||'human'; outcome='human';
  const why={stuck:'客户卡在某一步',notfixed:'方案无效，不再重复猜测',safety:'出现危险信号，停止指导',ai_hold:'AI 置信度不足',manual:'用户从说明书页联系客服'}[reason]||reason||'转人工';
  record('sys',why,''); syncInbox(); renderHandoff(); setStage('handoff'); }
function renderHandoff(){ const lvl=riskLevel(); const kb=assess&&assess.match?assess.match.entry:null;
  $('#techName').textContent=(ui==='zh'?'李伟 · ':'Li Wei · ')+'IronPeak'; $('#techOn').textContent=t('tech_on'); $('#handoffNote').value=ticket&&ticket.handoffNote||'';
  $('#hPack').innerHTML=[
    [`${shots.length} × ${shots.some(s=>s.kind==='clip')?t('shot_clip'):t('shot_photo')}`, esc(t('spot_ok'))],
    [ui==='zh'?'部位':'Region', esc(kb?kb.cat.zh:spotLabel(spotList().find(k=>k.id===spotId)||{cat:{zh:'—',en:'—'}},sl()))],
    [ui==='zh'?'AI 判断与置信度':'AI finding', assess?`${assess.confidence}% · ${assess.route==='ai'?'AI':'人工'}`:'—'],
    [ui==='zh'?'已做步骤':'Steps tried', `${ticket&&ticket.stepsDone||0} ${ui==='zh'?'步':'steps'}`],
    [t('k_sn'), serial?serial.sn:(ui==='zh'?'未提供':'not provided')],
  ].map(r=>`<div><i>✓</i><span>${r[0]}</span><small>${esc(String(r[1]))}</small></div>`).join(''); }
function saveHandoffNote(value){ if(!ticket) ensureTicket(); ticket.handoffNote=String(value||'').slice(0,240); syncInbox(); }
function handoffGo(){ if(!ticket) ensureTicket(); const note=$('#handoffNote'); if(note) ticket.handoffNote=note.value.trim().slice(0,240); ticket.route='engineer'; ticket.status='human'; syncInbox();
  record('sys','转人工：工程师将在 4 小时内联系',''); go(4); }

/* ---------- 收尾摘要 ---------- */
function renderSummary(){ const box=$('#h5sum'); if(!box) return; if(!ticket){ box.innerHTML=''; return; }
  const kb=assess&&assess.match?assess.match.entry:null;
  const routeTxt=outcome==='ai'?(ui==='zh'?'助手指导完成':'Fixed with the assistant'):(ui==='zh'?'已转工程师':'Engineer assigned');
  const nextTxt=outcome==='ai'?(ui==='zh'?'24 小时后自动再确认':'24-h check'):(ui==='zh'?'通常 4 小时内联系':'Usually replies within 4 hours');
  box.innerHTML=`<div><span>${t('sum_prod')}</span><b>${esc(t('prod'))}${serial?' · '+esc(serial.sn):''}</b></div>
    <div><span>${t('sum_issue')}</span><b>${esc(kb?kb.cat[sl()]:(ticket.issue||'—'))}</b></div>
    <div><span>${t('sum_route')}</span><b>${esc(routeTxt)}</b></div>
    <div><span>${t('sum_next')}</span><b>${esc(nextTxt)}</b></div>`; }

/* ---------- 文字兜底（保留完整对话能力） ---------- */
function camStepCard(kb){ const l=sl(); return `<div class="stepcard" style="align-self:stretch;background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 13px"><b style="font-size:13.5px">${esc(kb.stepTitle[l])}</b><ol style="margin:7px 0 0;padding-left:18px;font-size:13px;line-height:1.6;color:#2B333C">${(kb.steps[l]||kb.steps.en).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${kb.video?`<div class="tiny muted" style="margin-top:7px">▷ ${esc(t('manual_video'))} · ${esc(kb.video)}</div>`:''}</div>`; }
function record(who,text,tr){ if(!ticket) return; ticket.transcript.push({who,text,tr,t:Date.now()}); syncInbox(); }
function add(html){ const box=$('#chat'); if(!box) return; box.insertAdjacentHTML('beforeend',html); const sc=$('#chatScroll'); if(sc) sc.scrollTop=sc.scrollHeight; }
function typing(then,ms=900){ const tk=ticket; add('<div class="typing" id="ty"><i></i><i></i><i></i></div>'); setTimeout(()=>{ const x=$('#ty'); if(x) x.remove(); if(ticket===tk) then(); },ms); }
function aiMsg(text,tr){ record('ai',text,tr); add(`<div class="msg ai">${esc(text)}<div class="meta">${t('c_meta')}</div></div>`); }
function quick(list){ return `<div class="quick" id="q1">${list.map(([label,fn])=>`<button onclick="${fn}">${label}</button>`).join('')}</div>`; }
function clearQuick(){ const q=$('#q1'); if(q) q.remove(); }
function openText(){ ensureTicket(); if(!$('#chat').textContent) renderChat(); setStage('text'); setTimeout(()=>{ const sc=$('#chatScroll'); if(sc) sc.scrollTop=sc.scrollHeight; },0); }
function backToShot(){ if(shots.length&&assess) startConsult(); else if(shots.length){ setStage('aim'); startLiveCam(); } else setStage('how'); }
function renderChat(){ if(!ticket) return; $('#chat').innerHTML=''; add(`<div class="sysnote" style="margin:0 0 4px">${T0('c_sys',serial)}</div>`);
  for(const m of ticket.transcript){ if(m.who==='sys') continue; if(m.who==='cust') add(`<div class="msg me">${esc(m.text)}</div>`); else add(`<div class="msg ai">${esc(m.text)}<div class="meta">${t('c_meta')}</div></div>`); }
  if(ticket.status==='ai') add(quick([[t('q_video'),"enterCamera('photo')"],[t('q_person'),"userSay(t('q_person'))"]])); }
function respond(text){ clearQuick(); const a=assessNow(text); const kb=a.match?a.match.entry:null; ticket.kbId=kb?kb.id:null; const tr=Engine.summarizeZh(a,{});
  if(a.route==='human'){ lastAction='hold'; aiMsg(Engine.compose(a,ctx()),tr); setTimeout(()=>handoff('ai_hold'),700); return; }
  if(a.action==='ask'){
    if(asks>=2){ lastAction='hold'; aiMsg(Engine.compose({action:'hold'},ctx()),'AI 已追问 2 轮仍无法判断，转人工'); setTimeout(()=>handoff('ask_limit'),700); return; }
    asks++; lastAction='ask'; aiMsg(Engine.compose(a,ctx()),tr); add(quick([[t('q_video'),"enterCamera('photo')"],[t('q_person'),"userSay(t('q_person'))"]])); return; }
  lastAction='reply'; aiMsg(Engine.compose(a,ctx()),tr);
  if(kb) add(camStepCard(kb));
  if(Engine.offersPart(a)) applyShipping(a,kb);
  add(quick([[t('q_solved'),"userSay(t('q_solved'))"],[t('q_notfixed'),"userSay(t('q_notfixed'))"],[t('q_person'),"userSay(t('q_person'))"]])); }
function onChatMedia(input){ const f=input.files&&input.files[0]; if(!f) return; shots.push({kind:(f.type||'').startsWith('video/')?'clip':'photo',spot:spotId,t:Date.now()}); renderShots(); syncInbox(); toast(t('t_attach')); input.value=''; }
function userSay(s){ $('#ta').value=s; sendMsg(); }
function sendMsg(){ const ta=$('#ta'); const s=ta.value.trim(); if(!s) return; if(!ticket) ensureTicket(); ta.value=''; ta.style.height='auto'; clearQuick();
  if(!ticket.issue) ticket.issue=s.slice(0,120);
  record('cust',s,''); add(`<div class="msg me">${esc(s)}</div>`);
  const intent=s===t('q_person')||s===t('q_tech')?'human':s===t('q_solved')?'solved':s===t('q_notfixed')?'notfixed':Engine.detectConfirm(s);
  if(intent==='solved'){ typing(()=>{ ticket.status='done'; ticket.outcome='fixed'; outcome='ai'; syncInbox(); aiMsg(t('c_solved'),'客户确认已解决'); add(quick([[t('q_save'),'go(4)']])); }); return; }
  if(ticket.status==='human'){ typing(()=>{ aiMsg(t('c_noted'),'已有人工接手，新消息附到工单'); add(quick([[t('q_save'),'go(4)']])); }); return; }
  if(s===t('q_tech')){ typing(()=>{ ticket.status='human'; syncInbox(); aiMsg(T0('c_tech',routeName(),routeHours()),'客户要求技术人员上门'); add(quick([[t('q_save'),'go(4)']])); }); return; }
  if(intent==='human'){ typing(()=>{ record('sys','客户要求转人工',''); handoff('manual'); }); return; }
  if(intent==='notfixed'&&lastAction==='reply'){ typing(()=>{ ticket.status='human'; syncInbox(); outcome='human'; aiMsg(T0('c_notfixed',routeName(),routeHours()),'方案无效，不再重复猜测，转人工'); add(`<div class="human">${t('human_tag')}</div>`); add(quick([[t('q_save'),'go(4)']])); }); return; }
  typing(()=>respond(ticket.transcript.filter(x=>x.who==='cust'&&!/^\[/.test(x.text)).slice(-2).map(x=>x.text).join(' ')),900); }

/* ---------- 语音 / 输入模式 ---------- */
const KEYBOARD_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 10h1M10 10h1M14 10h1M18 10h.01M6 14h2M10 14h4M16 14h2"/></svg>';
const MIC_ICON='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
function updateVoiceUI(){ const b=$('#voiceBtn'), title=$('#voiceTitle'), hint=$('#voiceHint'); b.classList.toggle('recording',voiceOn); b.setAttribute('aria-pressed',String(voiceOn)); b.setAttribute('aria-label',t(voiceOn?'voice_listening':'voice_prompt')); b.title=t(voiceOn?'voice_listening':'voice_prompt'); title.textContent=t(voiceOn?'voice_listening':'voice_prompt'); hint.textContent=t(voiceOn?'voice_hint_listening':'voice_hint'); }
function updateInputModeUI(){ const textMode=inputMode==='text'; $('#composer').classList.toggle('text-mode',textMode); $('#keyboardBtn').innerHTML=textMode?MIC_ICON:KEYBOARD_ICON; $('#keyboardBtn').setAttribute('aria-label',t(textMode?'switch_voice':'switch_text')); $('#keyboardBtn').title=t(textMode?'switch_voice':'switch_text'); }
function setInputMode(mode){ inputMode=mode; if(mode==='voice') voiceOn=false; updateVoiceUI(); updateInputModeUI(); if(mode==='text') setTimeout(()=>$('#ta').focus(),0); }
function toggleInputMode(){ setInputMode(inputMode==='voice'?'text':'voice'); }
function toggleVoice(){ if(inputMode!=='voice') setInputMode('voice'); voiceOn=!voiceOn; updateVoiceUI(); toast(t(voiceOn?'voice_start':'voice_stop')); }

/* ---------- 合并会话里的语音 / 文字输入 ---------- */
function updateConsultVoiceUI(){ const b=$('#consultVoiceBtn'), title=$('#consultVoiceTitle'), hint=$('#consultVoiceHint'); if(!b||!title||!hint) return; b.classList.toggle('recording',consultVoiceOn); b.setAttribute('aria-pressed',String(consultVoiceOn)); b.setAttribute('aria-label',t(consultVoiceOn?'cf_voice_listening':'cf_voice_ready')); b.title=t(consultVoiceOn?'cf_voice_listening':'cf_voice_ready'); title.textContent=t(consultVoiceOn?'cf_voice_listening':'cf_voice_ready'); hint.textContent=t(consultVoiceOn?'cf_voice_hint_listening':'cf_voice_hint'); }
function updateConsultInputModeUI(){ const c=$('#consultComposer'), b=$('#consultKeyboardBtn'); if(!c||!b) return; const textMode=consultInputMode==='text'; c.classList.toggle('text-mode',textMode); b.innerHTML=textMode?MIC_ICON:KEYBOARD_ICON; b.setAttribute('aria-label',t(textMode?'switch_voice':'switch_text')); b.title=t(textMode?'switch_voice':'switch_text'); }
function setConsultInputMode(mode){ if(mode!=='voice'){ clearTimeout(consultVoiceTimer); consultVoiceTimer=null; consultVoiceOn=false; } consultInputMode=mode; updateConsultVoiceUI(); updateConsultInputModeUI(); if(mode==='text') setTimeout(()=>$('#consultTa').focus(),0); }
function toggleConsultInputMode(){ setConsultInputMode(consultInputMode==='voice'?'text':'voice'); }
function consultDemoPhrase(){ const steps=guideSteps(); if(consultStuckIdx===guideIdx&&steps.length) return t('cf_stuck_again'); if(steps.length) return consultDoneLabel(); return t('q_person'); }
function consultShowTranscribing(){ consultAppend(`<div class="consult-transcribing" id="consultTranscribing"><span class="consult-transcribing-dot"></span>${esc(t('cf_transcribing'))}</div>`,true); }
function stopConsultVoice(silent){ clearTimeout(consultVoiceTimer); consultVoiceTimer=null; if(!consultVoiceOn){ if(!silent) updateConsultVoiceUI(); return; } consultVoiceOn=false; updateConsultVoiceUI(); if(silent) return; consultSetBusy(true); consultShowTranscribing(); const phrase=consultDemoPhrase(); const run=consultRunSeq; scheduleConsult(()=>{ const x=$('#consultTranscribing'); if(x) x.remove(); if(run!==consultRunSeq||stage!=='consult') return; consultBusy=false; consultHandleUser(phrase,true); },440); }
function toggleConsultVoice(){ if(consultBusy) return; if(consultInputMode!=='voice') setConsultInputMode('voice'); if(consultVoiceOn){ stopConsultVoice(false); return; } clearTimeout(consultVoiceTimer); consultVoiceOn=true; updateConsultVoiceUI(); consultVoiceTimer=setTimeout(()=>stopConsultVoice(false),2400); }
function sendConsultMsg(){ if(consultBusy) return; const ta=$('#consultTa'); if(!ta) return; const text=ta.value.trim(); if(!text) return; ta.value=''; ta.style.height='auto'; consultHandleUser(text,false); }

/* ---------- 收尾 ---------- */
function saveEmail(){ const e=$('#email').value.trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)){ toast(t('email_bad')); return; } if(!ticket) ensureTicket(); ticket.email=e; ticket.name=e.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); syncInbox(); toast(t('saved')+e); }
function rate(n){ document.querySelectorAll('#stars button').forEach((b,i)=>b.classList.toggle('on',i<n)); if(ticket){ ticket.rating=n; syncInbox(); } toast(t('thanks')); }

/* ---------- 查工单 ---------- */
function track(){ const id=$('#trackInput').value.trim().toUpperCase(); let found=null; try{ const box=JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'); found=box.find(x=>x.id===id);
  if(adminState){ const at=adminState.tickets&&adminState.tickets.find(x=>x.id===id); if(at) found=Object.assign({},found,{id:at.id,status:at.status,createdAt:at.createdAt,issue:at.issue,stepsDone:at.stepsDone,route:at.route,transcript:(at.timeline||[]).filter(e=>e.who!=='sys').map(e=>({who:e.who==='cust'?'cust':'ai',text:e.text,t:e.t}))}); } }catch(e){}
  const box=$('#trackResult'); if(!found){ box.innerHTML=`<div class="card" style="color:var(--muted)">${t('track_none')}</div>`; return; }
  const st=t('st')[found.status]||found.status; const kb=found.kbId&&Engine.KB.find(k=>k.id===found.kbId);
  const steps=[found.issue?`${ui==='zh'?'问题已记录':'Logged'}`:'',kb?`${ui==='zh'?'匹配到':'Matched'}: ${kb.cat[sl()]}`:'',found.stepsDone?T0('g_sub',found.stepsDone,Math.max(found.stepsDone,3)):'',found.route?`${ui==='zh'?'处理方式':'Route'}: ${found.route}`:''].filter(Boolean);
  box.innerHTML=`<div class="card"><div class="row sp"><b>${esc(found.id)}</b><span class="tag ${found.status}">${esc(st)}</span></div>
    <div class="muted small" style="margin:4px 0 2px">${new Date(found.createdAt).toLocaleString()}</div>
    <div class="small" style="margin-bottom:10px">${esc(found.issue||'')}</div>
    <ul class="track-steps">${steps.map((s,i)=>`<li class="${i<steps.length-1?'done':''}"><b>${esc(s)}</b></li>`).join('')}</ul>
    ${(found.transcript||[]).filter(m=>m.who!=='sys').slice(-2).map(m=>`<div class="small" style="padding:7px 0;border-top:1px solid var(--line)"><b>${m.who==='cust'?(ui==='zh'?'你':'You'):(ui==='zh'?'助手':'Assistant')}</b> · ${esc(m.text.length>120?m.text.slice(0,120)+'…':m.text)}</div>`).join('')}
    <div class="small muted" style="margin-top:8px">${t('track_at')}: ${new Date().toLocaleString()}</div></div>`; }

/* ---------- 说明书 ---------- */
const MAN_IMG={cable:'sm_top',catch:'sm_catch',bolts:'sm_bolts',e07:'tr_console',belt:'tr_belt',motor:'rw_motor',units:'rw_console',assembly:'sm_top',glue:'hero'};
function manualEntries(){ return Engine.KB.filter(k=>k.product===product.id||k.product==='*'); }
function manualVideoCard(kb){ const s=sl(); const img=IMG[MAN_IMG[kb.id]]||IMG.hero||'';
  return `<button type="button" class="manual-video" onclick="toast(t('t_video'))" aria-label="${t('manual_video')}: ${esc(kb.stepTitle[s])}"><span class="thumb"><img src="${img}" alt=""><span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span><span class="du">${kb.video||'0:40'}</span></span><span class="copy"><b>${t('manual_video')}</b><small>${esc(kb.stepTitle[s])}</small></span></button>`; }
function renderManual(){ const s=sl(); const list=manualEntries(); $('#manualList').innerHTML=list.map(k=>`<details class="man"><summary>${esc(k.cat[s])}</summary>${manualVideoCard(k)}<ol>${(k.steps[s]||k.steps.en).map(x=>`<li>${x}</li>`).join('')}</ol>${k.part?`<div class="muted small">${ui==='zh'?'相关零件':'Part'}: ${esc(k.partName[s])} ${k.part}</div>`:''}</details>`).join(''); }
function renderManualDoc(resetChat=true){ const s=sl(); const list=manualEntries(); const meta=T0('doc_meta',`${product.series[s]} ${product.id}`,serial&&serial.sn);
  $('#manualDoc').innerHTML=`<div class="doc-cover"><span class="doc-kicker">IronPeak · ${product.id}</span><h1>${t('doc_heading')}</h1><p>${meta}</p><div class="doc-toc"><div class="small muted" style="font-weight:600;margin-bottom:2px">${t('doc_contents')}</div>${list.map((k,i)=>`<button onclick="scrollManualDoc('${k.id}')">${String(i+1).padStart(2,'0')} · ${esc(k.cat[s])}</button>`).join('')}</div></div>${list.map((k,i)=>`<section class="doc-section" id="doc-${k.id}"><div class="doc-section-count">${String(i+1).padStart(2,'0')}</div><h2>${esc(k.cat[s])}</h2><h3>${t('doc_steps')}</h3>${manualVideoCard(k)}<ol>${(k.steps[s]||k.steps.en).map(x=>`<li>${x}</li>`).join('')}</ol><div class="doc-note">${t('doc_note')}</div></section>`).join('')}<div class="doc-footer">IronPeak Fitness · ${product.id} · ${serial?serial.sn:''}</div>`;
  $('#manualAsk').placeholder=t('doc_ask_ph'); if(resetChat){ $('#manualChat').innerHTML=''; addManualMsg('ai',t('doc_ai_hello')); } }
function scrollManualDoc(id){ const el=document.getElementById('doc-'+id); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }
function addManualMsg(who,text){ const box=$('#manualChat'); box.insertAdjacentHTML('beforeend',`<div class="doc-msg ${who}">${esc(text).replace(/\n/g,'<br>')}</div>`); box.scrollTop=box.scrollHeight; }
function askManual(){ const input=$('#manualAsk'); const q=input.value.trim(); if(!q) return; input.value=''; addManualMsg('user',q); const s=sl(); const match=Engine.matchKB(q,product.id); const box=$('#manualChat');
  box.insertAdjacentHTML('beforeend',`<div class="doc-msg ai typing" id="docTyping">${ui==='zh'?'正在查说明书…':'Checking the manual…'}</div>`); box.scrollTop=box.scrollHeight;
  setTimeout(()=>{ if(v!=='d') return; const ty=$('#docTyping'); if(ty) ty.remove(); const e=match&&match.entry; addManualMsg('ai',e?T0('doc_ai_found',e.cat[s],e.steps[s]||e.steps.en,!!e.video):t('doc_ai_none')); },650); }
function openManualDoc(){ renderManualDoc(true); go('d'); const sc=$('#docScroll'); if(sc) sc.scrollTop=0; }
function contactSupportFromManual(){ ensureTicket(); handoff('manual'); if(v!==3) go(3); }

/* ---------- 重置 ---------- */
function resetDemo(){ camGen++; if(clipOn) clipStop(true); stopLiveCam(); clearTimeout(reviewVoiceTimer); shots.forEach(s=>{ if(s.url&&String(s.url).startsWith('blob:')) URL.revokeObjectURL(s.url); });
  consultRunSeq++; clearConsultTimers(); clearTimeout(consultVoiceTimer); consultVoiceTimer=null; consultVoiceOn=false; consultBusy=false; consultStuckIdx=-1; consultInputMode='voice';
  ticket=null; v=0; hist=[]; stage='how'; spotId=null; spotPicked=false; shots=[]; clipOn=false; camFacing='environment'; assess=null; guideIdx=0; route='engineer'; outcome='ai'; photoNoteMode=false; voiceOn=false; inputMode='voice'; reviewPhotoIndex=0; reviewNoteMode=null; reviewNoteText=''; reviewVoiceOn=false; reviewVoiceAttached=false; reviewVoiceTimer=null; cameraReturn='how';
  $('#reviewNoteText').value='';
  $('#chat').innerHTML=''; $('#ta').value=''; $('#ta').style.height='auto'; $('#consultChat').innerHTML=''; $('#consultTa').value=''; $('#consultTa').style.height='auto'; consultSetNewMsg(false); $('#email').value=''; $('#snInput').value=''; $('#trackInput').value=''; $('#trackResult').innerHTML=''; $('#manualDoc').innerHTML=''; $('#manualChat').innerHTML=''; $('#manualAsk').value=''; $('#h5title').textContent=''; $('#h5sum').innerHTML='';
  document.querySelectorAll('#stars button').forEach(b=>b.classList.remove('on'));
  setStage('how'); resetLabel(); setLang('zh'); go(0,false); toast(t('reset_done')); }

/* ---------- 启动 ---------- */
$('#stars').innerHTML=[1,2,3,4,5].map(i=>`<button onclick="rate(${i})">★</button>`).join('');
// 演示直链：?lang=en 以英文启动（起始语言页仍可切换）
if(qs.get('lang')==='en') setLang('en','EN','en'); else setLang('zh');
go(0,false);
// 演示直链：?go=shot 直接落到镜头；&sn= 指定序列号；&spot= 指定部位；&demo=analyze 直接跑完分析
if(qs.get('go')==='how') startReport();
if(['shot','chat','analyze','guide','consult'].includes(qs.get('go'))){
  const sn=qs.get('sn')||`${product.snPrefix}-${(productOrders[0]||{batches:['24B']}).batches[0]}-00955`;
  if(!applySerial(sn,false)) resetLabel();
  if(qs.get('spot')){ const id=qs.get('spot'); if(spotList().some(k=>k.id===id)) spotId=id; }
  startReport();
  if(qs.get('go')==='shot') setTimeout(()=>enterCamera(qs.get('mode')==='photo'?'photo':'video'),60);   // 演示直链：直接打开相机（浏览器会真的问权限）
  if(qs.get('demo')==='1'){ shots.push({kind:'photo',spot:spotId,t:Date.now()}); renderShots(); }
  if(qs.get('go')==='analyze'||qs.get('go')==='guide'||qs.get('go')==='consult'){ shots.push({kind:'photo',spot:spotId,t:Date.now()}); startAnalyze(); if(qs.get('go')==='guide'||qs.get('go')==='consult') setTimeout(()=>{ if(stage==='confirm') confirmYes(); },2000); }
  if(qs.get('go')==='chat') openText();
}
if(qs.get('go')==='manual'){ const sn=qs.get('sn')||`${product.snPrefix}-${(productOrders[0]||{batches:['24B']}).batches[0]}-00955`; if(!applySerial(sn,false)) resetLabel(); go('m'); openManualDoc(); }
if(qs.get('go')==='manual-list'){ const sn=qs.get('sn')||`${product.snPrefix}-${(productOrders[0]||{batches:['24B']}).batches[0]}-00955`; if(!applySerial(sn,false)) resetLabel(); go('m'); }
