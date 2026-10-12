# 验收单 · 模块 8：战斗 HUD 原版化 + 结算页

> 口径（你 2026-10-11 拍板）：战斗状态卡**跟成品第 105 轮**——移植主页左上角那张原版 HUD 卡，
> **不做** `AI协作改动说明.md` §4b 里的 v5 CARD5（成品已把它删掉，§4b 作废）。范围 = 三块全做。

## 改了哪些文件

| 文件 | 改动 |
|---|---|
| `game/ui/hud.js` | **新建（231 行）**。原版状态卡的绘制：`hud_frame` 底框 → 属性图标 → `hud_bars_full` 血蓝条（Catmull-Rom 采样的斜切曲线裁切）→ `hud_head` 头像（7 点多边形 clip）→ `hud_ring` 等级圈 → `digit_0..9.png` 等级数字 → 名牌描边字。对外三个入口：`drawHudCard()`（主页）、`drawBattleStatusCard(b, p)`（战斗左上角，同一张卡）、`drawHudCardCore()`（可传血蓝比例的裸卡，测试用） |
| `game/ui/result.js` | **重写（224 行）**。成品第 103~107 轮的原版结算页整套：曲边渐变面板、三行「标签贴图 + 图集拼数字」、活动/组队标签、左右两列属性贴图、掉落行、悬停放大的「确定」钮、0.35s 入场动画；战败仍走旧样式。属性数字**按本列可用宽等比压扁**（8 位数不再顶穿到右列标签上，见下面第 4 条） |
| `game/ui/explore.js` | **删掉**我们自己拼的「场景名 / 地形 / Lv.EXP 条」顶部信息块，换成 `drawHudCard()`（带 `S.mode==='explore' && !S.dialog` 守卫，因为 dialog/questlist/warreport 都拿 `drawExplore()` 当背景） |
| `game/ui/battle-view.js` | 左上角旧血条块（44 行）→ 一行 `drawBattleStatusCard(b, p)`。顶部 notice 播报块按 2026-10-04 的决定保持移除，`b.log` 数据仍在。**顺带让位**：顶部那条「⚔ 对战中 · 场景名」原来写死 `x=78`（当年只躲一张 46×46 的队伍卡），现在正好压在移植进来的状态卡上 → 改成按卡片右边缘起笔（`BATTLE_CARD.x + HUD.w*HUD.s + 12`） |
| `game/app/battle.js` | `startBattle` 的玩家单位加 `showHp/showMp`；`battleTick` 加指数缓动（`1-e^(-7dt)`，差 <0.6 时吸附）→ 血条掉下去是"滑"的不是"跳"的；`phase==='over'` 胜利分支改写 `S.result`（含 `dropForm/dropSoya/shards`）并置 `mode='result'`、`resultT=0`、`resultTagMode='act'` |
| `game/input.js` | 结算页交互改成成品口径：胜利页**只认「确定」按钮**（悬停指针 + 点击 / 空格 / 回车），删掉 Esc 与"点任意处继续"；战败页保持任意键/任意点击 |
| `game.html` | 挂载 `<script src="game/ui/hud.js">`（在 `battle-view.js` 之前） |
| `_tools/game-harness.mjs`、`_tools/pixel-canvas.mjs` | 测试台补 `quadraticCurveTo`/`bezierCurveTo`（前者记账、后者按 24 段折线真画）——结算页的曲边面板在旧测试台里会直接抛异常 |
| `_tools/shoot.mjs` | ①拍结算页前**按时间**推进（`resultT ≥ 0.4s`）而不是按帧数：入场动画没走完就拍，得到的是"滑到一半"的错位图，而且越看越像正常，极易漏检；②假画布的 `width/height` 改成只读（见"实测证据"里的排查记录，这是结算页画不出来的真因）；③收尾战斗改为主动出「攻击」，收不了场打 `⚠` 不再静默跳过 |

素材**一个都没拷**：`assets/ui/bottombar/`（22 个 HUD 图 + `digit_0..9.png` + `ele_*.png`）和
`assets/ui/result-*.png`（12 个）在模块 6+8 那一批就已经到位，逐个 `fetch` 过全是 200。

## 游戏里的体现

1. **主页左上角**：原来是一行小字「场景名 / 地形」+ 一条 `Lv. 经验条`；现在是原版那张卡——头像、属性图标、
   斜切血蓝双条、等级圈里的位图数字、青白描边的名字。截图 `04-scene.png`。
2. **战斗左上角**：同一张卡，血条跟着 `showHp` 缓动。截图 `10-battle-command.png`。
3. **打完赢**：右半屏滑入深蓝曲边面板，「战斗胜利！」+ 多比等级 / 获得经验 / 升级所需三行（贴图标签 +
   蓝绿数字图集）+ 活动/组队标签 + 生命/攻击/魔法…两列属性 + 掉落 + 悬停放大的「确定」。截图 `13-result.png`。
4. **打输**：保持旧的黑底「败　北」页（成品也是这个口径，不是回归）。

## 测试结果

- 全量回归：`node _tools/run-all-tests.mjs` → **56 个文件 / 通过 51 / 失败 5**，断言 **2192 通过 / 17 失败**。
  与本机基线**逐项一致**；5 个红仍是环境豁免清单（`test-dungeon`、`test-scene-d4`、`test-scene-names`、
  `test-conversation-export`、`test-handoff-bundle`），不是新坏的。
- `test-module-boundary`：`hud.js` / `result.js` 都在 `game/ui/` 守卫范围内，**0 违规**——两个文件里
  `save.` / `localStorage` / `expectedDamage` / `damage(` / `channelOf` / `defFactor` 一个都没有，
  存档数值只经 `G.app.saveData()`、`G.app.player.playerStats()` 桥读（"只画不裁决"）。
- `test-debug-surface`：调试面保持 **283 键不变**（这次没加任何调试导出）。
- `test-glyphs`：本次新增注释只用到图集里已有的字，未触发重生成（改完战斗标题后再跑一次：**2460 字全在图集里**）。
- `_tools/ui-overlap.mjs`：296 帧面板巡检 **问题 0 处**（改完战斗顶部标题起点后重跑）。

## 实测证据

**真浏览器（http://localhost:8791/game.html?dpr=off，dpr=1）**：四条绘制路径直接调用，全部无异常——
```
drawHudCard: ok          battle status card: ok
drawResult: ok           result defeat: ok
resultOkRect() = {x:695, y:494, w:110, h:52}
```
素材就绪度（真机 `naturalWidth`，不是测试台的 320×320 假图）：
```
hud_frame.png  200 327x124    hud_bars_full.png 200 327x124
hud_head.png   200 373x400    hud_ring.png      200 42x42
digit_0..9.png / ele_{火水风土物理无暗毒}.png / result-*.png 12 张：全部 200 可解码
```
> 顺手记一条踩坑：探测时我按 `hud_digits.png`（单张数字图集）去要文件，得到 404 —— **等级数字是
> `digit_0.png`…`digit_9.png` 十个单图**，没有图集。测试台的假图永远"就绪"，所以这类名字写错
> 在无头截图里看不出来，只能真机 `fetch`。

血条缓动实测（真浏览器里把 `hp` 一次砍掉 60%，逐帧调 `battleTick(1/60)`）：
```
showHp: 14829893 → 12287771 → 10274690 → 8680553 → 7418172 → 6418506 → 5626881 → 5000001 → …（目标 2614635）
```
> 顺带一条排查经验：`battleTick` 在**开场演出期**（`b.intro > 0`）会提前 `return`，
> 所以那段时间血条不动是设计如此，不是缓动坏了。

「确定」按钮的**点击**这一下没能在自动化里验（页面隐藏时 rAF 不跑，输入是逐帧消费的）；
悬停命中框已按 `resultOkRect()` 与真机 `drawImage` 落点核对一致（`{695,494,110,52}` vs 贴图 `700~800`）。
这一条留给你在可见窗口里点一下确认。


**真浏览器截图（权威证据）**：`docs/shots/验收单证据/模块8-真浏览器/`
`01-explore-hud-card.png` / `02-battle-status-card.png` / `03-result-win.png`（960×560，dpr=off）。
全链路回归（主菜单 → 大地图 → 地点 → 场景 → 战斗 → 结算，逐屏无异常）：
`10-chain-title.png`、`11-chain-worldmap.png`、`12-chain-places.png`、`13-chain-explore.png`、
`14-chain-battle.png`、`15-chain-result.png`；DPR 默认档（开关开、`devicePixelRatio=1`、`view.sx=1`）另拍
`20-dprOn-explore.png`、`21-dprOn-battle.png`、`22-dprOn-result.png`。
**本轮补拍两张**（针对上面两个改动）：`30-battle-card-nolabel-overlap.png`（战斗卡 + 「⚔ 对战中 · 水晶喷泉」
已经各占各位、不再叠字）、`31-result-8digit-squeeze.png`（把 `playerStats()` 临时换成 7~8 位的大数，
证明左列数字压扁后右列「魔力/防御/抗性/回避/速度」标签**全部露得出来**）。
> 端口记一笔：项目根在 `【薪火计划】祇酒多克多比制作v1.20/【薪火计划】祇酒多克多比制作v1.20/` 里面，
> 这次临时服务起在 **8792**（`node _dkdb_tmp_serve.mjs "<该 2-源码-可重建 路径>" 8792`，带 `SHOT_DIR`），
> 上面两张就是它落的盘。⚠️ **8791 上那个还开着的旧页面是旧根加载的，看的是旧文件** —— 换根/挪目录之后
> 必须重新导航，否则"改了没生效"是假象。
> 另外 `hud_*` 贴图是**懒加载**的：页面刚开就直连 `drawBattle()` 会画出"没有卡的战斗画面"
> （图还没解码，`hudImg` 返回 null 就跳过）—— 先空跑一帧 `drawBattle()` 让图开始加载，再 `clearRect` 重画才是有效截图。
> `devicePixelRatio=2` 那一档在模块 4 的验收单里已经实测过（大窗 2800×1634、鼠标映射误差 <0.4px），
> 这次没重复 —— 内置浏览器改不了 dpr。
> 拿图方式记一笔：Qoder 内置浏览器的截图口拿不到可视区域（`visibilityState=hidden`），
> 所以给临时静态服务 `_dkdb_tmp_serve.mjs` 加了一个 `POST /_shot?name=x.png`，
> 让页面自己 `canvas.toDataURL()` 回传落盘（限 `SHOT_DIR`、文件名过白名单、校验 PNG 签名）。
> 顺带发现：**页面隐藏时 rAF 不跑**（`S.battle.t` 900ms 后仍是 0），所以截图是直连
> `drawExplore/drawBattle/drawResult` 一帧一帧画出来的。

**无头像素截图**（`node _tools/shoot.mjs "docs/shots/验收单证据/模块8-headless" --battle-only`）：
`04-scene.png`（主页卡）、`10-battle-command.png`（战斗卡 + 等级圈）、`13-result.png`（结算页整套）与真浏览器一致。
> `13-result.png` 曾经**画不出结算面板**（只剩战斗背景 + 战斗自己的"战斗胜利"文字）。查清了，
> 是**截图工具的假画布**：`core/canvas.js` 的 `fit()` 会把 `cvs.width` 写成 `cssW×dpr`（这里 1286），
> 再反推 `view.sx = cvs.width/960 = 1.339`；真画布会同步扩大后备缓冲，而 `PixelCtx` 的缓冲是建好就不动的
> → 整帧被放大 1.34 倍塞进 960×560，右半边（结算面板、确定钮）直接画到画面外。
> 修法：`_tools/shoot.mjs` 的假画布把 `width/height` 写成**只读**（忽略写入，`view.sx` 回到 1，
> 等价于浏览器 `?dpr=off`）—— 这也是 `canvas.js` 注释里原本就假定的行为，只是假画布没做到。
> 顺带修了第二处坑：拍完冲刺后玩家 HP 被抬到 99999，原来"空转 600 帧等怪把玩家打死"经常收不了场，
> `mode` 还是 `battle` → 结算页一张都不拍还不报错。现在**每回到指令阶段就替玩家出「攻击」**，
> 收不了场会打一行 `⚠` 而不是静默跳过。
> ⚠️ 影响范围说准：这条只在**模块 4（DPR 移植）之后**用这个工具拍的图上存在（`fit()` 开始写 `cvs.width`
> 才引入的），右侧约 1/4 一直被裁掉；模块 4 之前那批历史截图不受影响，也不用重拍。

## 最短人工验证路径

双击 `game.html` → 进世界，看**左上角是不是那张带头像和等级圈的卡**（不是小字）→
点怪进战斗，左上角还是同一张卡，打掉血时**血条是滑下去的**→ 打赢，右半屏滑出结算页，
鼠标移到「确定」上它会**放大一点**，点它（或按空格）回场景。

## 与成品的有意差异 / 未收的（都需你知情）

1. **没做 v5 CARD5**（`AI协作改动说明.md` §4b 描述的那张）：成品第 105 轮自己删了它，按你的口径跟成品。
   → §4b 现在**作废**，谁再照它做就是走回头路。
2. **没收成品的底部栏 / 左侧图标 / 聊天面板 / 顶栏 / 场景门 / 场景脚注**（`drawBottomBar`、
   `drawLeftIcons`、`drawChatPanel`、`drawTopIcons`、`drawSceneGates`、`drawSceneFooter`）——
   这些在差异清单里属**模块 9 / 10**，归别人，我只留了依赖说明。
3. **场景身份**：我删的是 explore **顶部**那行「场景名 / 地形」+ `Lv.EXP` 条；**底部脚注**
   （`explore.js:71` 的「岛名 · 地形 · 本岛场景 i/n」）**保留**，所以场景身份没丢，只是不再和状态卡抢左上角。
   成品另外那套 `drawSceneFooter`（底部栏样式）属模块 10，仍归那边的人。
4. **大数值撞列：这一条已经收掉了**（之前记的是"成品同款行为"，我改了，所以是**有意差异**）。
   等级 99 的种子存档里「生命」是 8 位 `14689559`，左列数字会顶到右列标签上把「魔力」盖掉。
   现在按"本列可用宽"等比压扁数字高度（`result.js` 的 `digitsW` + `avail`，最小压到 11px），
   证据 `31-result-8digit-squeeze.png`。**代价**：极大数值时左列数字比成品小一圈 —— 常规存档
   （生命 5~6 位）压扁逻辑不触发，版式与成品逐像素一致。
5. 结算页的属性两列用贴图（`result-stats-left/right.png`）按行切片拼，数值仍按游戏实际值算——
   与成品一致；成品的战败页也是旧样式，一致。
