# -*- coding: utf-8 -*-
"""i18n_dict.json → i18n_dict.js（单文件里 i18nDict <script> 的内容）。改完字典跑这个，再跑 i18n_patch.py。"""
import json,os
d=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'i18n_dict.json'),encoding='utf-8'))
def obj(o): return '{\n'+',\n'.join(json.dumps(k,ensure_ascii=False)+':'+json.dumps(v,ensure_ascii=False) for k,v in o.items())+'\n}'
out="/* 英文字典：MAP 精确句；PAT 带 \\u0000 占位的句型。由脚本从源码与渲染结果抽取后翻译；补充项放 I18N_EXTRA。 */\nconst I18N_DICT={MAP:"+obj(d['MAP'])+",PAT:"+obj(d['PAT'])+"};\nconst I18N_EXTRA={};\n"
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'i18n_dict.js'),'w',encoding='utf-8').write(out)
print('i18n_dict.js',len(out),'bytes', len(d['MAP']),'map', len(d['PAT']),'pat')
