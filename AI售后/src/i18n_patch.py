# -*- coding: utf-8 -*-
"""把 I18N 模块 + 字典 + 右上切换 + 渲染钩子打进 原型_品牌方后台.html（幂等：先检测标记）"""
import re,sys,os
SRC=sys.argv[1]; DST=sys.argv[2]
h=open(SRC,encoding='utf-8').read()
assert 'const I18N' not in h, 'already patched'
core=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'i18n_core.js'),encoding='utf-8').read()
dic=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'i18n_dict.js'),encoding='utf-8').read()
n=0
def sub1(old,new,count=1,label=''):
    global h,n
    assert h.count(old)>=1, 'missing: '+label+' :: '+old[:80]
    if count==1: assert h.count(old)==1, 'ambiguous: '+label+' :: '+old[:80]
    h=h.replace(old,new,count); n+=1

# 1) CSS：切换控件
sub1(".agent-reset.show{display:inline-flex}",
     ".agent-reset.show{display:inline-flex}\n.lang-sw{display:inline-flex;height:32px;border:1px solid var(--line);border-radius:6px;background:#fff;overflow:hidden}\n.lang-sw button{border:0;background:transparent;padding:0 10px;font-size:12px;color:var(--muted);line-height:1;letter-spacing:.01em}\n.lang-sw button+button{border-left:1px solid var(--line)}\n.lang-sw button:hover{color:var(--ink);background:#F7F9FA}\n.lang-sw button.on{background:var(--ai-soft);color:var(--ai-ink);font-weight:600}",label='css')
# 2) 顶栏控件（放在重置按钮左侧）
sub1('<button class="agent-reset" id="agentResetBtn"',
     '<div class="lang-sw" id="langSw" data-noi18n title="语言 / Language"><button type="button" data-l="zh" onclick="I18N.set(\'zh\')">中文</button><button type="button" data-l="en" onclick="I18N.set(\'en\')">EN</button></div>\n    <button class="agent-reset" id="agentResetBtn"',label='toggle')
# 3) 字典独立 <script>，放主脚本前
sub1('<div class="toast" id="toast"></div>\n<script>',
     '<div class="toast" id="toast"></div>\n<script id="i18nDict">\n'+dic+'</script>\n<script>',label='dict script')
# 4) 模块放在「页面」段之前
sub1('/* ================= 页面 ================= */',
     core+'\n/* 侧栏 / 顶栏静态文案的中文源：切语言时先还原再翻译 */\nlet CHROME_HTML=null;\nfunction restoreChrome(){ const side=$(\'.side\'), top=$(\'.top\'); if(!CHROME_HTML){ CHROME_HTML={side:side.innerHTML,top:top.innerHTML}; return; } side.innerHTML=CHROME_HTML.side; top.innerHTML=CHROME_HTML.top; $(\'#avatar\').textContent=ROLE[role].av; $(\'#whoName\').textContent=ROLE[role].person; $(\'#whoOrg\').textContent=ROLE[role].name+\' · \'+ROLE[role].org; $(\'#roleSel\').value=role; }\n\n/* ================= 页面 ================= */',label='module')
# 5) 渲染出口钩子
sub1("main.innerHTML=PAGES[page](); if(page==='kb') KG.mount(); if(page==='qr'&&qrFocus) focusQrCard(); if(page==='agent') initAgent(); }",
     "main.innerHTML=PAGES[page](); if(page==='kb') KG.mount(); if(page==='qr'&&qrFocus) focusQrCard(); if(page==='agent') initAgent(); I18N.apply(document.body); }",label='render')
sub1("function toast(t){const e=$('#toast');e.textContent=t;",
     "function toast(t){const e=$('#toast');e.textContent=I18N.t(t);",label='toast')
sub1("function openDrawer(html){$('#drawer').innerHTML=html;$('#overlay').classList.add('show');$('#drawer').classList.add('show')}",
     "function openDrawer(html){$('#drawer').innerHTML=html;I18N.apply($('#drawer'));$('#overlay').classList.add('show');$('#drawer').classList.add('show')}",label='drawer')
sub1("function openModal(html,wide){$('#modal').innerHTML=`<div class=\"box${wide?' wide':''}\">${html}</div>`;$('#overlay').classList.add('show');$('#modal').classList.add('show')}",
     "function openModal(html,wide){$('#modal').innerHTML=`<div class=\"box${wide?' wide':''}\">${html}</div>`;I18N.apply($('#modal'));$('#overlay').classList.add('show');$('#modal').classList.add('show')}",label='modal')
sub1("function download(name, content, type='text/plain'){ const b=new Blob([content],{type});",
     "function download(name, content, type='text/plain'){ name=I18N.t(name); if(typeof content==='string') content=content.split('\\n').map(l=>I18N.t(l)).join('\\n'); const b=new Blob([content],{type});",label='download')
# 6) 知识图谱 canvas 标签
sub1("ctx.strokeText(n.label,n.x,y);","ctx.strokeText(I18N.t(n.label),n.x,y);",label='kg stroke')
sub1("ctx.fillText(n.label,n.x,y);","ctx.fillText(I18N.t(n.label),n.x,y);",label='kg fill')
# 7) 说明书审核：中文原稿段落不翻
sub1("<div class=\"manual-text\" ${source?'':`contenteditable=",
     "<div class=\"manual-text\" ${source?'data-noi18n':`contenteditable=",label='manual src side')
sub1('<div class="manual-text src">${manualRich(ch.source[i]||\'—\')}</div>',
     '<div class="manual-text src" data-noi18n>${manualRich(ch.source[i]||\'—\')}</div>',label='manual src diff')
# 8) 智能体意图：补英文关键词
sub1("if(!isInvite&&/没有|缺少|哪些订单|接口人|无法升级/.test(t)&&/接口人|工厂|升级/.test(t)&&!tid)",
     "if(!isInvite&&/没有|缺少|哪些订单|接口人|无法升级|without|missing|no factory contact|which orders/i.test(t)&&/接口人|工厂|升级|contact|factory|escalat/i.test(t)&&!tid)",label='reply contacts')
sub1("if(role==='factory'&&/升级给我/.test(t)) list=list.filter(x=>x.status==='factory');",
     "if(role==='factory'&&/升级给我|escalated to me|assigned to me/i.test(t)) list=list.filter(x=>x.status==='factory');",label='reply escalated-to-me')
sub1("return `<div class=\"txt\">${role==='factory'&&/升级给我/.test(t)?",
     "return `<div class=\"txt\">${role==='factory'&&/升级给我|escalated to me|assigned to me/i.test(t)?",label='reply escalated-to-me 2')
# 9) boot：捕获侧栏中文源 → 启动 I18N
sub1("$('#whoOrg').textContent=ROLE[role].name+' · '+ROLE[role].org; const [h,hArg,hArg2]=",
     "$('#whoOrg').textContent=ROLE[role].name+' · '+ROLE[role].org; restoreChrome(); I18N.boot(); const [h,hArg,hArg2]=",label='boot')
open(DST,'w',encoding='utf-8').write(h)
print('patched',n,'sites;',len(h),'bytes')
