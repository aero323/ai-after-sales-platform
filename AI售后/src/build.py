# 把拆分的源码拼成单文件原型：
#   python3 build.py        → H5 + 客户追踪页（默认，两个都不碰后台单文件，安全）
#   python3 build.py track  → 只构建客户追踪页（原型_客户追踪页.html）
#   python3 build.py all    → H5 + 后台（勿用，见下）
# 注意（2026-11-11）：原型_品牌方后台.html 在 11-09 之后被直接改过（约 600 行差异未回写 src），
# 用 all 重建会覆盖这些改动。回写 src 之前不要用 all。
# 知识图谱模块（2026-11-11）：源码在 kg.js / kg.css，改完跑 python3 sync_kg.py 直接替换进后台单文件；测试 node kgtest.js。
# policy.js 里的 __POLICY_DEFAULTS__ 在构建时用 policy.config.json 内容替换；
# H5 的图片由 gen_images.py 转成 data URI 内嵌，两个原型文件仍然是"双击就能开"的单文件。
import os, json, sys, subprocess
b=os.path.dirname(os.path.abspath(__file__)); out=os.path.dirname(b)
r=lambda f: open(os.path.join(b,f),encoding='utf-8').read()

cfg=json.load(open(os.path.join(b,'policy.config.json'),encoding='utf-8'))
_src=r('policy.js')
_anchor="const POLICY_DEFAULTS = (typeof __POLICY_DEFAULTS__!=='undefined') ? __POLICY_DEFAULTS__"
_i=_src.index(_anchor); _j=_src.index(';', _i)+1     # 替换到整条语句结尾
policy_src=_src[:_i]+'const POLICY_DEFAULTS = '+json.dumps(cfg, ensure_ascii=False, indent=1)+';'+_src[_j:]

subprocess.run([sys.executable, os.path.join(b,'gen_images.py')], check=True)

if len(sys.argv)>1 and sys.argv[1]=='all':
    open(os.path.join(out,'原型_品牌方后台.html'),'w',encoding='utf-8').write(
        r('head.html')+'\n'.join([r('qr.js'),r('engine.js'),policy_src]+[r(f) for f in ['app_state.js','app_pages.js','app_agent.js']])+'\n</script>\n</body>\n</html>\n')
    print('built admin')
open(os.path.join(out,'原型_H5扫码端.html'),'w',encoding='utf-8').write(
    r('h5_head.html')+policy_src+'\n'+r('h5_images.js')+'\n'+r('engine.js')+'\n'+r('h5_app.js')+'\n</script>\n</body>\n</html>\n')
print('built h5')

# 客户追踪页（设计_客户追踪页_v1.md §10）：track_head + policy + engine + track_app。
# engine 只用于产品系列名与 LANG_NAME，不读图片；页面无任何外链资源。
# 目标：无参数 = H5 + track；track = 只构建追踪页；all = 原行为（H5 + 后台，勿用）。
_targets=sys.argv[1:]
if (not _targets) or ('track' in _targets):
    open(os.path.join(out,'原型_客户追踪页.html'),'w',encoding='utf-8').write(
        r('track_head.html')+'\n<script>\n'+policy_src+'\n'+r('engine.js')+'\n'+r('track_app.js')+'\n</script>\n</body>\n</html>\n')
    print('built track')
