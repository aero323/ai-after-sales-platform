# H5 改版前备份（2026-11-11）

这是按 SoCare 参考改成"拍照 / 录短视频为主"之前的 H5 扫码端（对话气泡版，2026-11-09 16:11 构建）。

- `原型_H5扫码端.html`：改版前的单文件原型，双击可直接打开。
- `src/h5_head.html`、`src/h5_app.js`：改版前的源码，与上面的 HTML 逐字节一致（已用 build 逻辑重新拼装校验）。
- `src/h5test.js`：改版前的 H5 测试（36 项，在旧版上全过）。

回滚方法：把 `src/` 下两个文件复制回 `AI售后/src/`，在 `src/build.py` 里去掉 `h5_images.js` 那一段后运行 `python3 src/build.py`；或者直接用本目录的 HTML 覆盖 `AI售后/原型_H5扫码端.html`。

engine.js、policy.js、后台原型这次都没有改动，不在备份范围内。
