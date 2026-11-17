# AI 售后 · 术语讲解

> 面向两拨人写两版：
> **第一部分「给业务侧」**——去掉英文字段名，用流程和场景讲，用于会议、demo 讲解、给品牌方/工厂看的材料。
> **第二部分「给开发」**——标注代码字段名与所在文件（`src/engine.js`、`src/app_state.js`），用于实现和联调。
>
> 整理日期：2026-11-05。与原型 SEED_VERSION v5 一致。

---

# 第一部分 · 给业务侧

按"一封邮件进来之后，一路变成结案"的顺序讲，五层。

## 一、机器怎么认出"这是什么、哪台、谁卖的"

这一段的所有信息都来自同一个源头——**序列号**，它是整个系统的锚点。

- **型号**：这是哪一款产品，比如 SM-900 史密斯机、TR-650 跑步机。SKU 是它在仓库和报关单上的正式编号（如 IP-SM900-BK）。
- **序列号（SN）**：贴在后立柱标签上的一串字符，相当于机器的身份证号。
- **序列号前缀**：SN 开头的几位字母数字，直接对应型号——看到 SM9 就知道是 SM-900。
- **批次**：SN 中间那段（如 24B），代表同一批生产下线的机器。批次的用处只有一个：判断"是不是这批货都有毛病"。
- **订单**：品牌方向工厂下的那张采购单（如 PO-24118）。一张订单对应一个批次、一个分销商、一个收货城市。
- **分销商 / 收货城市**：这台机器最终卖到哪个零售商的哪个仓。AI 承诺寄件时，零件就从这里发出。
- **保修截止**：判断这次维修免费还是收费。
- **原始序列号**：有些工厂（如 Bodylonger）不用字母前缀，就是 11 位纯数字（如 20251042535）。系统认它，但解析不出批次，只能靠工单本身带订单。

**一条铁律**：订单归属只认序列号，不猜。没有序列号，系统宁可把订单留空等人工补，也不会因为"这个型号只有一张订单"就硬塞。FWT-61 案例里地址重复输入三次，就是预判订单归属太松造成的。

## 二、工单是什么

一段客户对话，加一个能追踪的状态。

每条工单上有：工单号、状态、进入当前状态的时刻（秒表起点）、客户信息（名字/邮箱/语言）、渠道（邮件 / 扫码 H5 / 代客户录入）、问题摘要、时间线、照片张数、客户评分、AI 追问轮数。

**时间线**记录"谁、什么时候、说了什么"。参与方有五种：客户、AI、品牌售后、工厂、分销商，加上记录系统动作的"系统"。

**状态是这套系统最核心的一张表**，它同时决定"谁在干活"和"时限怎么算"：

```
AI 处理中 → 修复指导中（让客户先自己修，2 天窗口）
          → 待品牌方售后（一级）
          → 已升级工厂（二级）
          → 已解决
其中任何在跑的工单超过时限，显示为红色「SLA 超时」
```

## 三、升级链条和时限

- **一级 / 二级路由**：一级是品牌方售后（4 小时），二级是工厂销售（24 小时）。三级是工厂内部，平台看不见，叫「黑盒」。
- **SLA 时限**：上面两个数字，改设置会立刻改变所有工单的红线。只用三种状态计算：待品牌方售后（+4h）、已升级工厂（+24h）、修复指导中（2 天窗口）。
- **建议升级**：AI 只会建议，不会替你按按钮——品牌方确认后才真正升级。
- **接口人**：升级后具体接手的工厂那个人。分三层——组织级默认接口人、订单级覆盖、工厂自己拉进来的单工单工程师。
- **脱敏**：工厂视角只看得到语言区、序列号、问题、照片、AI 摘要，看不到客户姓名和邮箱。品牌方是唯一对客窗口。
- **待放行**：工厂写了回复不能直接发给客户，必须品牌方点"放行"，AI 才翻译成客户语言发出。

## 四、AI 怎么决定"我自己回、还是先问、还是叫人"

这是产品里最值钱的部分，三个词要记牢。

**置信度**：AI 对自己"知道怎么修"的把握，0–100 分。算法是可解释的加法——基础 35 分，知识库关键词每命中一个加 10 分（封顶 30），认出产品 +12，有有效序列号 +10，有照片 +8。**知识库里压根没匹配到条目，封顶 45 分**，不管型号序列号照片凑得多齐都上不去。这条是防"我不认识这个问题，但格式上看起来很像"的假自信。

**阈值**：给 AI 定的及格线，默认 85。三档判定：

- 置信度 ≥ 阈值 → 直接回复
- 在"阈值 − 25"到阈值之间 → 追问补充信息，最多两轮
- 再低，或触发了规则 → 转人工

**规则拦截**：有些事置信度再高也不让 AI 自己回。四个开关，全部"先给人看"：

| 规则 | 什么时候拦 |
|---|---|
| 安全件 | 钢缆、锁扣这类断了会伤人的零件 |
| 退换货 / 赔偿 | 客户提退款、换整机、chargeback |
| 负面情绪 | 提到律师、差评、公开评价、语气激烈 |
| B 端客户 | 非免费邮箱（企业客户），默认关 |

**追问**：信息不全时 AI 的问句，按已有信息裁剪——已经有序列号就不再要标签照片。

**修复优先**：FWT-61 提炼出的策略。命中这类问题，AI 先发"自己动手修"的步骤并设置 2 天跟进窗口。客户反馈"没修好"，才进入寄件确认。原则是：能让客户当天修好的，别走 10 天物流。

**承诺寄件**：AI 有没有权限直接答应"免费寄"。≤ 50 美元的，设置打开就能自己承诺；超过 50 美元的（如 120 美元的控制板），必须人来点头，AI 只能说"同事 4 小时内确认"。

**批次聚集**：判断"是不是这批货的锅"。条件：同一型号、同一批次、同一故障 ≥ 3 起，且 ≥ 其他批次合计的 2 倍。用相对比例而不是绝对数，是因为某些故障本来就碎、某些型号销量小。达到条件，AI 给出升级工厂的建议卡。

**线程合并**：同一个邮箱的来信自动归入原工单。三条铁律：

1. 人工 / 工厂接手的工单客户再来信：只附消息提醒接手人，不改状态、不重置时限、不重复发安抚模板；
2. 客户说"解决了"就关单；
3. 关闭后 7 天内再来信，自动重新打开。

## 五、一封信里塞了三件事怎么办（FWT-61 带来的三个新结构）

**子问题**：一封来信拆成多条互不阻塞的问题，各有类型（技术问答 / 缺件 / 条件备件）、负责人、核销清单。核销清单就是"我问了两个点，你答了几个点"，全部勾完才自动结案。特别重要的一条：**"工厂未披露"也是一个正式结论**——把它勾上照样能结案。闭环验的是"有没有答复"，不是"有没有给到你想要的答案"。

**寄件记录**：件号、收件方、地址、运输方式、承诺日期、实际发运时间、运单号。发货超 24 小时没回填运单号，自动催办。承诺日期不是备注文字，是字段——这样才能算偏差。

**质量事件（CAPA）**：纠正与预防措施。工单上挂一个质量跟踪：现象、负责人、截止日、验证状态。规则：**口头措施不结案**，必须工厂提交验证结果、品牌方确认后才能关闭。FWT-61 里工厂那句"我们会找新型胶水"，就变成了这样一件 11-20 到期的质量事件。

## 六、其余零散术语

**知识库侧**

- 知识条目：AI 回答时真正用的那 8 条，每条带多语言关键词、回答模板、步骤、零件号、价格、是否安全件、是否修复优先。
- 资料文件：说明书原稿、爆炸图、STEP 模型、邮件归档——AI 的"原料"。
- 术语表：中英德西法对照，禁止某些译法，保证说明书和客服回复用词一致。
- 缺口：哪些产品没资料、问过的问题没条目。

**说明书侧**

- 合规检查共 12 项，只有最大用户体重、术语一致性、3D 动画三项是真算出来的，其余 9 项是模板默认通过——给客户演示时不要含糊。
- CE / EN 957 / ASTM F2276 / WEEE：不同市场必须印的声明。
- 爆炸图 / BOM：装配章节的零件号来源，也是客服"按件号寄件"的前提。没有它，说明书和售后就接不上。

**订单与协作侧**

- 合作方：工厂和分销商都是组织。
- 接口人状态：已接受 / 待接受。
- 一物一码 vs 固定通用二维码：会议已拍板选后者，一个型号一个码，扫码后靠用户手输序列号识别个体。
- H5：手机网页，不用装 App。
- B 端：经销商 / 健身房这类企业客户，区别于终端消费者。

---

# 第二部分 · 给开发

> 字段名以 `src/engine.js`、`src/app_state.js` 当前代码为准（2026-11-05，SEED_VERSION v5）。

## 产品与订单（engine.js）

```js
PRODUCTS[] = { id, series:{zh,en}, sku, snPrefix, has3d, maxUserWeight, manualLangs[] }
ORDERS[]   = { id, product, qty, brand, factory, dealer, dealerCity, batches[], ship, warrantyUntil }
```

- `state.products`（app_state.js）在 engine 产品目录之上补了 `qr`（是否发码）、`maxUserWeight` 可被说明书审核回写。
- `state.orders` 由 `Engine.ORDERS` 生成，并补 `source`（ERP 导入 / 手动创建 / CSV）、`createdAt`、`overrides[]`、`excluded[]`。
- **订单归属只通过 `parseSerial`**：`SN_RE = /([A-Z]{2}\d)-?(\d{2}[A-Z])-?(\d{5})/`，返回 `{sn, valid, product, batch, order, dealer, city, factory, warrantyUntil}`。
- 纯数字 11 位（`\b\d{11}\b` 且不匹配标准格式）→ `{sn, valid:true, raw:true, product:null, batch:null, order:null}`，订单由工单携带。F-C20 / Bodylonger 用这个。
- **不猜订单**：`runPipeline` 里 `order` 只来自 `serial.order` 或已有工单的 `t.order`；`Engine.orderFor(product)` 仅用于 H5 模拟 OCR 选批次，注释明确"不用于判定工单归属"。
- `buildOrder` 校验：订单号格式 `PO-\d{3,6}` 且唯一；型号存在；批次 `^\d{2}[A-Z]$` 且**一个批次只能属于一张订单**；工厂非空。

## 工单字段（app_state.js `newTicket`）

```js
{
  id, tag, ext,                      // 工单号 / 演示短标签 / 外部单号（{ref, ticket}，FWT-61 用）
  createdAt, updatedAt, statusSince, resolvedAt,
  status,                            // ai | guiding | human | factory | done（late 是派生态）
  resolvedBy,                        // ai | brand | factory | dealer
  cust:{name, email, lang},
  product, sn, batch, order, dealer,
  channel,                           // email | h5 | manual
  issue, kbId, confidence, reasons[],
  timeline:[{t, who, text, tr}],     // who: cust|ai|human|fact|dealer|sys；tr = 中文摘要/翻译
  rating,                            // 1–5
  photos,                            // 计数，不存图
  pending,                           // {type:'ship', part, from, value, at} 等品牌方确认
  shipped, asks,                     // 已寄件标记；AI 追问轮数（上限 2）
  issues:[], shipments:[], capa:null, guideDue:null,
  collab:[], suggest, assignee,
  h5Seen                             // 已合并的 H5 转录条数，增量桥接用
}
```

**状态与 SLA**：

```js
ST = { ai, guiding, human, factory, done, late }
slaDeadline(t):  human  → statusSince + settings.routes[0].hours*HR   // 默认 4h
                 factory→ statusSince + settings.routes[1].hours*HR   // 默认 24h
                 guiding→ guideDue                                    // 命中后 +2d
                 else   → null
isLate(t)     = deadline !== null && Date.now() > deadline
viewStatus(t) = isLate(t) ? 'late' : t.status
```

`setStatus` 一定刷新 `statusSince`（SLA 秒表重置点）；因此"人工接手后客户再来信"分支（`runPipeline` B 段）**只 `addEntry`，不 `setStatus`**，这是 SLA 不重置的实现方式。

## 判定引擎（engine.js `assess`）

```js
输入: { text, product, serial, photos, email, settings }
settings = { threshold, rules:{safety, refund, negative, b2b}, promise:{smallParts, bigParts, videos} }
输出: { match:{entry, hits, runnerUp, ambiguous}, confidence, reasons[], route, action, canShip, threshold }
```

置信度公式：

```
conf = 35
     + min(30, hits*10)              // 关键词命中，封顶 30
     - 10 (ambiguous)                // 与第二名同分
     + 12 (product) + 10 (valid serial) + 8 (photos>0)
无 match 时 conf = min(conf, 45)     // NO_MATCH_CAP
clamp 到 [10, 98]
```

路由：

```
reasons 非空                      → route:'human', action:'hold'
match && conf >= threshold        → route:'ai',    action:'reply'   // 直接回复必须有知识条目
conf >= threshold-25              → route:'ai',    action:'ask'     // 最多 2 轮（t.asks）
否则                              → route:'human', action:'hold'
```

`canShip = match.entry.part && shipOnReply!==false && (partValue<=50 ? promise.smallParts!==false : promise.bigParts===true)`

规则词表：`SAFETY_WORDS` / `REFUND_WORDS` / `NEGATIVE_WORDS` / `FREE_MAIL`（b2b 判定用免费邮箱反推）。注释标注：正式版由分类器 / LLM 承担，**保留的硬逻辑**是 `parseSerial`、订单归属、`assess` 路由与承诺、追问上限、`canShip`。

## 回信意图 `detectConfirm`

返回 `'human' | 'notfixed' | 'solved' | null`。优先级：**否定 / 转折 / 问句 > 强确认词 > 短致谢**。

- 先归一化（"又好了 / works again" → `fixedok`；"不再 / no longer" 抹掉）。
- `RE_HUMAN` → `'human'`；`RE_NOTFIXED` → `'notfixed'`。
- 出现 `RE_CONTRAST`（but/aber/但…）、否定词、或问句 → `null`（"Thanks, but still E07" 不关单）。
- `RE_SOLVED_STRONG` → `'solved'`；`RE_THANKS` 仅在 ≤6 词且 ≤8 个汉字时算 `'solved'`。

## 流水线与合并（app_state.js `runPipeline`）

返回 `{ticket, steps[], merged, assessment, reopened}`，`steps` 即后台演示的逐步动画（lang → product → order → kb → conf → rules → batch → decision → ticket）。

分支：

- **A. 已关闭 7 天内再来信**（`mergeThreads && resolvedAt > now-7d`）：致谢 → 保持关闭；其他 → `resolvedAt=null`、重开、转 `human`，AI 不再自动回复。
- **B. status 为 human/factory**：仅 `addEntry` + `t.photos` 累加 + 补序列号；`solved` → 关单；其余不改状态。
- **C. 新单或 AI 处理中**：正常 `assess`；`notfixed` / 同问题二次来信 / `human` 请求 → 强制 `route:'human'`。`skipReply`（H5 导入）直接落状态，不再生成回复。

同一发件人匹配：`cust.email` 全等。

## 批次聚集 `batchCluster`

```js
rel = 同 product + 同 kbId + 有 batch 的其他工单
same = rel 中 batch 相同的数量；others = rel.length - same
hot  = same >= 3 && same >= 2 * max(1, others)
```

只写入 `t.suggest = {type:'factory', reason}`，**不自动升级**；建议卡进"需要你的决定"。

## 子问题 / 寄件 / CAPA（FWT-61，O1–O6）

```js
issues[] = {
  type,          // tech 技术问答 | parts 缺件 | spare 条件备件
  title, status, // open | closed | shipped | done …
  owner,         // factory | brand
  asker,         // 外部提问方（Max / Force）
  checklist:[{q, done, ans}],   // 全勾且仍处理中 → 自动结案
  note
}
shipments[] = { parts, to, addr, method, promisedAt, shippedAt, tracking, trackingAt }
capa = { title, owner, due, status:'open'|…, at, note }   // 口头措施不结案
```

种子样本：`tag:'fwt61'` 工单 `T-2610-0206`，3 条子问题、1 条寄件（承诺 10-30 / 10-31 发 / 11-04 才回填运单 879545895350）、1 条 CAPA（换胶，`due:'2026-11-20'`）。专项测试 `src/verify_fwt61.js`（22 项）。

## 订单协作

```js
state.partners[] = { name, type:'factory'|'dealer', contacts:[{name, email, title, status:'active'|'pending', defaultAll, since}] }
orderMembers(o) → [{role:'b'|'f'|'d', scope:'brand'|'org'|'order', …}]
factoryContact(o) → active 的工厂接口人（没有则 pending 第一位）
recallFrom(email, orderIds, why) → 撤销接口人时其名下 factory 工单退回 human
visibleTickets() → 非 brand 角色：订单成员 ∩ 自己的订单 ∪ 工单级 collab
```

## 其他

- **知识条目 `KB[]`**：`{id, product('*' 通用), cat:{zh,en}, part, partName:{zh,en}, partValue, safety, video, shipOnReply, repairFirst, kw:{lang:[…]}, reply:{lang:fn}, steps:{zh[],en[],de?[]}, stepTitle}``
- **资料文件 `kbFiles[]`**：`{id, n, t(类型), src, st(已入库/待确认/解析中), at, p, size}`；类型：说明书 / 零件结构 / 3D 模型 / 历史客诉 / 术语表 / 故障代码 / 安装指导。
- **术语表 `terms[]`**：`{zh, en, de, es, fr, it, note}`；`TERM_LANGS = ['en','de','es','fr','it']`。
- **说明书 `manuals[]`**：`{id, product, langs[], market, template, outputs[], status:'generating'|'review'|'delivered', progress, checks[]}`；`manualChecks` 里 `src:'data'` 为真算、`src:'template'` 为模板默认通过。
- **库存 `inventory[]`**：`{part, name, qty, safe, loc}`；`shipPart` 扣减，`qty <= safe` 进提醒。
- **设置 `settings`**：`threshold`、`mailboxes[]`、`rules{}`、`promise{}`、`routes[{level,name,email,hours,cond}]`、`notify[]`、`h5Langs`、`serviceLang`、`brandColor`、`h5Email`、`h5App`。
- **持久化**：`localStorage` 键 `as_state`（后台）/ `as_h5_inbox`（H5→后台桥接）；`SEED_VERSION='v5'`，版本不符自动重置。
