/* 多克多比 · 界面层：主界面左上角状态卡（第 73 轮 · 模块 8 ①）
   —— 原版素材拼的那张卡：hud_frame 空槽底框 + hud_bars_full 血蓝满条（按比例裁右端）
      + hud_head 多比头像（七边形 clip 收口）+ hud_ring 圈圈 + 原版数字位图等级 + 姓名。
   来源：成品 game.js:8701-8948、9537-9543（第 105 轮起主页与战斗共用同一张卡）。
   —— **只画不裁决**：存档（等级 / 名字 / 真实血蓝）经 G.app.saveData() 桥读，本层不碰 save。
   依赖：内核 G.core（S / ctx）+ 引擎 window.DKDbb（util / text / assetUrl）。
   只经 G.ui 出口对外，game.js 用「解构 shim」取用。 */
(() => {
  'use strict'
  const G = window.DKDbbGame
  const { S, ctx } = G.core
  const { util, text } = window.DKDbb
  const saveData = () => G.app.saveData()

  const HUD_DIR = 'assets/ui/bottombar/'
  // 卡片左上 (14,14)，卡片内坐标 0..327 / 0..124；s 是**唯一**的整体缩放旋钮。
  const HUD = {
    x: 14, y: 14,
    w: 327, h: 124,
    s: 0.72,
    // 圈圈（hud_ring.png 42×42）：实测圆心在卡片内 (49,100)
    ring: { x: 28, y: 79, w: 42, h: 42 },
    // 等级数字（原版位图 digit_0..9.png）。h/gap 是**屏幕**像素，
    //   画时各自 ÷s 抵消外层缩放 → 数字不跟卡片一起缩（见 hudLevelLayout）。
    //   cy 净下移 1 屏px → 100 + 1/0.72。
    lv: { cx: 49, cy: 100 + 1 / 0.72, h: 18, gap: 0 },
    // 姓名落点：深蓝姓名框内、系别图标右侧。框深蓝内区 x[137..300] y[23..46]。
    //   cx/cy 是典型系别图标(17px 宽)下的代表中心点，供测试钉"名字条在卡片内"。
    name: { iconX: 140, boxR: 300, boxTop: 23, boxBot: 46, size: 20, cx: 230, cy: 35 },
    // 多比头像（hud_head.png）：clip 七边形 = 上/左上开放（头可冒出顶边），
    //   收口为底边线 y=112 + 右短斜线 (96,112)→(117,97)，其余沿用青描边实测边。
    head: { x: 41, y: 6, w: 90, h: 106,
            clip: [[29, -30], [108.7, -24.8], [141, 49], [117, 97], [96, 112], [67, 112], [29, 112]] },
    // 血条 / 蓝条的**填充带**（修改14 与 修改16 只差在这两条带里）。
    //   ★ 必须完整覆盖两端的斜角与圆角，否则满血时两端各缺一角；两条带**不等宽**。
    hp: { x: 129, y: 49, w: 193, h: 26 },
    mp: { x: 116, y: 75, w: 182, h: 25 },
  }
  // 系别图标：画在深蓝名字框左端，当前形态是什么系就画哪个。
  //   形态表里还有「光」系（用户没给图）→ 不在表里就跳过。
  const ELE_ICON = {
    '火': 'ele_huo.png', '水': 'ele_shui.png', '土': 'ele_tu.png', '风': 'ele_feng.png',
    '物理': 'ele_wuli.png', '无': 'ele_wu.png', '暗': 'ele_an.png', '毒': 'ele_du.png',
  }
  // ★ 硬编码尺寸表：运行时几何**绝不能用 naturalWidth** ——
  //   无头测试台的假图是 320×320，会把"图标右缘→名字起点"算到卡片外。
  const ELE_WH = {
    'ele_huo.png': [17, 17], 'ele_shui.png': [14, 16], 'ele_tu.png': [16, 13], 'ele_feng.png': [16, 16],
    'ele_wuli.png': [12, 16], 'ele_wu.png': [16, 16], 'ele_an.png': [15, 16], 'ele_du.png': [11, 16],
  }
  const hudImgs = new Map()
  function hudImg(f) {
    if (!hudImgs.has(f)) { const im = new Image(); im.src = window.DKDbb.assetUrl(HUD_DIR + f); hudImgs.set(f, im) }
    return hudImgs.get(f)
  }
  const imgReady = (im) => im.complete && im.naturalWidth

  // 满条末端那道斜口的轮廓（归一化 fx/fy）：从右上往左下走，越往下越平。
  const BAR_SLANT_PTS = [
    [0, 0], [0.06, 0.24], [0.14, 0.41], [0.26, 0.58],
    [0.42, 0.72], [0.60, 0.83], [0.78, 0.93], [1, 1],
  ]
  const BAR_SLANT_SEG = 16
  // Catmull-Rom 采样成密集直线段：无头渲染器（pixel-canvas）没有 bezierCurveTo，
  //   用曲线 API 会让整帧截图崩，逐段 lineTo 两边都认。
  function barSlantCurve() {
    const P = BAR_SLANT_PTS, m = P.length - 1, out = []
    const at = (i) => P[i < 0 ? 0 : (i > m ? m : i)]
    for (let i = 0; i < m; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2)
      for (let j = 0; j < BAR_SLANT_SEG; j++) {
        const t = j / BAR_SLANT_SEG, t2 = t * t, t3 = t2 * t
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
      }
    }
    out.push([P[m][0], P[m][1]])
    return out
  }
  const BAR_SLANT_CURVE = barSlantCurve()
  // 按比例变短的条：**裁同一张原版素材**（形状/渐变/描边都与原版一致），
  //   内容左对齐，裁切口是流畅弧线而非竖线；ratio=1 走矩形分支，与满条逐像素一致。
  function hudBarClipped(img, r, ratio, dx, dy) {
    const w = Math.round(r.w * util.clamp(ratio, 0, 1))
    if (w <= 0) return
    const topKeep = Math.round(r.h * 0.12)      // 斜口顶部保留的竖直段
    const slant = Math.round(r.h * 1.05)        // 斜口水平总跨度
    const xL = dx + r.x, xR = dx + r.x + w
    const yT = dy + r.y, yB = dy + r.y + r.h
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(xL, yT)
    ctx.lineTo(xR, yT)
    if (w < r.w) {
      const sl = Math.min(slant, w)             // 条很短时按比例收，不压成直线
      const dy2 = r.h - topKeep
      for (const [fx, fy] of BAR_SLANT_CURVE) {
        ctx.lineTo(Math.max(xL, xR - fx * sl), yT + topKeep + fy * dy2)
      }
    } else {
      ctx.lineTo(xR, yB)
    }
    ctx.lineTo(xL, yB)
    ctx.closePath()
    ctx.clip()
    // 尺寸显式给：同上，不能靠 naturalWidth。
    ctx.drawImage(img, dx, dy, HUD.w, HUD.h)
    ctx.restore()
  }
  // 纯函数：某比例下的裁切跨度与斜口参数（供测试钉死"左对齐 + 竖线变弧线"）
  function hudBarSpan(r, ratio) {
    const w = Math.round(r.w * util.clamp(ratio, 0, 1))
    return {
      w, slanted: w > 0 && w < r.w,
      topKeep: Math.round(r.h * 0.12), slant: Math.round(r.h * 1.05),
      curve: BAR_SLANT_CURVE, dstRight: r.x + w,
    }
  }
  // 原版数字位图的每位宽高（素材本就 10~13 × 15，"1" 最窄）
  const HUD_DIGIT_WH = [
    [13, 15], [10, 15], [12, 15], [12, 15], [13, 15],
    [12, 15], [12, 15], [13, 15], [13, 15], [12, 15],
  ]
  const HUD_DIGIT_BASE_H = 15
  // 某等级在圈里的两位数字排布（纯函数，测试直接断言它，不用抓画布）
  function hudLevelLayout(level) {
    const n = Math.max(1, Math.min(99, Math.round(level || 1)))
    const s = String(n).padStart(2, '0')
    // 数字单独抵消整体缩放：先除以 HUD.s，外层 scale(HUD.s) 再乘回去
    //   → 屏幕上数字恒为 HUD.lv.h 高，不跟卡片一起缩。gap 同理。
    const h = HUD.lv.h / HUD.s, gap = HUD.lv.gap / HUD.s
    const ws = [...s].map((c) => Math.max(1, Math.round(HUD_DIGIT_WH[+c][0] * (h / HUD_DIGIT_BASE_H))))
    const total = ws.reduce((a, b) => a + b, 0) + gap * (s.length - 1)
    return { s, ws, h, gap, total, x0: HUD.lv.cx - total / 2, y: HUD.lv.cy - h / 2 }
  }
  function drawHudLevel(level) {
    const L = hudLevelLayout(level)
    let x = L.x0
    for (let i = 0; i < L.s.length; i++) {
      const im = hudImg('digit_' + L.s[i] + '.png')
      if (imgReady(im)) ctx.drawImage(im, x, L.y, L.ws[i], L.h)
      x += L.ws[i] + L.gap
    }
  }

  // 卡片核心：主页与战斗**共用同一张**。
  //   x/y = 屏幕落点；s = 整体缩放（战斗也用 HUD.s 才能逐像素同款，
  //   数字/名字的抵消缩放公式都基于 HUD.s，故必须同值）；
  //   hpR/mpR = 0..1 比例：主页传存档真实值，战斗传 showHp/showMp 平滑显示值。
  function drawHudCardCore(x, y, s, hpR, mpR) {
    const sv = saveData()
    const frame = hudImg('hud_frame.png')        // ① 空槽底图
    if (!imgReady(frame)) return
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(s, s)
    // ↓ 以下全部是**卡片内坐标**，缩放由上面两行统一负责
    ctx.drawImage(frame, 0, 0, HUD.w, HUD.h)
    // ①b 系别图标：深蓝名字框左端，垂直居中（框中线 35）
    let eleW = 0
    const eleFile = ELE_ICON[S.form && S.form.element]
    if (eleFile) {
      const wh = ELE_WH[eleFile] || [0, 0]
      eleW = wh[0]
      const eim = hudImg(eleFile)
      if (imgReady(eim)) ctx.drawImage(eim, HUD.name.iconX, 35 - wh[1] / 2, wh[0], wh[1])
    }
    // ② 满条按比例变短，裁掉那段露出①的空槽
    const bars = hudImg('hud_bars_full.png')
    if (imgReady(bars)) {
      hudBarClipped(bars, HUD.hp, hpR, 0, 0)
      hudBarClipped(bars, HUD.mp, mpR, 0, 0)
    }
    // ③ 多比头像（第 2 图层），clip 七边形收口挡住身体
    const head = hudImg('hud_head.png')
    if (imgReady(head)) {
      ctx.save()
      ctx.beginPath()
      const cl = HUD.head.clip
      ctx.moveTo(cl[0][0], cl[0][1])
      for (let i = 1; i < cl.length; i++) ctx.lineTo(cl[i][0], cl[i][1])
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(head, HUD.head.x, HUD.head.y, HUD.head.w, HUD.head.h)
      ctx.restore()
    }
    // ④ 圈圈
    const ring = hudImg('hud_ring.png')
    if (imgReady(ring)) ctx.drawImage(ring, HUD.ring.x, HUD.ring.y, HUD.ring.w, HUD.ring.h)
    // ⑤ 圈里的等级数字
    drawHudLevel(sv.level)
    // ⑥ 名字：水平居中于「图标右缘 → 深蓝框右端」，过长时按可用宽度等比缩小
    {
      const nm = sv.playerName || '多比'
      const x0 = HUD.name.iconX + eleW + 4
      const x1 = HUD.name.boxR
      const availW = x1 - x0
      let ns = HUD.name.size
      const charW = ns * 1.02
      if (nm.length * charW > availW) ns = Math.max(10, Math.floor(availW / nm.length))
      const baseY = (HUD.name.boxTop + HUD.name.boxBot) / 2 + ns * 0.5   // CJK 基线略低于中线
      text.stroked(ctx, nm, (x0 + x1) / 2, baseY,
        { size: ns, align: 'center', baseline: 'alphabetic',
          color: '#eaf6ff', stroke: '#0c1830', lw: 3, weight: 'bold' })
    }
    ctx.restore()
  }
  // 主页左上角那一张（explore 专用入口）：血/蓝用存档真实值
  function drawHudCard() {
    const sv = saveData()
    drawHudCardCore(HUD.x, HUD.y, HUD.s, sv.hp / Math.max(1, sv.maxHp), sv.mp / Math.max(1, sv.maxMp))
  }

  // 战斗状态卡（轮次105 口径）：与主页同一张卡，仅两点不同 ——
  //   ① 落点 = 旧战斗卡位 (8,12)（其下方状态图标/飘字的排布依据不变）；
  //   ② 血/蓝用战斗显示值 showHp/showMp（每帧平滑追真实值，扣血时条缓缓退下去）。
  const BATTLE_CARD = { x: 8, y: 12 }
  function drawBattleStatusCard(b, p) {
    const hp = p.showHp == null ? p.hp : p.showHp
    const mp = p.showMp == null ? p.mp : p.showMp
    drawHudCardCore(BATTLE_CARD.x, BATTLE_CARD.y, HUD.s,
      hp / Math.max(1, p.maxHp), mp / Math.max(1, p.maxMp))
  }

  G.ui = G.ui || {}
  Object.assign(G.ui, {
    HUD, BATTLE_CARD, ELE_ICON, ELE_WH,
    hudImg, hudBarSpan, hudLevelLayout, drawHudLevel,
    drawHudCardCore, drawHudCard, drawBattleStatusCard,
  })
})()
