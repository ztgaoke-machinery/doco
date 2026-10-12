# AI 协作改动说明 —— **源码线**（`2-源码-可重建`，接手前必读）

> 本文件描述**第 73 / 74 轮**在源码包 `2-源码-可重建` 里做的改动：把成品（`1-游戏-双击即玩`，round108/v0.91）已经落地的增量，按模块化结构**并回源码**。
> 与同名的成品包文件 `1-游戏-双击即玩/AI协作改动说明.md` 是**两份文档**：那份讲成品里"11 岛 → 9 区域"的世界地图改动，**本包一行都没碰**（模块 7 归另一位负责人）。
> 结构沿用制作人的口径：§0 基线 → §1 改动 → §2 文件与函数 → §3 防冲突 → §4 工具链 → §5 已知瑕疵。

---

## 0. 基线（改动从这里起算）

- 基线 = **制作人交付包 `【薪火计划】祇酒多克多比制作v1.20原版` 里的 `2-源码-可重建`**（STATE.md 头部为**第 72 轮**，模块化批次 1–9 已完成，`game/ui/hud.js` 尚不存在）。
- 改动前后**逐文件比对**（`diff -rq`，排除 `.git` / `_tmp_test_out` / `.crops` / `_tools/py`）：
  - **删除 0 个文件**（`Only in 基线` = 0）；
  - **修改 121 个**：代码与文档 **33** 个 + 素材与图集 **88** 个（`assets/skills/` 82 项 = 81 张图标位图 + `index.json`；`_tools/glyphs/*` 6 个图集重生成产物）；
  - **新增 513 个文件**（顶层 56 项，其中三个素材目录就占 373：`assets/ui/bottombar/` 154 + `assets/skills/gray/` 164 + `assets/items/gray/` 55）：新代码 3（`game/ui/hud.js`、`save-web.js`、`_tools/gen-web-save.mjs`）+ 素材 468 + 记账与证据 103（`docs/验收单/` 7 份、`docs/shots/round74/` 5 张、`docs/shots/验收单证据/` 80 张）+ git 配套 2（`.gitignore`、`.gitattributes`）。
  - ⚠️ 基线的 `assets/ui/` 是一个**空目录**（0 个文件）—— 这 31 张顶层 UI 贴图（壁纸/取名钮/结算页/状态卡）在基线里根本不存在，是本次最大的素材缺口。
- 依据等级：本包**没有新增任何官方数据**。所有增量都来自成品已有实现（转述级），逐条在 `docs/deviations.md` **V90–V96** 登记，缺依据的两项进 `BLOCKED.md` **B16 / B17**。
- **提交历史就是给制作人审 diff 用的**：基线之后 11 个提交，按 `chore(git)` → `feat(素材)` → 模块 **2 → 1 → 4 → 3 → 5 → 6 → 字形图集 → 8** → `docs(交付记账)` 排列
  （依赖顺序，不是编号顺序：引擎先于页面，素材先于接线）。审法：`git log --oneline` 取基线那一条，再 `git diff <基线>..HEAD -- game/`。
  同一个文件被两个模块改过时（`engine/mouse.js` = 模块 3 + 4 的点击换算；`game.html` 里含模块 4 的按钮与模块 8 的挂载），
  **整文件归第一个模块**，另一部分在那条提交信息里写明 —— 不做半文件暂存，免得审到一半发现分片对不上。

---

## 1. 相对基线的改动（按模块，7 个模块 = 分工表里的 1/2/3/4/5/6/8）

| 模块 | 一句话 | 玩家看得见的变化 |
|---|---|---|
| **1 页面/启动器** | `game.html` 挂 `save-web.js` + 首次取名面板 `#namePanel`，页面壁纸用 `assets/ui/bg_page.png`，工具栏加 `#btn-dpr` | 双击网页与双击 exe 看**同一份存档**；第一次进游戏会弹**取名大框** |
| **2 引擎/存档** | `G.ASSET_VER` + `G.assetUrl()` 破浏览器缓存；`nameChosen` 入档 + `save.flushNow()` 绕防抖；音频双轨 `playOverlay/playBgm({seekTo})` | 改了素材**刷新就见效**（不再看到旧图）；取名后立刻关窗**不会丢名字**；探索 BGM 与战斗 overlay 能并存、音量同步跟随静音键 |
| **3 输入/鼠标/特效** | `applyCursor(cvs, hovering, icon)` 第三参；`SKILL_FX` 补 6 个 7k7k 技能专属特效；字形图集 +「灼」「翎」 | 战斗瞄准时光标变成**法杖/药水**；6 个新技能有**自己的弹道与命中特效**，不再是通用方块 |
| **4 DPR 高清画布** | `fit()` 按 CSS 尺寸 × devicePixelRatio（上限 2）开缓冲，`draw()` 首行 `setTransform`，`toCanvas()` 读逻辑尺寸 | 高分屏/大窗口下文字与像素**不再发糊**；右上角「高清 开/关」可即时对比；放大后**点击不偏移** |
| **5 数据表** | 6 张表逐张 diff：只有 `buildScenes()` 没透传 manifest 的 `walk` → 补 `walk: s.walk \|\| null` | 暂时**看不见**（要等模块 10 补 mask 与挂载，见 B17） |
| **6 技能表 + 图标索引** | `skills-official.js` 136 → **142 条**（+6 个 7k7k 技能、一批 `icon` 改指 9xxxxx）；`assets/skills/index.json` 重生成 155 → **164** | 技能面板/图鉴**多 6 个技能**，图标都是真图（不再是橙色占位方块） |
| **8 战斗 HUD 原版化 + 结算页** | 新建 `game/ui/hud.js`（231 行）：探索/战斗**同一张原版状态卡**；`ui/result.js` 重写（246 行）为成品整套结算页；血条**缓动** | 左上角不再是我们自己拼的色条；扣血时血条**滑下去**而不是跳；胜利后是原版的**曲边结算面板**（位图数字 + 贴图标签 + 掉落行 + 悬停「确定」） |

---

## 2. 改动涉及的文件与函数（不要无脑覆盖）

### 2.1 新增
| 文件 | 内容 |
|---|---|
| `game/ui/hud.js` | **只画不裁决**。分层：`hud_frame` 底框 → `ele_*.png` 属性图标 → `hud_bars_full` 血蓝条 → `hud_head` 头像（7 点多边形 clip）→ `hud_ring` 等级圈 → `digit_0..9.png` 位图数字 → 描边名牌。导出 `drawHudCard()` / `drawBattleStatusCard(b, p)` / `HUD`（尺寸常量）/ `HUD_DIGIT_WH` / `ELE_WH`。存档数值**只**经 `G.app.saveData()`、`G.app.player.playerStats()` 桥取 |
| `save-web.js` | 纯 ASCII 的 `<script>` 存档副本，挂 `window.__DKDbb_WEB_SAVE__`。**生成物，勿手改**（`_tools/gen-web-save.mjs`） |
| `_tools/gen-web-save.mjs` | 从 `1-游戏-双击即玩/web` 的种子存档生成上面那份副本；路径按"exe 与 `game.html` 同目录"解析 |
| 素材 | `assets/ui/bottombar/`（154 项：22 张底栏图 + `digit_0..9.png` + `ele_*.png`）、`assets/ui/result-*.png`（12）、`battle-*`（8）、`skill-icon{,-gray}.png`、`item-page-*`（4）、`name_ok{,_h}.png`、`cursor-{wand,potion}.png`、`bg_page.png`、`assets/skills/skill_icon_900001..900011.png` + `assets/skills/gray/`（164）+ `assets/items/gray/` |

### 2.2 修改（按文件 → 函数）
| 文件 | 改了哪个函数 / 字段 |
|---|---|
| `game/core/state.js` | 新增 `view = { sx, sy, dprOff }`，随 `G.core` 导出 |
| `game/core/canvas.js` | `fit()` 重写（DPR + 上限 2 + `?dpr=off` + 发布 `window.__DKDbb_VIEW__`） |
| `game/core/images.js`、`game/ui/{bag,skillpanel,zukan}.js` | 6 处 `im.src` 全部改走 `G.assetUrl()` |
| `game/game.js` | `draw()` 首行 `setTransform(sx,0,0,sy,0,0)`；业务代码**仍按 960×560 写** |
| `game/engine/mouse.js` | `toCanvas()` 读 `__DKDbb_VIEW__` 的逻辑尺寸；`applyCursor(cvs, hovering, icon)` 加第三参 |
| `game/engine/engine.js` | `G.ASSET_VER` / `G.assetUrl()`（`http` 下给图片 URL 加 `?v=`，`file:` 与测试台不加）；音频双轨 `playOverlay/stopOverlay/syncAudioVol/isMuted/playBgm({seekTo})`；调试口 `__overlay/__overlayLoop/__bgmSeek/__loop`（**未增新键**，`test-debug-surface` 恒 283） |
| `game/engine/fx.js` | `SKILL_FX` 补 6 条（魔气弹 / 魔焰灼烧 / 血冰箭 / 魔羽箭 / 吸血蔓藤 / 血晶地刺） |
| `game/app/{battle,rename,title}.js` | `battleTick` 里 `showHp/showMp` 按 `1-e^(-7dt)` 指数逼近、差 <0.6 吸附；`promptFirstName()` 进世界时才检查 `nameChosen` |
| `game/tables/data.js` | `buildScenes()` 加 `walk: s.walk \|\| null` |
| `game/tables/skills-official.js` | 136 → 142 条（**表体来自成品产物**，原因见 V90 / B16） |
| `game/ui/explore.js` | **删除**我们自拼的「场景名 / 地形 / Lv.EXP 条」→ `drawHudCard()`；底部脚注（`:71` 岛名 · 地形 · 本岛场景 i/n）**保留** |
| `game/ui/battle-view.js` | 左上角 44 行旧血条 → 一行 `drawBattleStatusCard(b, p)`；顶部「⚔ 对战中 · 场景名」起笔从写死 `x=78` 改为 `BATTLE_CARD.x + HUD.w*HUD.s + 12`（≈247），**给状态卡让位** |
| `game/ui/result.js` | 整套重写（见 V91 / V93） |
| `game/input.js` | 结算分支改成品口径：胜利页**只认「确定」/ 空格 / 回车**（去掉 Esc 与点任意处）；战败页不变 |
| `game/boot.js` | `#btn-dpr` 接线：切 `view.dprOff` → `fit()` → 按钮文字「高清 开/关」 |
| `game.html`、`game/style.css` | `#namePanel` + `#nameOk`、页面壁纸、`#btn-dpr` |
| `_tools/game-harness.mjs` | FakeCanvas **忽略 `width/height` 写入**（只读 getter，见 V95）；补 `quadraticCurveTo/bezierCurveTo` 记账 |
| `_tools/pixel-canvas.mjs` | `quadraticCurveTo` 按 **24 段折线真画** |
| `_tools/shoot.mjs` | 拍结算页**按时间**推进到 `resultT ≥ 0.4s`；收尾战斗改为**主动出招**（每回指令阶段 `selectCommand('攻击')` + 回车，上限 900 帧，没收场打 `⚠`） |

---

## 3. 给接手 AI 的"防冲突"约定（最重要）

1. **逻辑坐标系只有一个：960×560。** 任何新绘制代码**不要**乘 DPR、不要读 `cvs.width/height` 来换算。要尺寸就读 `window.__DKDbb_VIEW__`。同理测试台的 FakeCanvas 恒 960×560（尺寸写入被忽略）——**无头截图不能用来验证 DPR**，DPR 只在真浏览器测（`?dpr=off` 对比）。
2. **`ui/hud.js` 是纯绘制层。** 模块边界测试会钉：它里面出现 `save.` / `localStorage` / `expectedDamage` / `damage(` / `channelOf` / `defFactor` **一律算红**。要数值就走 `G.app.saveData()` / `G.app.player.playerStats()`。同理 `ui/result.js`。
3. **`drawExplore()` 会被当背景复用**（dialog / questlist / warreport 都调它）。凡在探索层新加 HUD，守卫写 `S.mode==='explore' && !S.dialog`，否则会在弹窗上叠一张卡。
4. **状态卡 = 成品第 105 轮那一套。** `AI协作改动说明.md`（成品包）§4b 的 v5 `CARD5` **已作废** —— 成品自己删了它，用户 2026-10-11 拍板跟第 105 轮。**不要**再照 §4b 实现 v5，那是回头路。
5. **位图数字/图标尺寸用常量表**（`HUD_DIGIT_WH`、`ELE_WH`、`DIGIT_BBOX`），**不要**读 `naturalWidth` 或 `getImageData`：测试台假图恒 320×320，`file://` 下读像素会被判污染。等级数字是 **10 张单图**（`digit_0..9.png`），**没有** `hud_digits.png` 图集 —— 按图集名去要会 404，而假图恒"就绪"，无头截图查不出来。
6. **所有图片 URL 走 `G.assetUrl()`。** 直接 `im.src = 'assets/...'` 会在改素材后被浏览器缓存吃掉。
7. **字形图集三步走，别改中间产物。** 新代码/新文案里出现图集外的字 → `test-glyphs` 报缺字。修法固定三步：`node _tools/gen-glyphs-prep.mjs` → `powershell -File _tools/_gen.ps1` → `node _tools/gen-glyphs-post.mjs`，然后把 `docs/复刻与构建手册.md` 的「字形总数」改成新数（R12：改文档不改校验脚本）。
8. **存档一次性标记用 `save.flushNow()`**（绕 400ms 防抖）。防抖期内关窗会丢写盘的教训已经过一次（名字）。
9. **生成物不要手改**：`save-web.js`、`assets/skills/index.json`、`_tools/glyphs/*`、`docs/systems-status.json`、`docs/保真度报告.md`、`docs/test-baseline.json`（最后一份只有 `run-all-tests.mjs` 能写）。
10. **模块边界（分工）**：模块 **7 / 9 / 10 / 11 不属于本包这几轮**。具体未收：底部栏（`drawSceneFooter`）、左侧图标、聊天面板、顶栏、场景门、逐场景 walk mask。改这些前先看本表，别把别人的接口签名换了。

---

## 4. 工具链（复现每条改动）

```bash
cd 2-源码-可重建
node _tools/check-plan-freshness.mjs        # 开工自检（12 项）
node _tools/run-all-tests.mjs               # 全量回归：56 文件 / 51 通过 / 5 环境豁免恒红
node _tools/test-glyphs.mjs                 # 字形图集覆盖
node _tools/test-debug-surface.mjs          # 调试口键数（应恒 283）
node _tools/test-module-boundary.mjs        # 绘制层不得裁决
node _tools/sync-skill-icon-index.mjs       # 重生成 assets/skills/index.json
node _tools/gen-web-save.mjs                # 重生成 save-web.js
node _tools/shoot.mjs                       # 无头截图（探索 / 战斗指令 / 结算页）
node _tools/ui-overlap.mjs                  # 版式重叠检查
```
- `merge-skills3.mjs` **跑不起来**：输入 `_web/*.json` 不在工作区（B16）。需要改技能表时先向制作人索取归档。
- 临时探针脚本一律 `_` 前缀（`.gitignore` 已排），用完即删。

---

## 5. 已知瑕疵 / 待办（非 bug，按需处理）

1. **`walk` 数据入口已通、但不生效**（B17）：需要模块 10 给 `assets/manifest.json` 加 `walk` 字段并在 `game.html` 挂 `scene_86.walk.js`；那张 mask 图在归档里**没找到**。补之前所有场景继续走全局矩形 `WALK`，与改动前一致。
2. **`assets/skills/index.json` 源码侧领先成品 9 条**（成品那份没重生成过）。这是差异清单要求的修正，不是偏离 —— 但**两边不一致**，制作人若要求逐字节一致需拍板保留哪份。
3. **成品 `skills-official.js` 文件头注释写「共 136 个技能」是陈旧的**（实际 142）。源码侧已写 142。成品那份要不要顺手改对，由制作人定。
4. **结算页 8 位大数值会压扁数字**（V93，源码侧的修正，成品没有）。常规 5~6 位不触发 → 与成品逐像素一致。
5. **DPR 开关不持久化**（V94，与成品一致 —— 成品也只有 `?dpr=off`）。差异清单提过"要持久化"，约 5 行，等拍板。
6. **`docs/交接与协作指南.md:69` 还写「字形图集（4918 字）」**，`check-plan-freshness` 不检查这一处。已在 V90 记为待顺手改正（历史日志里的 4918 **不改**，追加式记录）。
7. **无头截图工具看不到 DPR，也可能看不到"图没加载"**：假图恒就绪。截图证据**以真浏览器为准**（`docs/shots/round74/`、`docs/验收单/模块8-*` 里那三张真机图）。内置浏览器截图口拿不到可视区域（`visibilityState=hidden` 时 rAF 不跑）→ 手法：给临时静态服务加 `POST /_shot?name=x.png`，页面自己 `canvas.toDataURL()` 回传落盘，绘制函数直连调用。

---

## 6. 本轮交付物清单（制作人核对入口）

| 文档 | 位置 | 记了什么 |
|---|---|---|
| 自主迭代日志 | `docs/自主迭代日志.md` | **第 72 轮补记 + 第 73 / 74 轮**，四列表 `| # | 问题 | 根因 | 改动 | 验证 |` |
| 偏离登记 | `docs/deviations.md` | **V90–V96**（拷产物的原因、折线近似贝塞尔、HUD 口径、数字压扁、DPR 上限与不持久化、无头工具行为、页内存档快照的边界） |
| 缺失登记 | `BLOCKED.md` | **B16**（`_web/` 抓取归档不在工作区）、**B17**（scene_86 walk mask 与挂载，归模块 10） |
| 状态页 | `STATE.md` | 第 73 / 74 轮实况、版本号与回归数字 |
| 计划书 | `00-PLAN.md` | §9.1 基线快照（轮数 71→74、回归 56/2252、字形 4918→4926）+ §12 变更记录一行。**§3 规则表与 §4 决策点一字未动** |
| 验收单 | `docs/验收单/`（**7 份**） | 模块 **1 / 2 / 3 / 4 / 5 / 6 / 8** 各一份：改了哪些文件、游戏里的体现、测试结果、实测证据、最短人工验证路径、与成品的有意差异 |
| 截图证据 | `docs/shots/round74/`（5 张）+ `docs/shots/验收单证据/`（80 个文件 28 MB） | 真浏览器 3 张（HUD 卡 / 战斗状态卡 / 胜利结算）+ 让位与压扁各 1 张；`验收单证据/` 是从工作区的 `验收截图/` **整批复制进仓库**的（模块 4 的 dpr 开/关对比、模块 8 的真浏览器 14 张 + 无头 64 张），制作人 clone 就能看到，不必另外索取目录 |
| 差异对照 | `新建文件夹 (2)/源码与成品差异-任务清单.md`（工作区根，不在本包内） | 逐模块的 diff 结论与归属 |

**回归结论**：本机基线**不变** —— 56 文件 / 51 通过 / 5 环境豁免（红名单恒等于 `test-dungeon`、`test-scene-d4`、`test-scene-names`、`test-conversation-export`、`test-handoff-bundle`）；断言 2192 / 17。

---
**接手这几轮改动前请先读完本文件 §3，再打开 `docs/自主迭代日志.md` 的第 73 / 74 轮。**
