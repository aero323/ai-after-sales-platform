# 把 outputs/kg.js 与 kg.css 同步进后台单文件（替换已有块）
import os,sys
F=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),"原型_品牌方后台.html")
D=os.path.dirname(os.path.abspath(__file__))
s=open(F,encoding='utf-8').read()
js=open(os.path.join(D,'kg.js'),encoding='utf-8').read(); css=open(os.path.join(D,'kg.css'),encoding='utf-8').read()
i=s.index('const KG=(()=>{'); j=s.index('/* ================= 知识库管理 ================= */',i)
s=s[:i]+js+'\n\n'+s[j:]
a=s.index('\n/* ---------- 知识图谱面板'); b=s.index('</style>',a)
s=s[:a]+css+'\n'+s[b:]
open(F,'w',encoding='utf-8').write(s); print('synced')
