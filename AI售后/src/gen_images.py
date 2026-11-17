# 把 src/img/*.jpg 转成 base64 data URI，生成 h5_images.js（由 build.py 自动调用）
# 图片来自 minimax-h3-image 生成，压缩后内嵌，保证原型仍是"双击就能开"的单文件。
import os, base64
b=os.path.dirname(os.path.abspath(__file__))
img_dir=os.path.join(b,'img')
order=['hero','engineer','label','tech','sm_top','sm_catch','sm_bolts','tr_belt','tr_console','rw_motor','rw_console']
parts=[]
for name in order:
    p=os.path.join(img_dir,name+'.jpg')
    if not os.path.exists(p): continue
    with open(p,'rb') as f: data=base64.b64encode(f.read()).decode('ascii')
    parts.append(f'  {name}:"data:image/jpeg;base64,{data}"')
src='/* 自动生成：src/img/*.jpg → data URI（见 gen_images.py）。图片由 minimax-h3-image 生成。 */\nconst H5_IMG={\n'+',\n'.join(parts)+'\n};\n'
open(os.path.join(b,'h5_images.js'),'w',encoding='utf-8').write(src)
print('h5_images.js written (%.1f KB)'%(len(src)/1024))
