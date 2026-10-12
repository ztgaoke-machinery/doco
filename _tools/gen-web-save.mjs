// 把 exe 旁边的 save.json 生成一份「网页版种子」→ web/save-web.js
//
// 【为什么需要】exe 与网页版的存档是**两个源**：
//   · exe 启动 = 本地 http 服务器 → 存档走 `/__save` → 落到 exe 旁边的 save.json
//   · 双击 game.html = `file://` → fetch('/__save') 必然失败 → 只能吃浏览器 localStorage
//   用户 2026-10-09 要求"网页同步改"，而 file:// 下 fetch 读不到同目录文件（CORS），
//   所以改用 **<script> 注入**这份副本：`<script>` 不受 CORS 限制，file:// 下能正常加载。
//
// 【为什么中文要转义】test-glyphs.mjs 会扫 game.html 引用的**所有脚本**的字符集，
//   中文直接写进来会往字形图集里塞新字（图集是离线生成的，改不动）。转成 \uXXXX 后文件保持纯 ASCII。
//
// 用法：改完存档后跑 `node _tools/gen-web-save.mjs`
// （源码包布局：exe 与 game.html 同在根目录，save.json 就在旁边，故 SRC 取本目录）
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('.')
const SRC = path.join(ROOT, 'save.json')
const OUT = path.join(ROOT, 'save-web.js')

if (!fs.existsSync(SRC)) {
  console.error('找不到存档：' + SRC)
  process.exit(1)
}
const raw = fs.readFileSync(SRC, 'utf8')
let obj
try { obj = JSON.parse(raw) } catch (e) {
  console.error('save.json 不是合法 JSON：' + e.message)
  process.exit(1)
}
// 转成纯 ASCII（非 ASCII 一律 \uXXXX）
const ascii = JSON.stringify(obj).replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
const head = [
  '// AUTO-GENERATED - DO NOT EDIT BY HAND.',
  '// Web build (opened via file://) cannot fetch ../save.json, so game.html loads this',
  '// <script> copy to keep the web build and the exe build on the SAME save file.',
  '// Source: ../save.json ; regenerate with: node _tools/gen-web-save.mjs',
  '// Kept pure ASCII on purpose (test-glyphs scans every script referenced by game.html).',
  '',
].join('\n')
fs.writeFileSync(OUT, head + 'window.__DKDbb_WEB_SAVE__ = ' + ascii + ';\n', 'utf8')

const size = fs.statSync(OUT).size
const nonAscii = /[^\x00-\x7F]/.test(fs.readFileSync(OUT, 'utf8'))
console.log(`已生成 save-web.js（${size} 字节，level=${obj.level}，整文件纯 ASCII=${!nonAscii}）`)
