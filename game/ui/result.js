/* 多克多比 · 界面层：战斗结算页（第 73 轮 · 模块 8 ③ 对齐成品 game.js:14611-14876）
   胜利 = 原版**右半版式**：左半边仍是战斗画面，右边一块深蓝曲边面板滑入 + 渐现，
   面板上除数字外全部贴用户抠好的原版高清图，数字用蓝/绿两套 0-9 图集按实际数值拼
   （数值变了画面自动跟着变）。战败维持旧样式（黑底 + 败北，2026-10-05 拍板本次只重做胜利）。
   —— **只画不裁决**：存档经 G.app.saveData() 桥读、属性经 G.app.player.playerStats() 桥读。
   依赖：内核 G.core（S / ctx / W / H）+ 引擎 window.DKDbb（text / assetUrl）
        + 内容表 window.DKDbbData（expToNext）+ 同层 G.ui（drawBattle）。
   对外：G.ui.drawResult / G.ui.resultOkRect（「确定」命中框，input.js 用）。 */
(() => {
  'use strict'
  const G = window.DKDbbGame
  const D = window.DKDbbData
  const { text } = window.DKDbb
  const { S, ctx, W, H } = G.core
  const saveData = () => G.app.saveData()
  const playerStats = (...a) => G.app.player.playerStats(...a)
  const drawBattle = (...a) => G.ui.drawBattle(...a)

  const RESULT = {
    // 背景左缘曲线：顶 640 → 底 480，中点**向右凹** 26（往面板内侧咬进去）。
    //   ⚠️ 该位置下曲线在 y=64 处 x≈615.9 > 标题左缘 600 → 「战斗胜利」左侧会压在面板边缘上，
    //     这是已知并接受的结果（不再要求"曲线不得切内容"）。
    edgeTopX: 640, edgeBotX: 480, edgeBend: 26,
    victoryY: 64, victoryW: 200,                   // 「战斗胜利」（左缘跟随曲线，不固定 x）
    lineY: [110, 304, 466], lineW: 295,            // 发光线 result-line.png，三处共用同一张
    // 内容左缘(y) = curveX(lvY) + contentInset + followK × (curveX(y) − curveX(lvY))
    //   ① 第一项保证**每一点都在曲线右侧 contentInset 以上** → 落在实心区（渐变内侧）；
    //   ② followK<1 → 逐行左移幅度按比例缩小，不会像纯贴曲线那样斜。
    //   ⚠️ 不能写成 curveX(y)+inset+k·(...)：那等于把曲线位移又加一遍，越往下越靠左，直接钻进渐变区。
    contentInset: 16, followK: 0.55,
    textInset: 8,                                  // 正文比标题/光线再靠左 4px
    // 数字"视觉脚"相对标签的修正：标签是白色艺术字+蓝色发光（下方延展多），数字只多 ~0.5px，
    //   按 alpha 外沿对齐会让数字的脚比标签短 4px → 整体下移 4px。
    digitFootAdj: 4,
    statColGap: 152, tagsGap: 45,                  // 属性两列间距 / 「活动组队」与经验数字的间距
    lvY: 158, expY: 216, needY: 272,               // 三行大数值中心 y
    labH: 38,                                      // 三行标签显示高
    numH: 34, expNumH: 30, numGap: 2,              // 等级数字略大，经验/升级所需略小
    rowNumGap: 0,                                  // 三行数字的字距
    digitSqueeze: 0.86,                            // 数字横向压缩（<1 变瘦）
    tagsH: 50,                                     // 「活动/组队」整图显示高
    statsTop: 320, statsGap: 26,                   // 属性表：整列图顶 y / 行距
    statNumH: 18,
    okX: 750, okY: 520, okW: 100,                  // 「确定」中心与显示宽
    animDur: 0.35,                                 // 开场动画时长
    okHoverScale: 1.08,                            // 「确定」hover 放大倍数
  }
  function resultOkRect() {
    const w = 110, h = 52
    return { x: RESULT.okX - w / 2, y: RESULT.okY - h / 2, w, h }
  }
  // 背景左缘那条弯线在高度 y 处的 x（二次贝塞尔；控制点在弦中点右侧 → 曲线向右凹）。
  function resultCurveX(y) {
    const tt = Math.max(0, Math.min(1, y / H))
    const cx = (RESULT.edgeTopX + RESULT.edgeBotX) / 2 + RESULT.edgeBend * 2
    return (1 - tt) * (1 - tt) * RESULT.edgeTopX + 2 * (1 - tt) * tt * cx + tt * tt * RESULT.edgeBotX
  }
  const _resCache = new Map()
  function resImg(n) {
    if (!_resCache.has(n)) { const im = new Image(); im.src = window.DKDbb.assetUrl('assets/ui/' + n); _resCache.set(n, im) }
    const im = _resCache.get(n)
    return (im.complete && im.naturalWidth) ? im : null
  }
  // 数字图集每格的**字形边界**（源像素；格子 256×256，图集 1280×512）。
  //   ⚠️ 上排(0-4)字形在 y 25~248、下排(5-9)在 y 14~235 —— 两排垂直位置差 13px，
  //      所以"整格贴"做不到"字与数字底部对齐"，必须按字形边界裁剪贴。
  //   ⚠️ 必须是常量表：file:// 下 canvas 读像素会被跨域污染（本项目铁律），不能运行时 getImageData。
  const DIGIT_BBOX = [
    [21, 25, 246, 248], [44, 25, 232, 248], [19, 25, 236, 248], [19, 25, 230, 248], [6, 25, 247, 248],
    [22, 17, 243, 235], [22, 17, 246, 235], [19, 14, 237, 234], [8, 14, 239, 235], [15, 14, 242, 235],
  ]
  const DIGIT_CELL = 256
  // 数字图集绘制（5 列×2 行，0-4 上排 5-9 下排）
  //   x = 左缘；yBottom = **字形底边**（不是格子底边）；dh = 字形显示高。返回结束 x，方便接龙排版。
  function drawDigits(img, x, yBottom, txt, dh, gap) {
    const cw = img.naturalWidth / 5, ch = img.naturalHeight / 2
    const kx = cw / DIGIT_CELL, ky = ch / DIGIT_CELL
    let cx = x
    for (const c of String(txt)) {
      const d = c.charCodeAt(0) - 48
      if (d < 0 || d > 9) continue
      const b = DIGIT_BBOX[d]
      const sx = (d % 5) * cw + b[0] * kx, sy = (d >= 5 ? ch : 0) + b[1] * ky
      const sw = (b[2] - b[0]) * kx, sh = (b[3] - b[1]) * ky
      const dw = dh * sw / sh * (RESULT.digitSqueeze === undefined ? 1 : RESULT.digitSqueeze)
      ctx.drawImage(img, sx, sy, sw, sh, cx, yBottom - dh, dw, dh)
      cx += dw + (gap === undefined ? RESULT.numGap : gap)
    }
    return cx
  }

  function drawResult() {
    drawBattle()
    const r = S.result
    if (!r) return
    if (!r.win) {
      // ---- 战败：维持旧样式（黑底 + 败北）----
      ctx.fillStyle = 'rgba(6,10,18,.85)'; ctx.fillRect(0, 0, W, H)
      text.stroked(ctx, '败　北', W / 2, 210, { size: 56, align: 'center', color: '#ff8a8a', lw: 10 })
      text.stroked(ctx, '体力已恢复，回去再战吧', W / 2, 290, { size: 18, align: 'center', color: '#cfd6e4', lw: 4 })
      text.stroked(ctx, '按 空格 继续', W / 2, 440, { size: 18, align: 'center', color: '#ffe45e', lw: 5 })
      return
    }

    // ---- 开场动画：从"画面中间往左 1/3"滑向最终位 + 渐现 ----
    const t = Math.min(S.resultT || 0, RESULT.animDur)
    const p = t / RESULT.animDur
    const e = 1 - Math.pow(1 - p, 3)
    ctx.save()
    ctx.translate(-W / 3 * (1 - e), 0)
    ctx.globalAlpha = Math.min(1, p / 0.62)

    // ---- 深蓝曲边背景 ----
    //   颜色按原版真机截图实测取样 ≈ RGB(24,24,32)（基本是黑、只有一点点蓝），透明度 0.85。
    //   渐变轴 = 左缘曲线的**法向**：弯线几乎竖直，直接拿弦方向当轴会让等值线变成水平的，
    //   看上去就成了"上下渐隐"而不是"左右渐隐"。
    //   ★★陷阱：linearGradient 必须**在填充路径内完成衰减**，否则等于把渐变前半段剪掉 = 硬边
    //     （代码里完全看不出来，只能从截图/像素上抓）→ 路径整体向左外扩 OFF。
    const BG_A = 0.85
    const ux = RESULT.edgeBotX - RESULT.edgeTopX, uy = H
    const ul = Math.hypot(ux, uy)
    const nx = uy / ul, ny = -ux / ul          // 法向（指向面板内侧 = 右）
    const mx0 = (RESULT.edgeTopX + RESULT.edgeBotX) / 2, my0 = H / 2
    const gBg = ctx.createLinearGradient(mx0 - nx * 90, my0 - ny * 90, mx0 + nx * 8, my0 + ny * 8)
    gBg.addColorStop(0.00, 'rgba(7,9,14,0)')
    gBg.addColorStop(0.30, 'rgba(10,13,21,0.30)')
    gBg.addColorStop(0.62, 'rgba(16,20,37,0.62)')
    gBg.addColorStop(1.00, 'rgba(24,28,50,' + BG_A + ')')
    const OFF = 130
    ctx.beginPath()
    ctx.moveTo(RESULT.edgeTopX - OFF, 0)
    ctx.quadraticCurveTo((RESULT.edgeTopX + RESULT.edgeBotX) / 2 + RESULT.edgeBend * 2 - OFF, H / 2, RESULT.edgeBotX - OFF, H)
    ctx.lineTo(W, H); ctx.lineTo(W, 0); ctx.closePath()
    ctx.fillStyle = gBg; ctx.fill()

    // ---- 版式素材（标签是贴图；数字用图集按游戏实际数值拼）----
    const sv = saveData()
    const dBlue = resImg('result-digits-blue.png'), dGreen = resImg('result-digits-green.png')
    const blitH = (n, cx, cy, dh) => { const im = resImg(n); if (!im) return 0; const w = dh * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, cx - w / 2, cy - dh / 2, w, dh); return w }
    const blitW = (n, cx, cy, dw) => { const im = resImg(n); if (!im) return 0; const h = dw * im.naturalHeight / im.naturalWidth; ctx.drawImage(im, cx - dw / 2, cy - h / 2, dw, h); return h }
    const curveX = resultCurveX
    const followX = (y, inset) => curveX(RESULT.lvY) + (inset === undefined ? RESULT.contentInset : inset)
      + RESULT.followK * (curveX(y) - curveX(RESULT.lvY))
    // "每一行字与数字底部对齐" = 站在同一高度的地面上，且对齐的是**视觉脚（亮色主体下沿）**，
    //   不是 alpha 外沿 —— 标签的描边+发光在下方多出 ~6px，按外沿对齐数字的脚会多露 5.5px。
    //   下表 = 三行标签亮色主体下沿距图底（源像素）。
    const LAB_MAIN_PAD = { 'result-lab-level.png': 26, 'result-lab-exp.png': 26, 'result-lab-need.png': 20 }
    const rowBottom = (cy) => cy + RESULT.labH / 2

    blitW('result-victory.png', followX(RESULT.victoryY) + RESULT.victoryW / 2, RESULT.victoryY, RESULT.victoryW)
    for (const ly of RESULT.lineY) blitW('result-line.png', followX(ly) + RESULT.lineW / 2, ly, RESULT.lineW)

    const gapAfter = 10
    const rowLab = (n, cy) => {
      const im = resImg(n); if (!im) return 0
      const w = RESULT.labH * im.naturalWidth / im.naturalHeight
      // 让亮色主体下沿落在 rowBottom：贴图底边 = rowBottom + 该下留白
      const pad = (LAB_MAIN_PAD[n] || 0) * RESULT.labH / im.naturalHeight
      ctx.drawImage(im, followX(cy, RESULT.textInset), rowBottom(cy) + pad - RESULT.labH, w, RESULT.labH)
      return w
    }
    const wLv = rowLab('result-lab-level.png', RESULT.lvY)
    const wExp = rowLab('result-lab-exp.png', RESULT.expY)
    const wNeed = rowLab('result-lab-need.png', RESULT.needY)
    if (dBlue) drawDigits(dBlue, followX(RESULT.lvY, RESULT.textInset) + wLv + gapAfter, rowBottom(RESULT.lvY) + RESULT.digitFootAdj, String(sv.level), RESULT.numH, RESULT.rowNumGap)
    let endExp = 0
    if (dGreen) endExp = drawDigits(dGreen, followX(RESULT.expY, RESULT.textInset) + wExp + gapAfter, rowBottom(RESULT.expY) + RESULT.digitFootAdj, String(r.exp), RESULT.expNumH, RESULT.rowNumGap)
    if (dBlue) drawDigits(dBlue, followX(RESULT.needY, RESULT.textInset) + wNeed + gapAfter, rowBottom(RESULT.needY) + RESULT.digitFootAdj, String(Math.max(0, D.expToNext(sv.level) - sv.exp)), RESULT.expNumH, RESULT.rowNumGap)

    // 活动/组队（整图，绿=选中；单机版默认「活动」，S.resultTagMode 可切 'team'）
    //   位置跟着"获得经验"那行的数字右缘走，不能钉死。
    const tagCx = (endExp || (followX(RESULT.expY, RESULT.textInset) + wExp + gapAfter)) + RESULT.tagsGap
    blitH(S.resultTagMode === 'act' ? 'result-tags-act.png' : 'result-tags-team.png', tagCx, RESULT.expY, RESULT.tagsH)

    // ---- 属性表（两列 5 行；整列图**逐行切开**贴，才能每行各自跟随曲线）----
    const st = playerStats()
    const L = ['life', 'atk', 'matk', 'hit', 'crit'], R = ['mp', 'def', 'mdef', 'eva', 'spd']
    const rowH = RESULT.statsGap, imL = resImg('result-stats-left.png'), imR = resImg('result-stats-right.png')
    const colW = [imL, imR].map((im) => (im ? rowH * (im.naturalWidth / (im.naturalHeight / 5)) : 0))
    // 属性整列图里亮色主体下沿距每行片段底 ≈15.5px（源，片段 71.4）→ 数字 alpha 底边要再上提。
    const statPad = rowH * 18 / 71.4
    ;[imL, imR].forEach((im, c) => {
      if (!im) return
      const seg = im.naturalHeight / 5
      for (let i = 0; i < 5; i++) {
        const cy = RESULT.statsTop + rowH / 2 + i * rowH
        const cx = followX(cy, RESULT.textInset) + (c === 1 ? RESULT.statColGap : 0)
        const w = rowH * (im.naturalWidth / seg)
        ctx.drawImage(im, 0, i * seg, im.naturalWidth, seg, cx, cy - rowH / 2, w, rowH)
      }
    })
    if (dBlue) {
      // 属性数字**按本列可用宽等比压扁**。
      //   为什么要有这条：数字是左对齐跟在标签图后面的，后期属性（或被改过的存档）能到
      //   8 位（生命 14689559 这种），原尺寸下会一路顶穿到右列标签上，「魔力」两字被盖掉。
      //   原版属性没这么大所以没这问题 —— 这里只做兜底，宁可数字小一点也不糊版。
      const digitsW = (txt, dh) => {
        let w = 0
        for (const ch of txt) {
          const d = ch.charCodeAt(0) - 48
          if (d < 0 || d > 9) continue
          const b = DIGIT_BBOX[d]
          w += dh * (b[2] - b[0]) / (b[3] - b[1]) * (RESULT.digitSqueeze === undefined ? 1 : RESULT.digitSqueeze) + RESULT.numGap
        }
        return w
      }
      ;[L, R].forEach((keys, c) => {
        keys.forEach((k, i) => {
          const cy = RESULT.statsTop + rowH / 2 + i * rowH
          const cx = followX(cy, RESULT.textInset) + (c === 1 ? RESULT.statColGap : 0)
          const sx = cx + colW[c] + gapAfter
          const avail = c === 0 ? RESULT.statColGap - colW[0] - gapAfter * 2 : (W - 26) - sx
          const txt = String(Math.round(st[k] || 0))
          let dh = RESULT.statNumH
          const w0 = digitsW(txt, dh)
          if (w0 > avail) dh = Math.max(11, dh * avail / w0)
          drawDigits(dBlue, sx, cy + rowH / 2 - statPad + RESULT.digitFootAdj, txt, dh)
        })
      })
    }

    // 掉落提示（形态/索亚/碎片 —— 原版版式没有，放「确定」上方一行小字）
    //   ⚠️ y 必须落在第三条线与「确定」之间（写 okY-52 正好压在线上）。
    const drops = []
    if (r.dropForm) drops.push(`★ 新形态「${r.dropForm}」`)
    if (r.dropSoya) drops.push(`★ 索亚「${r.dropSoya}」`)
    if (r.shards) drops.push(`★ 白色彩晶石碎片 ×${r.shards}`)
    if (drops.length) {
      text.stroked(ctx, drops.join('　'), RESULT.okX, RESULT.okY - 34,
        { size: 14, align: 'center', color: '#ffe45e', lw: 3 })
    }

    // ---- 「确定」：hover 只整体放大，不画任何描边/底色；命中矩形保持原样 ----
    const ok = resImg('result-confirm.png')
    if (ok) {
      const w = RESULT.okW * (S.resultOkHover ? RESULT.okHoverScale : 1)
      const h = w * ok.naturalHeight / ok.naturalWidth
      ctx.drawImage(ok, RESULT.okX - w / 2, RESULT.okY - h / 2, w, h)
    }

    ctx.restore()
  }

  G.ui = G.ui || {}
  Object.assign(G.ui, { drawResult, resultOkRect, RESULT, resImg, drawDigits })
})()
