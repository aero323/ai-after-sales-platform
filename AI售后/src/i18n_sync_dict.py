# -*- coding: utf-8 -*-
"""i18n_dict.json → i18n_dict.js → 原子替换 原型_品牌方后台.html 里 <script id="i18nDict"> 的内容。
   与 i18n_patch.py 不同，可重复执行：只换字典 script，不动其他补丁点。"""
import json,re,sys,os
HERE=os.path.dirname(os.path.abspath(__file__))
DECK=os.path.join(HERE,'..','原型_品牌方后台.html')
d=json.load(open(os.path.join(HERE,'i18n_dict.json'),encoding='utf-8'))
def obj(o): return '{\n'+',\n'.join(json.dumps(k,ensure_ascii=False)+':'+json.dumps(v,ensure_ascii=False) for k,v in o.items())+'\n}'
js=("/* 英文字典：MAP 精确句；PAT 带 \\u0000 占位的句型。由脚本从源码与渲染结果抽取后翻译；补充项放 I18N_EXTRA。 */\n"
    "const I18N_DICT={MAP:"+obj(d['MAP'])+",PAT:"+obj(d['PAT'])+"};\nconst I18N_EXTRA={};\n")
h=open(DECK,encoding='utf-8').read()
a=h.find('<script id="i18nDict">'); assert a>=0
b=h.find('</script>',a); assert b>a
new=h[:a]+'<script id="i18nDict">\n'+js+h[b:]
open(DECK,'w',encoding='utf-8').write(new)
print('synced dict into backend html:',len(d['MAP']),'MAP',len(d['PAT']),'PAT, file',len(new),'bytes')
