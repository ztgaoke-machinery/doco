/* 多克多比 · 内核（core/canvas.js）
   职责：画布缩放 fit() 与窗口 resize（把 960×560 的逻辑画布按窗口等比缩放），
        以及 **DPR 感知的高清后备缓冲**（第 108 轮增量）。
   来源：原 game/game.js 第 199–206 行 + 成品 fit() 的 DPR 段。

   【为什么要 DPR】原来后备缓冲固定 960×560，再用 CSS 把整张位图放大到窗口（≤1.6×）
     → 文字、描边、渐变、圆角全都被浏览器二次放大，看着糊。
     现在：后备缓冲按「CSS 尺寸 × 设备像素比」给足，绘制前 setTransform 把逻辑坐标
     960×560 映射上去 → 一切都按**最终显示分辨率**光栅化，文字/边线明显更清楚。
   ⚠️ 两条须知：
     ① 位图素材本身是 1:1 原生尺寸 → 不会因此变清楚（要清楚得换更高分辨率源）；
     ② 鼠标换算必须用**逻辑尺寸**，不能再用 cvs.width（那已是后备缓冲宽，
        见 engine/mouse.js 的 toCanvas，它改成读 window.__DKDbb_VIEW__）。
   想要 A/B 对比：网页上加 ?dpr=off 即恢复旧行为（960×560 后备缓冲）。 */
(() => {
  'use strict'
  const G = window.DKDbbGame
  const { cvs, W, H, view } = G.core

  function fit() {
    const maxW = window.innerWidth - 40
    const maxH = window.innerHeight - 150
    const k = Math.min(maxW / W, maxH / H, 1.6)
    const cssW = Math.round(W * k), cssH = Math.round(H * k)
    cvs.style.width = cssW + 'px'
    cvs.style.height = cssH + 'px'
    // ★ DPR 感知：后备缓冲 = CSS 尺寸 × devicePixelRatio（关掉即旧行为，见 view.dprOff）。
    //   dpr 上限取 2：更高的倍率对 2D 画布只是徒增开销（4K+200% 缩放下才可能更高）。
    const dpr = view.dprOff ? 1 : Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    // 关掉时后备缓冲就固定 960×560（= 旧行为，让浏览器去放大），否则按设备像素给足。
    // ⚠️ 不能写成 max(W, cssW*dpr)：dpr=1 时它仍等于 cssW → "关"等于没关（踩过）。
    const bw = view.dprOff ? W : Math.max(W, Math.round(cssW * dpr))
    const bh = view.dprOff ? H : Math.max(H, Math.round(cssH * dpr))
    if (cvs.width !== bw || cvs.height !== bh) { cvs.width = bw; cvs.height = bh }
    // ★ 缩放比必须由画布**实际**尺寸反推，而不是由"我们想设的 bw"。
    //   两个理由：① 无头测试台的假画布会忽略尺寸写入（保持 960×560）→ 这里得到 1，
    //   若用 bw 反推就变成 1.339，测试台量出来的文字框会被错误放大 → 全线"文字越界"假红；
    //   ② 浏览器若因内存或尺寸上限限制了实际大小，反推也不会脱节。
    view.sx = cvs.width / W
    view.sy = cvs.height / H
    // 逻辑尺寸发布给鼠标换算用（mouse.js 不能再用 cvs.width —— 那是后备缓冲宽）
    window.__DKDbb_VIEW__ = { w: W, h: H, sx: view.sx, sy: view.sy, dpr: dpr, bw: bw, bh: bh }
  }
  window.addEventListener('resize', fit)

  G.core.fit = fit
})()
