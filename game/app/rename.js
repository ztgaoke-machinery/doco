/* 多克多比 · 应用层：起名字（第 72 轮重构 · 批次 4）
   来源：原 `game/game.js` 第 6518–6592 行（第 54 轮做的），内容一致。
   依赖：引擎存档 `window.DKDbb.save` + 内核提示 `G.core.toast`；
   只经 `G.app.rename` 出口对外，`game.js` 用「解构 shim」取用（调用点一处不改）。 */
(() => {
  'use strict'

  const G = window.DKDbbGame
  const { save } = window.DKDbb
  const { toast } = G.core

  // ==================== 起名字（第 54 轮）====================
  // 用户要的：「可以出一个起名字的功能让玩家起 id」。
  // 两个地方都能改：① **玩家（多克）自己的名字**（显示在顶栏，也是场景里那身造型的稳定种子）；
  //                ② **出战多比的昵称**（显示在战斗/面板里）。
  //
  // 实现要点：用**隐藏的 DOM input** 收字，而不是在 canvas 上抓 keydown ——
  // 中文要经过输入法，自己抓 keydown 只能拿到 ASCII。input 天然支持输入法、粘贴、退格。
  const NAME_INPUT_ID = 'nameInput'
  let renaming = null      // { kind: 'player' | 'form', formName }
  let firstNaming = false  // 轮次99-③：true = 正在做"首次强制取名"，空白禁止、不可取消、完成后置 nameChosen
  function nameInputEl() {
    return (typeof document !== 'undefined' && document.getElementById)
      ? document.getElementById(NAME_INPUT_ID) : null
  }
  // 轮次103：取名大框（标题 + 输入框 + 确定按钮）。big=首次取名；compact=聊天/改名（只露输入框）。
  function namePanelEl() {
    return (typeof document !== 'undefined' && document.getElementById)
      ? document.getElementById('namePanel') : null
  }
  function showNamePanel(big) {
    const p = namePanelEl()
    if (!p) return
    if (p.classList) p.classList.toggle('big', !!big)
    if (p.style) p.style.display = 'flex'
  }
  function hideNamePanel() {
    const p = namePanelEl()
    if (p && p.style) p.style.display = 'none'
  }
  function currentNameOf(kind, formName) {
    if (kind === 'player') return save.data.playerName || '多比'
    const m = save.data.formNames || (save.data.formNames = {})
    return m[formName] || ''
  }
  // 显示出来的名字：多比没起昵称就用形态名
  function displayNameOf(formName) {
    const m = save.data.formNames || {}
    return m[formName] || formName
  }
  function beginRename(kind, formName) {
    const el = nameInputEl()
    renaming = { kind, formName }
    if (!el) {
      // 没有 DOM（测试台/无头环境）时退回一个默认名字，不让流程卡住
      applyRename(kind === 'player' ? '多克' : '', formName)
      return false
    }
    el.value = currentNameOf(kind, formName)
    el.style.display = 'block'
    showNamePanel(false)           // 改名走 compact：只露输入框，观感同旧版
    // ⚠️ focus / select 都要**防御性调用**：无头环境（测试台）里的假元素没有这些方法，
    //    直接调会抛 `el.focus is not a function` 把整局游戏带崩 —— 这是真该修的健壮性问题。
    if (typeof el.focus === 'function') el.focus()
    if (typeof el.select === 'function') el.select()
    return true
  }
  function endRenameInput() {
    const el = nameInputEl()
    if (el) {
      if (el.style) el.style.display = 'none'
      if (typeof el.blur === 'function') el.blur()
    }
    hideNamePanel()
    renaming = null
  }
  function applyRename(value, formName) {
    const v = String(value === undefined || value === null ? '' : value).trim().slice(0, 10)
    // 轮次99-③：首次强制取名，空白名直接打回（不关闭、不提交）
    if (firstNaming && !v) {
      toast('名字不能为空，请重新输入')
      const el = nameInputEl()
      if (el && typeof el.focus === 'function') el.focus()
      return
    }
    const info = renaming || { kind: formName ? 'form' : 'player', formName }
    if (info.kind === 'player') {
      save.data.playerName = v || '多克'
      toast(`名字已改为「${save.data.playerName}」`)
    } else {
      const m = save.data.formNames || (save.data.formNames = {})
      if (v) { m[info.formName] = v; toast(`「${info.formName}」的昵称：${v}`) }
      else { delete m[info.formName]; toast(`「${info.formName}」恢复用形态名`) }
    }
    if (firstNaming) { save.data.nameChosen = true; firstNaming = false }
    save.persist()
    // 轮次103：nameChosen 是"只此一次"的关键标记 —— persist 的文件写入有防抖，
    //   玩家确认完名字马上关游戏就会丢 → 下次开机又弹取名框。这里绕过防抖立即落盘。
    //   （flushNow 属引擎增量，引擎对齐后生效；此处防御式调用，无它时退回 persist。）
    if (typeof save.flushNow === 'function') save.flushNow()
    renaming = null
  }
  // 轮次99-③：首次进入游戏的强制取名。复用隐藏 DOM 输入框，空白/取消都被
  //   wireNameInput 拦回（必须取完名才能玩）。轮次100：老存档也弹一次（改名机会），
  //   当前名还是默认"多比"→ 清空强输；已是自定义名 → 预填现名，回车即保留。
  //   无 DOM 环境（无头测试台）直接置 nameChosen，不让流程卡住。
  //   轮次103：改走取名大框（标题「请输入你的名字」+ 输入框 + 确定按钮）。
  function promptFirstName() {
    const el = nameInputEl()
    firstNaming = true
    renaming = { kind: 'player' }
    if (!el) {
      save.data.nameChosen = true
      save.persist()
      firstNaming = false
      return
    }
    const cur = save.data.playerName || ''
    el.value = (cur && cur !== '多比') ? cur : ''
    el.placeholder = '请输入你的名字'
    el.style.display = 'block'
    showNamePanel(true)            // big 模式：标题 + 输入框 + 确定按钮
    if (typeof el.focus === 'function') el.focus()
    if (typeof el.select === 'function') el.select()
  }
  // 把输入框的事件接上（只接一次）
  let nameInputWired = false
  function wireNameInput() {
    if (nameInputWired) return
    const el = nameInputEl()
    if (!el || !el.addEventListener) return
    nameInputWired = true
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // 轮次99-③：首次取名禁止空白 —— 直接打回、保持打开
        if (firstNaming && !el.value.trim()) { toast('名字不能为空，请重新输入'); if (el.focus) el.focus(); return }
        applyRename(el.value); endRenameInput()
      } else if (e.key === 'Escape') {
        // 轮次99-③：首次取名不允许取消（必须设名才能玩）
        if (firstNaming) { toast('首次进入必须设置名字'); if (el.focus) el.focus(); return }
        e.preventDefault(); renaming = null; endRenameInput(); toast('已取消改名')
      }
      e.stopPropagation()          // 别让 WASD 传到游戏里把角色走起来
    })
    el.addEventListener('blur', () => {
      // 轮次99-③：首次取名空白时保持打开（重新 focus），非空才提交
      if (firstNaming) {
        if (el.value.trim()) { applyRename(el.value); endRenameInput() }
        else if (typeof el.focus === 'function') el.focus()
        return
      }
      if (renaming) { applyRename(el.value); endRenameInput() }
    })
    // 轮次103：确定按钮（取名大框底部，两态图）。点击 = 回车确认，逻辑与 Enter 完全一致。
    const okBtn = (typeof document !== 'undefined' && document.getElementById)
      ? document.getElementById('nameOk') : null
    if (okBtn && okBtn.addEventListener) {
      okBtn.addEventListener('click', () => {
        if (firstNaming && !el.value.trim()) { toast('名字不能为空，请重新输入'); if (el.focus) el.focus(); return }
        if (firstNaming || renaming) { applyRename(el.value); endRenameInput() }
      })
    }
  }

  G.app = G.app || {}
  G.app.rename = { NAME_INPUT_ID, beginRename, endRenameInput, applyRename, wireNameInput, promptFirstName, displayNameOf, currentNameOf }
})()